<script setup lang="ts">
const emit = defineEmits<{ click: [] }>()
</script>

<template>
    <div class="button" role="button" @click="emit('click')">
        <slot />
    </div>
</template>
