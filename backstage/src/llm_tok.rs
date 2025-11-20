use std::collections::HashMap;
use std::sync::OnceLock;
use std::path::Path;

use axum::Json;
use axum::response::{IntoResponse, Response};
use serde::{Deserialize, Serialize};
use tokenizers::Tokenizer;

static TOKENIZERS: OnceLock<HashMap<String, Tokenizer>> = OnceLock::new();

pub fn tokenizers() -> &'static HashMap<String, Tokenizer> {
    TOKENIZERS.get_or_init(|| {
        let path = Path::new("modele");
        if !path.exists() || !path.is_dir() {
            panic!("Directory 'modele' is absent");
        }

        let mut m = HashMap::new();
        let entries = std::fs::read_dir(path).expect("Failed to read 'modele' directory");

        for entry in entries.flatten() {
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
                Ok(tokenizer) => { m.insert(key, tokenizer); },
                Err(e) => { tracing::warn!("Failed to load tokenizer from {:?}: {}", path, e); }    
            }
        }

        if m.is_empty() {
            panic!("Directory 'modele' is empty or contains no valid tokenizers");
        }
        
        tracing::info!("Loaded {} tokenizers", m.len());
        m
    })
}

pub async fn list_tokenizers() -> Json<Vec<String>> {
    let tokenizers = tokenizers();
    let tokenizers: Vec<String> = tokenizers.keys().cloned().collect();
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

pub async fn tokenize(Json(payload): Json<TokenizeRequest>) -> Response {
    let tokenizers = tokenizers();
    if let Some(tokenizer) = tokenizers.get(&payload.tokenizer) {
        match tokenizer.encode(payload.text, false) {
            Ok(encoding) => {
                let ids = encoding.get_ids().to_vec();
                let tokens = encoding.get_tokens().to_vec();
                Json(TokenizeSuccessResponse { ids, tokens }).into_response()
            },
            Err(e) => {
                Json(TokenizerErrorResponse { error: format!("Tokenization error: {}", e) }).into_response()
            }
        }
    } else {
        Json(TokenizerErrorResponse { error: "Tokenizer not found".to_string() }).into_response()
    }
}
