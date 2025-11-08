<script setup lang="ts">
import type { AdditionalCHR, CHRFile, PlayerCHR, SimulatorCHR } from '../llm/chr_file'

// const {
//     simulatorCHRFile,
//     playerCHR,
//     additionalCHRs,
// } = defineProps<{
//     simulatorCHRFile: CHRFile<SimulatorCHR>
//     playerCHR: CHRFile<PlayerCHR>
//     additionalCHRs: CHRFile<AdditionalCHR>[]
// }>()

const showDialog = true
</script>

<template>
    <v-dialog v-model="showDialog" max-width="600">
        <v-card>
            <v-card-title>模拟器配置</v-card-title>
            <v-container>
                <v-row>
                    <v-col cols="10"><v-text-field label="模拟器角色文件" density="compact" readonly /></v-col>
                    <v-col cols="2"><v-btn color="primary">上传</v-btn></v-col>
                </v-row>
                <v-row>
                    <v-col cols="10"><v-text-field label="玩家角色文件" density="compact" readonly /></v-col>
                    <v-col cols="2"><v-btn color="primary">上传</v-btn></v-col>
                </v-row>
                <v-row>
                    <v-col cols="10"><v-text-field label="额外角色文件" density="compact" readonly /></v-col>
                    <v-col cols="2"><v-btn color="primary">上传</v-btn></v-col>
                </v-row>
            </v-container>
        </v-card>
    </v-dialog>
</template>
