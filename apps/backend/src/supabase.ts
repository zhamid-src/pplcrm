import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ybvreudvsviubmalyahl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidnJldWR2c3ZpdWJtYWx5YWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzIxOTg1MjYsImV4cCI6MTk4Nzc3NDUyNn0.eyboJuTsG8PoPDEff27Wqs7XBgo5gfbvuQ4o_q0QLbo";

const url: string = SUPABASE_URL as string;
const key: string = SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
