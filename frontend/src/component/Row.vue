<template>
    <div class="row">
        <slot />
    </div>
</template>

<style>
.row {
    display: flex;
    flex-direction: row;
    column-gap: 1em;
    align-items: center;
}
</style>