import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import VueCookies from "vue-cookies";

import "./assets/styles.css";
import App from "./App.vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { useAuthStore } from "./stores/authStore";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia); // Register Pinia globally
app.use(VueQueryPlugin, {
  enableDevTools: true, // Enable DevTools
});

const authStore = useAuthStore();
// Wait for auth state to initialize before mounting
await authStore.initAuth();
app.use(router);
app.use(VueCookies);

app.mount("#app");
