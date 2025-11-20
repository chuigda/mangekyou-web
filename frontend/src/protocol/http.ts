import { JsonResponder, mobius } from '../util'

export let urlBase = ''

export interface TokenizeSuccessResponse {
    ids: number[]
    tokens: string[]
}

export interface TokenizeErrorResponse {
    error: string
}

export type TokenizeResponse = TokenizeSuccessResponse | TokenizeErrorResponse

export async function tokenizersList(): Promise<string[]> {
    return mobius.get(`${urlBase}/tokenizer/list`, {}, JsonResponder)
}

export async function tokenize(tokenizer: string, text: string): Promise<TokenizeResponse> {
    return mobius.postJson(
        `${urlBase}/tokenizer/tokenize`,
        { tokenizer, text },
        {},
        JsonResponder
    )
}
