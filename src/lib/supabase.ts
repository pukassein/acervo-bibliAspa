import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://jvfruuneqfgqvdztspid.supabase.co";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2ZnJ1dW5lcWZncXZkenRzcGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzgwNzMsImV4cCI6MjA5NTA1NDA3M30.XcPKunKVm9x8fSse9eCGnau8-HaaKVrwd3TZaTEXuWU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
