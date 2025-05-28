// utils/plainAxios.js
import axios from "axios";

const plainAxios = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default plainAxios;
