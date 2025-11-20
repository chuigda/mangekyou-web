export function isDefined<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null
}

export function isBlank(s: string): boolean {
    return /^\s*$/.test(s)
}

export function deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
}

export async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export type Responder<T> = (response: Response) => Promise<T>

export const JsonResponder: Responder<any> = x => x.json()

export const TextResponder: Responder<string> = x => x.text()

export const VoidResponder: Responder<void> = async _ => {}

export const mobius = {
    get,
    post,
    postText,
    postJson
}

function get<T, R extends Responder<T>>(
    url: string,
    headers: Record<string, string>,
    responder: R
): Promise<T> {
    return fetch(url, { headers }).then(responder)
}

function post<T, R extends Responder<T>>(
    url: string,
    body: any,
    headers: Record<string, string>,
    responder: R
): Promise<T> {
    return fetch(url, {
        method: 'POST',
        headers,
        body
    }).then(responder)
}

function postText<T, R extends Responder<T>>(
    url: string,
    body: string,
    headers: Record<string, string>,
    responder: R
): Promise<T> {
    return post(
        url,
        body,
        { 'Content-Type': 'text/plain', ...headers },
        responder
    )
}

function postJson<T, R extends Responder<T>>(
    url: string,
    body: any,
    headers: Record<string, string>,
    responder: R
): Promise<T> {
    if (typeof body === 'string') {
        body = JSON.parse(body)
    }

    return post(
        url,
        JSON.stringify(body),
        { 'Content-Type': 'application/json', ...headers },
        responder
    )
}
