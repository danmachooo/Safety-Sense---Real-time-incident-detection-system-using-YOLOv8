const express = require('express');
const cors = require('cors');
const app = express();
const errorHandlerMiddleware = require('./middlewares/ErrorHandlerMiddleware');
const inventoryRouter = require('./routes/InventoryRoutes');

require('dotenv').config();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(inventoryRouter);

// Error handler (MUST BE AFTER ROUTES)
app.use(errorHandlerMiddleware); // ⚠️ Place after routes

// Start backend
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});