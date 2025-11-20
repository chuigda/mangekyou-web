import type { MangekyouRequest, MangekyouRequestBody, MangekyouResponse } from './mangekyou'

type ResolveFn = (value: MangekyouResponse) => void

let websocketConnection: WebSocket | null = null
let nextRequestId = 1

const pendingRequests = new Map<number, ResolveFn>()
let onDisconnectCallback: (() => void) | null = null

export function initWebsocket(url: string, onDisconnect?: () => void): Promise<boolean> {
    if (onDisconnect) {
        onDisconnectCallback = onDisconnect
    }

    if (websocketConnection) {
        return Promise.resolve(true)
    }

    return new Promise((resolve) => {
        websocketConnection = new WebSocket(url)

        websocketConnection.onopen = () => {
            console.log('WebSocket connected')
            resolve(true)
        }

        websocketConnection.onmessage = event => {
            try {
                const response: MangekyouResponse = JSON.parse(event.data)
                const { id } = response
                const resolveFn = pendingRequests.get(id)
                if (resolveFn) {
                    resolveFn(response)
                    pendingRequests.delete(id)
                }
            } catch (e) {
                console.error('Failed to parse websocket message', e)
            }
        }

        websocketConnection.onclose = () => {
            console.log('WebSocket disconnected')
            websocketConnection = null
            for (const [id, resolveFn] of pendingRequests.entries()) {
                resolveFn({
                    id: id,
                    error: 'WebSocket disconnected'
                })
            }
            pendingRequests.clear()
            if (onDisconnectCallback) {
                onDisconnectCallback()
            }
            resolve(false)
        }

        websocketConnection.onerror = error => {
            console.error('WebSocket error', error)
            resolve(false)
        }
    })
}

export function sendRequest(requestBody: MangekyouRequestBody): Promise<MangekyouResponse> {
    return new Promise(resolve => {
        const id = nextRequestId++

        if (!websocketConnection || websocketConnection.readyState !== WebSocket.OPEN) {
            return resolve({
                id: id,
                error: 'WebSocket is not connected'
            })
        }
        const request: MangekyouRequest = {
            ...requestBody,
            id
        }

        pendingRequests.set(id, resolve)

        try {
            websocketConnection.send(JSON.stringify(request))
        } catch (e) {
            pendingRequests.delete(id)
            return resolve({
                id: id,
                error: 'Failed to send request over WebSocket'
            })
        }
    })
}
