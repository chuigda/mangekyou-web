use serde::{Deserialize, Serialize};
use axum::Json;

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
    pub status_bar: Option<StatusBarConfig>,
    pub simulator: Option<SimulatorConfig>,
    pub memory: Option<MemorySummarizerConfig>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ParseResult<T: Serialize> {
    pub success: bool,
    pub message: Option<String>,
    pub data: Option<T>
}

pub async fn parse_simulator(body: String) -> Json<ParseResult<SimulatorCHR>> {
    parse_toml(&body)
}

pub async fn parse_additional(body: String) -> Json<ParseResult<AdditionalCHR>> {
    parse_toml(&body)
}

pub async fn parse_player(body: String) -> Json<ParseResult<PlayerCHR>> {
    parse_toml(&body)
}

pub fn parse_toml<T>(body: &str) -> Json<ParseResult<T>>
where
    T: Serialize + for<'de> Deserialize<'de>,
{
    match toml::from_str::<T>(body) {
        Ok(v) => Json(ParseResult {
            success: true,
            message: None,
            data: Some(v),
        }),
        Err(e) => Json(ParseResult {
            success: false,
            message: Some(e.to_string()),
            data: None,
        }),
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
