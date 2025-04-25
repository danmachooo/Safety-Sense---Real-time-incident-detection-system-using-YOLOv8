<template>
    <section class="home-container" id="home">
      <div class="circle-bg circle-1"></div>
      <div class="circle-bg circle-2"></div>
      <div class="content-wrapper">
        <div class="text-section">
          <div class="blue-line"></div>
          <h1>
            Municipal Disaster
            <span class="blue-text">Risk Reduction &<br>Management Office</span>
            <span class="blue-text">Socorro, Oriental<br>Mindoro</span>
          </h1>
          <p class="description">
            The Municipal Disaster Risk Reduction and Management Office
            (MDRRMO) of Socorro is committed to building a resilient community
            through preparedness, response, recovery, and mitigation.
          </p>
        </div>
        <div class="logo-section">
          <img src="../assets/logo.png" alt="SOCORRO MDRRMC Logo" class="logo">
        </div>
      </div>
    </section>
  </template>
  
  <style scoped>
  /* General Styling */
  .home-container {
    background-color: #f7fafc;
    height: 80vh;
    padding: 5rem 3rem;
    position: relative;
    overflow: hidden;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    align-items: center;
  }
  
  .circle-bg {
    position: absolute;
    border-radius: 50%;
    background-color: #BBE1FA;
    z-index: 0;
  }
  
  .circle-1 {
    width: 800px;
    height: 800px;
    bottom: -400px;
    left: -200px;
  }
  
  .circle-2 {
    width: 600px;
    height: 600px;
    top: -200px;
    right: -100px;
  }
  
  .content-wrapper {
    position: relative;
    z-index: 1;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4rem;
    flex-wrap: wrap;
  }
  
  .text-section {
    flex: 1;
    min-width: 300px;
  }
  
  .blue-line {
    width: 100px;
    height: 4px;
    background-color: #1e6bb8;
    margin-bottom: 2rem;
  }
  
  h1 {
    font-size: 3rem;
    font-weight: bold;
    color: #333;
    line-height: 1.2;
    margin-bottom: 1.5rem;
  }
  
  .blue-text {
    display: block;
    color: #1e88e5;
    margin-top: 0.5rem;
  }
  
  .description {
    color: #666;
    font-size: 1.3rem;
    line-height: 1.6;
    max-width: 600px;
  }
  
  .logo-section {
    flex: 1;
    display: flex;
    justify-content: center;
    padding-left: 2rem;
    min-width: 300px;
  }
  
  .logo {
    max-width: 500px;
    height: auto;
  }
  
  @media (max-width: 1024px) {
    .content-wrapper {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .logo-section {
      padding-left: 0;
    }
  }
  
  @media (max-width: 768px) {
    .home-container {
      padding: 2rem;
      height: auto;
    }
    
    h1 {
      font-size: 2rem;
    }
    
    .logo {
      max-width: 300px;
    }
  }
  
  @media (max-width: 480px) {
    .home-container {
      padding: 1rem;
    }
    
    h1 {
      font-size: 1.8rem;
    }
    
    .description {
      font-size: 1rem;
    }
    
    .logo {
      max-width: 250px;
    }
  }
  </style>
  