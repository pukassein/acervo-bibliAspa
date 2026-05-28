import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://jvfruuneqfgqvdztspid.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2ZnJ1dW5lcWZncXZkenRzcGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzgwNzMsImV4cCI6MjA5NTA1NDA3M30.XcPKunKVm9x8fSse9eCGnau8-HaaKVrwd3TZaTEXuWU";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('books').select('*');
  if (error) {
    console.error("error fetching books", error);
  } else {
    console.log("books count: ", data?.length);
    console.log("books:", JSON.stringify(data, null, 2));
  }
}

check();
