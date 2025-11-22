<template>
    <div class="dialog-overlay">
        <div class="dialog-content">
            <slot />
        </div>
    </div>
</template>

<style scoped>
.dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;

    z-index: 1000;
}

.dialog-content {
    border: 1px solid var(--border-color);
    background-color: var(--body-background-color);
    padding: 1em;
}
</style>
