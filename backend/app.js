const errorHandlerMiddleware = require('./middlewares/ErrorHandlerMiddleware');
const express = require('express');
const cors = require('cors');
const setupCronJobs = require('./cron')
const app = express();

const apiRouter = require('./routes/api');

require('dotenv').config();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main route
app.use('/api', apiRouter);

// Error handler 
app.use(errorHandlerMiddleware); 

setupCronJobs();

// Start backend
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});