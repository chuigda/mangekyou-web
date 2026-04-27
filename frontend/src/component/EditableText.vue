<script setup lang="ts">
import { ref, nextTick } from 'vue'

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
            <span class="text">{{ model || '&nbsp;' }}</span>
        </div>
        <div v-else class="edit">
            <div class="toolbar">
                <div class="button" role="button" @click="save" title="保存">✓</div>
                <div class="button" role="button" @click="cancel" title="取消">✗</div>
            </div>
            <textarea ref="textareaRef" v-model="draft" />
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

.toolbar {
    display: flex;
    justify-content: flex-end;
    gap: 0.25em;
    margin-bottom: 0.25em;
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
