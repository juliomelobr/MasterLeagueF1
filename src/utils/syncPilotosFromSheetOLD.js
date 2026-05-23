import { supabase } from '../supabaseClient';
import Papa from 'papaparse';

// CADASTRO MLF1 (gid=1844400629)
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1844400629&single=true&output=csv';
// Pilotos PR (gid=884534812) - Para buscar COD IDML
const PILOTOS_PR_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=884534812&single=true&output=csv';

/**
 * Busca COD IDML da planilha "Pilotos PR" pelo nome do piloto
 */
async function buscarCodIdmlPorNome(nomePiloto) {
    try {
        const response = await fetch(PILOTOS_PR_CSV_URL);
        if (!response.ok) {
            console.warn('⚠️ Erro ao buscar planilha Pilotos PR:', response.status);
            return null;
        }
        
        const csvText = await response.text();
        
        return new Promise((resolve) => {
            Papa.parse(csvText, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    const rows = results.data;
                    if (rows.length < 2) {
                        resolve(null);
                        return;
                    }
                    
                    // Normalizar nome para comparação
                    const normalizarNome = (nome) => {
                        return nome
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, ' '); // Normaliza espaços
                    };
                    
                    const nomeNormalizado = normalizarNome(nomePiloto);
                    
                    // Buscar na planilha (Drivers = coluna A, COD IDML = coluna B)
                    const match = rows.find((row, index) => {
                        if (index === 0) return false; // Pular cabeçalho
                        const driverName = normalizarNome(row[0] || '');
                        // Busca exata ou parcial
                        return driverName === nomeNormalizado || 
                               driverName.includes(nomeNormalizado) || 
                               nomeNormalizado.includes(driverName);
                    });
                    
                    if (match && match[1]) {
                        const codIdml = match[1].trim();
                        console.log(`✅ COD IDML encontrado para ${nomePiloto}: ${codIdml}`);
                        resolve(codIdml);
                    } else {
                        console.warn(`⚠️ COD IDML não encontrado para: ${nomePiloto}`);
                        resolve(null);
                    }
                },
                error: () => {
                    resolve(null);
                }
            });
        });
    } catch (err) {
        console.error('❌ Erro ao buscar COD IDML:', err);
        return null;
    }
}

/**
 * Sincroniza pilotos da planilha "CONTROLE ML1" (aba INSCRIÇÃO T20) com Supabase
 * Agora também busca e inclui o COD IDML da planilha "Pilotos PR"
 */
export async function syncPilotosFromSheet() {
    try {
        console.log('🔄 Iniciando sincronização...');
        console.log('📡 URL:', SHEET_CSV_URL);

        // 1. Buscar dados da planilha
        const response = await fetch(SHEET_CSV_URL);
        console.log('📥 Status da resposta:', response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const csvText = await response.text();
        console.log('📄 Tamanho do CSV:', csvText.length, 'caracteres');
        console.log('📄 Primeiros 500 caracteres:', csvText.substring(0, 500));

        // Parse CSV
        const lines = csvText.split('\n').filter(line => line.trim().length > 0);
        console.log('📋 Total de linhas:', lines.length);

        if (lines.length < 2) {
            return { success: false, count: 0, error: 'Planilha vazia ou sem dados' };
        }

        // Mostrar cabeçalho para debug
        const headerFields = parseCSVLine(lines[0]);
        console.log('📋 Colunas do cabeçalho:', headerFields.length);
        headerFields.forEach((col, idx) => {
            console.log(`   Coluna ${idx} (${String.fromCharCode(65 + idx)}): "${col}"`);
        });

        const pilotosParaInserir = [];

        // Processar cada linha (começando da linha 1, pulando cabeçalho)
        for (let i = 1; i < lines.length; i++) {
            const fields = parseCSVLine(lines[i]);
            
            // Preencher campos faltantes com string vazia
            while (fields.length < 20) fields.push('');

            // Mapeamento conforme informado:
            // Coluna A (0) = Nome
            // Coluna B (1) = Gamertag
            // Coluna C (2) = WhatsApp  
            // Coluna D (3) = Plataforma
            // Coluna E (4) = Grid
            // Coluna F (5) = Email (alternativo)
            // Coluna H (7) = E-mail Login (principal - usado para autenticação)
            // Coluna O (14) = Nome do Piloto
            // Coluna P (15) = COD IDML (se disponível na planilha)
            const nome = (fields[14] || fields[0] || '').trim();
            const gamertag = (fields[1] || '').trim();
            const whatsapp = (fields[2] || '').trim();
            const plataformaRaw = (fields[3] || '').trim();
            const gridRaw = (fields[4] || '').trim();
            const emailColunaH = (fields[7] || '').trim().toLowerCase(); // Coluna H - E-mail Login (principal)
            const emailColunaF = (fields[5] || '').trim().toLowerCase(); // Coluna F - Email alternativo
            const codIdmlColunaP = (fields[15] || '').trim(); // Coluna P - COD IDML (se disponível)

            // Usar email da coluna H (principal), se vazio, usar coluna F como fallback
            const email = emailColunaH || emailColunaF;

            console.log(`Linha ${i + 1}: Gamertag="${gamertag}", Email="${email}", Nome="${nome}", Grid="${gridRaw}"`);

            // Validar campos obrigatórios
            if (!email || !nome) {
                console.warn(`⚠️ Linha ${i + 1} ignorada - email: "${email}", nome: "${nome}"`);
                continue;
            }

            // Extrair grid
            let grid = 'carreira';
            if (gridRaw.toLowerCase().includes('light')) {
                grid = 'light';
            } else if (gridRaw.toLowerCase().includes('carreira')) {
                grid = 'carreira';
            }

            // Extrair plataforma
            let plataforma = 'PC';
            const platLower = plataformaRaw.toLowerCase();
            if (platLower.includes('playstation') || platLower.includes('ps')) {
                plataforma = 'PlayStation';
            } else if (platLower.includes('xbox')) {
                plataforma = 'Xbox';
            } else if (platLower.includes('pc')) {
                plataforma = 'PC';
            }

            // Buscar COD IDML: primeiro da coluna P (se disponível), senão da planilha Pilotos PR
            let codIdml = codIdmlColunaP || null;
            if (!codIdml) {
                codIdml = await buscarCodIdmlPorNome(nome);
            } else {
                console.log(`✅ COD IDML encontrado na coluna P: ${codIdml}`);
            }
            
            pilotosParaInserir.push({
                email: email, // Email da coluna H (E-mail Login)
                nome,
                whatsapp: whatsapp || null,
                grid,
                equipe: null,
                is_steward: false,
                cod_idml: codIdml || null // COD IDML da coluna P ou da planilha Pilotos PR
            });

            console.log(`✅ Piloto adicionado: ${nome} (${email}) - Grid: ${grid}${codIdml ? ` - COD IDML: ${codIdml}` : ''}`);
        }

        console.log(`📊 Total de pilotos para inserir: ${pilotosParaInserir.length}`);

        if (pilotosParaInserir.length === 0) {
            return { success: false, count: 0, error: 'Nenhum piloto válido encontrado na planilha' };
        }

        // Inserir no Supabase
        console.log('💾 Inserindo no Supabase...');
        
        const { data, error } = await supabase
            .from('pilotos')
            .upsert(pilotosParaInserir, { 
                onConflict: 'email',
                ignoreDuplicates: false
            })
            .select();

        if (error) {
            console.error('❌ Erro do Supabase:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Dados inseridos:', data);
        console.log(`✅ Sincronização concluída! ${pilotosParaInserir.length} pilotos processados`);
        
        return { success: true, count: pilotosParaInserir.length };

    } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Busca um piloto específico na planilha "CADASTRO MLF1" pelo e-mail de login
 * NOVA ESTRUTURA:
 * - Email de login: Coluna H (índice 7) - "E-mail Login"
 * - WhatsApp: Coluna C (índice 2) - "WhatsApp"
 * - Nome do Piloto: Coluna O (índice 14) - "Nome Piloto"
 * Retorna os dados do piloto ou null se não encontrar
 */
export async function findDriverByEmail(userEmail) {
    try {
        console.log('🔍 Buscando piloto na planilha CADASTRO MLF1 para:', userEmail);
        console.log('📡 URL da planilha:', SHEET_CSV_URL);
        
        const response = await fetch(SHEET_CSV_URL);
        console.log('📥 Status HTTP:', response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log('📄 Tamanho do CSV:', csvText.length, 'caracteres');
        
        const lines = csvText.split('\n').filter(line => line.trim().length > 0);
        console.log('📋 Total de linhas:', lines.length);
        
        if (lines.length < 2) {
            return { found: false, error: 'Planilha vazia ou inacessível' };
        }

        // Analisar cabeçalho
        const headerFields = parseCSVLine(lines[0]);
        console.log('📋 Cabeçalho (total de colunas):', headerFields.length);
        console.log('📋 Nomes das colunas:', headerFields);

        const targetEmail = userEmail.trim().toLowerCase();
        console.log('🎯 E-mail procurado (coluna H):', targetEmail);

        // Buscar APENAS na coluna H (índice 7) - "E-mail Login"
        for (let i = 1; i < lines.length; i++) {
            const fields = parseCSVLine(lines[i]);
            while (fields.length < 20) fields.push('');

            // Email de login está na coluna H (índice 7)
            const emailLogin = (fields[7] || '').trim().toLowerCase();

            // Se encontrar o e-mail na coluna H
            if (emailLogin === targetEmail) {
                const nomeCadastrado = (fields[0] || '').trim(); // Coluna A
                const nomePiloto = (fields[14] || nomeCadastrado || '').trim(); // Coluna O (Nome Piloto)
                const whatsappRaw = (fields[2] || '').trim(); // Coluna C (WhatsApp)
                const gamertag = (fields[1] || '').trim(); // Coluna B (Gamertag/ID)
                const gridRaw = (fields[4] || '').trim(); // Coluna E (Grid)
                const plataformaRaw = (fields[3] || '').trim(); // Coluna D (Plataforma)

                console.log('\n✅ PILOTO ENCONTRADO!');
                console.log('   Nome Cadastrado (A):', nomeCadastrado);
                console.log('   Nome Piloto (O):', nomePiloto);
                console.log('   Email Login (H):', targetEmail);
                console.log('   WhatsApp (C):', whatsappRaw);
                console.log('   Grid (E):', gridRaw);
                console.log('   Plataforma (D):', plataformaRaw);

                // Determinar Grid
                let grid = 'carreira';
                if (gridRaw.toLowerCase().includes('light')) grid = 'light';
                
                // Determinar Plataforma
                let plataforma = 'PC';
                const platLower = plataformaRaw.toLowerCase();
                if (platLower.includes('playstation') || platLower.includes('ps')) plataforma = 'PlayStation';
                else if (platLower.includes('xbox')) plataforma = 'Xbox';
                else if (platLower.includes('pc')) plataforma = 'PC';

                return {
                    found: true,
                    nome: nomePiloto, // Usar nome da coluna O
                    nomeCadastrado: nomeCadastrado, // Nome completo da coluna A
                    whatsappEsperado: whatsappRaw,
                    email: targetEmail,
                    gamertag: gamertag || null,
                    grid,
                    plataforma
                };
            }
        }

        console.log('\n❌ E-mail NÃO ENCONTRADO na coluna H (E-mail Login)');
        console.log(`   Total de linhas verificadas: ${lines.length - 1}`);
        return { found: false, error: 'E-mail não encontrado na planilha CADASTRO MLF1' };

    } catch (error) {
        console.error('❌ Erro ao buscar na planilha:', error);
        return { found: false, error: error.message };
    }
}

/**
 * Busca um piloto específico na planilha e o insere no Supabase
 * @param {string} userEmail - Email do piloto para buscar
 * @returns {Promise<{found: boolean, piloto?: object, dadosPlanilha?: object, error?: string}>}
 */
export async function findAndSyncPilotoFromSheet(userEmail) {
    try {
        console.log('🔍 Buscando e sincronizando piloto da planilha para:', userEmail);
        
        // Buscar na planilha
        const result = await findDriverByEmail(userEmail);
        
        if (!result.found) {
            return { found: false, error: result.error || 'E-mail não encontrado na planilha' };
        }
        
        console.log('✅ Piloto encontrado na planilha. Inserindo no Supabase...');
        
        // Buscar COD IDML da planilha Pilotos PR
        const codIdml = await buscarCodIdmlPorNome(result.nome);
        
        // Preparar dados para inserção no Supabase
        const pilotoData = {
            email: result.email.toLowerCase().trim(),
            nome: result.nome,
            whatsapp: result.whatsappEsperado || null,
            grid: result.grid,
            equipe: null,
            is_steward: false,
            cod_idml: codIdml || null // COD IDML da planilha Pilotos PR
        };
        
        console.log('📋 Dados a inserir:', pilotoData);
        
        // Inserir no Supabase (upsert - atualiza se existir, cria se não existir)
        const { data: pilotoInserido, error: insertError } = await supabase
            .from('pilotos')
            .upsert(pilotoData, { 
                onConflict: 'email',
                ignoreDuplicates: false
            })
            .select()
            .single();
        
        if (insertError) {
            console.error('❌ Erro ao inserir piloto no Supabase:', insertError);
            return { found: true, error: `Erro ao inserir no Supabase: ${insertError.message}` };
        }
        
        console.log('✅ Piloto inserido/sincronizado no Supabase com sucesso!');
        return { 
            found: true, 
            piloto: pilotoInserido,
            dadosPlanilha: result // Manter dados da planilha para validação de WhatsApp
        };
        
    } catch (error) {
        console.error('❌ Erro ao buscar e sincronizar piloto:', error);
        return { found: false, error: error.message };
    }
}

/**
 * Parser CSV que respeita campos com aspas
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}
