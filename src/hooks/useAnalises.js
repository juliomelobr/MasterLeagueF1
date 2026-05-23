import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { fetchGoogleSheetCsvText } from '../utils/fetchGoogleSheetCsv';

/**
 * Parser CSV robusto que lida com campos entre aspas
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Aspas escapadas
                current += '"';
                i++;
            } else {
                // Toggle estado de aspas
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Fim do campo
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    // Último campo
    result.push(current.trim());
    
    return result;
}

/**
 * Hook para buscar pilotos da planilha "CADASTRO MLF1"
 * NOVA ESTRUTURA:
 * - A (0): Nome Cadastrado
 * - B (1): Gamertag/ID
 * - C (2): WhatsApp
 * - D (3): Plataforma
 * - E (4): Grid
 * - H (7): E-mail Login (usado para login)
 * - O (14): Nome Piloto (nome oficial do piloto)
 */
export function usePilotosData() {
    const [pilotos, setPilotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPilotos = async () => {
            try {
                const normalizeName = (name) => (name || '')
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                // CADASTRO MLF1 (gid=1844400629)
                const sheetId = '2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x';
                const gid = '1844400629';
                const baseUrl = `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?gid=${gid}&single=true&output=csv`;
                const carreiraBaseUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1379467380&single=true&output=csv';
                const lightBaseUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1962038690&single=true&output=csv';

                const [cadastroCsv, carreiraCsv, lightCsv] = await Promise.all([
                    fetchGoogleSheetCsvText(baseUrl, { timeoutMs: 15000 }),
                    fetchGoogleSheetCsvText(carreiraBaseUrl, { timeoutMs: 15000 }),
                    fetchGoogleSheetCsvText(lightBaseUrl, { timeoutMs: 15000 }),
                ]);

                if (!cadastroCsv?.trim() || !carreiraCsv?.trim() || !lightCsv?.trim()) {
                    const errors = [];
                    if (!cadastroCsv?.trim()) errors.push('Cadastro: vazio');
                    if (!carreiraCsv?.trim()) errors.push('Carreira: vazio');
                    if (!lightCsv?.trim()) errors.push('Light: vazio');
                    console.error('❌ Erros ao carregar planilhas:', errors);
                    throw new Error(`Erro ao carregar planilhas: ${errors.join(', ')}`);
                }
                
                // Verificar se alguma resposta é HTML (erro do proxy)
                const csvs = [cadastroCsv, carreiraCsv, lightCsv];
                const csvNames = ['Cadastro', 'Carreira', 'Light'];
                for (let i = 0; i < csvs.length; i++) {
                    if (csvs[i].trim().startsWith('<!DOCTYPE') || csvs[i].trim().startsWith('<html')) {
                        console.error(`❌ ${csvNames[i]} retornou HTML ao invés de CSV`);
                        throw new Error(`${csvNames[i]} retornou HTML. A planilha pode não estar acessível.`);
                    }
                }

                const cadastroLines = cadastroCsv.split('\n').slice(1); // Skip header
                const carreiraLines = carreiraCsv.split('\n').slice(1);
                const lightLines = lightCsv.split('\n').slice(1);

                console.log('📋 Total de linhas (cadastro):', cadastroLines.length);
                console.log('📋 Total de linhas (carreira):', carreiraLines.length);
                console.log('📋 Total de linhas (light):', lightLines.length);

                const cadastroProcessado = cadastroLines
                    .filter(line => line.trim())
                    .map((line, idx) => {
                        const values = parseCSVLine(line);
                        
                        // Debug primeira linha
                        if (idx === 0) {
                            console.log('🔍 Primeira linha valores:', values);
                            console.log('  - Nome Cadastrado (col A/0):', values[0]);
                            console.log('  - Gamertag (col B/1):', values[1]);
                            console.log('  - WhatsApp (col C/2):', values[2]);
                            console.log('  - Plataforma (col D/3):', values[3]);
                            console.log('  - Grid (col E/4):', values[4]);
                            console.log('  - E-mail Login (col H/7):', values[7]);
                            console.log('  - Nome Piloto (col O/14):', values[14]);
                        }

                        // NOVA ESTRUTURA - CADASTRO MLF1
                        const nomeCadastrado = (values[0] || '').trim(); // Coluna A
                        const gamertag = (values[1] || '').trim(); // Coluna B
                        const whatsapp = (values[2] || '').trim(); // Coluna C
                        const plataformaRaw = (values[3] || '').trim(); // Coluna D
                        const gridRaw = (values[4] || '').toString().trim().toLowerCase(); // Coluna E
                        const emailLogin = (values[7] || '').trim(); // Coluna H - E-mail Login
                        const nomePiloto = (values[14] || nomeCadastrado || '').trim(); // Coluna O - Nome Piloto
                        
                        // Determina grid
                        let grid = 'carreira';
                        if (gridRaw.includes('light')) grid = 'light';
                        if (gridRaw.includes('carreira')) grid = 'carreira';
                        
                        return {
                            nome: nomePiloto.toUpperCase(), // Nome oficial da coluna O
                            nomeCadastrado: nomeCadastrado, // Nome completo da coluna A
                            gamertag: gamertag,
                            whatsapp: whatsapp,
                            grid: grid,
                            email: emailLogin, // Email da coluna H
                            plataforma: plataformaRaw,
                            // Gera o nome da foto: remove espaços, acentos e converte para lowercase
                            fotoNome: nomePiloto.toLowerCase()
                                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                .replace(/\s+/g, '')
                        };
                    })
                    .filter(p => p.email && p.nome); // Precisa ter email (coluna H) e nome (coluna O)

                const cadastroMap = new Map();
                cadastroProcessado.forEach((piloto) => {
                    const key = normalizeName(piloto.nome);
                    if (!cadastroMap.has(key)) {
                        cadastroMap.set(key, piloto);
                        return;
                    }

                    const existente = cadastroMap.get(key);
                    if (existente.grid !== 'carreira' && piloto.grid === 'carreira') {
                        cadastroMap.set(key, piloto);
                    }
                });

                const parseGridNames = (lines, gridName) => {
                    const nomes = [];
                    lines.filter(line => line.trim()).forEach((line) => {
                        const values = parseCSVLine(line);
                        const nome = (values[0] || '').trim(); // Coluna A
                        if (nome) {
                            nomes.push({
                                nome,
                                grid: gridName
                            });
                        }
                    });
                    return nomes;
                };

                const dedupeByGrid = (items) => {
                    const gridMap = new Map();
                    items.forEach((item) => {
                        const key = normalizeName(item.nome);
                        if (!gridMap.has(key)) {
                            gridMap.set(key, item);
                        }
                    });
                    return Array.from(gridMap.values());
                };

                const nomesCarreira = dedupeByGrid(parseGridNames(carreiraLines, 'carreira'));
                const nomesLight = dedupeByGrid(parseGridNames(lightLines, 'light'));

                const pilotosFinal = [...nomesCarreira, ...nomesLight].map((item) => {
                    const key = normalizeName(item.nome);
                    const cadastro = cadastroMap.get(key);
                    if (cadastro) {
                        return {
                            ...cadastro,
                            nome: item.nome.toUpperCase(),
                            grid: item.grid
                        };
                    }

                    return {
                        nome: item.nome.toUpperCase(),
                        nomeCadastrado: item.nome,
                        gamertag: '',
                        whatsapp: '',
                        grid: item.grid,
                        email: '',
                        plataforma: '',
                        fotoNome: item.nome.toLowerCase()
                            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                            .replace(/\s+/g, '')
                    };
                });

                console.log('✅ Pilotos processados:', pilotosFinal.length);
                if (pilotosFinal.length > 0) {
                    console.log('🎮 Primeiro piloto:', pilotosFinal[0]);
                }

                setPilotos(pilotosFinal);
            } catch (err) {
                console.error('❌ Erro ao carregar pilotos das planilhas:', err);
                console.log('🔄 Tentando buscar pilotos do Supabase como fallback...');
                
                // Fallback: buscar pilotos do Supabase
                try {
                    const { data: pilotosSupabase, error: supabaseError } = await supabase
                        .from('pilotos')
                        .select('id, nome, email, grid, gamertag, whatsapp');
                    
                    if (supabaseError) {
                        console.error('❌ Erro ao buscar pilotos do Supabase:', supabaseError);
                        setError(err.message);
                    } else if (pilotosSupabase && pilotosSupabase.length > 0) {
                        const pilotosFormatados = pilotosSupabase.map(p => ({
                            nome: p.nome.toUpperCase(),
                            nomeCadastrado: p.nome,
                            gamertag: p.gamertag || '',
                            whatsapp: p.whatsapp || '',
                            grid: (p.grid || 'carreira').toLowerCase(),
                            email: p.email || '',
                            plataforma: '',
                            fotoNome: (p.nome || '').toLowerCase()
                                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                .replace(/\s+/g, '')
                        }));
                        console.log('✅ Pilotos carregados do Supabase (fallback):', pilotosFormatados.length);
                        setPilotos(pilotosFormatados);
                    } else {
                        setError(err.message);
                    }
                } catch (fallbackErr) {
                    console.error('❌ Erro no fallback do Supabase:', fallbackErr);
                    setError(err.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPilotos();
    }, []);

    return { pilotos, loading, error };
}

/**
 * Converte uma data de quinta-feira (Carreira) para a segunda-feira anterior (Light)
 * Subtrai 3 dias da data original (DD/MM/YY)
 */
export const calcLightDate = (carreiraDate) => {
    if (!carreiraDate || !carreiraDate.includes('/')) return carreiraDate;
    try {
        const parts = carreiraDate.split('/');
        if (parts.length !== 3) return carreiraDate;
        
        const [day, month, year] = parts;
        const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
        const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
        
        // Subtrai 3 dias (Quinta -> Segunda)
        date.setDate(date.getDate() - 3);
        
        const newDay = String(date.getDate()).padStart(2, '0');
        const newMonth = String(date.getMonth() + 1).padStart(2, '0');
        const newYear = String(date.getFullYear()).slice(-2);
        
        return `${newDay}/${newMonth}/${newYear}`;
    } catch (e) {
        console.error('Erro ao calcular data Light:', e);
        return carreiraDate;
    }
};

/** Fallback de 8 etapas quando cache/Sheets falham (ex.: site publicado com rede lenta ou CORS) */
function getFallbackEtapas() {
    const fallbackEtapas = [];
    for (let i = 1; i <= 8; i++) {
        fallbackEtapas.push({ round: i, date: '-', circuit: `Etapa ${i}` });
    }
    return fallbackEtapas;
}

/** Normaliza linha do cache: Supabase pode devolver array ou objeto; devolve array de valores. */
function normalizeRow(row) {
    if (Array.isArray(row)) return row;
    if (row && typeof row === 'object') {
        const keys = Object.keys(row).sort();
        return keys.map(k => row[k] ?? '');
    }
    return [row];
}

/**
 * Hook para buscar etapas do calendário por temporada.
 * Usa Supabase cache primeiro, com fallback para Google Sheets.
 */
export function useCalendarioTemporada(temporada = 20) {
    // Inicializar já com 8 etapas fallback: no site publicado o select nunca fica vazio
    const [etapas, setEtapas] = useState(() => getFallbackEtapas());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const CALENDARIO_TIMEOUT_MS = 12000; // 12s: evita loading infinito no site publicado

        const fetchCalendario = async () => {
            let rows = null;

            try {
                // 1. Tentar buscar do Supabase cache primeiro
                try {
                    const { data: cacheData, error: cacheError } = await supabase
                        .from('calendario_cache')
                        .select('*')
                        .eq('season', temporada)
                        .order('last_synced_at', { ascending: false })
                        .limit(1);

                    if (!cacheError && cacheData && cacheData.length > 0 && cacheData[0].data?.rows) {
                        const raw = cacheData[0].data.rows;
                        rows = Array.isArray(raw) ? raw.map(normalizeRow) : [];
                        if (rows.length > 0) {
                            console.log('📅 Calendário carregado do Supabase cache:', rows.length, 'linhas');
                        }
                    }
                } catch (supabaseErr) {
                    console.warn('⚠️ Erro ao buscar calendário do Supabase:', supabaseErr?.message || supabaseErr);
                }

                // 2. Se não encontrou no cache, tentar Google Sheets via proxy (com timeout)
                if (!rows || rows.length === 0) {
                    console.log('📅 Tentando carregar calendário do Google Sheets...');
                    const baseUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=0&single=true&output=csv';
                    const csv = await fetchGoogleSheetCsvText(baseUrl, { timeoutMs: 15000 });
                    if (!csv?.trim()) throw new Error('Calendário CSV vazio');
                    rows = csv.split('\n').map(line => parseCSVLine(line));
                    console.log('📅 Calendário carregado do Google Sheets:', rows.length, 'linhas');
                }

                // 3. Processar as linhas para extrair etapas
                const etapasProcessadas = [];
                for (let i = 0; i < rows.length; i++) {
                    const values = normalizeRow(rows[i]);
                    const firstCol = (values[0] || '').toString().toLowerCase();

                    if (firstCol.includes('etapa')) {
                        const etapaMatch = (values[0] || '').toString().match(/etapa\s*(\d+)/i);
                        const round = etapaMatch ? parseInt(etapaMatch[1]) : null;
                        const date = (values[2] || '').toString().trim();
                        const circuit = (values[3] || '').toString().trim();
                        if (round && circuit) {
                            etapasProcessadas.push({ round, date, circuit });
                        }
                    }
                }

                if (etapasProcessadas.length === 0) {
                    console.warn('⚠️ Nenhuma etapa encontrada. Usando fallback de 8 etapas.');
                    setEtapas(getFallbackEtapas());
                } else {
                    setEtapas(etapasProcessadas);
                }
            } catch (err) {
                console.error('❌ Erro ao carregar calendário:', err?.message || err);
                setError(err?.message || null);
                setEtapas(getFallbackEtapas());
                console.log('📅 Usando fallback de 8 etapas genéricas');
            } finally {
                setLoading(false);
            }
        };

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('timeout')), CALENDARIO_TIMEOUT_MS);
        });

        Promise.race([fetchCalendario(), timeoutPromise]).catch(() => {
            setLoading(false);
            setEtapas(getFallbackEtapas());
            setError('timeout');
            console.warn('📅 Calendário: timeout, usando 8 etapas fallback');
        });
    }, [temporada]);

    return { etapas, loading, error };
}

/**
 * Compatibilidade com chamadas legadas.
 */
export function useCalendarioT20() {
    return useCalendarioTemporada(20);
}

/**
 * Gera código de Lance no formato STW-{Grid}{Season}{Round}{Order}
 * Ex: STW-C190301 (Carreira, Season 19, Round 03, 1º incident)
 */
export function generateLanceCode(grid, season, round, order) {
    const gridPrefix = grid === 'carreira' ? 'C' : 'L';
    return `STW-${gridPrefix}${String(season).slice(-2)}${String(round).padStart(2, '0')}${String(order).padStart(2, '0')}`;
}

/**
 * Calcula pontos de penalidade baseado no tipo
 * Absolvido=0, Advertência=0, Leve=5, Média=10, Grave=15, Gravíssima=20
 * Se agravante=true, adiciona +5
 */
export function calculatePenaltyPoints(penaltyType, agravante = false) {
    const basePoints = {
        'absolvido': 0,
        'advertencia': 0,
        'leve': 5,
        'media': 10,
        'grave': 15,
        'gravissima': 20,
    };

    const points = basePoints[penaltyType] || 0;
    return agravante ? points + 5 : points;
}

/**
 * Verifica se piloto levou race ban (total >20 pontos)
 */
export function shouldApplyRaceBan(totalPoints) {
    return totalPoints > 20;
}

/**
 * Formata timezone BRT (UTC-3)
 * Retorna uma data ajustada para o fuso de Brasília (America/Sao_Paulo)
 */
export function getBRTDeadline(dayOffset = 1) {
    const brtDate = getCurrentBRT();
    brtDate.setDate(brtDate.getDate() + dayOffset);
    brtDate.setHours(20, 0, 0, 0); // 20:00 BRT
    return brtDate;
}

/**
 * Verifica se deadline de acusação foi atingido (para Grid Light)
 */
export function isDeadlineExceeded(deadline) {
    return getCurrentBRT() > deadline;
}

/**
 * Obtém o horário atual em BRT (UTC-3)
 * Funciona independente do fuso horário configurado no dispositivo do usuário
 */
function getCurrentBRT() {
    const now = new Date();
    // Converte para string no fuso de SP e cria um novo objeto Date
    const brtString = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    return new Date(brtString);
}

/**
 * Verifica se pode enviar acusação baseado no grid e horário atual
 * Grid Light: pode enviar de Segunda 20:15h até Terça 20:00h BRT
 * Grid Carreira: pode enviar até Sexta 20:00h BRT
 */
export function canSubmitAcusacao(grid) {
    const brtNow = getCurrentBRT();
    const dayOfWeek = brtNow.getDay(); // 0 = Domingo, 1 = Segunda, 2 = Terça, ..., 5 = Sexta
    const hours = brtNow.getHours();
    const minutes = brtNow.getMinutes();
    
    if (grid === 'light') {
        // Grid Light: Segunda 20:15h até Terça 20:00h
        if (dayOfWeek === 1) {
            // Segunda: só pode se for após 20:15h
            return hours > 20 || (hours === 20 && minutes >= 15);
        } else if (dayOfWeek === 2) {
            // Terça: só pode se for antes de 20:00h (até 19:59:59)
            return hours < 20;
        }
        return false; // Outros dias não podem
    } else {
        // Grid Carreira: pode enviar até Sexta 20:00h
        if (dayOfWeek === 5) {
            // Sexta: só pode se for antes de 20:00h (até 19:59:59)
            return hours < 20;
        } else if (dayOfWeek >= 1 && dayOfWeek < 5) {
            // Segunda a Quinta: pode enviar
            return true;
        }
        return false; // Fim de semana não pode
    }
}

/**
 * Calcula o deadline para defesa baseado na data da acusação
 * Grid Light: até Quarta 12:00h BRT (1 dia após receber acusação)
 * Grid Carreira: até Sábado 12:00h BRT (1 dia após receber acusação)
 */
export function getDefesaDeadline(acusacaoDate, grid) {
    if (!acusacaoDate) return null;
    const acusacao = new Date(acusacaoDate);
    const deadline = new Date(acusacao);
    // Adicionar 1 dia e definir para 12:00h (meio-dia)
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(12, 0, 0, 0);
    return deadline;
}

/**
 * Verifica se pode enviar defesa baseado na data da acusação e grid
 * Grid Light: até Quarta 12:00h BRT (após receber acusação)
 * Grid Carreira: até Sábado 12:00h BRT (após receber acusação)
 */
export function canSubmitDefesa(acusacaoDate, grid) {
    if (!acusacaoDate) return false;
    const deadline = getDefesaDeadline(acusacaoDate, grid);
    if (!deadline) return false;
    const now = new Date();
    return now <= deadline;
}

/**
 * Atualiza automaticamente lances com deadline de defesa expirado
 * Muda status de 'aguardando_defesa' para 'aguardando_analise' quando o prazo passa
 */
export async function atualizarLancesComDefesaExpirada(supabase) {
    try {
        // Buscar todos os lances aguardando defesa
        const { data: lancesPendentes, error: fetchError } = await supabase
            .from('notificacoes_admin')
            .select('id, dados, created_at')
            .eq('tipo', 'nova_acusacao')
            .eq('dados->>status', 'aguardando_defesa');

        if (fetchError) {
            console.error('❌ Erro ao buscar lances pendentes:', fetchError);
            return { success: false, error: fetchError, updated: 0 };
        }

        if (!lancesPendentes || lancesPendentes.length === 0) {
            return { success: true, updated: 0, message: 'Nenhum lance pendente encontrado' };
        }

        const now = new Date();
        const lancesParaAtualizar = [];

        // Verificar quais lances têm deadline expirado
        for (const lance of lancesPendentes) {
            const dados = lance.dados || {};
            
            // Verificar se já tem defesa enviada - se tiver, não atualizar
            if (dados.defesa && dados.defesa.descricaoDefesa) {
                continue; // Já tem defesa, não atualizar
            }
            
            const grid = dados.acusador?.grid || dados.grid;
            const dataAcusacao = lance.created_at || dados.dataEnvio;
            
            if (!dataAcusacao || !grid) continue;

            const deadline = getDefesaDeadline(dataAcusacao, grid);
            if (!deadline) continue;

            // Se o deadline passou, marcar para atualizar
            if (now > deadline) {
                lancesParaAtualizar.push({
                    id: lance.id,
                    dadosAtualizados: {
                        ...dados,
                        status: 'aguardando_analise',
                        // Manter defesa se existir, senão deixar null
                        defesa: dados.defesa || null
                    }
                });
            }
        }

        if (lancesParaAtualizar.length === 0) {
            return { success: true, updated: 0, message: 'Nenhum lance com deadline expirado' };
        }

        // Atualizar todos os lances de uma vez
        const updates = lancesParaAtualizar.map(lance => 
            supabase
                .from('notificacoes_admin')
                .update({
                    dados: lance.dadosAtualizados,
                    lido: false // Marcar como não lido para alertar admin
                })
                .eq('id', lance.id)
        );

        const results = await Promise.all(updates);
        const errors = results.filter(r => r.error);
        
        if (errors.length > 0) {
            console.error('❌ Erros ao atualizar alguns lances:', errors);
            return { 
                success: false, 
                updated: lancesParaAtualizar.length - errors.length,
                errors: errors.map(e => e.error),
                total: lancesParaAtualizar.length
            };
        }

        console.log(`✅ ${lancesParaAtualizar.length} lance(s) atualizado(s) para 'aguardando_analise' (deadline de defesa expirado)`);
        
        // Notificar todos os jurados cadastrados sobre os lances movidos para análise
        try {
            const { data: juradosAtivos, error: errorJurados } = await supabase
                .from('jurados')
                .select('nome, whatsapp, email_google')
                .eq('ativo', true)
                .not('whatsapp', 'is', null);
            
            if (!errorJurados && juradosAtivos && juradosAtivos.length > 0) {
                const SITE_URL = 'https://masterleaguef1.com.br';
                const { sendWhatsappNotification } = await import('../utils/whatsappNotify');
                
                for (const lanceAtualizado of lancesParaAtualizar) {
                    const dados = lanceAtualizado.dadosAtualizados;
                    const codigoLance = dados.codigoLance || 'N/A';
                    const acusador = dados.acusador?.nome || dados.acusador?.gamertag || 'N/A';
                    const acusado = dados.acusado?.nome || dados.acusado?.gamertag || 'N/A';
                    const etapa = dados.etapa?.circuit 
                        ? `${dados.etapa.round} - ${dados.etapa.circuit}`
                        : (dados.etapa?.round || 'N/A');
                    const grid = dados.acusador?.grid?.toUpperCase() || 'N/A';
                    
                    const mensagemJurados = `👨‍⚖️ *NOVO LANCE PARA ANÁLISE - MASTER LEAGUE F1*\n\n` +
                        `🔖 *Código:* ${codigoLance}\n` +
                        `🏁 *Etapa:* ${etapa}\n` +
                        `🏎️ *Grid:* ${grid}\n` +
                        `👤 *Acusador:* ${acusador}\n` +
                        `🎯 *Acusado:* ${acusado}\n` +
                        `⚠️ *Defesa não enviada no prazo*\n\n` +
                        `📋 *Acesse o Painel do Júri para analisar:*\n` +
                        `🔗 ${SITE_URL}/painel-veredito\n\n` +
                        `⏰ ${new Date().toLocaleString('pt-BR')}`;
                    
                    // Enviar notificação para cada jurado ativo
                    for (const jurado of juradosAtivos) {
                        if (jurado.whatsapp) {
                            try {
                                await sendWhatsappNotification({
                                    phone: jurado.whatsapp,
                                    email: jurado.email_google || `${jurado.whatsapp}@masterleaguef1.com`,
                                    nome: jurado.nome || 'Jurado',
                                    message: mensagemJurados
                                });
                                // Pequeno delay entre envios
                                await new Promise(resolve => setTimeout(resolve, 500));
                            } catch (err) {
                                console.error(`❌ Erro ao enviar notificação para jurado ${jurado.nome}:`, err);
                            }
                        }
                    }
                }
                
                console.log(`📬 Notificações enviadas para ${juradosAtivos.length} jurado(s) sobre ${lancesParaAtualizar.length} lance(s) movido(s) para análise`);
            }
        } catch (err) {
            console.error('⚠️ Erro ao enviar notificações para jurados:', err);
            // Não bloquear o fluxo principal se a notificação falhar
        }
        
        return { 
            success: true, 
            updated: lancesParaAtualizar.length,
            message: `${lancesParaAtualizar.length} lance(s) movido(s) para análise`
        };

    } catch (error) {
        console.error('❌ Erro ao atualizar lances com defesa expirada:', error);
        return { success: false, error: error.message, updated: 0 };
    }
}
