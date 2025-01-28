const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const errorHandlerMiddleware = require('./middlewares/ErrorHandlerMiddleware');

require('dotenv').config()

//Middlewares
app.use(cors());
app.use(bodyParser.json({urlencoded:true}));
app.use(errorHandlerMiddleware);

//Start backend
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
