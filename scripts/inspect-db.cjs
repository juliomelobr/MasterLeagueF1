const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ueqfmjwdijaeawvxhdtp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEzOTEsImV4cCI6MjA4MDA5NzM5MX0.b-y_prO5ffMuSOs7rUvrMru4SDN06BHqyMsbUIDDdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data: draft, error: err1 } = await supabase.from('draft_pilotos').select('grid, season').limit(5);
    console.log('Draft Data Sample:', draft);
    
    const { data: countDraft } = await supabase.from('draft_pilotos').select('*', { count: 'exact', head: true });
    console.log('Total Draft Count:', countDraft);

    const { data: seasons } = await supabase.from('draft_pilotos').select('season').limit(10);
    console.log('Seasons in Draft:', seasons);
}

inspect();





