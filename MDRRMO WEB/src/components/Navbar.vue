<template>
    <nav class="navbar">
      <div class="navbar-brand">
        <h1>SAFETYSENSE</h1>
      </div>
      <button class="hamburger" @click="toggleMenu">☰</button>
      <div :class="['navbar-links', { 'active': isMenuOpen }]">
        <a href="#home" class="nav-link" @click="scrollTo('home')">HOME</a>
        <a href="#service" class="nav-link" @click="scrollTo('service')">SERVICE</a>
        <a href="#about" class="nav-link" @click="scrollTo('about')">ABOUT US</a>
        <a href="#contact" class="nav-link" @click="scrollTo('contact')">CONTACT US</a>
      </div>
    </nav>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  
  const isMenuOpen = ref(false);
  
  const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value;
  };
  
  const scrollTo = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
    isMenuOpen.value = false; // Close menu after clicking
  };
  </script>
  
  <style scoped>
  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background-color: #f7fafc;
    font-family: Arial, sans-serif;
    position: sticky; /* Make navbar sticky */
    top: 0; /* Stick to the top */
    z-index: 1000; /* Ensure it stays above other content */
    
    }

  
  .navbar-brand h1 {
    font-size: 1.2rem;
    font-weight: bold;
    margin: 0;
    letter-spacing: 1px;
  }
  
  .hamburger {
    display: none;
    font-size: 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    margin-left: auto;
    order: 2;
  }
  
  .navbar-links {
    display: flex;
    gap: 1.5rem;
  }
  
  .nav-link {
    color: #666;
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.3s ease;
    cursor: pointer;
  }
  
  .nav-link:hover {
    color: #000;
  }
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .hamburger {
      display: block;
      position: absolute;
      right: 2rem;
      top: 1rem;
    }
    
    .navbar-links {
      display: none;
      flex-direction: column;
      position: absolute;
      top: 60px;
      right: 0;
      width: 200px;
      background: white;
      padding: 1rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    .navbar-links.active {
      display: flex;
    }
  }
  </style>
  