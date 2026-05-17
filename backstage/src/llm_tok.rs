use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use axum::extract::State;
use axum::Json;
use axum::response::{IntoResponse, Response};
use serde::{Deserialize, Serialize};
use tokenizers::Tokenizer;
use tokio::task::spawn_blocking;

use crate::state::AppState;

#[allow(unused)]
pub fn load_tokenizers() -> Result<HashMap<String, Arc<Tokenizer>>, Box<dyn std::error::Error>> {
    let path = Path::new("modele");
    if !path.exists() || !path.is_dir() {
        return Err("Directory 'modele' is absent".into());
    }

    let entries = std::fs::read_dir(path)?;
    let mut m = HashMap::new();
    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        if !path.extension().map_or(false, |ext| ext == "json") {
            continue
        }

        let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
            continue
        };

        let key = stem.split('.').next().unwrap_or(stem).to_string();
        tracing::info!("Loading tokenizer {}", key);

        match Tokenizer::from_file(&path) {
            Ok(tokenizer) => { m.insert(key, Arc::new(tokenizer)); },
            Err(e) => { tracing::warn!("Failed to load tokenizer from {:?}: {}", path, e); }
        }
    }

    if m.is_empty() {
        tracing::info!("Directory 'modele' is empty or contains no valid tokenizers");
    }

    tracing::info!("Loaded {} tokenizers", m.len());
    Ok(m)
}

pub async fn list_tokenizers(State(state): State<AppState>) -> Json<Vec<String>> {
    let tokenizers: Vec<String> = state.tokenizers.keys().cloned().collect();
    Json(tokenizers)
}

#[derive(Deserialize)]
pub struct TokenizeRequest {
    pub tokenizer: String,
    pub text: String,
}

#[derive(Serialize)]
pub struct TokenizeSuccessResponse {
    pub ids: Vec<u32>,
    pub tokens: Vec<String>,
}

#[derive(Serialize)]
pub struct TokenizerErrorResponse {
    pub error: String,
}

pub async fn tokenize(
    State(state): State<AppState>,
    Json(payload): Json<TokenizeRequest>
) -> Response {
    let Some(tokenizer) = state.tokenizers.get(&payload.tokenizer) else {
        return Json(TokenizerErrorResponse { error: "Tokenizer not found".to_string() }).into_response();
    };

    let tokenizer = tokenizer.clone();

    match spawn_blocking(move || tokenizer.encode(payload.text, false)).await {
        Ok(Ok(encoding)) => {
            let ids = encoding.get_ids().to_vec();
            let tokens = encoding.get_tokens().to_vec();
            Json(TokenizeSuccessResponse { ids, tokens }).into_response()
        },
        Ok(Err(e)) => {
            Json(TokenizerErrorResponse { error: format!("Tokenization error: {}", e) }).into_response()
        },
        Err(e) => {
            Json(TokenizerErrorResponse { error: format!("Tokio task error: {}", e) }).into_response()
        }
    }
}
