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

export function parseSimulator(toml: string): Promise<SimulatorCHR> {
    return mobius.postText(
        `${urlBase}/chr/parse/simulator`,
        toml,
        {},
        JsonResponder
    )
}

export function parsePlayer(toml: string): Promise<PlayerCHR> {
    return mobius.postText(
        `${urlBase}/chr/parse/player`,
        toml,
        {},
        JsonResponder
    )
}

export function parseAdditional(toml: string): Promise<AdditionalCHR> {
    return mobius.postText(
        `${urlBase}/chr/parse/additional`,
        toml,
        {},
        JsonResponder
    )
}
