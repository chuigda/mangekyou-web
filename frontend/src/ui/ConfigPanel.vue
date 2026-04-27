<script setup lang="ts">
import { ref } from 'vue'
import {
    wsUrl, apiUrl, apiKey, isConnected,
    chatConfig, statusBarConfig, memoryConfig, outputBudget,
    simulatorCHR, playerCHR, additionalCHRs,
    connectWs, disconnectWs,
    uploadSimulatorCHR, uploadPlayerCHR, uploadAdditionalCHR,
    saveContext, loadContext,
    saveApiConfig, loadApiConfig
} from '../store'
import Row from '../component/Row.vue'

const simulatorFileInput = ref<HTMLInputElement>()
const playerFileInput = ref<HTMLInputElement>()
const additionalFileInput = ref<HTMLInputElement>()
const contextFileInput = ref<HTMLInputElement>()
const apiConfigFileInput = ref<HTMLInputElement>()

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

async function handleLoadContext(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    loadContext(text)
    input.value = ''
}

async function handleLoadApiConfig(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    loadApiConfig(text)
    input.value = ''
}
</script>

<template>
    <div class="config-panel panel">
        <h3>上下文</h3>
        <Row>
            <button @click="saveContext">保存</button>
            <button @click="contextFileInput?.click()">加载</button>
            <button @click="saveApiConfig">保存配置</button>
            <button @click="apiConfigFileInput?.click()">加载配置</button>
        </Row>
        <input ref="contextFileInput" type="file" accept=".json" hidden
               @change="handleLoadContext" />
        <input ref="apiConfigFileInput" type="file" accept=".json" hidden
               @change="handleLoadApiConfig" />
        <hr />

        <h3>连接</h3>
        <Row>
            <label>WS 地址</label>
            <input v-model="wsUrl" type="text" placeholder="ws://localhost:3000/ws" />
        </Row>
        <Row>
            <button v-if="!isConnected" @click="connectWs">连接</button>
            <button v-else @click="disconnectWs">断开</button>
            <span :class="isConnected ? 'tooltip' : 'red-tooltip'">
                {{ isConnected ? '已连接' : '未连接' }}
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
        <h3>聊天模型</h3>
        <Row>
            <label>模型</label>
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
        <h3>状态栏模型</h3>
        <Row>
            <label>模型</label>
            <input v-model="statusBarConfig.model" type="text" />
        </Row>
        <Row>
            <label>温度</label>
            <input v-model.number="statusBarConfig.temperature" type="number" class="short" step="0.1" min="0" max="2" />
        </Row>

        <hr />
        <h3>记忆模型</h3>
        <Row>
            <label>模型</label>
            <input v-model="memoryConfig.model" type="text" />
        </Row>
        <Row>
            <label>温度</label>
            <input v-model.number="memoryConfig.temperature" type="number" class="short" step="0.1" min="0" max="2" />
        </Row>

        <hr />
        <h3>输出预算</h3>
        <Row>
            <label>字数</label>
            <input v-model.number="outputBudget" type="number" class="short" step="50" min="50" />
        </Row>

        <hr />
        <h3>CHR 文件</h3>

        <div class="chr-section">
            <Row>
                <label>模拟器</label>
                <button @click="simulatorFileInput?.click()">上传</button>
                <span v-if="simulatorCHR" class="tooltip">{{ simulatorCHR.universeName }}</span>
                <span v-else class="red-tooltip">未加载</span>
            </Row>
            <input ref="simulatorFileInput" type="file" accept=".toml,.chr" hidden
                   @change="handleFileUpload($event, uploadSimulatorCHR)" />
        </div>

        <div class="chr-section">
            <Row>
                <label>玩家</label>
                <button @click="playerFileInput?.click()">上传</button>
                <span v-if="playerCHR" class="tooltip">{{ playerCHR.playerName }}</span>
                <span v-else class="red-tooltip">未加载</span>
            </Row>
            <input ref="playerFileInput" type="file" accept=".toml,.chr" hidden
                   @change="handleFileUpload($event, uploadPlayerCHR)" />
        </div>

        <div class="chr-section">
            <Row>
                <label>附加</label>
                <button @click="additionalFileInput?.click()">添加</button>
            </Row>
            <input ref="additionalFileInput" type="file" accept=".toml,.chr" hidden
                   @change="handleFileUpload($event, uploadAdditionalCHR)" />
            <div v-for="(_, index) in additionalCHRs" :key="index" class="chr-item">
                <Row>
                    <span class="tooltip">附加 #{{ index + 1 }}</span>
                    <button @click="removeAdditionalCHR(index)">✗</button>
                </Row>
            </div>
            <span v-if="additionalCHRs.length === 0" class="tooltip">无</span>
        </div>
    </div>
</template>

<style scoped>
.config-panel {
    width: 360px;
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
