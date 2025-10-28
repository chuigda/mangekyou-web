export interface MessageBase<K extends string> {
    $k: K
    content: string
}

export interface SimulatorMessage extends MessageBase<'simulator'> {
    summarize: string[]
    statusBar: string

    promptTokenCount: number
    tokenCount: number
    statusBarPromptTokenCount: number
    statusBarTokenCount: number
}

export interface PlayerMessage extends MessageBase<'player'> {}

export type Message = SimulatorMessage | PlayerMessage
