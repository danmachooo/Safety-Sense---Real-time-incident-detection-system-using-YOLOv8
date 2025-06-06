import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import VueCookies from "vue-cookies";

import "./assets/styles.css";
import App from "./App.vue";
import { VueQueryPlugin } from "@tanstack/vue-query";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia); // Register Pinia globally
app.use(VueQueryPlugin, {
  enableDevTools: true, // Enable DevTools
});
app.use(router);
app.use(VueCookies);

app.mount("#app");
