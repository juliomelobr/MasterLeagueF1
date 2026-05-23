import { supabase } from '../supabaseClient';
import Papa from 'papaparse';

// URLs das planilhas do Google Sheets (CSV export)
// IMPORTANTE: Conforme as planilhas fornecidas:
// - gid=905408135 = DRAFT LIGHT
// - gid=914372939 = DRAFT CARREIRA
const SHEET_URLS = {
    light: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=905408135&single=true&output=csv',
    carreira: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=914372939&single=true&output=csv'
};

/**
 * Normaliza o COD IDML para garantir consistência
 */
function normalizeCodIdml(cod) {
    if (!cod) return null;
    return String(cod).trim().toUpperCase();
}

/**
 * Processa os dados da planilha e retorna array de pilotos
 */
function processSheetData(csvText, grid) {
    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                console.log(`📊 Processando ${results.data.length} linhas do grid ${grid}`);
                
                const pilotos = results.data
                    .map((row, index) => {
                        // Extrair dados das colunas
                        const nome = (row['DRAFT LIGHT'] || row['DRAFT CARREIRA'] || '').trim();
                        const ordemEscolha = parseInt(row['ORDEM ESCOLHA'] || row['#ESCOLHA'] || index + 1);
                        const season = parseInt(row['SEASON'] || 20);
                        const powerRankingPts = parseInt(row['POWER PTS'] || 0);
                        const whatsapp = (row['WHATSAPP'] || '').trim();
                        const codIdml = normalizeCodIdml(row['COD IDML'] || '');

                        console.log(`  Linha ${index + 1}: ${nome} | COD: ${codIdml} | Grid: ${grid}`);

                        // Validar dados mínimos
                        if (!nome || nome === '') {
                            console.warn(`  ⚠️ Linha ${index + 1} ignorada: nome vazio`);
                            return null;
                        }

                        return {
                            nome,
                            grid,
                            ordem_escolha: ordemEscolha,
                            season,
                            power_ranking_pts: powerRankingPts,
                            whatsapp: whatsapp || null,
                            cod_idml: codIdml || null
                        };
                    })
                    .filter(p => p !== null);

                console.log(`✅ ${pilotos.length} pilotos válidos encontrados no grid ${grid}`);
                resolve({ pilotos, total: results.data.length });
            },
            error: (error) => {
                console.error(`❌ Erro ao parsear CSV do grid ${grid}:`, error);
                reject(error);
            }
        });
    });
}

/**
 * Importa pilotos de um grid específico
 */
export async function importDraftPilotos(grid, replace = false) {
    try {
        console.log(`🔄 Iniciando importação do grid: ${grid} (replace: ${replace})`);
        
        const url = SHEET_URLS[grid];
        if (!url) {
            throw new Error(`Grid inválido: ${grid}`);
        }

        // Buscar dados da planilha
        console.log(`📡 Buscando dados de: ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }

        const csvText = await response.text();
        console.log(`📄 CSV recebido: ${csvText.length} caracteres`);

        // Processar dados
        const { pilotos, total } = await processSheetData(csvText, grid);

        if (pilotos.length === 0) {
            return {
                success: false,
                error: 'Nenhum piloto válido encontrado na planilha',
                imported: 0,
                total: total || 0
            };
        }

        // Se replace = true, deletar todos os pilotos desse grid primeiro
        if (replace) {
            console.log(`🗑️ Deletando pilotos existentes do grid ${grid}...`);
            const { error: deleteError } = await supabase
                .from('draft_pilotos')
                .delete()
                .eq('grid', grid);

            if (deleteError) {
                console.error('❌ Erro ao deletar pilotos:', deleteError);
                throw deleteError;
            }
            console.log(`✅ Pilotos do grid ${grid} deletados`);
        }

        // Inserir pilotos no Supabase
        console.log(`💾 Inserindo ${pilotos.length} pilotos no Supabase...`);
        const { data, error } = await supabase
            .from('draft_pilotos')
            .upsert(pilotos, {
                onConflict: 'nome,grid,season',
                ignoreDuplicates: false
            })
            .select();

        if (error) {
            console.error('❌ Erro ao inserir pilotos:', error);
            throw error;
        }

        console.log(`✅ ${data?.length || pilotos.length} pilotos importados com sucesso!`);
        
        return {
            success: true,
            imported: data?.length || pilotos.length,
            pilotos: data || pilotos,
            total
        };

    } catch (error) {
        console.error(`❌ Erro na importação do grid ${grid}:`, error);
        return {
            success: false,
            error: error.message,
            imported: 0
        };
    }
}

/**
 * Importa pilotos de ambos os grids
 */
export async function importAllDraftPilotos(replace = false) {
    try {
        console.log(`🔄 Iniciando importação de TODOS os grids (replace: ${replace})`);
        
        const resultLight = await importDraftPilotos('light', replace);
        const resultCarreira = await importDraftPilotos('carreira', replace);

        const totalImported = (resultLight.imported || 0) + (resultCarreira.imported || 0);
        const hasError = !resultLight.success || !resultCarreira.success;

        return {
            success: !hasError,
            totalImported,
            light: resultLight,
            carreira: resultCarreira,
            error: hasError ? 'Erro em um ou mais grids' : null
        };

    } catch (error) {
        console.error('❌ Erro na importação geral:', error);
        return {
            success: false,
            error: error.message,
            totalImported: 0
        };
    }
}

/**
 * Busca pilotos do draft no Supabase
 */
export async function getDraftPilotos(grid = null) {
    try {
        let query = supabase
            .from('draft_pilotos')
            .select('*')
            .order('ordem_escolha', { ascending: true });

        if (grid) {
            query = query.eq('grid', grid);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ Erro ao buscar pilotos do draft:', error);
            throw error;
        }

        return {
            success: true,
            pilotos: data || []
        };

    } catch (error) {
        console.error('❌ Erro ao buscar pilotos:', error);
        return {
            success: false,
            error: error.message,
            pilotos: []
        };
    }
}




