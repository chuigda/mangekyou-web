<script setup lang="ts">
import { ref } from 'vue'

import WebSocketTest from './WebSocketTest.vue'

import type { AdditionalCHR, PlayerCHR, SimulatorCHR } from '../llm/chr_file'

import Dialog from '../component/Dialog.vue'
import Row from '../component/Row.vue'

type AppMode = 'chat' | 'configure'

const appMode = ref<AppMode>('configure')

const simulatorCHRFile = ref<SimulatorCHR | undefined>(undefined)
const playerCHRFile = ref<PlayerCHR | undefined>(undefined)
const additionalCHRFiles = ref<AdditionalCHR[]>([])
</script>

<template>
    <WebSocketTest />
</template>
