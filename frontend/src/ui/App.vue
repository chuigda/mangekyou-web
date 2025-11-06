<template>
  <v-app id="mangekyou">
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>

      <v-app-bar-title>Mangekyou</v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-navigation-drawer v-model="drawer">
        <!--  -->
      </v-navigation-drawer>

      <ChatConfig />

      <!--  -->
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ChatConfig from './ChatConfig.vue'
import { useTheme } from 'vuetify/lib/composables/theme.mjs'

const drawer = ref<boolean | null>(null)

const theme = useTheme()
theme.toggle()
</script>
