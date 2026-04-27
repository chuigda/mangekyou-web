<script setup lang="ts">
import { computed } from 'vue'
import { messages, coarseMemory, preciseMemory } from '../store'
import EditableText from '../component/EditableText.vue'

const latestStatusBar = computed(() => {
    const last = messages.value.findLast(m => m.$k === 'simulator')
    if (!last || last.$k !== 'simulator') return ''
    return last.versions[last.currentVersionIndex]!!.statusBar
})

const totalTokens = computed(() => {
    let total = 0
    for (const msg of messages.value) {
        if (msg.$k === 'simulator') {
            const v = msg.versions[msg.currentVersionIndex]!!
            total += v.tokenCount + v.statusBarTokenCount
        }
    }
    return total
})

function addPreciseMemory() {
    preciseMemory.value.push('')
}

function removePreciseMemory(index: number) {
    preciseMemory.value.splice(index, 1)
}

function updatePreciseMemory(index: number, value: string) {
    preciseMemory.value[index] = value
}
</script>

<template>
    <div class="status-panel panel">
        <h3>状态栏</h3>
        <div class="status-bar-content">
            <pre v-if="latestStatusBar">{{ latestStatusBar }}</pre>
            <span v-else class="tooltip">暂无状态</span>
        </div>

        <hr />
        <h3>粗粒度记忆</h3>
        <EditableText v-model="coarseMemory" />

        <hr />
        <div class="memory-header">
            <h3>精细记忆</h3>
            <button @click="addPreciseMemory">+</button>
        </div>
        <div v-if="preciseMemory.length === 0" class="tooltip">暂无条目</div>
        <div v-for="(entry, index) in preciseMemory" :key="index" class="precise-entry">
            <div class="precise-entry-header">
                <span class="tooltip">#{{ index + 1 }}</span>
                <button @click="removePreciseMemory(index)">✗</button>
            </div>
            <textarea
                :value="entry"
                @input="updatePreciseMemory(index, ($event.target as HTMLTextAreaElement).value)"
                rows="2"
            />
        </div>

        <hr />
        <h3>统计</h3>
        <div class="stats">
            <span class="tooltip">消息数: {{ messages.length }}</span>
            <span class="tooltip">总 Token 数: {{ totalTokens }}</span>
        </div>
    </div>
</template>

<style scoped>
.status-panel {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    row-gap: 0.5em;
}

.status-bar-content pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: var(--code-font-family);
    font-size: 0.9em;
    background-color: var(--section-background-color);
    padding: 0.5em;
    border: 1px solid var(--border-color);
}

.memory-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.memory-header button {
    height: 1.5em;
    width: 1.5em;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.precise-entry {
    display: flex;
    flex-direction: column;
    row-gap: 0.25em;
}

.precise-entry-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.precise-entry-header button {
    height: 1.5em;
    padding: 0 0.4em;
    font-size: 0.8em;
}

.precise-entry textarea {
    width: 100%;
}

.stats {
    display: flex;
    flex-direction: column;
    row-gap: 0.25em;
}
</style>
