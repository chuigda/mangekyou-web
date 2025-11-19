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

use crate::protocol::mangekyou::{MangekyouErrorResponse, MangekyouRequest};

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

async fn handle_websocket(mut ws: WebSocket) {
    // split the websocket into sender and receiver
    let (mut sender, mut receiver) = ws.split();
    let sender = Arc::new(Mutex::new(sender));

    while let Some(Ok(msg)) = receiver.next().await {
        let Message::Text(message) = msg else {
            continue
        };
        let message = message.as_str();
        let Ok(chat_completion_request) = serde_json::from_str::<MangekyouRequest>(message) else {
            let _ = sender.lock().await.send(Message::from(serde_json::to_string(&MangekyouErrorResponse {
                error: "Invalid request format".to_string(),
            }).unwrap())).await;
            continue;
        };

        let sender = sender.clone();
        spawn(async move {

        });
    }
}
