import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js'; // Import router
import Navbar from './components/Navbar.vue';

const app = createApp(App);
app.use(router);
app.component('Navbar', Navbar);
app.mount('#app');
