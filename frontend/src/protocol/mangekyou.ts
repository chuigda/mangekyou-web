import type { ChatCompletionRequest } from './openai'

export interface MangekyouRequest {
    id: number

    api_url: string
    api_key: string
    openai_request: ChatCompletionRequest
}

export interface MangekyouResponseBase {
    id: number
}

export interface MangekyouResponse extends MangekyouResponseBase {
    content: string
    actual_token_usage: number
}

export interface MangekyouErrorResponse extends MangekyouResponseBase {
    error: string
}
