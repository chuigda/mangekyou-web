use serde::{Deserialize, Serialize};
use axum::Json;
use axum::response::{IntoResponse, Response};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulatorCHR {
    pub universe_name: String,
    pub literal_work_name: String,
    pub prologue: Option<String>,

    pub language: Language,

    pub status_bar: StatusBarConfig,
    pub simulator: Option<SimulatorConfig>,
    pub memory: Option<MemorySummarizerConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerCHR {
    pub player_name: String,
    pub settings: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdditionalCHR {
    pub name: Option<String>,
    pub status_bar: Option<StatusBarConfig>,
    pub simulator: Option<SimulatorConfig>,
    pub memory: Option<MemorySummarizerConfig>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ParseSuccessResult<T: Serialize> {
    pub data: T
}

#[derive(Debug, Clone, Serialize)]
pub struct ParseErrorResult {
    pub error: String
}

pub async fn parse_simulator(body: String) -> Response {
    parse_toml::<SimulatorCHR>(&body)
}

pub async fn parse_additional(body: String) -> Response {
    parse_toml::<AdditionalCHR>(&body)
}

pub async fn parse_player(body: String) -> Response {
    parse_toml::<PlayerCHR>(&body)
}

pub fn parse_toml<T>(body: &str) -> Response
where
    T: Serialize + for<'de> Deserialize<'de>,
{
    match toml::from_str::<T>(body) {
        Ok(data) => Json(ParseSuccessResult { data }).into_response(),
        Err(e) => Json(ParseErrorResult { error: e.to_string() }).into_response(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Language {
    #[serde(rename = "en")]
    English,
    #[serde(rename = "zh_CN")]
    Chinese,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulatorConfig {
    pub tasks: Option<String>,
    pub commands: Option<String>,
    pub world: Option<String>,
    pub characters: Option<String>,
    pub database: Option<String>,
    pub behaviors: Option<String>,
    pub prohibitions: Option<String>,
    pub sections: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusBarConfig {
    pub format: String,
    pub rule: Option<String>,
    pub sections: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemorySummarizerConfig {
    pub rules: Option<String>,
    pub sections: Option<String>,
}
