import type { AdditionalCHR, PlayerCHR, SimulatorCHR } from './chr_file'
import type { Message as ChatMessage } from './chat_message'

import { LanguageConfigs } from './lang_config'
import { isBlank, isDefined } from '../util'

import SimulatorSystemPromptTemplate from '../assets/prompts/simulator.xml?raw'
import SimulatorUserPromptInstructionTemplate from '../assets/prompts/simulator-user-instruction.xml?raw'
import StatusBarUpdaterSystemPromptTemplate from '../assets/prompts/status-bar.xml?raw'
import StatusBarUpdaterUserPromptTemplate from '../assets/prompts/status-bar-user.xml?raw'
import MemorySummarizerSystemPromptTemplate from '../assets/prompts/memory.xml?raw'
import MemorySummarizerUserPromptTemplate from '../assets/prompts/memory-user.xml?raw'

export {
    SimulatorSystemPromptTemplate,
    SimulatorUserPromptInstructionTemplate,
    StatusBarUpdaterSystemPromptTemplate,
    StatusBarUpdaterUserPromptTemplate,
    MemorySummarizerSystemPromptTemplate,
    MemorySummarizerUserPromptTemplate
}

export function buildSimulatorSystemPrompt(
    simulatorCHR: SimulatorCHR,
    playerCHR: PlayerCHR,
    additionalCHRs: AdditionalCHR[],
    outputBudget: number
): string {
    const { name: languageName, wordUnit } = LanguageConfigs[simulatorCHR.language] ?? LanguageConfigs.zh_CN
    const lengthIndicator = `${outputBudget} ${wordUnit}`

    let additionalTasks
    let worldSettings
    let characterDatabase
    let additionalDatabaseSections
    let additionalBehaviors
    let additionalProhibitions
    let additionalCommands
    let additionalSections

    if (isDefined(simulatorCHR.simulator)) {
        additionalTasks = simulatorCHR.simulator.tasks
        worldSettings = simulatorCHR.simulator.world
        characterDatabase = simulatorCHR.simulator.characters
        additionalDatabaseSections = simulatorCHR.simulator.database
        additionalBehaviors = simulatorCHR.simulator.behaviors
        additionalProhibitions = simulatorCHR.simulator.prohibitions
        additionalCommands = simulatorCHR.simulator.commands
        additionalSections = simulatorCHR.simulator.sections
    }

    for (const chr of additionalCHRs) {
        if (isDefined(chr.simulator)) {
            additionalTasks = c(additionalTasks, chr.simulator.tasks)
            worldSettings = c(worldSettings, chr.simulator.world)
            characterDatabase = c(characterDatabase, chr.simulator.characters)
            additionalDatabaseSections = c(additionalDatabaseSections, chr.simulator.database)
            additionalBehaviors = c(additionalBehaviors, chr.simulator.behaviors)
            additionalProhibitions = c(additionalProhibitions, chr.simulator.prohibitions)
            additionalCommands = c(additionalCommands, chr.simulator.commands)
            additionalSections = c(additionalSections, chr.simulator.sections)
        }
    }

    return SimulatorSystemPromptTemplate
        .replaceAll('    ', '')
        .replaceAll('{$UNIVERSE_NAME}', simulatorCHR.universeName)
        .replaceAll('{$LANGUAGE_SELECTION}', languageName)
        .replaceAll('{$LENGTH_INDICATOR}', lengthIndicator)
        .replaceAll('{$LITERAL_WORK_NAME}', simulatorCHR.literalWorkName)
        .replaceAll('{$ADDITIONAL_TASKS}\n', sanitize2(additionalTasks))
        .replaceAll('{$ADDITIONAL_COMMANDS}\n', sanitize2(additionalCommands))
        .replaceAll('{$WORLD_SETTINGS}\n', sanitize(worldSettings))
        .replaceAll('{$PLAYER_CHARACTER}\n', sanitize(playerCHR.settings))
        .replaceAll('{$CHARACTER_DATABASE}\n', sanitize(characterDatabase))
        .replaceAll('{$ADDITIONAL_DATABASE_SECTIONS}\n', sanitize(additionalDatabaseSections))
        .replaceAll('{$ADDITIONAL_BEHAVIORS}\n', sanitize2(additionalBehaviors))
        .replaceAll('{$ADDITIONAL_PROHIBITIONS}\n', sanitize2(additionalProhibitions))
        .replaceAll('{$ADDITIONAL_SECTIONS}\n', sanitize(additionalSections))
        .replaceAll('{$PC_NAME}', playerCHR.playerName)
}

export function buildSimulatorUserPrompt(
    simulatorCHR: SimulatorCHR,
    playerCHR: PlayerCHR,
    coarseMemory: string,
    preciseMemory: string,
    messages: ChatMessage[],
    statusBar: string,
    playerAction: string
): string {
    const { name: languageName } = LanguageConfigs[simulatorCHR.language]

    coarseMemory = sanitize(coarseMemory)
    preciseMemory = sanitize(preciseMemory)

    let r = '<input>\n'
    r += `<memory type="coarse" comment="Summary of previous events">\n${coarseMemory}</memory>\n`
    r += `<memory type="precise" comment="Summary of recent events">\n${preciseMemory}</memory>\n`
    r += '\n'

    for (const msg of messages) {
        if (msg.$k === 'player') {
            r += `<${msg.$k}>\n${sanitize(msg.content)}</${msg.$k}>\n`
        } else if (msg.$k === 'simulator') {
            r += `<${msg.$k}>\n${sanitize(msg.content)}</${msg.$k}>\n`
        }
    }
    if (messages.length > 0) {
        r += '\n'
    }

    r += `<status comment="Most up-to-date world state">\n${sanitize(statusBar)}</status>\n`
    r += '\n'

    r += `<player>\n${sanitize(playerAction)}</player>\n`
    r += '\n'

    r += SimulatorUserPromptInstructionTemplate
        .replaceAll('    ', '')
        .replaceAll('{$LANGUAGE_SELECTOR}', languageName)
        .replaceAll('{$PC_NAME}', playerCHR.playerName)

    r += '</input>'

    return r
}

export function buildStatusBarUpdaterSystemPrompt(
    simulatorCHR: SimulatorCHR,
    playerCHR: PlayerCHR,
    additionalCHRs: AdditionalCHR[]
): string {
    const { name: languageName } = LanguageConfigs[simulatorCHR.language]

    let statusBarFormat = simulatorCHR.statusBar.format
    let statusBarUpdatingRule = simulatorCHR.statusBar.rule
    let additionalSections = simulatorCHR.statusBar.sections

    let worldSettings
    let characterDatabase
    let additionalDatabaseSections

    if (isDefined(simulatorCHR.simulator)) {
        worldSettings = simulatorCHR.simulator.world
        characterDatabase = simulatorCHR.simulator.characters
        additionalDatabaseSections = simulatorCHR.simulator.database
    }

    console.info(additionalCHRs)

    for (const chr of additionalCHRs) {
        console.info(chr.statusBar)
        console.info(isDefined(chr.statusBar))

        if (isDefined(chr.statusBar)) {
            if (chr.statusBar.format) {
                statusBarFormat = c(statusBarFormat, chr.statusBar.format) ?? statusBarFormat
            }
            statusBarUpdatingRule = c(statusBarUpdatingRule, chr.statusBar.rule)
            additionalSections = c(additionalSections, chr.statusBar.sections)
        }

        if (isDefined(chr.simulator)) {
            worldSettings = c(worldSettings, chr.simulator.world)
            characterDatabase = c(characterDatabase, chr.simulator.characters)
            additionalDatabaseSections = c(additionalDatabaseSections, chr.simulator.database)
        }
    }

    return StatusBarUpdaterSystemPromptTemplate
        .replaceAll('    ', '')
        .replaceAll('{$LANGUAGE_SELECTION}', languageName)
        .replaceAll('{$WORLD_SETTINGS}\n', sanitize(worldSettings))
        .replaceAll('{$PLAYER_CHARACTER}\n', sanitize(playerCHR.settings))
        .replaceAll('{$CHARACTER_DATABASE}\n', sanitize(characterDatabase))
        .replaceAll('{$ADDITIONAL_DATABASE_SECTIONS}\n', sanitize(additionalDatabaseSections))
        .replaceAll('{$STATUS_BAR_UPDATING_RULE}\n', sanitize2(statusBarUpdatingRule))
        .replaceAll('{$ADDITIONAL_SECTIONS}\n', sanitize(additionalSections))
        .replaceAll('{$STATUS_BAR_FORMAT}\n', sanitize(statusBarFormat))
        .replaceAll('{$PC_NAME}', playerCHR.playerName)
}

export function buildStatusBarUpdaterUserPrompt(
    coarseMemory: string,
    preciseMemory: string,
    simulatorOutputBeforePlayerAction: string,
    previousStatusBar: string,
    playerAction: string,
    simulatorOutputAfterPlayerAction: string
): string {
    return StatusBarUpdaterUserPromptTemplate
        .replaceAll('    ', '')
        .replaceAll('{$COARSE_MEMORY}\n', sanitize(coarseMemory))
        .replaceAll('{$PRECISE_MEMORY}\n', sanitize(preciseMemory))
        .replaceAll('{$SIMULATOR_OUTPUT_BEFORE_PLAYER_ACTION}\n', sanitize(simulatorOutputBeforePlayerAction))
        .replaceAll('{$PREVIOUS_STATUS_BAR}\n', sanitize(previousStatusBar))
        .replaceAll('{$PLAYER_ACTION}\n', sanitize(playerAction))
        .replaceAll('{$SIMULATOR_OUTPUT_AFTER_PLAYER_ACTION}\n', sanitize(simulatorOutputAfterPlayerAction))
}

export function buildMemorySummarizerSystemPrompt(
    simulatorCHR: SimulatorCHR,
    additionalCHRs: AdditionalCHR[]
): string {
    const { name: languageName } = LanguageConfigs[simulatorCHR.language]

    let memorySummarizingRules = simulatorCHR.memory?.rules
    let additionalSections = simulatorCHR.memory?.sections

    for (const chr of additionalCHRs) {
        if (isDefined(chr.memory)) {
            memorySummarizingRules = c(memorySummarizingRules, chr.memory.rules)
            additionalSections = c(additionalSections, chr.memory.sections)
        }
    }

    return MemorySummarizerSystemPromptTemplate
        .replaceAll('    ', '')
        .replaceAll('{$UNIVERSE_NAME}', simulatorCHR.universeName)
        .replaceAll('{$LANGUAGE_SELECTION}', languageName)
        .replaceAll('{$MEMORY_SUMMARIZING_RULES}\n', sanitize2(memorySummarizingRules))
        .replaceAll('{$ADDITIONAL_SECTIONS}\n', sanitize(additionalSections))
}

export function buildMemorySummarizerUserPrompt(
    coarseMemory: string,
    preciseMemory: string
) {
    return MemorySummarizerUserPromptTemplate
        .replaceAll('    ', '')
        .replaceAll('{$COARSE_MEMORY}\n', sanitize(coarseMemory))
        .replaceAll('{$PRECISE_MEMORY}\n', sanitize(preciseMemory))
}

function c(a?: string, b?: string): string | undefined {
    if (!isDefined(a) || a.length === 0) {
        return b
    }

    if (!isDefined(b) || b.length === 0) {
        return a
    }

    return `${a}\n${b}`
}

function sanitize(s?: string): string {
    if (!isDefined(s) || isBlank(s)) {
        return ''
    }

    if (!s.endsWith('\n')) {
        return `${s}\n`
    } else {
        return s
    }
}

function sanitize2(s?: string): string {
    if (!isDefined(s) || isBlank(s)) {
        return ''
    }

    return (s.startsWith('\n') ? '' : '\n') + s + (s.endsWith('\n') ? '' : '\n')
}
