<script setup lang="ts">
import { ref, nextTick } from 'vue'

const props = withDefaults(defineProps<{ editingRows?: number }>(), { editingRows: 4 })
const model = defineModel<string>({ default: '' })

const editing = ref(false)
const draft = ref('')
const textareaRef = ref<HTMLTextAreaElement>()

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
    <div class="editable-text" :class="{ editing }">
        <div v-if="!editing" class="view" @dblclick="enterEdit">
            <code class="text"><pre>{{ model || '&nbsp;' }}</pre></code>
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
</style>
