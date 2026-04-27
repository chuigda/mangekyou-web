import { reactive, ref, computed } from 'vue'
import type { SimulatorCHR, PlayerCHR, AdditionalCHR } from './llm/chr_file'
import type { Message, SimulatorMessage } from './llm/chat_message'
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
export const coarseMemory = computed({
    get() {
        const last = messages.value.findLast(m => m.$k === 'simulator')
        return (last && last.$k === 'simulator') ? last.coarseMemory : ''
    },
    set(value: string) {
        const last = messages.value.findLast(m => m.$k === 'simulator')
        if (last && last.$k === 'simulator') last.coarseMemory = value
    }
})
export const preciseMemory = computed(() =>
    messages.value
        .filter(m => m.$k === 'simulator')
        .flatMap(m => (m as SimulatorMessage).summarize)
)

// ── UI State ──
export const outputBudget = ref(400)
export const preciseMemoryLimit = ref(10)
export const compressPerTime = ref(5)
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

function splitSimulatorOutput(raw: string): { content: string; summarize: string[] } {
    const parts = raw.split('------SPLIT------')
    if (parts.length >= 2) {
        const lines = parts.slice(1).join('').trim().split('\n').filter(l => l.trim())
        return { content: parts[0]!!.trim(), summarize: lines }
    }
    return { content: raw, summarize: [] }
}

function getSimulationContext(): SimulationContext | undefined {
    if (!simulatorCHR.value || !playerCHR.value) return undefined

    // Use activePreciseMemory from last simulator message to limit precise memory
    const lastSim = messages.value.findLast(m => m.$k === 'simulator') as SimulatorMessage | undefined
    const activeCount = lastSim?.activePreciseMemory ?? preciseMemory.value.length
    const activePrecise = preciseMemory.value.slice(-activeCount)

    return {
        simulatorCHR: simulatorCHR.value,
        playerCHR: playerCHR.value,
        additionalCHR: additionalCHRs.value,
        compressedAdditionalCHR: compressedAdditionalCHR.value,
        userAdditionalCHR: userAdditionalCHR.value,
        coarseMemory: coarseMemory.value,
        preciseMemory: activePrecise,
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

        const rawOutput = accumulated || (response as MangekyouSuccessResponse).content
        const promptTokens = (response as MangekyouSuccessResponse).prompt_tokens ?? 0
        const completionTokens = (response as MangekyouSuccessResponse).completion_tokens ?? 0
        const { content: simulatorContent, summarize } = splitSimulatorOutput(rawOutput)

        // Step 2: Status bar update (non-streaming)
        const updatedCtx = getSimulationContext()!
        const statusRequest = buildStatusBarUpdateRequest(updatedCtx, statusBarConfig, playerAction, simulatorContent)
        const statusRequestBody = { api_url: apiUrl.value, api_key: apiKey.value, openai_request: statusRequest }
        const statusResponse = await sendRequest(statusRequestBody)

        const statusBar = ('content' in statusResponse) ? (statusResponse as MangekyouSuccessResponse).content : ''

        // Add simulator message
        const simMsg: SimulatorMessage = {
            $k: 'simulator',
            content: simulatorContent,
            summarize,
            statusBar,
            coarseMemory: coarseMemory.value,
            activePreciseMemory: preciseMemory.value.length,
            promptTokens,
            completionTokens,
        }
        messages.value.push(simMsg)

        // Compress precise memory if over limit
        await maybeCompressPreciseMemory()

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

/** Compress oldest precise memory lines into coarse memory when over limit */
async function maybeCompressPreciseMemory() {
    const allLines = preciseMemory.value
    if (allLines.length <= preciseMemoryLimit.value) return

    const ctx = getSimulationContext()
    if (!ctx) return

    const linesToCompress = allLines.slice(0, compressPerTime.value)

    // Build a context with only the lines to compress
    const compressCtx: SimulationContext = {
        ...ctx,
        coarseMemory: coarseMemory.value,
        preciseMemory: linesToCompress,
    }
    const request = buildMemorySummarizeRequest(compressCtx, memoryConfig)
    const requestBody = { api_url: apiUrl.value, api_key: apiKey.value, openai_request: request }
    const response = await sendRequest(requestBody)

    if ('content' in response) {
        const newCoarse = (response as MangekyouSuccessResponse).content
        // Update coarseMemory on the last simulator message
        const lastSim = messages.value.findLast(m => m.$k === 'simulator') as SimulatorMessage | undefined
        if (lastSim) lastSim.coarseMemory = newCoarse

        // Remove compressed lines from their source messages
        let remaining = compressPerTime.value
        for (const msg of messages.value) {
            if (remaining <= 0) break
            if (msg.$k !== 'simulator') continue
            const sim = msg as SimulatorMessage
            const take = Math.min(sim.summarize.length, remaining)
            if (take > 0) {
                sim.summarize.splice(0, take)
                remaining -= take
            }
        }
    }
}

/** Regenerate: remove the last simulator message and resend */
export async function regenerateSimulatorMessage() {
    const lastSimIdx = messages.value.findLastIndex(m => m.$k === 'simulator')
    if (lastSimIdx < 0) return

    const playerAction = findPlayerActionBefore(lastSimIdx)

    // Remove everything from the last simulator message onward (including trailing errors)
    messages.value.splice(lastSimIdx)

    // Also remove the player message that triggered it, since sendPlayerMessage will re-add it
    const lastPlayerIdx = messages.value.findLastIndex(m => m.$k === 'player')
    if (lastPlayerIdx >= 0) {
        messages.value.splice(lastPlayerIdx, 1)
    }

    await sendPlayerMessage(playerAction)
}

// ── Save / Load Context ──

interface SavedContext {
    apiUrl: string
    apiKey: string
    wsUrl: string
    chatConfig: LLMConfig
    statusBarConfig: LLMConfig
    memoryConfig: LLMConfig
    outputBudget: number
    simulatorCHR: SimulatorCHR | undefined
    playerCHR: PlayerCHR | undefined
    additionalCHRs: AdditionalCHR[]
    compressedAdditionalCHR: AdditionalCHR
    userAdditionalCHR: AdditionalCHR
    messages: Message[]
}

export function saveContext() {
    const data: SavedContext = {
        apiUrl: apiUrl.value,
        apiKey: apiKey.value,
        wsUrl: wsUrl.value,
        chatConfig: { ...chatConfig },
        statusBarConfig: { ...statusBarConfig },
        memoryConfig: { ...memoryConfig },
        outputBudget: outputBudget.value,
        simulatorCHR: simulatorCHR.value,
        playerCHR: playerCHR.value,
        additionalCHRs: additionalCHRs.value,
        compressedAdditionalCHR: compressedAdditionalCHR.value,
        userAdditionalCHR: userAdditionalCHR.value,
        messages: messages.value,
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mangekyou-context-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
}

export function loadContext(json: string) {
    const data: SavedContext = JSON.parse(json)

    apiUrl.value = data.apiUrl
    apiKey.value = data.apiKey
    wsUrl.value = data.wsUrl

    Object.assign(chatConfig, data.chatConfig)
    Object.assign(statusBarConfig, data.statusBarConfig)
    Object.assign(memoryConfig, data.memoryConfig)

    outputBudget.value = data.outputBudget
    simulatorCHR.value = data.simulatorCHR
    playerCHR.value = data.playerCHR
    additionalCHRs.value = data.additionalCHRs
    compressedAdditionalCHR.value = data.compressedAdditionalCHR
    userAdditionalCHR.value = data.userAdditionalCHR
    messages.value = data.messages
}

// ── Save / Load API & Model Config ──

interface SavedApiConfig {
    apiUrl: string
    apiKey: string
    wsUrl: string
    chatConfig: LLMConfig
    statusBarConfig: LLMConfig
    memoryConfig: LLMConfig
    outputBudget: number
}

export function saveApiConfig() {
    const data: SavedApiConfig = {
        apiUrl: apiUrl.value,
        apiKey: apiKey.value,
        wsUrl: wsUrl.value,
        chatConfig: { ...chatConfig },
        statusBarConfig: { ...statusBarConfig },
        memoryConfig: { ...memoryConfig },
        outputBudget: outputBudget.value,
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mangekyou-api-config-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
}

export function loadApiConfig(json: string) {
    const data: SavedApiConfig = JSON.parse(json)

    apiUrl.value = data.apiUrl
    apiKey.value = data.apiKey
    wsUrl.value = data.wsUrl

    Object.assign(chatConfig, data.chatConfig)
    Object.assign(statusBarConfig, data.statusBarConfig)
    Object.assign(memoryConfig, data.memoryConfig)

    outputBudget.value = data.outputBudget
}

/** Regenerate only the status bar for the current version of the last simulator message */
export async function regenerateStatusBar() {
    const ctx = getSimulationContext()
    if (!ctx) return

    const lastSimIdx = messages.value.findLastIndex(m => m.$k === 'simulator')
    if (lastSimIdx < 0) return

    const simMsg = messages.value[lastSimIdx] as SimulatorMessage
    const playerAction = findPlayerActionBefore(lastSimIdx)

    isSending.value = true

    try {
        const statusRequest = buildStatusBarUpdateRequest(ctx, statusBarConfig, playerAction, simMsg.content)
        const statusRequestBody = { api_url: apiUrl.value, api_key: apiKey.value, openai_request: statusRequest }
        const statusResponse = await sendRequest(statusRequestBody)

        if ('content' in statusResponse) {
            simMsg.statusBar = (statusResponse as MangekyouSuccessResponse).content
        }
    } finally {
        isSending.value = false
    }
}
