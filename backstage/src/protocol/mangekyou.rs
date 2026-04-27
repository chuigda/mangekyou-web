use serde::{Serialize, Deserialize};

use crate::protocol::openai;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangekyouRequest {
    pub id: u32,

    pub api_url: String,
    pub api_key: String,

    pub openai_request: openai::ChatCompletionRequest
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangekyouSuccessResponse {
    pub id: u32,

    pub content: String,
    pub token_usage: u32
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangekyouStreamChunk {
    pub id: u32,
    pub delta: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangekyouStreamEnd {
    pub id: u32,
    pub done: bool,
    pub token_usage: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangekyouErrorResponse {
    pub id: u32,
    pub error: String
}
