use std::sync::Arc;

use axum::extract::WebSocketUpgrade;
use axum::extract::ws::{Message, WebSocket};
use axum::response::Response;
use futures_util::{SinkExt, StreamExt};
use tokio::spawn;
use tokio::sync::Mutex;

use crate::protocol::mangekyou::{MangekyouErrorResponse, MangekyouRequest, MangekyouSuccessResponse};
use crate::protocol::openai::ChatCompletionResponse;

pub async fn websocket_handler(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_websocket)
}

async fn handle_websocket(ws: WebSocket) {
    let (sender, mut receiver) = ws.split();
    let sender = Arc::new(Mutex::new(sender));

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

        tracing::info!("Handling MangekyouRequest ID: {}", mangekyou_request.id);

        let sender = sender.clone();
        spawn(async move {
            let result = forward_mangekyou_request(mangekyou_request).await;

            let response_text = match result {
                Ok(resp) => serde_json::to_string(&resp).unwrap(),
                Err(error_resp) => serde_json::to_string(&error_resp).unwrap(),
            };

            if let Err(e) = sender.lock().await.send(Message::from(response_text)).await {
                tracing::error!("Failed to send response: {}", e);
            }
        });
    }
}

async fn forward_mangekyou_request(
    mangekyou_request: MangekyouRequest
) -> Result<MangekyouSuccessResponse, MangekyouErrorResponse> {
    let client = reqwest::Client::new();
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
