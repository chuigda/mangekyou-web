import type { SimulatorCHR, PlayerCHR, AdditionalCHR } from '../llm/chr_file'
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

export interface ResponseBase {}

export interface ResponseSuccess<T> extends ResponseBase {
    data: T
}

export interface ResponseError extends ResponseBase {
    error: string
}

export type Response<T> = ResponseSuccess<T> | ResponseError

export function tokenizersList(): Promise<string[]> {
    return mobius.get(`${urlBase}/tokenizer/list`, {}, JsonResponder)
}

export function tokenize(tokenizer: string, text: string): Promise<TokenizeResponse> {
    return mobius.postJson(
        `${urlBase}/tokenizer/tokenize`,
        { tokenizer, text },
        {},
        JsonResponder
    )
}

export async function parseSimulator(toml: string): Promise<SimulatorCHR | string> {
    const result = await mobius.postText<Response<SimulatorCHR | string>, typeof JsonResponder>(
        `${urlBase}/chr/parse/simulator`,
        toml,
        {},
        JsonResponder
    )
    if ('error' in result) {
        return result.error
    }

    return result.data
}

export async function parsePlayer(toml: string): Promise<PlayerCHR | string> {
    const result = await mobius.postText<Response<PlayerCHR | string>, typeof JsonResponder>(
        `${urlBase}/chr/parse/player`,
        toml,
        {},
        JsonResponder
    )
    if ('error' in result) {
        return result.error
    }

    return result.data
}

export async function parseAdditional(toml: string): Promise<AdditionalCHR | string> {
    const result = await mobius.postText<Response<AdditionalCHR | string>, typeof JsonResponder>(
        `${urlBase}/chr/parse/additional`,
        toml,
        {},
        JsonResponder
    )
    if ('error' in result) {
        return result.error
    }

    return result.data
}
