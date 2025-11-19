let ws_connection: WebSocket | null = null

export function initWebsocket() {
    // connect to port 3000, do not specify host
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
}
