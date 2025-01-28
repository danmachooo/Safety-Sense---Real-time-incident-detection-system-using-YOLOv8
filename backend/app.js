const express = require('express');
const cors = require('cors');
const app = express();
const errorHandlerMiddleware = require('./middlewares/ErrorHandlerMiddleware');
const inventoryRouter = require('./routes/InventoryManagementRoutes');

require('dotenv').config();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(errorHandlerMiddleware);

// Routes
app.use(inventoryRouter);

// Start backend
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
