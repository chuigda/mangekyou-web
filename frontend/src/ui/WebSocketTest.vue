<template>
  <div class="ws-test">
    <h2>WebSocket Test</h2>
    
    <div class="section">
      <h3>Connection</h3>
      <div class="input-group">
        <label>WS URL:</label>
        <input v-model="wsUrl" type="text" placeholder="ws://localhost:8080" />
        <button @click="connect">Connect</button>
      </div>
      <div class="status">Status: {{ connectionStatus }}</div>
    </div>

    <div class="section">
      <h3>Request Config</h3>
      <div class="input-group">
        <label>API URL:</label>
        <input v-model="apiUrl" type="text" placeholder="https://api.openai.com/v1/chat/completions" />
      </div>
      <div class="input-group">
        <label>API Key:</label>
        <input v-model="apiKey" type="password" placeholder="sk-..." />
      </div>
    </div>

    <div class="section">
      <h3>Message</h3>
      <div class="input-group">
        <label>Model:</label>
        <input v-model="model" type="text" />
      </div>
      <div class="input-group">
        <textarea v-model="userMessage" rows="4" placeholder="Enter your message here..."></textarea>
      </div>
      <button @click="send" :disabled="!isConnected">Send Request</button>
    </div>

    <div class="section">
      <h3>Logs</h3>
      <div class="logs">
        <div v-for="(log, index) in logs" :key="index" class="log-entry">
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { initWebsocket, sendRequest } from '../protocol/ws'
import type { MangekyouRequestBody } from '../protocol/mangekyou'

const wsUrl = ref('ws://localhost:3000/ws')
const apiUrl = ref('https://api.openai.com/v1/chat/completions')
const apiKey = ref('')
const model = ref('gpt-3.5-turbo')
const userMessage = ref('Hello!')
const logs = ref<string[]>([])
const isConnected = ref(false)

const connectionStatus = computed(() => isConnected.value ? 'Connected' : 'Disconnected')

function addLog(msg: string) {
  logs.value.push(`[${new Date().toLocaleTimeString()}] ${msg}`)
}

async function connect() {
  try {
    addLog(`Connecting to ${wsUrl.value}...`)
    const success = await initWebsocket(wsUrl.value, () => {
      isConnected.value = false
      addLog('Disconnected from WebSocket')
    })
    if (success) {
      isConnected.value = true
      addLog('Connected successfully')
    } else {
      isConnected.value = false
      addLog('Connection failed')
    }
  } catch (e) {
    addLog(`Error connecting: ${e}`)
    isConnected.value = false
  }
}

async function send() {
  if (!userMessage.value) return

  const requestBody: MangekyouRequestBody = {
    api_url: apiUrl.value,
    api_key: apiKey.value,
    openai_request: {
      model: model.value,
      messages: [
        { role: 'user', content: userMessage.value }
      ],
      temperature: 0.7,
      top_p: 1,
      n: 1,
      stream: false,
      stop: [],
      max_completion_tokens: 1000,
      presence_penalty: 0,
      frequency_penalty: 0
    }
  }

  addLog(`Sending request: ${JSON.stringify(requestBody, null, 2)}`)
  try {
    const response = await sendRequest(requestBody)
    addLog(`Response received: ${JSON.stringify(response, null, 2)}`)
  } catch (e) {
    addLog(`Error sending request: ${e}`)
  }
}
</script>

<style scoped>
.ws-test {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.section {
  margin-bottom: 20px;
  border: 1px solid #ccc;
  padding: 15px;
  border-radius: 4px;
}

.input-group {
  margin-bottom: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-group label {
  min-width: 80px;
}

.input-group input,
.input-group textarea {
  flex: 1;
  padding: 5px;
}

.logs {
  background: #f5f5f5;
  padding: 10px;
  height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  font-family: monospace;
  white-space: pre-wrap;
}

.log-entry {
  margin-bottom: 5px;
  border-bottom: 1px solid #eee;
}
</style>
