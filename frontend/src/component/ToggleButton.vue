<script setup lang="ts">
const model = defineModel<boolean>()
</script>

<template>
    <div class="button" :class="{ toggled: model }"
         @click = "model = !model"
         role="radio"
         :aria-checked="model">
        <slot />
    </div>
</template>
