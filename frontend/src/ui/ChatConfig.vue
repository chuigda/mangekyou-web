<script setup lang="ts">
import type { AdditionalCHR, CHRFile, PlayerCHR, SimulatorCHR } from '../llm/chr_file'

// const {
//     simulatorCHRFile,
//     additionalCHRs,
//     playerCHR
// } = defineProps<{
//     simulatorCHRFile: CHRFile<SimulatorCHR>
//     additionalCHRs: CHRFile<AdditionalCHR>[]
//     playerCHR: CHRFile<PlayerCHR>
// }>()
</script>

<template>
    <v-card class="card-container">
        <v-container>
            <v-row>
                <v-col>
                    <v-text-field readonly :value="''" />
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <v-text-field readonly :value="''" />
                </v-col>
            </v-row>
        </v-container>
    </v-card>
</template>

<style>
.card-container {
    margin: 16px;
}
</style>