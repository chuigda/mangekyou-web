<script setup lang="ts">
import type { Message } from '../llm/chat_message'
import EditableMarkdown from '../component/EditableMarkdown.vue'
import EditableText from '../component/EditableText.vue'
import { computed } from 'vue'

const props = defineProps<{ message: Message }>()

const simulatorContent = computed({
    get() {
        const msg = props.message
        if (msg.$k !== 'simulator') return ''
        return msg.content
    },
    set(value: string) {
        const msg = props.message
        if (msg.$k !== 'simulator') return
        ;(msg as { content: string }).content = value
    }
})

const simulatorSummarize = computed({
    get() {
        const msg = props.message
        if (msg.$k !== 'simulator') return ''
        return msg.summarize
    },
    set(value: string) {
        const msg = props.message
        if (msg.$k !== 'simulator') return
        ;(msg as { summarize: string }).summarize = value
    }
})

const playerContent = computed({
    get() {
        const msg = props.message
        if (msg.$k !== 'player') return ''
        return msg.content
    },
    set(value: string) {
        const msg = props.message
        if (msg.$k !== 'player') return
        ;(msg as { content: string }).content = value
    }
})
</script>

<template>
    <div class="chat-bubble" :class="message.$k">
        <template v-if="message.$k === 'error'">
            <div class="bubble-header">
                <span class="role error-role">错误</span>
            </div>
            <div class="bubble-content error-content">{{ message.content }}</div>
        </template>
        <template v-else>
            <div class="bubble-header">
                <span class="role">{{ message.$k === 'simulator' ? '模拟器' : '玩家' }}</span>
            </div>
            <div class="bubble-content">
                <template v-if="message.$k === 'simulator'">
                    <EditableMarkdown v-model="simulatorContent" />
                    <div v-if="simulatorSummarize || true" class="bubble-summary">
                        <span class="summary-label tooltip">摘要</span>
                        <EditableText v-model="simulatorSummarize" />
                    </div>
                </template>
                <template v-else>
                    <EditableMarkdown v-model="playerContent" />
                </template>
            </div>
            <div v-if="message.$k === 'simulator'" class="bubble-footer tooltip">
                {{ message.promptTokens }}+{{ message.completionTokens }} tokens
            </div>
        </template>
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

.chat-bubble.error {
    border-color: #c44;
    background-color: #2a1010;
}

.error-role {
    color: #e55 !important;
}

.error-content {
    color: #e88;
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
    word-break: break-word;
    line-height: 1.6;
}

.bubble-summary {
    margin-top: 0.5em;
    padding-top: 0.5em;
    border-top: 1px dashed var(--border-color);
}

.summary-label {
    font-size: 0.8em;
}

.bubble-footer {
    text-align: right;
    font-size: 0.8em;
}
</style>
