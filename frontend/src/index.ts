import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'

import App from './ui/App.vue'
import './index.css'

const vuetify = createVuetify()

createApp(App).use(vuetify).mount('#app')
