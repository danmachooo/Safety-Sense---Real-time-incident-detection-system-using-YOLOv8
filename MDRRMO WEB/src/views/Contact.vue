<template>
    <section class="contact-section" id="contact">
      <h2 class="section-title">Contact MDRRMO</h2>
      <div class="underline"></div>
  
      <div class="contact-grid">
        <!-- Emergency Hotlines -->
        <div class="contact-card">
          <div class="icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </div>
          <h3 class="card-title">Emergency Hotlines</h3>
          <p class="card-content">0931 769 1990</p>
        </div>
  
        <!-- Office Location -->
        <div class="contact-card">
          <div class="icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <h3 class="card-title">Office Location</h3>
          <div class="card-content">
            <p>MDRRMO Building</p>
            <p>Municipal Hall Compound</p>
            <p>Socorro, Oriental Mindoro, Philippines</p>
          </div>
        </div>
  
        <!-- Email & Social -->
        <div class="contact-card">
          <div class="icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>
          <h3 class="card-title">Email & Social</h3>
          <div class="social-links">
            <a href="#" class="social-button facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>
            <a href="#" class="social-button email">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </a>
          </div>
        </div>
      </div>
  
      <!-- Google Maps -->
      <div class="map-container">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d123785.80988587847!2d121.30000000000001!3d13.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33bc6b8eb0061803%3A0x84e23efa34045a89!2sSocorro%2C%20Oriental%20Mindoro!5e0!3m2!1sen!2sph!4v1629789345678!5m2!1sen!2sph"
          width="100%"
          height="450"
          style="border:0;"
          loading="lazy"
        ></iframe>
      </div>
    </section>
  </template>
  
  <style scoped>
  .contact-section {
    background: linear-gradient(to bottom right, #3282B8, #0F4C75, #1B262C);;
    padding: 4rem 2rem;
    min-height: 100vh;
  }
  
  .section-title {
    text-align: center;
    color: white;
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  
  .underline {
    width: 100px;
    height: 4px;
    background-color: white;
    margin: 1rem auto 3rem;
  }
  
  .contact-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto 3rem;
  }
  
  .contact-card {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .icon-circle {
    width: 64px;
    height: 64px;
    background-color: #e3f2fd;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
  }
  
  .card-title {
    color: #2d3748;
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
  }
  
  .card-content {
    color: #4a5568;
    line-height: 1;
  }
  
  .social-links {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .social-button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    transition: transform 0.3s ease;
  }
  
  .social-button:hover {
    transform: translateY(-2px);
  }
  
  .facebook {
    background-color: #1877f2;
  }
  
  .email {
    background-color: #1877f2;
  }
  
  .map-container {
    max-width: 1200px;
    margin: 0 auto;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  @media (max-width: 1024px) {
    .contact-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (max-width: 640px) {
    .contact-grid {
      grid-template-columns: 1fr;
    }
    
    .section-title {
      font-size: 2rem;
    }
  }
  </style>