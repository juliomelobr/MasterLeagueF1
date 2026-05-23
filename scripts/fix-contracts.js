const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ueqfmjwdijaeawvxhdtp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEzOTEsImV4cCI6MjA4MDA5NzM5MX0.b-y_prO5ffMuSOs7rUvrMru4SDN06BHqyMsbUIDDdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixContracts() {
    console.log('🔍 Buscando pilotos do Draft...');
    const { data: draftPilotos, error: draftError } = await supabase
        .from('draft_pilotos')
        .select('cod_idml, grid')
        .eq('season', 20);

    if (draftError) {
        console.error('❌ Erro ao buscar draft_pilotos:', draftError);
        return;
    }

    console.log(`✅ ${draftPilotos.length} pilotos encontrados no Draft.`);

    const pilotGridMap = {};
    draftPilotos.forEach(p => {
        if (p.cod_idml) {
            pilotGridMap[p.cod_idml.trim().toUpperCase()] = p.grid.toLowerCase();
        }
    });

    console.log('🔍 Buscando contratos da Temporada 20...');
    const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id, pilot_cod_idml, grid')
        .eq('season', 20);

    if (contractsError) {
        console.error('❌ Erro ao buscar contratos:', contractsError);
        return;
    }

    console.log(`✅ ${contracts.length} contratos encontrados.`);

    let updatedCount = 0;
    for (const contract of contracts) {
        const codIdml = (contract.pilot_cod_idml || '').trim().toUpperCase();
        const correctGrid = pilotGridMap[codIdml];

        if (correctGrid && contract.grid !== correctGrid) {
            console.log(`🔄 Atualizando contrato ${contract.id} (Piloto: ${codIdml}): ${contract.grid} -> ${correctGrid}`);
            const { error: updateError } = await supabase
                .from('contracts')
                .update({ grid: correctGrid })
                .eq('id', contract.id);

            if (updateError) {
                console.error(`❌ Erro ao atualizar contrato ${contract.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`\n🎉 Fim do processo. ${updatedCount} contratos foram corrigidos.`);
}

fixContracts();





