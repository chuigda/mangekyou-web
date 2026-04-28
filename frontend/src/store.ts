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

// ── Per-task API overrides (空字符串表示使用默认主服务商) ──
export const statusBarApiUrl = ref('')
export const statusBarApiKey = ref('')
export const memoryApiUrl = ref('')
export const memoryApiKey = ref('')

function resolveApi(overrideUrl: string, overrideKey: string): { url: string; key: string } {
    return {
        url: overrideUrl.trim() ? overrideUrl : apiUrl.value,
        key: overrideKey.trim() ? overrideKey : apiKey.value,
    }
}

// ── LLM Configs (per-task) ──
function defaultLLMConfig(): LLMConfig {
    return {
        model: 'claude-opus-4-6',
        temperature: 0.5,
        topP: 1,
        n: 1,
        presencePenalty: 0,
        frequencyPenalty: 0
    }
}

function defaultLightWeightLLMConfig(): LLMConfig {
    return {
        model: 'gemini-3.1-flash-lite-preview',
        temperature: 0.05,
        topP: 1,
        n: 1,
        presencePenalty: 0,
        frequencyPenalty: 0
    }
}

export const chatConfig = reactive<LLMConfig>(defaultLLMConfig())
export const statusBarConfig = reactive<LLMConfig>(defaultLightWeightLLMConfig())
export const memoryConfig = reactive<LLMConfig>(defaultLightWeightLLMConfig())

// ── CHR Files ──
export const simulatorCHR = ref<SimulatorCHR | undefined>(undefined)
export const playerCHR = ref<PlayerCHR | undefined>(undefined)
export const additionalCHRs = ref<AdditionalCHR[]>([])
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
        .map(m => (m as SimulatorMessage).summarize)
        .filter(s => s)
)

// ── UI State ──
export const outputBudget = ref(1024)
export const preciseMemoryLimit = ref(20)
export const compressPerTime = ref(5)
export const inlineMessageLimit = ref(5)
export const isSending = ref(false)
export const streamingContent = ref('')
export const dialogError = ref('')

export type WorkStatus =
    | { $k: 'idle' }
    | { $k: 'waiting' }
    | { $k: 'streaming'; chars: number; ttft: number; tps: number }
    | { $k: 'status-bar' }
    | { $k: 'compressing' }
    | { $k: 'error-main' }
    | { $k: 'error-status-bar' }
    | { $k: 'error-compress' }

export const workStatus = ref<WorkStatus>({ $k: 'idle' })

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
        if (messages.value.length === 0 && result.prologue) {
            messages.value.push({
                $k: 'simulator',
                content: result.prologue,
                summarize: '',
                statusBar: '',
                coarseMemory: '',
                activePreciseMemory: 0,
                promptTokens: 0,
                completionTokens: 0,
            })
        }
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

function splitSimulatorOutput(raw: string): { content: string; summarize: string } {
    const parts = raw.split('------SPLIT------')
    if (parts.length >= 2) {
        return { content: parts[0]!!.trim(), summarize: parts.slice(1).join('').trim() }
    }
    return { content: raw, summarize: '' }
}

function getSimulationContext(): SimulationContext | undefined {
    if (!simulatorCHR.value || !playerCHR.value) return undefined

    return {
        simulatorCHR: simulatorCHR.value,
        playerCHR: playerCHR.value,
        additionalCHR: additionalCHRs.value,
        userAdditionalCHR: userAdditionalCHR.value,
        messages: messages.value
    }
}

export async function sendPlayerMessage(playerAction: string) {
    const ctx = getSimulationContext()
    if (!ctx) return

    messages.value = messages.value.filter(m => m.$k !== 'error')

    isSending.value = true
    streamingContent.value = ''
    workStatus.value = { $k: 'waiting' }

    try {
        const lastSimIdx = messages.value.findLastIndex(m => m.$k === 'simulator')
        const lastSimMessage = lastSimIdx >= 0 ? messages.value[lastSimIdx]!! as SimulatorMessage : undefined

        // Step 1: Simulation request (streaming)
        const request = buildSimulationRequest(ctx, chatConfig, outputBudget.value, playerAction, inlineMessageLimit.value)
        const requestBody = { api_url: apiUrl.value, api_key: apiKey.value, openai_request: request }

        // Add player message
        messages.value.push({ $k: 'player', content: playerAction })

        let accumulated = ''
        const streamStart = Date.now()
        let firstTokenTime = 0
        let chunkCount = 0
        const response = await sendRequest(requestBody, (delta: string) => {
            chunkCount++
            if (chunkCount === 1) firstTokenTime = Date.now()
            accumulated += delta
            streamingContent.value = accumulated
            const ttft = firstTokenTime ? firstTokenTime - streamStart : 0
            const elapsed = (Date.now() - firstTokenTime) / 1000
            const tps = elapsed > 0 ? (chunkCount - 1) / elapsed : 0
            workStatus.value = { $k: 'streaming', chars: accumulated.length, ttft, tps }
        })

        if ('error' in response) {
            messages.value.push({ $k: 'error', content: response.error as string })
            streamingContent.value = ''
            isSending.value = false
            workStatus.value = { $k: 'error-main' }
            return
        }

        const rawOutput = accumulated || (response as MangekyouSuccessResponse).content
        const promptTokens = (response as MangekyouSuccessResponse).prompt_tokens ?? 0
        const completionTokens = (response as MangekyouSuccessResponse).completion_tokens ?? 0
        const { content: simulatorContent, summarize } = splitSimulatorOutput(rawOutput)

        // Step 2: Status bar update (non-streaming)
        workStatus.value = { $k: 'status-bar' }
        let statusBar = ctx.messages.findLast(m => m.$k === 'simulator')?.statusBar ?? ''
        const statusRequest = buildStatusBarUpdateRequest(ctx, statusBarConfig, playerAction, simulatorContent)
        const statusApi = resolveApi(statusBarApiUrl.value, statusBarApiKey.value)
        const statusRequestBody = { api_url: statusApi.url, api_key: statusApi.key, openai_request: statusRequest }
        const statusResponse = await sendRequest(statusRequestBody)

        if ('content' in statusResponse) {
            statusBar = (statusResponse as MangekyouSuccessResponse).content
        } else {
            workStatus.value = { $k: 'error-status-bar' }
            isSending.value = false
            // status bar failed to update, but do not cancel other operations
        }

        // Add simulator message immediately with empty status bar
        const simMsg: SimulatorMessage = {
            $k: 'simulator',
            content: simulatorContent,
            summarize,
            statusBar,
            coarseMemory: coarseMemory.value,
            activePreciseMemory: (lastSimMessage?.activePreciseMemory ?? 0) + (summarize ? 1 : 0),
            promptTokens,
            completionTokens,
        }
        messages.value.push(simMsg)
        streamingContent.value = ''

        // Compress precise memory if over limit
        workStatus.value = { $k: 'compressing' }
        const compressOk = await maybeCompressPreciseMemory()
        if (!compressOk) {
            workStatus.value = { $k: 'error-compress' }
            isSending.value = false
            return
        }
    } finally {
        isSending.value = false
        if (workStatus.value.$k !== 'error-main'
            && workStatus.value.$k !== 'error-status-bar'
            && workStatus.value.$k !== 'error-compress') {
            workStatus.value = { $k: 'idle' }
        }
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

/** Compress oldest active precise memory lines into coarse memory when over limit.
 *  Returns false if compression was needed but failed. */
async function maybeCompressPreciseMemory(): Promise<boolean> {
    const lastSim = messages.value.findLast(m => m.$k === 'simulator') as SimulatorMessage | undefined
    if (!lastSim) return true

    const allLines = preciseMemory.value
    const activeCount = lastSim.activePreciseMemory ?? allLines.length
    const activeLines = allLines.slice(-activeCount)
    if (activeLines.length <= preciseMemoryLimit.value) return true

    const ctx = getSimulationContext()
    if (!ctx) return true

    // Build a context with only the lines to compress
    const request = buildMemorySummarizeRequest(ctx, memoryConfig, compressPerTime.value)
    const memApi = resolveApi(memoryApiUrl.value, memoryApiKey.value)
    const requestBody = { api_url: memApi.url, api_key: memApi.key, openai_request: request }
    const response = await sendRequest(requestBody)

    if ('content' in response) {
        const newCoarse = (response as MangekyouSuccessResponse).content
        lastSim.coarseMemory = newCoarse

        // Lazily "remove" compressed lines by shrinking activePreciseMemory
        const compressed = Math.min(compressPerTime.value, activeLines.length)
        lastSim.activePreciseMemory = activeCount - compressed
        return true
    }
    return false
}

export function deleteMessage(index: number) {
    if (index >= 0 && index < messages.value.length) {
        messages.value.splice(index, 1)
    }
}

/** Regenerate: remove the last simulator message and resend */
export async function regenerateSimulatorMessage() {
    messages.value = messages.value.filter(m => m.$k !== 'error')

    const last0 = messages.value.at(-1)
    if (last0 && last0.$k === 'player') {
        // If the last message is a player message, just remove and resend it to trigger the same simulator response again
        messages.value.pop()
        await sendPlayerMessage(last0.content)
        return
    }

    const lastSimIdx = messages.value.findLastIndex(m => m.$k === 'simulator')
    if (lastSimIdx < 0) return

    const playerAction = findPlayerActionBefore(lastSimIdx)

    // Remove everything from the last simulator message onward (including trailing errors)
    messages.value.splice(lastSimIdx)

    // Remove the player message that triggered it only if it's the last message,
    // since sendPlayerMessage will re-add it
    const last = messages.value.at(-1)
    if (last && last.$k === 'player') {
        messages.value.pop()
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
    inlineMessageLimit?: number
    simulatorCHR: SimulatorCHR | undefined
    playerCHR: PlayerCHR | undefined
    additionalCHRs: AdditionalCHR[]
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
        inlineMessageLimit: inlineMessageLimit.value,
        simulatorCHR: simulatorCHR.value,
        playerCHR: playerCHR.value,
        additionalCHRs: additionalCHRs.value,
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
    if (data.inlineMessageLimit !== undefined) inlineMessageLimit.value = data.inlineMessageLimit
    simulatorCHR.value = data.simulatorCHR
    playerCHR.value = data.playerCHR
    additionalCHRs.value = data.additionalCHRs ?? []
    userAdditionalCHR.value = data.userAdditionalCHR ?? {}
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
    inlineMessageLimit?: number
    statusBarApiUrl?: string
    statusBarApiKey?: string
    memoryApiUrl?: string
    memoryApiKey?: string
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
        inlineMessageLimit: inlineMessageLimit.value,
        statusBarApiUrl: statusBarApiUrl.value,
        statusBarApiKey: statusBarApiKey.value,
        memoryApiUrl: memoryApiUrl.value,
        memoryApiKey: memoryApiKey.value,
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
    if (data.inlineMessageLimit !== undefined) inlineMessageLimit.value = data.inlineMessageLimit
    statusBarApiUrl.value = data.statusBarApiUrl ?? ''
    statusBarApiKey.value = data.statusBarApiKey ?? ''
    memoryApiUrl.value = data.memoryApiUrl ?? ''
    memoryApiKey.value = data.memoryApiKey ?? ''
}

/** Regenerate only the status bar for the current version of the last simulator message */
export async function regenerateStatusBar() {
    const ctx = getSimulationContext()
    if (!ctx) return

    const lastPlayerIdx = messages.value.findLastIndex(m => m.$k === 'player')
    if (lastPlayerIdx < 0 || lastPlayerIdx === messages.value.length - 1) {
        // No player message or last message is player message, use empty action
        return
    }
    const playerAction = messages.value[lastPlayerIdx]!!.content
    const simMsg = messages.value[lastPlayerIdx + 1]!! as SimulatorMessage

    const slicedMessages = messages.value.slice(0, lastPlayerIdx + 1)
    const forkedCtx = {
        ...ctx,
        messages: slicedMessages,
    }

    isSending.value = true

    try {
        workStatus.value = { $k: 'status-bar' }

        const statusRequest = buildStatusBarUpdateRequest(forkedCtx, statusBarConfig, playerAction, simMsg.content)
        const statusApi = resolveApi(statusBarApiUrl.value, statusBarApiKey.value)
        const statusRequestBody = { api_url: statusApi.url, api_key: statusApi.key, openai_request: statusRequest }
        const statusResponse = await sendRequest(statusRequestBody)

        if ('content' in statusResponse) {
            simMsg.statusBar = (statusResponse as MangekyouSuccessResponse).content
            workStatus.value = { $k: 'idle' }
        } else {
            workStatus.value = { $k: 'error-status-bar' }
        }
    } finally {
        isSending.value = false
    }
}
