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

use crate::protocol::mangekyou::{MangekyouErrorResponse, MangekyouRequest, MangekyouResponse};
use crate::protocol::openai::ChatCompletionResponse;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/ws", any(websocket_handler));
    let listener = TcpListener::bind("127.0.0.1:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn websocket_handler(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_websocket)
}

async fn handle_websocket(ws: WebSocket) {
    // split the websocket into sender and receiver
    let (sender, mut receiver) = ws.split();
    let sender = Arc::new(Mutex::new(sender));

    while let Some(Ok(msg)) = receiver.next().await {
        let Message::Text(message) = msg else {
            continue
        };
        let message = message.as_str();
        let Ok(mangekyou_request) = serde_json::from_str::<MangekyouRequest>(message) else {
            let _ = sender.lock().await.send(Message::from(serde_json::to_string(&MangekyouErrorResponse {
                error: "Invalid request format".to_string(),
            }).unwrap())).await;
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

                if !response.status().is_success() {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    return Err(format!("API returned error status: {}. Body: {}", error_text, error_text));
                }

                let chat_response = response.json::<ChatCompletionResponse>().await
                    .map_err(|e| format!("Failed to parse response: {}", e))?;

                let choice = chat_response.choices.first()
                    .ok_or_else(|| "No choices in response".to_string())?;

                Ok(MangekyouResponse {
                    content: choice.message.content.clone(),
                    actual_token_usage: chat_response.usage.total_tokens as usize,
                })
            }.await;

            let response_text = match result {
                Ok(resp) => serde_json::to_string(&resp).unwrap(),
                Err(error_msg) => serde_json::to_string(&MangekyouErrorResponse {
                    error: error_msg,
                }).unwrap(),
            };

            if let Err(e) = sender.lock().await.send(Message::from(response_text)).await {
                show_error_message_box(&format!("Failed to send response: {}", e));
            }
        });
    }
}

#[link(name = "user32")]
unsafe extern "system" {
    fn MessageBoxW(hwnd: *mut std::ffi::c_void, lpText: *const u16, lpCaption: *const u16, uType: u32) -> i32;
}

fn show_error_message_box(message: &str) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    let msg: Vec<u16> = OsStr::new(message).encode_wide().chain(Some(0)).collect();
    let caption: Vec<u16> = OsStr::new("Error").encode_wide().chain(Some(0)).collect();

    unsafe {
        MessageBoxW(std::ptr::null_mut(), msg.as_ptr(), caption.as_ptr(), 0);
    }
}
