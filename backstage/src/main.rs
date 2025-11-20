mod protocol;

use std::sync::Arc;

use axum::Router;
use axum::extract::WebSocketUpgrade;
use axum::extract::ws::{Message, WebSocket};
use axum::response::Response;
use axum::routing::any;
use tokio::net::TcpListener;
use tokio::spawn;
use tokio::sync::Mutex;
use futures_util::{SinkExt, StreamExt};

use crate::protocol::mangekyou::{MangekyouErrorResponse, MangekyouRequest, MangekyouSuccessResponse};
use crate::protocol::openai::ChatCompletionResponse;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = Router::new()
        .route("/ws", any(websocket_handler));
    let listener = TcpListener::bind("127.0.0.1:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn websocket_handler(ws: WebSocketUpgrade) -> Response {
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
        let Ok(mangekyou_request) = serde_json::from_str::<MangekyouRequest>(message) else {
            tracing::error!("Failed to parse MangekyouRequest: {}", message);
            continue;
        };

        let sender = sender.clone();
        spawn(async move {
            let result = async {
                let client = reqwest::Client::new();
                let response = client.post(&mangekyou_request.api_url)
                    .header("Authorization", format!("Bearer {}", mangekyou_request.api_key))
                    .json(&mangekyou_request.openai_request)
                    .send()
                    .await
                    .map_err(|e| format!("Request failed: {}", e))?;

                let status  = response.status();

                if !status.is_success() {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    return Err(format!("API returned error status: {}. Body: {}", status, error_text));
                }

                let chat_response = response.json::<ChatCompletionResponse>().await
                    .map_err(|e| format!("Failed to parse response: {}", e))?;

                let choice = chat_response.choices.first()
                    .ok_or_else(|| "No choices in response".to_string())?;

                Ok(MangekyouSuccessResponse {
                    id: mangekyou_request.req_id,
                    content: choice.message.content.clone(),
                    token_usage: chat_response.usage.total_tokens,
                })
            }.await;

            let response_text = match result {
                Ok(resp) => serde_json::to_string(&resp).unwrap(),
                Err(error_msg) => serde_json::to_string(&MangekyouErrorResponse {
                    id: mangekyou_request.req_id,
                    error: error_msg,
                }).unwrap(),
            };

            if let Err(e) = sender.lock().await.send(Message::from(response_text)).await {
                tracing::error!("Failed to send response: {}", e);
            }
        });
    }
}
