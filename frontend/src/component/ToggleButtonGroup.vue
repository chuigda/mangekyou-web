<script setup lang="ts" generic="T extends any">
import { computed } from 'vue'

type DisplayObject = { [key: string]: any }

const {
    values,
    disabled,
    display,
    labelField: labelField0,
    defaultValue
} = defineProps<{
    values: T[],
    disabled?: boolean[],
    display: Record<string, string | DisplayObject> | (string | DisplayObject)[],
    labelField?: string,
    defaultValue?: T
}>()

const labelField = labelField0 ?? 'label'

const labels = computed(() => {
    if (Array.isArray(display)) {
        return display.map(d => typeof d === 'string' ? d : d[labelField])
    } else {
        return values.map(v => {
            const d = display[v as string]!!
            return typeof d === 'string' ? d : d[labelField]
        })
    }
})

const model = defineModel<T>()

const onValueSelectOrDeselect = (value: T) => {
    if (model.value === value && defaultValue !== undefined) {
        model.value = defaultValue
    } else {
        model.value = value
    }
}
</script>

<template>
    <div class="toggle-button-group" :style="{ columnCount: values.length }">
        <div v-for="(value, index) in values"
             class="button"
             :class="{ selected: value === model, disabled: disabled?.[index] ?? false }"
             :aria-disabled="disabled?.[index] ?? false"
             @click="!(disabled?.[index] ?? false) && onValueSelectOrDeselect(value)"
             role="radio"
             :aria-checked="value === model">
            {{ labels[index] }}
        </div>
    </div>
</template>

<style scoped>
.toggle-button-group {
    column-fill: balance;
    column-gap: 0;
}

.toggle-button-group > div:not(:first-child) {
    border-left: none;
}

.toggle-button-group > div.selected {
    background-color: var(--selected-background-color);
    color: var(--selected-text-color);
}
</style>
