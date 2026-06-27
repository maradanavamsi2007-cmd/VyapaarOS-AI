const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log(`Loaded Supabase URL: ${supabaseUrl || 'None'}`);
console.log(`Supabase credentials detected: ${!!(supabaseUrl && supabaseKey)}`);

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase URL or Key (Service Role / Anon) is missing in environment variables.');
}

const supabase = createClient(supabaseUrl || 'https://placeholder-url.supabase.co', supabaseKey || 'placeholder-key', {
  auth: {
    persistSession: false
  }
});

module.exports = supabase;
