import type { MangekyouRequest, MangekyouRequestBody, MangekyouResponse, MangekyouStreamChunk, MangekyouStreamEnd } from './mangekyou'

type ResolveFn = (value: MangekyouResponse) => void
type DeltaFn = (delta: string) => void

interface PendingRequest {
    resolve: ResolveFn
    onDelta?: DeltaFn
}

let websocketConnection: WebSocket | null = null
let nextRequestId = 1

const pendingRequests = new Map<number, PendingRequest>()
let onDisconnectCallback: (() => void) | null = null

export function initWebsocket(url: string, onDisconnect?: () => void): Promise<boolean> {
    if (onDisconnect) {
        onDisconnectCallback = onDisconnect
    }

    if (websocketConnection) {
        return Promise.resolve(true)
    }

    return new Promise(resolve => {
        websocketConnection = new WebSocket(url)

        websocketConnection.onopen = () => {
            console.log('WebSocket connected')
            resolve(true)
        }

        websocketConnection.onmessage = event => {
            try {
                const response = JSON.parse(event.data)
                const { id } = response
                const pending = pendingRequests.get(id)
                if (!pending) return

                // streaming chunk
                if ('delta' in response) {
                    const chunk = response as MangekyouStreamChunk
                    pending.onDelta?.(chunk.delta)
                    return
                }

                // streaming end
                if ('done' in response) {
                    const end = response as MangekyouStreamEnd
                    pending.resolve({ id: end.id, content: '', token_usage: end.token_usage ?? 0 } as MangekyouResponse)
                    pendingRequests.delete(id)
                    return
                }

                // non-streaming or error
                pending.resolve(response as MangekyouResponse)
                pendingRequests.delete(id)
            } catch (e) {
                console.error('Failed to parse websocket message', e)
            }
        }

        websocketConnection.onclose = () => {
            console.log('WebSocket disconnected')
            websocketConnection = null
            for (const [id, pending] of pendingRequests.entries()) {
                pending.resolve({
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

export function disconnectWebsocket() {
    if (websocketConnection) {
        websocketConnection.close()
        websocketConnection = null
    }
}

export function sendRequest(requestBody: MangekyouRequestBody, onDelta?: DeltaFn): Promise<MangekyouResponse> {
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

        pendingRequests.set(id, { resolve, onDelta })

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
