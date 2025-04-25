<template>
  <div>
    <Navbar />
    <div class="container">
      <Home />
      <Service />
      <AboutUs />
      <Contact />
    </div>
    <Footer />
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
import Home from './views/Home.vue';
import Service from './views/Service.vue';
import AboutUs from './views/AboutUs.vue';
import Contact from './views/Contact.vue';

export default {
  components: {
    Navbar,
    Footer,
    Home,
    AboutUs,
    Service,
    Contact
  }
};
</script>

<style scoped>
</style>
