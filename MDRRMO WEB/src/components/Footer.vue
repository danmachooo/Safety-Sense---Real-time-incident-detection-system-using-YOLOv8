<template>
    <footer class="footer">
      <div class="footer-content">
        © {{ currentYear }} Municipal Disaster Risk Reduction and Management Office (MDRRMO) of Socorro. All rights reserved.
      </div>
    </footer>
  </template>
  
  <script setup>
  const currentYear = new Date().getFullYear()
  </script>
  
  <style scoped>
  .footer {
    background-color: #f8f9fa;
    text-align: center;
    border-top: 1px solid #edf2f7;
    padding: 5px;
  }
  
  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    color: #718096;
    font-size: 0.875rem;
  }
  </style>