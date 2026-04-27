use std::sync::Arc;

use axum::extract::{State, WebSocketUpgrade};
use axum::extract::ws::{Message, WebSocket};
use axum::response::Response;
use futures_util::{SinkExt, StreamExt};
use tokio::spawn;
use tokio::sync::Mutex;

use crate::protocol::mangekyou::{MangekyouErrorResponse, MangekyouRequest, MangekyouStreamChunk, MangekyouStreamEnd, MangekyouSuccessResponse};
use crate::protocol::openai::{ChatCompletionChunk, ChatCompletionResponse};
use crate::state::AppState;

type WsSender = Arc<Mutex<futures_util::stream::SplitSink<WebSocket, Message>>>;

pub async fn websocket_handler(State(state): State<AppState>, ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(move |socket| handle_websocket(socket, state.client))
}

async fn handle_websocket(ws: WebSocket, client: reqwest::Client) {
    let (sender, mut receiver) = ws.split();
    let sender: WsSender = Arc::new(Mutex::new(sender));

    while let Some(Ok(msg)) = receiver.next().await {
        let Message::Text(message) = msg else {
            continue
        };
        let message = message.as_str();
        let mangekyou_request = match serde_json::from_str::<MangekyouRequest>(message) {
            Ok(req) => req,
            Err(e) => {
                tracing::error!("Failed to parse MangekyouRequest: {}. Error: {}", message, e);
                continue;
            }
        };

        tracing::info!("Handling MangekyouRequest ID: {} (stream={})", mangekyou_request.id, mangekyou_request.openai_request.stream);

        let sender = sender.clone();
        let client = client.clone();
        let is_stream = mangekyou_request.openai_request.stream;
        spawn(async move {
            if is_stream {
                forward_streaming(mangekyou_request, client, sender).await;
            } else {
                let result = forward_non_streaming(mangekyou_request, client).await;
                let response_text = match result {
                    Ok(resp) => serde_json::to_string(&resp),
                    Err(error_resp) => serde_json::to_string(&error_resp),
                }.unwrap();
                if let Err(e) = sender.lock().await.send(Message::from(response_text)).await {
                    tracing::error!("Failed to send response: {}", e);
                }
            }
        });
    }
}

async fn send_ws(sender: &WsSender, msg: &impl serde::Serialize) {
    let text = serde_json::to_string(msg).unwrap();
    if let Err(e) = sender.lock().await.send(Message::from(text)).await {
        tracing::error!("Failed to send WS message: {}", e);
    }
}

async fn forward_streaming(
    req: MangekyouRequest,
    client: reqwest::Client,
    sender: WsSender,
) {
    let id = req.id;

    let response = match client.post(&req.api_url)
        .header("Authorization", format!("Bearer {}", req.api_key))
        .json(&req.openai_request)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            send_ws(&sender, &MangekyouErrorResponse { id, error: format!("Request failed: {}", e) }).await;
            return;
        }
    };

    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        send_ws(&sender, &MangekyouErrorResponse { id, error: format!("API error {}: {}", status, error_text) }).await;
        return;
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut last_usage = None;

    while let Some(chunk_result) = stream.next().await {
        let bytes = match chunk_result {
            Ok(b) => b,
            Err(e) => {
                send_ws(&sender, &MangekyouErrorResponse { id, error: format!("Stream read error: {}", e) }).await;
                return;
            }
        };

        buffer.push_str(&String::from_utf8_lossy(&bytes));

        // SSE format: each event is "data: {json}\n\n"
        while let Some(pos) = buffer.find("\n\n") {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 2..].to_string();

            let data = line.strip_prefix("data: ").unwrap_or(&line);
            if data == "[DONE]" {
                continue;
            }

            let chunk = match serde_json::from_str::<ChatCompletionChunk>(data) {
                Ok(c) => c,
                Err(_) => continue,
            };

            if let Some(usage) = &chunk.usage {
                last_usage = Some(usage.total_tokens);
            }

            if let Some(choice) = chunk.choices.first() {
                if let Some(content) = &choice.delta.content {
                    if !content.is_empty() {
                        send_ws(&sender, &MangekyouStreamChunk { id, delta: content.clone() }).await;
                    }
                }
            }
        }
    }

    send_ws(&sender, &MangekyouStreamEnd { id, done: true, token_usage: last_usage }).await;
}

async fn forward_non_streaming(
    mangekyou_request: MangekyouRequest,
    client: reqwest::Client,
) -> Result<MangekyouSuccessResponse, MangekyouErrorResponse> {
    let response = client.post(&mangekyou_request.api_url)
        .header("Authorization", format!("Bearer {}", mangekyou_request.api_key))
        .json(&mangekyou_request.openai_request)
        .send()
        .await
        .map_err(|e| MangekyouErrorResponse {
            id: mangekyou_request.id,
            error: format!("Request failed: {}", e),
        })?;

    let status = response.status();

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(MangekyouErrorResponse {
            id: mangekyou_request.id,
            error: format!("API returned error status: {}. Body: {}", status, error_text),
        });
    }

    let chat_response = response.json::<ChatCompletionResponse>()
        .await
        .map_err(|e| MangekyouErrorResponse {
            id: mangekyou_request.id,
            error: format!("Failed to parse response: {}", e),
        })?;

    let choice = chat_response.choices.first()
        .ok_or_else(|| MangekyouErrorResponse {
            id: mangekyou_request.id,
            error: "No choices in response".to_string(),
        })?;

    Ok(MangekyouSuccessResponse {
        id: mangekyou_request.id,
        content: choice.message.content.clone(),
        token_usage: chat_response.usage.total_tokens,
    })
}
