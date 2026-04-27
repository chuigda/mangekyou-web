<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { marked } from 'marked'

marked.setOptions({ breaks: true })

const props = withDefaults(defineProps<{ editingRows?: number }>(), { editingRows: 6 })
const model = defineModel<string>({ default: '' })

const editing = ref(false)
const draft = ref('')
const textareaRef = ref<HTMLTextAreaElement>()

const renderedHtml = computed(() => marked.parse(model.value || '') as string)

function enterEdit() {
    draft.value = model.value
    editing.value = true
    nextTick(() => textareaRef.value?.focus())
}

function save() {
    model.value = draft.value
    editing.value = false
}

function cancel() {
    if (draft.value !== model.value) {
        if (!confirm('确定要放弃修改吗？')) return
    }
    editing.value = false
}
</script>

<template>
    <div class="editable-markdown" :class="{ editing }">
        <div v-if="!editing" class="view" @dblclick="enterEdit">
            <div class="markdown-body" v-html="renderedHtml"></div>
        </div>
        <div v-else class="edit">
            <div class="toolbar">
                <div class="button" role="button" @click="save" title="保存">✓</div>
                <div class="button" role="button" @click="cancel" title="取消">✗</div>
            </div>
            <textarea ref="textareaRef" v-model="draft" :rows="props.editingRows" />
        </div>
    </div>
</template>

<style scoped>
.view {
    min-height: 1.5em;
    padding: 0.25em 0.4em;
    border: 1px solid transparent;
}

.view:hover {
    border-color: var(--border-color);
}

.edit {
    position: relative;
}

.toolbar {
    position: absolute;
    top: 0.25em;
    right: 0.25em;
    display: flex;
    gap: 0.25em;
    z-index: 1;
}

.toolbar .button {
    font-size: 0.9em;
}

textarea {
    width: 100%;
    min-height: 4em;
    padding: 0.25em 0.4em;
}

.markdown-body :deep(p) {
    margin: 0.4em 0;
}

.markdown-body :deep(p:first-child) {
    margin-top: 0;
}

.markdown-body :deep(p:last-child) {
    margin-bottom: 0;
}

.markdown-body :deep(pre) {
    background: var(--detail-background-color);
    padding: 0.5em 0.75em;
    border-radius: 4px;
    overflow-x: auto;
}

.markdown-body :deep(code) {
    background: var(--detail-background-color);
    padding: 0.1em 0.3em;
    border-radius: 3px;
    font-size: 0.9em;
}

.markdown-body :deep(pre code) {
    background: none;
    padding: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
    padding-left: 1.5em;
    margin: 0.4em 0;
}

.markdown-body :deep(blockquote) {
    border-left: 3px solid var(--border-color);
    margin: 0.4em 0;
    padding-left: 0.75em;
    opacity: 0.85;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
    margin: 0.5em 0 0.25em;
}

.markdown-body :deep(table) {
    border-collapse: collapse;
    margin: 0.4em 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
    border: 1px solid var(--border-color);
    padding: 0.3em 0.6em;
}

.markdown-body :deep(a) {
    color: var(--snippet-text-color);
}

.markdown-body :deep(hr) {
    border: none;
    border-top: 1px solid var(--border-color);
    margin: 0.5em 0;
}
</style>
