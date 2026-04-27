<script setup lang="ts">
import { computed } from 'vue'
import { messages, coarseMemory } from '../store'
import EditableText from '../component/EditableText.vue'
import EditableMarkdown from '../component/EditableMarkdown.vue'

const latestStatusBar = computed({
    get() {
        const last = messages.value.findLast(m => m.$k === 'simulator')
        if (!last || last.$k !== 'simulator') return ''
        return last.statusBar
    },
    set(value: string) {
        const last = messages.value.findLast(m => m.$k === 'simulator')
        if (!last || last.$k !== 'simulator') return
        last.statusBar = value
    }
})

const preciseMemoryEntries = computed(() =>
    messages.value
        .filter(m => m.$k === 'simulator')
        .map(m => m.summarize)
        .filter(s => s.trim().length > 0)
)

const activeCount = computed(() => {
    const last = messages.value.findLast(m => m.$k === 'simulator') as { activePreciseMemory: number } | undefined
    return last?.activePreciseMemory ?? preciseMemoryEntries.value.length
})

const inactiveEntries = computed(() =>
    preciseMemoryEntries.value.slice(0, -activeCount.value || undefined)
)

const activeEntries = computed(() =>
    activeCount.value > 0
        ? preciseMemoryEntries.value.slice(-activeCount.value)
        : []
)
</script>

<template>
    <div class="status-panel panel">
        <h3>状态栏</h3>
        <div class="status-bar-content">
            <EditableMarkdown v-if="latestStatusBar || messages.some(m => m.$k === 'simulator')" v-model="latestStatusBar" :editing-rows="15" />
            <span v-else class="tooltip">暂无状态</span>
        </div>

        <hr />
        <h3>总结记忆</h3>
        <EditableText v-model="coarseMemory" />

        <hr />
        <h3>精细记忆</h3>
        <div v-if="preciseMemoryEntries.length === 0" class="tooltip">暂无条目</div>
        <details v-if="inactiveEntries.length > 0" class="inactive-memories">
            <summary class="tooltip">非活动记忆 ({{ inactiveEntries.length }})</summary>
            <div v-for="(entry, index) in inactiveEntries" :key="'i-' + index" class="precise-entry inactive">
                <div class="precise-entry-text">{{ entry }}</div>
            </div>
        </details>
        <div v-for="(entry, index) in activeEntries" :key="'a-' + index" class="precise-entry">
            <div class="precise-entry-text">{{ entry }}</div>
        </div>
    </div>
</template>

<style scoped>
.status-panel {
    flex: 2;
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

.inactive-memories {
    color: gray;
}

.inactive-memories summary {
    cursor: pointer;
    user-select: none;
}

.precise-entry.inactive .precise-entry-text {
    color: gray;
}

.stats {
    display: flex;
    flex-direction: column;
    row-gap: 0.25em;
}
</style>
