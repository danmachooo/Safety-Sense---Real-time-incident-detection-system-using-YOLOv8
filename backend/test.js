import { testSupabaseConnection } from "./config/multer.js";
// Test connection on startup
testSupabaseConnection().then((connected) => {
  if (!connected) {
    console.error("Supabase connection failed - check your configuration");
  }
});
