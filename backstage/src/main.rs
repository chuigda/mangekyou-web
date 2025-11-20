mod protocol;
mod chr;
mod llm_fwd;
mod llm_tok;
mod win32;
mod state;

use std::sync::Arc;

use axum::Router;
use axum::routing::{any, post, get};
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;

use crate::state::AppState;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    if let Err(e) = application_start().await {
        let error_message = format!("Mangekyou error: {}", e);
        tracing::error!("{}", error_message);
        win32::message_box(&error_message, "Mangekyou Error", win32::MB_ICONERROR);
        Err(e)
    } else {
        Ok(())
    }
}

async fn application_start() -> Result<(), Box<dyn std::error::Error>> {
    tracing::info!("Pre-initializing tokenizers");
    let tokenizers = llm_tok::load_tokenizers()?;
    tracing::info!("Tokenizers pre-initialization complete");

    let state = AppState {
        client: reqwest::Client::new(),
        tokenizers: Arc::new(tokenizers),
    };

    let app = Router::new()
        .route("/", get(|| async { "Zdravstvuyte, mir!" }))
        .route("/ws", any(llm_fwd::websocket_handler))
        .route("/parse/simulator", post(chr::parse_simulator))
        .route("/parse/additional", post(chr::parse_additional))
        .route("/parse/player", post(chr::parse_player))
        .route("/tokenizer/list", get(llm_tok::list_tokenizers))
        .route("/tokenizer/tokenize", post(llm_tok::tokenize))
        .layer(CorsLayer::permissive())
        .with_state(state);

    tracing::info!("Starting HTTP server on http://127.0.0.1:3000");
    tracing::info!("WebSocket endpoint available at ws://127.0.0.1:3000/ws");

    let listener = TcpListener::bind("127.0.0.1:3000").await?;
    axum::serve(listener, app).await?;

    Ok(())
}
