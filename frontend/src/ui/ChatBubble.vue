<script setup lang="ts">
import type { Message, SimulatorMessage } from '../llm/chat_message'

const { message } = defineProps<{ message: Message }>()

function switchVersion(msg: SimulatorMessage, delta: number) {
    const next = msg.currentVersionIndex + delta
    if (next >= 0 && next < msg.versions.length) {
        msg.currentVersionIndex = next
    }
}
</script>

<template>
    <div class="chat-bubble" :class="message.$k">
        <div class="bubble-header">
            <span class="role">{{ message.$k === 'simulator' ? '模拟器' : '玩家' }}</span>
            <span v-if="message.$k === 'simulator' && message.versions.length > 1" class="version-switcher">
                <button @click="switchVersion(message, -1)" :disabled="message.currentVersionIndex === 0">&lt;</button>
                <span class="tooltip">{{ message.currentVersionIndex + 1 }}/{{ message.versions.length }}</span>
                <button @click="switchVersion(message, 1)" :disabled="message.currentVersionIndex === message.versions.length - 1">&gt;</button>
            </span>
        </div>
        <div class="bubble-content">
            <template v-if="message.$k === 'simulator'">
                {{ message.versions[message.currentVersionIndex]!!.content }}
            </template>
            <template v-else>
                {{ message.content }}
            </template>
        </div>
        <div v-if="message.$k === 'simulator'" class="bubble-footer tooltip">
            {{ message.versions[message.currentVersionIndex]!!.tokenCount }} tokens
        </div>
    </div>
</template>

<style scoped>
.chat-bubble {
    padding: 0.75em 1em;
    border: 1px solid var(--border-color);
    background-color: var(--section-background-color);
    display: flex;
    flex-direction: column;
    row-gap: 0.25em;
}

.chat-bubble.player {
    background-color: var(--detail-background-color);
    margin-left: 3em;
}

.chat-bubble.simulator {
    margin-right: 3em;
}

.bubble-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.role {
    font-size: 0.85em;
    font-weight: bold;
    color: var(--snippet-text-color);
}

.version-switcher {
    display: flex;
    align-items: center;
    column-gap: 0.25em;
}

.version-switcher button {
    height: 1.5em;
    font-size: 0.8em;
    padding: 0 0.4em;
}

.bubble-content {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
}

.bubble-footer {
    text-align: right;
    font-size: 0.8em;
}
</style>
