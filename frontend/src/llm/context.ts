import type { SimulatorCHR, PlayerCHR, AdditionalCHR } from './chr_file'
import type { Message } from './chat_message'
import type { ChatCompletionRequest } from '../protocol/openai'
import {
    buildMemorySummarizerSystemPrompt,
    buildMemorySummarizerUserPrompt,
    buildSimulatorSystemPrompt,
    buildSimulatorUserPrompt,
    buildStatusBarUpdaterSystemPrompt,
    buildStatusBarUpdaterUserPrompt
} from './prompt_builder'
import { isDefined } from '../util'

export interface SimulationContext {
    simulatorCHR: SimulatorCHR
    playerCHR: PlayerCHR
    additionalCHR: AdditionalCHR[]
    compressedAdditionalCHR: AdditionalCHR
    userAdditionalCHR: AdditionalCHR

    coarseMemory: string
    preciseMemory: string[]
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
    const lastSimulatorMessageVersion = isDefined(lastSimulatorMessage)
        ? lastSimulatorMessage.versions[lastSimulatorMessage.currentVersionIndex]
        : undefined
    const statusBar = lastSimulatorMessageVersion?.statusBar ?? ''

    const userPrompt = buildSimulatorUserPrompt(
        ctx.simulatorCHR,
        ctx.playerCHR,
        ctx.coarseMemory,
        ctx.preciseMemory.join('\n'),
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
    const lastSimulatorMessageVersion = isDefined(lastSimulatorMessage)
        ? lastSimulatorMessage.versions[lastSimulatorMessage.currentVersionIndex]
        : undefined
    const prevStatusBar = lastSimulatorMessageVersion?.statusBar ?? ''
    const lastSimulatorOutput = lastSimulatorMessageVersion?.content ?? ''

    const userPrompt = buildStatusBarUpdaterUserPrompt(
        ctx.coarseMemory,
        ctx.preciseMemory.join('\n'),
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
    llmConfig: LLMConfig
): ChatCompletionRequest {
    const systemPrompt = buildMemorySummarizerSystemPrompt(
        ctx.simulatorCHR,
        [ctx.compressedAdditionalCHR, ctx.userAdditionalCHR]
    )

    const userPrompt = buildMemorySummarizerUserPrompt(
        ctx.coarseMemory,
        ctx.preciseMemory.join('\n')
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
