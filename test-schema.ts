import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yxibppbfrugarjoeoijw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4aWJwcGJmcnVnYXJqb2VvaWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTgwNjUsImV4cCI6MjA5MDA5NDA2NX0.m7pkeKKDBW4bunM9V8iR1Wo6TzXdhLHAd9BfFagepO0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('questions').select('*').limit(1);
  if (error) console.error(error);
  else console.log(Object.keys(data[0] || {}));
}
test();
