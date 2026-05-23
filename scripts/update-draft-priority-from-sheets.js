/**
 * Script para atualizar draft_priority e grid dos pilotos
 * baseado nas planilhas do Google Sheets
 * 
 * Grid Carreira: https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=914372939&single=true&output=csv
 * Grid Light: https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=905408135&single=true&output=csv
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// URLs das planilhas
const SHEET_CARREIRA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=914372939&single=true&output=csv';
const SHEET_LIGHT = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=905408135&single=true&output=csv';

/**
 * Baixa e parseia CSV
 */
async function fetchCSV(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        
        // Parse CSV simples
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            // Pular linhas vazias ou com critérios
            if (!values[0] || values[0].includes('CRITÉRISO') || values[0].includes('DRAFT')) {
                continue;
            }
            
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
        
        return data;
    } catch (error) {
        console.error(`❌ Erro ao baixar CSV de ${url}:`, error);
        throw error;
    }
}

/**
 * Normaliza nome do piloto para comparação
 */
function normalizeName(name) {
    if (!name) return '';
    return name
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/\s+/g, ' '); // Normaliza espaços
}

/**
 * Busca piloto no banco por nome (com tolerância a variações)
 */
async function findPilotByName(name, grid) {
    const normalized = normalizeName(name);
    
    // Primeiro, tentar busca exata
    let { data, error } = await supabase
        .from('pilotos')
        .select('id, nome, grid, draft_priority, status')
        .eq('nome', name)
        .single();
    
    if (data) return data;
    
    // Se não encontrou, buscar todos e comparar nomes normalizados
    const { data: allPilots, error: allError } = await supabase
        .from('pilotos')
        .select('id, nome, grid, draft_priority, status');
    
    if (allError) {
        console.error('❌ Erro ao buscar pilotos:', allError);
        return null;
    }
    
    // Buscar por nome normalizado
    const match = allPilots?.find(p => normalizeName(p.nome) === normalized);
    if (match) return match;
    
    // Buscar por nome parcial (para casos como "Lucas Raiol" vs "Lucas Raiol Silva")
    const partialMatch = allPilots?.find(p => {
        const pNormalized = normalizeName(p.nome);
        return pNormalized.includes(normalized) || normalized.includes(pNormalized);
    });
    
    return partialMatch || null;
}

/**
 * Atualiza draft_priority, grid e cod_idml de um piloto
 */
async function updatePilotData(pilotId, draftPriority, grid, codIdml) {
    const updateData = {
        draft_priority: draftPriority,
        grid: grid,
        status: 'ativo', // Garantir que está ativo
        updated_at: new Date().toISOString()
    };
    
    // Adicionar cod_idml se disponível
    if (codIdml) {
        updateData.cod_idml = codIdml;
    }

    const { data, error } = await supabase
        .from('pilotos')
        .update(updateData)
        .eq('id', pilotId)
        .select()
        .single();
    
    if (error) {
        console.error(`❌ Erro ao atualizar piloto ${pilotId}:`, error);
        return false;
    }
    
    return true;
}

/**
 * Processa planilha do Grid Carreira
 */
async function processCarreiraGrid() {
    console.log('\n📊 Processando Grid Carreira...');
    const data = await fetchCSV(SHEET_CARREIRA);
    
    const results = {
        updated: 0,
        notFound: [],
        errors: []
    };
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const nome = row['DRAFT CARREIRA'] || row['DRAFT CARREIRA'] || '';
        
        if (!nome || nome.trim() === '') continue;
        
        const draftPriority = parseInt(row['ORDEM ESCOLHA'] || row['#ESCOLHA'] || (i + 1));
        
        // Buscar código IDML na linha (procurar por coluna que contenha IDML)
        const codIdmlKey = Object.keys(row).find(key => 
            key.toUpperCase().includes('IDML') || 
            key.toUpperCase().includes('COD') && key.toUpperCase().includes('PILOTO')
        );
        const codIdml = codIdmlKey ? (row[codIdmlKey] || '').trim().toUpperCase() : null;
        
        if (isNaN(draftPriority)) {
            console.warn(`⚠️  Linha ${i + 1}: Prioridade inválida para ${nome}`);
            continue;
        }
        
        const pilot = await findPilotByName(nome, 'carreira');
        
        if (!pilot) {
            results.notFound.push({ nome, draftPriority });
            console.warn(`⚠️  Piloto não encontrado: ${nome} (Prioridade: ${draftPriority})`);
            continue;
        }
        
        const success = await updatePilotData(pilot.id, draftPriority, 'carreira', codIdml);
        
        if (success) {
            results.updated++;
            console.log(`✅ ${nome} - Prioridade ${draftPriority} (Grid: carreira)${codIdml ? ` [IDML: ${codIdml}]` : ''}`);
        } else {
            results.errors.push({ nome, draftPriority });
        }
    }
    
    return results;
}

/**
 * Processa planilha do Grid Light
 */
async function processLightGrid() {
    console.log('\n💡 Processando Grid Light...');
    const data = await fetchCSV(SHEET_LIGHT);
    
    const results = {
        updated: 0,
        notFound: [],
        errors: []
    };
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const nome = row['DRAFT CARREIRA'] || row['DRAFT CARREIRA'] || '';
        
        if (!nome || nome.trim() === '') continue;
        
        const draftPriority = parseInt(row['#ESCOLHA'] || row['ORDEM ESCOLHA'] || (i + 1));
        
        // Buscar código IDML na linha
        const codIdmlKey = Object.keys(row).find(key => 
            key.toUpperCase().includes('IDML') || 
            key.toUpperCase().includes('COD') && key.toUpperCase().includes('PILOTO')
        );
        const codIdml = codIdmlKey ? (row[codIdmlKey] || '').trim().toUpperCase() : null;
        
        if (isNaN(draftPriority)) {
            console.warn(`⚠️  Linha ${i + 1}: Prioridade inválida para ${nome}`);
            continue;
        }
        
        const pilot = await findPilotByName(nome, 'light');
        
        if (!pilot) {
            results.notFound.push({ nome, draftPriority });
            console.warn(`⚠️  Piloto não encontrado: ${nome} (Prioridade: ${draftPriority})`);
            continue;
        }
        
        const success = await updatePilotData(pilot.id, draftPriority, 'light', codIdml);
        
        if (success) {
            results.updated++;
            console.log(`✅ ${nome} - Prioridade ${draftPriority} (Grid: light)${codIdml ? ` [IDML: ${codIdml}]` : ''}`);
        } else {
            results.errors.push({ nome, draftPriority });
        }
    }
    
    return results;
}

/**
 * Função principal
 */
async function main() {
    console.log('🚀 Iniciando atualização de draft_priority e grid dos pilotos...\n');
    
    try {
        // Processar Grid Carreira
        const carreiraResults = await processCarreiraGrid();
        
        // Processar Grid Light
        const lightResults = await processLightGrid();
        
        // Resumo
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMO DA ATUALIZAÇÃO');
        console.log('='.repeat(60));
        
        console.log('\n🏎️  Grid Carreira:');
        console.log(`   ✅ Atualizados: ${carreiraResults.updated}`);
        console.log(`   ⚠️  Não encontrados: ${carreiraResults.notFound.length}`);
        if (carreiraResults.notFound.length > 0) {
            carreiraResults.notFound.forEach(p => {
                console.log(`      - ${p.nome} (Prioridade: ${p.draftPriority})`);
            });
        }
        console.log(`   ❌ Erros: ${carreiraResults.errors.length}`);
        
        console.log('\n💡 Grid Light:');
        console.log(`   ✅ Atualizados: ${lightResults.updated}`);
        console.log(`   ⚠️  Não encontrados: ${lightResults.notFound.length}`);
        if (lightResults.notFound.length > 0) {
            lightResults.notFound.forEach(p => {
                console.log(`      - ${p.nome} (Prioridade: ${p.draftPriority})`);
            });
        }
        console.log(`   ❌ Erros: ${lightResults.errors.length}`);
        
        const totalUpdated = carreiraResults.updated + lightResults.updated;
        const totalNotFound = carreiraResults.notFound.length + lightResults.notFound.length;
        
        console.log('\n' + '='.repeat(60));
        console.log(`✨ Total: ${totalUpdated} pilotos atualizados`);
        if (totalNotFound > 0) {
            console.log(`⚠️  ${totalNotFound} pilotos não encontrados no banco`);
        }
        console.log('='.repeat(60) + '\n');
        
    } catch (error) {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    }
}

// Executar
main();







