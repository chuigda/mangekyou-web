import type { SimulatorCHR, PlayerCHR, AdditionalCHR } from './chr_file'
import type { Message } from './chat_message'

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
