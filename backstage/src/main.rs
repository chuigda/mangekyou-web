mod protocol;
mod chr;
mod llm_fwd;
mod llm_tok;

use std::thread;

use axum::Router;
use axum::routing::{any, post, get};
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
        .route("/tokenizer/list", get(llm_tok::list_tokenizers))
        .route("/tokenizer/tokenize", post(llm_tok::tokenize))
        .layer(CorsLayer::permissive());
    let listener = TcpListener::bind("127.0.0.1:3000").await.unwrap();

    thread::spawn(|| {
        tracing::info!("Pre-initializing tokenizers");
        let _ = llm_tok::tokenizers();
        tracing::info!("Tokenizers pre-initialization complete");
    });

    tracing::info!("HTTP Server listening on http://127.0.0.1:3000");
    tracing::info!("Websocket Server listening on ws://127.0.0.1:3000/ws");
    axum::serve(listener, app).await.unwrap();
}
