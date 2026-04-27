import type { LanguageSelector } from './lang_config'

export interface CHRBase {}

export interface SimulatorCHR extends CHRBase {
    universeName: string
    literalWorkName: string
    prologue?: string

    language: LanguageSelector

    statusBar: StatusBarConfig
    simulator?: SimulatorConfig
    memory?: MemorySummarizerConfig
}

export interface AdditionalCHR extends CHRBase {
    statusBar?: StatusBarConfig
    simulator?: SimulatorConfig
    memory?: MemorySummarizerConfig
}

export interface PlayerCHR extends CHRBase {
    playerName: string
    settings?: string
}

export type CHR = SimulatorCHR | AdditionalCHR | PlayerCHR

export interface CHRFile<C extends CHRBase> {
    fileName: string
    absolutePath: string
    chr: C
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
