import { createClient } from "@supabase/supabase-js";

//TODO: move to env
const SUPABASE_URL: string = "https://ybvreudvsviubmalyahl.supabase.co";
const SUPABASE_ANON_KEY: string =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidnJldWR2c3ZpdWJtYWx5YWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzIxOTg1MjYsImV4cCI6MTk4Nzc3NDUyNn0.eyboJuTsG8PoPDEff27Wqs7XBgo5gfbvuQ4o_q0QLbo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
