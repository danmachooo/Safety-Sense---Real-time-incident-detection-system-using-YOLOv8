<template>
    <section class="responsibilities-section" id="service">
      <h2 class="section-title">MDRRMO Responsibilities</h2>
      <div class="underline"></div>
  
      <div class="responsibilities-grid">
        <div class="responsibility-card" v-for="(item, index) in responsibilities" :key="index">
          <div class="icon" v-html="item.icon"></div>
          <h3 class="card-title">{{ item.title }}</h3>
          <p class="card-description">{{ item.description }}</p>
        </div>
      </div>
    </section>
  </template>
  
  <script>
  export default {
    data() {
      return {
        responsibilities: [
          {
            title: "Disaster Response",
            description: "Coordinate response and recovery operations during emergencies.",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="2" ry="2"></rect><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle><path d="M10 7V5a2 2 0 0 1 4 0v2"></path><path d="M2 9h20"></path><path d="M12 12v3"></path><path d="M10 12h4"></path></svg>`
          },
          {
            title: "Community Engagement",
            description: "Work with the community to build disaster resilience.",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><circle cx="5.5" cy="9" r="2.5"></circle><circle cx="18.5" cy="9" r="2.5"></circle><path d="M12 15v6"></path><path d="M5.5 12v6"></path><path d="M18.5 12v6"></path></svg>`
          },
          {
            title: "Civil Protection",
            description: "Implement programs to protect life, property, and the environment.",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"></path><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"></path><path d="M4 15v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3"></path></svg>`
          },
          {
            title: "Medical & Rescue Services",
            description: "Provide medical and rescue services during disasters.",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>`
          },
          {
            title: "Evacuation & Rescue",
            description: "Perform evacuation and rescue operations.",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
          },
          {
            title: "Property Assistance",
            description: "Provide assistance to people affected by disasters.",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path><path d="M12 5.36V8"></path><path d="M12 11v3"></path><path d="M12 16v3"></path></svg>`
          }
        ]
      };
    }
  };
  </script>
  
  <style scoped>
  .responsibilities-section {
    min-height: 80vh;
    background: linear-gradient(to bottom right, #3282B8, #0F4C75, #1B262C);
    padding: 3rem 2rem; /* Increased bottom padding */
    text-align: center;

  }
  
  .section-title {
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
  
  .responsibilities-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .responsibility-card {
    background: white;
    border-radius: 10px;
    padding: 2rem;
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  }
  
  .responsibility-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
  }
  
  .icon {
    margin-bottom: 1rem;
    display: flex;
    justify-content: center;
  }
  
  .card-title {
    color: #2b6cb0;
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
  }
  
  .card-description {
    color: #4a5568;
    line-height: 1.6;
  }
  
  @media (max-width: 1024px) {
    .responsibilities-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (max-width: 640px) {
    .responsibilities-grid {
      grid-template-columns: 1fr;
    }
  
    .section-title {
      font-size: 2rem;
    }
  }
  </style>
  