<script setup lang="ts">
import { ref } from 'vue'
import {
    wsUrl, apiUrl, apiKey, isConnected,
    chatConfig, statusBarConfig, memoryConfig, outputBudget,
    simulatorCHR, playerCHR, additionalCHRs,
    connectWs, disconnectWs,
    uploadSimulatorCHR, uploadPlayerCHR, uploadAdditionalCHR
} from '../store'
import Row from '../component/Row.vue'

const simulatorFileInput = ref<HTMLInputElement>()
const playerFileInput = ref<HTMLInputElement>()
const additionalFileInput = ref<HTMLInputElement>()

async function handleFileUpload(
    event: Event,
    handler: (text: string) => Promise<void>
) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    await handler(text)
    input.value = ''
}

function removeAdditionalCHR(index: number) {
    additionalCHRs.value.splice(index, 1)
}
</script>

<template>
    <div class="config-panel panel">
        <h3>Connection</h3>
        <Row>
            <label>WS URL</label>
            <input v-model="wsUrl" type="text" placeholder="ws://localhost:3000/ws" />
        </Row>
        <Row>
            <button v-if="!isConnected" @click="connectWs">Connect</button>
            <button v-else @click="disconnectWs">Disconnect</button>
            <span :class="isConnected ? 'tooltip' : 'red-tooltip'">
                {{ isConnected ? 'Connected' : 'Disconnected' }}
            </span>
        </Row>

        <hr />
        <h3>API</h3>
        <Row>
            <label>API URL</label>
            <input v-model="apiUrl" type="text" placeholder="https://api.openai.com/v1/chat/completions" />
        </Row>
        <Row>
            <label>API Key</label>
            <input v-model="apiKey" type="password" placeholder="sk-..." />
        </Row>

        <hr />
        <h3>Chat Model</h3>
        <Row>
            <label>Model</label>
            <input v-model="chatConfig.model" type="text" />
        </Row>
        <Row>
            <label>Temperature</label>
            <input v-model.number="chatConfig.temperature" type="number" class="short" step="0.1" min="0" max="2" />
        </Row>
        <Row>
            <label>Top P</label>
            <input v-model.number="chatConfig.topP" type="number" class="short" step="0.1" min="0" max="1" />
        </Row>
        <Row>
            <label>N</label>
            <input v-model.number="chatConfig.n" type="number" class="short" step="1" min="1" />
        </Row>
        <Row>
            <label>Presence Penalty</label>
            <input v-model.number="chatConfig.presencePenalty" type="number" class="short" step="0.1" min="-2" max="2" />
        </Row>
        <Row>
            <label>Frequency Penalty</label>
            <input v-model.number="chatConfig.frequencyPenalty" type="number" class="short" step="0.1" min="-2" max="2" />
        </Row>

        <hr />
        <h3>Status Bar Model</h3>
        <Row>
            <label>Model</label>
            <input v-model="statusBarConfig.model" type="text" />
        </Row>
        <Row>
            <label>Temperature</label>
            <input v-model.number="statusBarConfig.temperature" type="number" class="short" step="0.1" min="0" max="2" />
        </Row>

        <hr />
        <h3>Memory Model</h3>
        <Row>
            <label>Model</label>
            <input v-model="memoryConfig.model" type="text" />
        </Row>
        <Row>
            <label>Temperature</label>
            <input v-model.number="memoryConfig.temperature" type="number" class="short" step="0.1" min="0" max="2" />
        </Row>

        <hr />
        <h3>Output Budget</h3>
        <Row>
            <label>Words</label>
            <input v-model.number="outputBudget" type="number" class="short" step="50" min="50" />
        </Row>

        <hr />
        <h3>CHR Files</h3>

        <div class="chr-section">
            <Row>
                <label>Simulator</label>
                <button @click="simulatorFileInput?.click()">Upload</button>
                <span v-if="simulatorCHR" class="tooltip">{{ simulatorCHR.universeName }}</span>
                <span v-else class="red-tooltip">Not loaded</span>
            </Row>
            <input ref="simulatorFileInput" type="file" accept=".toml,.chr" hidden
                   @change="handleFileUpload($event, uploadSimulatorCHR)" />
        </div>

        <div class="chr-section">
            <Row>
                <label>Player</label>
                <button @click="playerFileInput?.click()">Upload</button>
                <span v-if="playerCHR" class="tooltip">{{ playerCHR.playerName }}</span>
                <span v-else class="red-tooltip">Not loaded</span>
            </Row>
            <input ref="playerFileInput" type="file" accept=".toml,.chr" hidden
                   @change="handleFileUpload($event, uploadPlayerCHR)" />
        </div>

        <div class="chr-section">
            <Row>
                <label>Additional</label>
                <button @click="additionalFileInput?.click()">Add</button>
            </Row>
            <input ref="additionalFileInput" type="file" accept=".toml,.chr" hidden
                   @change="handleFileUpload($event, uploadAdditionalCHR)" />
            <div v-for="(_, index) in additionalCHRs" :key="index" class="chr-item">
                <Row>
                    <span class="tooltip">Additional #{{ index + 1 }}</span>
                    <button @click="removeAdditionalCHR(index)">✗</button>
                </Row>
            </div>
            <span v-if="additionalCHRs.length === 0" class="tooltip">None</span>
        </div>
    </div>
</template>

<style scoped>
.config-panel {
    width: 320px;
    min-width: 280px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    row-gap: 0.5em;
}

.config-panel label {
    min-width: 6em;
    font-size: 0.9em;
}

.config-panel input[type="text"],
.config-panel input[type="password"],
.config-panel input[type="number"] {
    flex: 1;
    min-width: 0;
}

.chr-section {
    display: flex;
    flex-direction: column;
    row-gap: 0.25em;
}

.chr-item {
    padding-left: 1em;
}
</style>
