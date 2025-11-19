import type { MangekyouRequest, MangekyouResponseBase } from './mangekyou'

let ws_connection: WebSocket | null = null

export function initWebsocket() {
    ws_connection = new WebSocket(`ws://localhost:3000/ws`)

    ws_connection.onopen = () => {
        console.log('WebSocket connection established')
    }

    ws_connection.onclose = () => {
        console.log('WebSocket connection closed')
        initWebsocket()
    }

    ws_connection.onerror = err => {
        console.error('WebSocket error:', err)
    }

    ws_connection.onmessage = event => {
        const data: MangekyouResponseBase = JSON.parse(event.data)
        const resolver = awaiting[data.id]
        if (resolver) {
            resolver(data)
            delete awaiting[data.id]
        }
    }
}

const awaiting: Record<number, (data: MangekyouResponseBase) => void> = {}

export function sendWebsocketRequest(req: MangekyouRequest): Promise<MangekyouResponseBase> {
    return new Promise((resolve, reject) => {
        if (!ws_connection || ws_connection.readyState !== WebSocket.OPEN) {
            return reject(new Error('WebSocket is not connected'))
        }

        awaiting[req.id] = resolve
        ws_connection.send(JSON.stringify(req))

        setTimeout(() => {
            if (awaiting[req.id]) {
                delete awaiting[req.id]
                reject(new Error('WebSocket request timed out'))
            }
        }, 3 * 60 * 1000) // timeout after 3 minutes
    })
}
