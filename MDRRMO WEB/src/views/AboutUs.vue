<template>
    <section class="about-section" id="about">
      <h2 class="section-title">Our Team</h2>
      <div class="underline"></div>
  
      <div class="team-grid">
        <!-- Team Member 1 -->
        <div class="team-card">
          <div class="profile-image">
            <img src="../assets/logo.png" alt="John Paul Angelo C. Mayordo" class="avatar">
          </div>
          <h3 class="member-name">John Paul Angelo C. Mayordo</h3>
          <p class="member-role">Full-Stack Developer</p>
          <p class="member-tagline">NAKA MUTE</p>
        </div>
  
        <!-- Team Member 2 -->
        <div class="team-card">
          <div class="profile-image">
            <img src="../assets/logo.png" alt="Thiena B. Damasco" class="avatar">
          </div>
          <h3 class="member-name">Thiena B. Damasco</h3>
          <p class="member-role">UI/UX Designer</p>
          <p class="member-tagline">GANDA LANG</p>
        </div>
  
        <!-- Team Member 3 -->
        <div class="team-card">
          <div class="profile-image">
            <img src="../assets/logo.png" alt="Aheizer Rodriguez" class="avatar">
          </div>
          <h3 class="member-name">Aheizer Rodriguez</h3>
          <p class="member-role">All Around</p>
          <p class="member-tagline">TANGA</p>
        </div>
      </div>
    </section>
  </template>
  
  <style scoped>
  .about-section {
    padding: 4rem 2rem;
    background-color: #f7fafc;
    height: 83vh;
  }
  
  .section-title {
    text-align: center;
    font-size: 2.5rem;
    font-weight: bold;
    color: #2d3748;
    margin-bottom: 0.5rem;
  }
  
  .underline {
    width: 100px;
    height: 4px;
    background-color: #1e88e5;
    margin: 1rem auto 3rem;
  }
  
  .team-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .team-card {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease;
  }
  
  .team-card:hover {
    transform: translateY(-5px);
  }
  
  .profile-image {
    width: 150px;
    height: 150px;
    margin: 0 auto 1.5rem;
    border-radius: 50%;
    overflow: hidden;
    background-color: #e2e8f0;
  }
  
  .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .member-name {
    font-size: 1.5rem;
    font-weight: bold;
    color: #2d3748;
    margin-bottom: 0.5rem;
  }
  
  .member-role {
    color: #718096;
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }
  
  .member-tagline {
    color: #1e88e5;
    font-weight: 600;
    letter-spacing: 1px;
  }
  
  @media (max-width: 1024px) {
    .team-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (max-width: 640px) {
    .team-grid {
      grid-template-columns: 1fr;
    }
  
    .section-title {
      font-size: 2rem;
    }
  
    .profile-image {
      width: 120px;
      height: 120px;
    }
  }
  </style>