use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LanguageSelector {
    #[serde(rename = "en")]
    English,
    #[serde(rename = "zh_CN")]
    Chinese,
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
pub struct MemorySummarizerConfig {
    pub rules: Option<String>,
    pub sections: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulatorCHR {
    pub universe_name: String,
    pub literal_work_name: String,
    pub prologue: Option<String>,

    pub language: LanguageSelector,

    pub status_bar: StatusBarConfig,
    pub simulator: Option<SimulatorConfig>,
    pub memory: Option<MemorySummarizerConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdditionalCHR {
    pub status_bar: Option<StatusBarConfig>,
    pub simulator: Option<SimulatorConfig>,
    pub memory: Option<MemorySummarizerConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerCHR {
    pub player_name: String,
    pub settings: Option<String>,
}
