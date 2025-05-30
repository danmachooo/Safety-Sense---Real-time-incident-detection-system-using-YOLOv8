import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import VueCookies from "vue-cookies";

import "./assets/styles.css";
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia); // Register Pinia globally
app.use(router);
app.use(VueCookies);

app.mount("#app");
