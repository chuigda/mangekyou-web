mod protocol;
mod chr;
mod llm_fwd;

use axum::Router;
use axum::routing::any;
use tokio::net::TcpListener;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = Router::new()
        .route("/ws", any(llm_fwd::websocket_handler));
    let listener = TcpListener::bind("127.0.0.1:3000").await.unwrap();

    tracing::info!("Websocket Server listening on ws://127.0.0.1:3000/ws");
    axum::serve(listener, app).await.unwrap();
}
