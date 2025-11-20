mod protocol;
mod chr;
mod llm_fwd;

use axum::Router;
use axum::routing::{any, post};
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = Router::new()
        .route("/ws", any(llm_fwd::websocket_handler))
        .route("/parse/simulator", post(chr::parse_simulator))
        .route("/parse/additional", post(chr::parse_additional))
        .route("/parse/player", post(chr::parse_player))
        .layer(CorsLayer::permissive());
    let listener = TcpListener::bind("127.0.0.1:3000").await.unwrap();

    tracing::info!("HTTP Server listening on http://127.0.0.1:3000");
    tracing::info!("Websocket Server listening on ws://127.0.0.1:3000/ws");
    axum::serve(listener, app).await.unwrap();
}
