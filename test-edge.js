import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://kouzruxnyurjxqwdkijo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdXpydXhueXVyanhxd2RraWpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjM0NTgsImV4cCI6MjA5MDY5OTQ1OH0.KWmRMcRousQXyIkcM8ofsEaB0-kHPcRb3lJuLRsBulI')

async function test() {
    const res = await supabase.functions.invoke('get-prices');
    console.log("Raw Response:");
    console.log(res);
}
test();
