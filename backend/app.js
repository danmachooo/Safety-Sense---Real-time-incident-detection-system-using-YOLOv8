const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

require('dotenv').config()

//Middlewares
app.use(cors());
app.use(bodyParser.json({urlencoded:true}));

//Start backend
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
