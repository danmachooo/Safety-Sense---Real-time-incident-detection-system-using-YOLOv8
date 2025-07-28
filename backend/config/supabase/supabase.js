import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SB_PROJECT_URL;
const supabaseKey = process.env.SB_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
