import { reactive, ref } from 'vue'
import type { SimulatorCHR, PlayerCHR, AdditionalCHR } from './llm/chr_file'
import type { Message, SimulatorMessage, SimulatorMessageVersion } from './llm/chat_message'
import type { LLMConfig, SimulationContext } from './llm/context'
import { buildSimulationRequest, buildStatusBarUpdateRequest, buildMemorySummarizeRequest } from './llm/context'
import { initWebsocket, sendRequest, disconnectWebsocket } from './protocol/ws'
import type { MangekyouSuccessResponse } from './protocol/mangekyou'
import { parseSimulator, parsePlayer, parseAdditional } from './protocol/http'

// ── Connection ──
export const wsUrl = ref('ws://localhost:3000/ws')
export const apiUrl = ref('https://api.openai.com/v1/chat/completions')
export const apiKey = ref('')
export const isConnected = ref(false)

// ── LLM Configs (per-task) ──
function defaultLLMConfig(): LLMConfig {
    return {
        model: 'gpt-4o',
        temperature: 0.7,
        topP: 1,
        n: 1,
        presencePenalty: 0,
        frequencyPenalty: 0
    }
}

export const chatConfig = reactive<LLMConfig>(defaultLLMConfig())
export const statusBarConfig = reactive<LLMConfig>(defaultLLMConfig())
export const memoryConfig = reactive<LLMConfig>(defaultLLMConfig())

// ── CHR Files ──
export const simulatorCHR = ref<SimulatorCHR | undefined>(undefined)
export const playerCHR = ref<PlayerCHR | undefined>(undefined)
export const additionalCHRs = ref<AdditionalCHR[]>([])
export const compressedAdditionalCHR = ref<AdditionalCHR>({})
export const userAdditionalCHR = ref<AdditionalCHR>({})

// ── Simulation Context ──
export const messages = ref<Message[]>([])
export const coarseMemory = ref('')
export const preciseMemory = ref<string[]>([])

// ── UI State ──
export const outputBudget = ref(400)
export const isSending = ref(false)
export const streamingContent = ref('')
export const dialogError = ref('')

// ── Actions ──

export async function connectWs(): Promise<boolean> {
    const success = await initWebsocket(wsUrl.value, () => {
        isConnected.value = false
    })
    isConnected.value = success
    return success
}

export function disconnectWs() {
    disconnectWebsocket()
    isConnected.value = false
}

export async function uploadSimulatorCHR(text: string) {
    // simulatorCHR.value = await parseSimulator(text)
    const result = await parseSimulator(text)
    if (typeof result === 'string') {
        dialogError.value = `Simulator CHR 解析失败:\n${result}`
    } else {
        simulatorCHR.value = result
    }
}

export async function uploadPlayerCHR(text: string) {
    const result = await parsePlayer(text)
    if (typeof result === 'string') {
        dialogError.value = `Player CHR 解析失败:\n${result}`
    } else {
        playerCHR.value = result
    }
}

export async function uploadAdditionalCHR(text: string) {
    const result = await parseAdditional(text)
    if (typeof result === 'string') {
        dialogError.value = `Additional CHR 解析失败:\n${result}`
    } else {
        additionalCHRs.value.push(result)
    }
}

function getSimulationContext(): SimulationContext | undefined {
    if (!simulatorCHR.value || !playerCHR.value) return undefined
    return {
        simulatorCHR: simulatorCHR.value,
        playerCHR: playerCHR.value,
        additionalCHR: additionalCHRs.value,
        compressedAdditionalCHR: compressedAdditionalCHR.value,
        userAdditionalCHR: userAdditionalCHR.value,
        coarseMemory: coarseMemory.value,
        preciseMemory: preciseMemory.value,
        messages: messages.value
    }
}

export async function sendPlayerMessage(playerAction: string) {
    const ctx = getSimulationContext()
    if (!ctx) return

    // Add player message
    messages.value.push({ $k: 'player', content: playerAction })

    isSending.value = true
    streamingContent.value = ''

    try {
        // Step 1: Simulation request (streaming)
        const request = buildSimulationRequest(ctx, chatConfig, outputBudget.value, playerAction)
        const requestBody = { api_url: apiUrl.value, api_key: apiKey.value, openai_request: request }

        let accumulated = ''
        const response = await sendRequest(requestBody, (delta: string) => {
            accumulated += delta
            streamingContent.value = accumulated
        })

        if ('error' in response) {
            messages.value.push({ $k: 'error', content: response.error as string })
            streamingContent.value = ''
            isSending.value = false
            return
        }

        const simulatorOutput = accumulated || (response as MangekyouSuccessResponse).content
        const tokenCount = (response as MangekyouSuccessResponse).token_usage ?? 0

        // Step 2: Status bar update (non-streaming)
        const updatedCtx = getSimulationContext()!
        const statusRequest = buildStatusBarUpdateRequest(updatedCtx, statusBarConfig, playerAction, simulatorOutput)
        const statusRequestBody = { api_url: apiUrl.value, api_key: apiKey.value, openai_request: statusRequest }
        const statusResponse = await sendRequest(statusRequestBody)

        const statusBar = ('content' in statusResponse) ? (statusResponse as MangekyouSuccessResponse).content : ''
        const statusBarTokenCount = ('token_usage' in statusResponse) ? (statusResponse as MangekyouSuccessResponse).token_usage ?? 0 : 0

        // Add simulator message
        const version: SimulatorMessageVersion = {
            content: simulatorOutput,
            summarize: [],
            statusBar,
            tokenCount,
            statusBarTokenCount
        }

        const simMsg: SimulatorMessage = {
            $k: 'simulator',
            versions: [version],
            currentVersionIndex: 0
        }
        messages.value.push(simMsg)
        streamingContent.value = ''
    } finally {
        isSending.value = false
    }
}

/** Find the last player action before a given simulator message index */
function findPlayerActionBefore(simMsgIndex: number): string {
    for (let i = simMsgIndex - 1; i >= 0; i--) {
        const m = messages.value[i]!!
        if (m.$k === 'player') return m.content
    }
    return ''
}

/** Regenerate: add a new version to the last simulator message */
export async function regenerateSimulatorMessage() {
    const ctx = getSimulationContext()
    if (!ctx) return

    const lastSimIdx = messages.value.findLastIndex(m => m.$k === 'simulator')
    if (lastSimIdx < 0) return

    const playerAction = findPlayerActionBefore(lastSimIdx)

    isSending.value = true
    streamingContent.value = ''

    try {
        const request = buildSimulationRequest(ctx, chatConfig, outputBudget.value, playerAction)
        const requestBody = { api_url: apiUrl.value, api_key: apiKey.value, openai_request: request }

        let accumulated = ''
        const response = await sendRequest(requestBody, (delta: string) => {
            accumulated += delta
            streamingContent.value = accumulated
        })

        if ('error' in response) {
            messages.value.push({ $k: 'error', content: response.error as string })
            streamingContent.value = ''
            isSending.value = false
            return
        }

        const simulatorOutput = accumulated || (response as MangekyouSuccessResponse).content
        const tokenCount = (response as MangekyouSuccessResponse).token_usage ?? 0

        // Status bar for the new version
        const updatedCtx = getSimulationContext()!
        const statusRequest = buildStatusBarUpdateRequest(updatedCtx, statusBarConfig, playerAction, simulatorOutput)
        const statusRequestBody = { api_url: apiUrl.value, api_key: apiKey.value, openai_request: statusRequest }
        const statusResponse = await sendRequest(statusRequestBody)

        const statusBar = ('content' in statusResponse) ? (statusResponse as MangekyouSuccessResponse).content : ''
        const statusBarTokenCount2 = ('token_usage' in statusResponse) ? (statusResponse as MangekyouSuccessResponse).token_usage ?? 0 : 0

        const version: SimulatorMessageVersion = {
            content: simulatorOutput,
            summarize: [],
            statusBar,
            tokenCount,
            statusBarTokenCount: statusBarTokenCount2
        }

        const simMsg = messages.value[lastSimIdx] as SimulatorMessage
        simMsg.versions.push(version)
        simMsg.currentVersionIndex = simMsg.versions.length - 1
        streamingContent.value = ''
    } finally {
        isSending.value = false
    }
}

/** Regenerate only the status bar for the current version of the last simulator message */
export async function regenerateStatusBar() {
    const ctx = getSimulationContext()
    if (!ctx) return

    const lastSimIdx = messages.value.findLastIndex(m => m.$k === 'simulator')
    if (lastSimIdx < 0) return

    const simMsg = messages.value[lastSimIdx] as SimulatorMessage
    const currentVersion = simMsg.versions[simMsg.currentVersionIndex]!!
    const playerAction = findPlayerActionBefore(lastSimIdx)

    isSending.value = true

    try {
        const statusRequest = buildStatusBarUpdateRequest(ctx, statusBarConfig, playerAction, currentVersion.content)
        const statusRequestBody = { api_url: apiUrl.value, api_key: apiKey.value, openai_request: statusRequest }
        const statusResponse = await sendRequest(statusRequestBody)

        if ('content' in statusResponse) {
            currentVersion.statusBar = (statusResponse as MangekyouSuccessResponse).content
            currentVersion.statusBarTokenCount = (statusResponse as MangekyouSuccessResponse).token_usage ?? 0
        }
    } finally {
        isSending.value = false
    }
}
