export type Responder<T> = (response: Response) => Promise<T>

export const JsonResponder: Responder<any> = x => x.json()

export const TextResponder: Responder<string> = x => x.text()

export function get<T, R extends Responder<T>>(
    url: string,
    headers: Record<string, string>,
    responder: R
): Promise<T> {
    return fetch(url, { headers }).then(responder)
}

export function post<T, R extends Responder<T>>(
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

export function postText<T, R extends Responder<T>>(
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

export function postJson<T, R extends Responder<T>>(
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

export default {
    get,
    post,
    postText,
    postJson
}
