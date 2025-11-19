use serde::{Serialize, Deserialize};

use crate::protocol::openai;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangekyouRequest {
    pub req_id: u32,

    pub api_url: String,
    pub api_key: String,

    pub openai_request: openai::ChatCompletionRequest
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangekyouResponse {
    pub id: u32,

    pub content: String,
    pub actual_token_usage: usize
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangekyouErrorResponse {
    pub id: u32,
    pub error: String
}
