import type { SimulatorCHR, PlayerCHR, AdditionalCHR } from './chr_file'
import type { Message, SimulatorMessage } from './chat_message'
import type { ChatCompletionRequest } from '../protocol/openai'
import {
    buildMemorySummarizerSystemPrompt,
    buildMemorySummarizerUserPrompt,
    buildSimulatorSystemPrompt,
    buildSimulatorUserPrompt,
    buildStatusBarUpdaterSystemPrompt,
    buildStatusBarUpdaterUserPrompt
} from './prompt_builder'

export interface SimulationContext {
    simulatorCHR: SimulatorCHR
    playerCHR: PlayerCHR
    additionalCHR: AdditionalCHR[]
    compressedAdditionalCHR: AdditionalCHR
    userAdditionalCHR: AdditionalCHR

    messages: Message[]
}

export interface LLMConfig {
    model: string
    temperature: number
    topP: number
    n: number
    presencePenalty: number
    frequencyPenalty: number
}

export function buildSimulationRequest(
    ctx: SimulationContext,
    llmConfig: LLMConfig,
    outputBudget: number,
    playerAction: string
): ChatCompletionRequest {
    // assume 2 words = 3 tokens, and add 1536 tokens for thinking budget
    const maxTokens = Math.ceil(outputBudget * 1.5 + 1536)

    const systemPrompt = buildSimulatorSystemPrompt(
        ctx.simulatorCHR,
        ctx.playerCHR,
        [ctx.compressedAdditionalCHR, ctx.userAdditionalCHR],
        outputBudget
    )

    const lastSimulatorMessage = ctx.messages.findLast(m => m.$k === 'simulator')
    const statusBar = lastSimulatorMessage?.$k === 'simulator' ? lastSimulatorMessage.statusBar : ''

    const userPrompt = buildSimulatorUserPrompt(
        ctx.simulatorCHR,
        ctx.playerCHR,
        lastSimulatorMessage?.coarseMemory ?? '',
        computePreciseMemoryInUse(ctx.messages).join('\n'),
        ctx.messages,
        statusBar,
        playerAction
    )

    return {
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        top_p: llmConfig.topP,
        n: llmConfig.n,
        presence_penalty: llmConfig.presencePenalty,
        frequency_penalty: llmConfig.frequencyPenalty,

        max_completion_tokens: maxTokens,

        stream: true,
        stop: [],

        messages: [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: userPrompt
            }
        ]
    }
}

export function buildStatusBarUpdateRequest(
    ctx: SimulationContext,
    llmConfig: LLMConfig,
    playerAction: string,
    simulatorOutput: string
): ChatCompletionRequest {
    const systemPrompt = buildStatusBarUpdaterSystemPrompt(
        ctx.simulatorCHR,
        ctx.playerCHR,
        ctx.additionalCHR
    )

    const lastSimulatorMessage = ctx.messages.findLast(m => m.$k === 'simulator')
    const prevStatusBar = lastSimulatorMessage?.$k === 'simulator' ? lastSimulatorMessage.statusBar : ''
    const lastSimulatorOutput = lastSimulatorMessage?.$k === 'simulator' ? lastSimulatorMessage.content : ''

    const userPrompt = buildStatusBarUpdaterUserPrompt(
        lastSimulatorMessage?.coarseMemory ?? '',
        computePreciseMemoryInUse(ctx.messages).join('\n'),
        lastSimulatorOutput,
        prevStatusBar,
        playerAction,
        simulatorOutput
    )

    return {
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        top_p: llmConfig.topP,
        n: 1,
        presence_penalty: llmConfig.presencePenalty,
        frequency_penalty: llmConfig.frequencyPenalty,

        max_completion_tokens: 4096,
        stream: false,
        stop: [],

        messages: [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: userPrompt
            }
        ]
    }
}

export function buildMemorySummarizeRequest(
    ctx: SimulationContext,
    llmConfig: LLMConfig,
    compressCount: number
): ChatCompletionRequest {
    const systemPrompt = buildMemorySummarizerSystemPrompt(
        ctx.simulatorCHR,
        [ctx.compressedAdditionalCHR, ctx.userAdditionalCHR]
    )

    const lastSimulatorMessage = ctx.messages.findLast(m => m.$k === 'simulator') as SimulatorMessage | undefined

    const userPrompt = buildMemorySummarizerUserPrompt(
        lastSimulatorMessage?.coarseMemory ?? '',
        computePreciseMemoryInUse(ctx.messages).slice(0, compressCount).join('\n')
    )

    return {
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        top_p: llmConfig.topP,
        n: 1,
        presence_penalty: llmConfig.presencePenalty,
        frequency_penalty: llmConfig.frequencyPenalty,

        max_completion_tokens: 4096,
        stream: false,
        stop: [],

        messages: [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: userPrompt
            }
        ]
    }
}

export function computePreciseMemoryInUse(messages: Message[]): string[] {
    const lastSimulatorMessage = messages.findLast(m => m.$k === 'simulator') as SimulatorMessage
    if (!lastSimulatorMessage) {
        return []
    }

    const preciseMemoryInUse = []
    let restCount = lastSimulatorMessage.activePreciseMemory
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]
        if (msg?.$k === 'simulator') {
            const simMsg = msg as SimulatorMessage
            if (simMsg.summarize) {
                restCount -= 1
                preciseMemoryInUse.push(simMsg.summarize)
            }
            if (restCount <= 0) {
                break
            }
        }
    }

    return preciseMemoryInUse.reverse()
}
