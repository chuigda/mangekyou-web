<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import { messages, isSending, streamingContent, isConnected, simulatorCHR, playerCHR, sendPlayerMessage, regenerateSimulatorMessage, regenerateStatusBar } from '../store'
import ChatBubble from './ChatBubble.vue'

const playerInput = ref('')
const messagesContainer = ref<HTMLDivElement>()

const canSend = ref(true)

function computeCanSend(): boolean {
    return isConnected.value
        && !!simulatorCHR.value
        && !!playerCHR.value
        && !isSending.value
        && playerInput.value.trim().length > 0
}

watch([isConnected, simulatorCHR, playerCHR, isSending, playerInput], () => {
    canSend.value = computeCanSend()
}, { immediate: true })

function scrollToBottom() {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    })
}

watch([messages, streamingContent], scrollToBottom)

async function handleSend() {
    const text = playerInput.value.trim()
    if (!text) return
    playerInput.value = ''
    await sendPlayerMessage(text)
}

function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (canSend.value) handleSend()
    }
}

const canRegenerate = computed(() =>
    isConnected.value
    && !!simulatorCHR.value
    && !!playerCHR.value
    && !isSending.value
    && messages.value.some(m => m.$k === 'simulator')
)
</script>

<template>
    <div class="chat-panel panel">
        <div ref="messagesContainer" class="messages-container">
            <ChatBubble v-for="(msg, index) in messages" :key="index" :message="msg" />

            <div v-if="streamingContent" class="chat-bubble simulator streaming">
                <div class="bubble-header">
                    <span class="role">模拟器</span>
                    <span class="tooltip">生成中...</span>
                </div>
                <div class="bubble-content">{{ streamingContent }}</div>
            </div>

            <div v-if="messages.length === 0 && !streamingContent" class="empty-state">
                <span class="tooltip">上传 CHR 文件并发送消息以开始</span>
            </div>
        </div>

        <div class="input-area">
            <textarea
                v-model="playerInput"
                @keydown="handleKeydown"
                :disabled="isSending"
                placeholder="输入玩家行动..."
                rows="3"
            />
            <div class="input-buttons">
                <button @click="handleSend" :disabled="!canSend">
                    {{ isSending ? '发送中...' : '发送' }}
                </button>
                <button @click="regenerateSimulatorMessage" :disabled="!canRegenerate">
                    重新生成
                </button>
                <button @click="regenerateStatusBar" :disabled="!canRegenerate">
                    重新生成状态栏
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.chat-panel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.messages-container {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    row-gap: 0.75em;
    padding-bottom: 0.5em;
}

.empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.streaming {
    padding: 0.75em 1em;
    border: 1px solid var(--border-color);
    background-color: var(--section-background-color);
    margin-right: 3em;
    display: flex;
    flex-direction: column;
    row-gap: 0.25em;
}

.streaming .role {
    font-size: 0.85em;
    font-weight: bold;
    color: var(--snippet-text-color);
}

.streaming .bubble-content {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
}

.input-area {
    display: flex;
    column-gap: 0.5em;
    padding-top: 0.5em;
    border-top: 1px solid var(--border-color);
}

.input-area textarea {
    flex: 1;
    min-width: 0;
}

.input-buttons {
    display: flex;
    flex-direction: column;
    row-gap: 0.25em;
    justify-content: flex-end;
}

.input-buttons button {
    min-width: 8em;
}
</style>
