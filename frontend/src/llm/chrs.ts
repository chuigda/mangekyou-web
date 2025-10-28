export type LanguageSelector = 'en' | 'zh_CN'

export interface SimulatorCHR {
    universeName: string
    literalWorkName: string
    prologue?: string

    language: LanguageSelector

    statusBar: StatusBarConfig
    simulator?: SimulatorConfig
    memory?: MemorySummarizerConfig
}

export interface AdditionalCHR {
    statusBar?: StatusBarConfig
    simulator?: SimulatorConfig
    memory?: MemorySummarizerConfig
}

export interface PlayerCHR {
    playerName: string
    settings?: string
}

export interface StatusBarConfig {
    format: string
    rule?: string
    sections?: string
}

export interface SimulatorConfig {
    tasks?: string
    commands?: string
    world?: string
    characters?: string
    database?: string
    behaviors?: string
    prohibitions?: string
    sections?: string
}

export interface MemorySummarizerConfig {
    rules?: string
    sections?: string
}
