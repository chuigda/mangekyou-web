<script setup lang="ts">
import ConfigPanel from './ConfigPanel.vue'
import ChatPanel from './ChatPanel.vue'
import StatusPanel from './StatusPanel.vue'
import Dialog from '../component/Dialog.vue'
import { dialogError } from '../store'
</script>

<template>
    <ConfigPanel />
    <ChatPanel />
    <StatusPanel />

    <Dialog v-if="dialogError" @click.self="dialogError = ''">
        <pre class="dialog-error-detail">{{ dialogError }}</pre>
        <button @click="dialogError = ''">关闭</button>
    </Dialog>
</template>

<style scoped>
.dialog-error-detail {
    white-space: pre-wrap;
    word-break: break-word;
    max-width: 40em;
    max-height: 20em;
    overflow-y: auto;
    margin-bottom: 0.75em;
}
</style>
