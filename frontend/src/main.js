import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import VueCookies from "vue-cookies";

import "./assets/styles.css";
import App from "./App.vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { useAuthStore } from "./stores/authStore";

async function bootstrap() {
  const app = createApp(App);

  // Pinia
  const pinia = createPinia();
  app.use(pinia);

  // Vue Query
  app.use(VueQueryPlugin, { enableDevTools: true });

  // Cookies
  app.use(VueCookies);

  // Initialize auth store before router
  const authStore = useAuthStore();
  await authStore.initAuth();

  // Router (after auth initialization)
  app.use(router);

  app.mount("#app");
}

// Call the async bootstrap function
bootstrap();
