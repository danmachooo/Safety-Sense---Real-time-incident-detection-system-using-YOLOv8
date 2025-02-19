import { createApp } from 'vue'
import { createPinia } from "pinia";
import router from "./router";

import './assets/styles.css'
import App from './App.vue'

const app = createApp(App);
app.use(createPinia()); // Register Pinia globally
app.use(router);

app.mount("#app");