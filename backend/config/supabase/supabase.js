import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SB_PROJECT_URL;
const supabaseKey = process.env.SB_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
