import type { ChatCompletionRequest } from './openai'

export interface MangekyouRequestBody {
    api_url: string
    api_key: string
    openai_request: ChatCompletionRequest
}

export interface MangekyouRequest extends MangekyouRequestBody {
    id: number
}

export interface MangekyouResponseBase {
    id: number
}

export interface MangekyouSuccessResponse extends MangekyouResponseBase {
    content: string
    prompt_tokens: number
    completion_tokens: number
}

export interface MangekyouStreamChunk extends MangekyouResponseBase {
    delta: string
}

export interface MangekyouStreamEnd extends MangekyouResponseBase {
    done: boolean
    prompt_tokens?: number
    completion_tokens?: number
}

export interface MangekyouErrorResponse extends MangekyouResponseBase {
    error: string
}

export type MangekyouResponse = MangekyouSuccessResponse | MangekyouErrorResponse | MangekyouStreamChunk | MangekyouStreamEnd
