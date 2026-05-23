const { createClient } = require('@supabase/supabase-js');
const Papa = require('papaparse');

const supabaseUrl = 'https://ueqfmjwdijaeawvxhdtp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEzOTEsImV4cCI6MjA4MDA5NzM5MX0.b-y_prO5ffMuSOs7rUvrMru4SDN06BHqyMsbUIDDdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

const LINKS = {
    carreira: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=914372939&single=true&output=csv",
    light: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=905408135&single=true&output=csv"
};

async function fixContracts() {
    console.log('📥 Baixando dados do Draft das planilhas Google...');
    
    const pilotGridMap = {};

    try {
        // Carreira
        const resCarreira = await fetch(LINKS.carreira);
        const textCarreira = await resCarreira.text();
        const dataCarreira = Papa.parse(textCarreira, { header: true }).data;
        dataCarreira.forEach(p => {
            const cod = (p.cod_idml || p['COD IDML'] || '').trim().toUpperCase();
            if (cod) pilotGridMap[cod] = 'carreira';
        });

        // Light
        const resLight = await fetch(LINKS.light);
        const textLight = await resLight.text();
        const dataLight = Papa.parse(textLight, { header: true }).data;
        dataLight.forEach(p => {
            const cod = (p.cod_idml || p['COD IDML'] || '').trim().toUpperCase();
            if (cod) pilotGridMap[cod] = 'light';
        });

        console.log(`✅ ${Object.keys(pilotGridMap).length} pilotos mapeados do Draft.`);

        console.log('🔍 Buscando contratos da Temporada 20 no banco...');
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
                console.log(`🔄 Corrigindo contrato ${contract.id} (Piloto: ${codIdml}): ${contract.grid} -> ${correctGrid}`);
                const { error: updateError } = await supabase
                    .from('contracts')
                    .update({ grid: correctGrid })
                    .eq('id', contract.id);

                if (updateError) {
                    console.error(`❌ Erro ao atualizar contrato ${contract.id}:`, updateError);
                } else {
                    updatedCount++;
                }
            } else if (!correctGrid) {
                console.warn(`⚠️ Piloto ${codIdml} não encontrado no Draft!`);
            }
        }

        console.log(`\n🎉 Fim do processo. ${updatedCount} contratos foram corrigidos.`);
    } catch (err) {
        console.error('❌ Erro fatal:', err.message);
    }
}

fixContracts();
