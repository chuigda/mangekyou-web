import type { ChatCompletionRequest } from './openai'

export interface MangekyouRequest {
    api_url: string
    api_key: string
    openai_request: ChatCompletionRequest
}

export interface MangekyouResponse {
    content: string
    actual_token_usage: number
}

export interface MangekyouErrorResponse {
    error: string
}
