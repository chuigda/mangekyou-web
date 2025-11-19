use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangekyouRequest {
    pub api_url: String,
    pub api_key: String,
    pub model: String,
    pub messages: Vec<MangekyouMessage>,
    pub temperature: f32,
    pub top_p: f32,
    pub presence_penalty: f32,
    pub frequency_penalty: f32,
    pub token_budget: usize
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangekyouResponse {
    pub content: String,
    pub actual_token_usage: usize
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangekyouErrorResponse {
    pub error: String
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MangekyouMessageRole {
    System,
    User,
    Assistant
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangekyouMessage {
    pub role: MangekyouMessageRole,
    pub content: String,
}
