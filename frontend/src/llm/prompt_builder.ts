import { LanguageConfigs } from './lang_config'
import type { AdditionalCHR, PlayerCHR, SimulatorCHR } from './chr_file'
import type { Message as ChatMessage } from './chat_message'
import { isBlank, isDefined } from '../util/check'

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
    const { name: languageName, wordUnit } = LanguageConfigs[simulatorCHR.language]
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
        .replace('    ', '')
        .replace('{$UNIVERSE_NAME}', simulatorCHR.universeName)
        .replace('{$LANGUAGE_SELECTION}', languageName)
        .replace('{$LENGTH_INDICATOR}', lengthIndicator)
        .replace('{$LITERAL_WORK_NAME}', simulatorCHR.literalWorkName)
        .replace('{$ADDITIONAL_TASKS}\n', sanitize2(additionalTasks))
        .replace('{$ADDITIONAL_COMMANDS}\n', sanitize2(additionalCommands))
        .replace('{$WORLD_SETTINGS}\n', sanitize(worldSettings))
        .replace('{$PLAYER_CHARACTER}\n', sanitize(playerCHR.settings))
        .replace('{$CHARACTER_DATABASE}\n', sanitize(characterDatabase))
        .replace('{$ADDITIONAL_DATABASE_SECTIONS}\n', sanitize(additionalDatabaseSections))
        .replace('{$ADDITIONAL_BEHAVIORS}\n', sanitize2(additionalBehaviors))
        .replace('{$ADDITIONAL_PROHIBITIONS}\n', sanitize2(additionalProhibitions))
        .replace('{$ADDITIONAL_SECTIONS}\n', sanitize(additionalSections))
        .replace('{$PC_NAME}', playerCHR.playerName)
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
    r += `<memory type="coarse" comment="Summarize of previous events">\n${coarseMemory}</memory>\n`
    r += `<memory type="precise" comment="Important details from previous events">\n${preciseMemory}</memory>\n`
    r += '\n'

    for (const msg of messages) {
        r += `<${msg.$k}>\n${sanitize(msg.content)}</${msg.$k}>\n`
    }
    if (messages.length > 0) {
        r += '\n'
    }

    r += `<status comment="The most up-to-date world state">\n${sanitize(statusBar)}</status>\n`
    r += '\n'

    r += `<player>\n${sanitize(playerAction)}</player>\n`
    r += '\n'

    r += SimulatorUserPromptInstructionTemplate
        .replace('    ', '')
        .replace('{$LANGUAGE_SELECTOR}', languageName)
        .replace('{$PC_NAME}', playerCHR.playerName)

    r += '</input>'

    return r
}

export function buildStatusBarUpdaterSystemPrompt(
    simulatorCHR: SimulatorCHR,
    playerCHR: PlayerCHR,
    additionalCHRs: AdditionalCHR[]
): string {
    const { name: languageName } = LanguageConfigs[simulatorCHR.language]

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

    for (const chr of additionalCHRs) {
        if (isDefined(chr.statusBar)) {
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
        .replace('    ', '')
        .replace('{$LANGUAGE_SELECTION}', languageName)
        .replace('{$WORLD_SETTINGS}\n', sanitize(worldSettings))
        .replace('{$PLAYER_CHARACTER}\n', sanitize(playerCHR.settings))
        .replace('{$CHARACTER_DATABASE}\n', sanitize(characterDatabase))
        .replace('{$ADDITIONAL_DATABASE_SECTIONS}\n', sanitize(additionalDatabaseSections))
        .replace('{$STATUS_BAR_UPDATING_RULE}\n', sanitize2(statusBarUpdatingRule))
        .replace('{$ADDITIONAL_SECTIONS}\n', sanitize(additionalSections))
        .replace('{$STATUS_BAR_FORMAT}\n', sanitize(simulatorCHR.statusBar.format))
        .replace('{$PC_NAME}', playerCHR.playerName)
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
        .replace('    ', '')
        .replace('{$COARSE_MEMORY}\n', sanitize(coarseMemory))
        .replace('{$PRECISE_MEMORY}\n', sanitize(preciseMemory))
        .replace('{$SIMULATOR_OUTPUT_BEFORE_PLAYER_ACTION}\n', sanitize(simulatorOutputBeforePlayerAction))
        .replace('{$PREVIOUS_STATUS_BAR}\n', sanitize(previousStatusBar))
        .replace('{$PLAYER_ACTION}\n', sanitize(playerAction))
        .replace('{$SIMULATOR_OUTPUT_AFTER_PLAYER_ACTION}\n', sanitize(simulatorOutputAfterPlayerAction))
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
        .replace('    ', '')
        .replace('{$UNIVERSE_NAME}', simulatorCHR.universeName)
        .replace('{$LANGUAGE_SELECTION}', languageName)
        .replace('{$MEMORY_SUMMARIZING_RULES}\n', sanitize2(memorySummarizingRules))
        .replace('{$ADDITIONAL_SECTIONS}\n', sanitize(additionalSections))
}

export function buildMemorySummarizerUserPrompt(
    coarseMemory: string,
    preciseMemory: string
) {
    return MemorySummarizerUserPromptTemplate
        .replace('    ', '')
        .replace('{$COARSE_MEMORY}\n', sanitize(coarseMemory))
        .replace('{$PRECISE_MEMORY}\n', sanitize(preciseMemory))
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
