<script setup lang="ts">

</script>

<template>
    <nav>
        <slot />
    </nav>
</template>

<style scoped>
nav {
    background-color: var(--body-background-color);
    padding: 0.5em;

    display: flex;
    column-gap: 0.5em;
    align-items: center;
}
</style>
