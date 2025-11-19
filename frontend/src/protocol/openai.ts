export type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

export interface ChatMessage {
    role: ChatRole
    content: string
}

export interface ChatCompletionRequest {
    model: string
    messages: ChatMessage[]
    temperature: number
    top_p: number
    n: number
    stream: boolean
    stop: string[]
    max_tokens: number
    presence_penalty: number
    frequency_penalty: number
}

export interface Choice {
    index: number
    message: ChatMessage
    finish_reason: string
}

export interface Usage {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
}

export interface ChatCompletionResponse {
    id: string
    object: string
    created: number
    model: string
    choices: Choice[]
    usage: Usage
}