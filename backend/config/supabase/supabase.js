import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SB_PROJECT_URL;
const supabaseKey = process.env.SB_SERVICE_KEY;

console.log("=== Supabase Configuration ===");
console.log("URL:", supabaseUrl ? "Loaded" : "MISSING");
console.log("Key:", supabaseKey ? "Loaded" : "MISSING");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase credentials missing in .env file");
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Supabase client initialized successfully");
console.log("==============================");

export default supabase;
