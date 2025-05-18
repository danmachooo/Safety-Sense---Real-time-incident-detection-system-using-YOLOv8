<template>
  <section class="about-section" id="about">
    <h2 class="section-title">MDRRMO Vision & Mission</h2>
    <div class="underline"></div>

    <div class="vm-row">
      <!-- Vision Box -->
      <div class="vm-box vision">
        <div class="vm-header">
          <i class="fas fa-eye"></i>
          <h3>VISION</h3>
        </div>
        <p>
          "A RESILIENT MDRRMO managed by responsible and accountable local
          officials and employees in partnership with empowered citizenry and
          established linkage to dynamic line agencies towards organized and
          systematic preparation for sustainable response to emergency."
        </p>
      </div>

      <!-- Mission Box -->
      <div class="vm-box mission">
        <div class="vm-header">
          <i class="fas fa-bullseye"></i>
          <h3>MISSION</h3>
        </div>
        <ol>
          <li>
            To prepare the community more particularly the municipal government
            to anticipate and respond quickly and appropriately to disasters.
          </li>
          <li>
            To provide integrated and precise control of material and monetary
            resources, ensuring availability during and after calamities.
          </li>
          <li>
            To minimize casualties and damage, ideally achieving zero casualty
            level.
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>

<style scoped>
@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css");

.about-section {
  padding: 4rem 2rem;
  background: #f7fafc;
  min-height: 83vh;
}

.section-title {
  text-align: center;
  font-size: 2.8rem;
  font-weight: bold;
  color: #1e6bb8;
  margin-bottom: 0.5rem;
}

.underline {
  width: 100px;
  height: 4px;
  background-color: #1e6bb8;
  margin: 1rem auto 3rem;
}

.vm-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.vm-box {
  background: #fff;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  border-left: 6px solid #1e88e5;
}

.vm-box:hover {
  transform: translateY(-5px);
}

.vm-box.vision {
  border-left-color: #43a047;
}

.vm-box.mission {
  border-left-color: #f4511e;
}

.vm-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.5rem;
}

.vm-header i {
  font-size: 1.8rem;
  color: inherit;
}

.vm-header h3 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #2d3748;
}

.vm-box p,
.vm-box ol {
  font-size: 1.3rem;
  color: #37474f;
  line-height: 1.6;
  text-align: justify;
}

.vm-box ol {
  padding-left: 1.2rem;
  list-style-type: decimal;
}

@media (max-width: 768px) {
  .vm-row {
    grid-template-columns: 1fr;
  }
}
</style>
