use std::collections::HashMap;
use std::sync::Arc;
use tokenizers::Tokenizer;

#[derive(Clone)]
pub struct AppState {
    pub client: reqwest::Client,
    pub tokenizers: Arc<HashMap<String, Arc<Tokenizer>>>,
}
