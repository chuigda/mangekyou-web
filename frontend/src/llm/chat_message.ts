export interface MessageBase<K extends string> {
    $k: K
}

export interface SimulatorMessage extends MessageBase<'simulator'> {
    content: string
    summarize: string
    statusBar: string
}

export interface PlayerMessage extends MessageBase<'player'> {
    content: string
}

export interface ErrorMessage extends MessageBase<'error'> {
    content: string
}

export type Message = SimulatorMessage | PlayerMessage | ErrorMessage
