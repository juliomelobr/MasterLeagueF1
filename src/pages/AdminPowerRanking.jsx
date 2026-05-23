import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { usePowerRankingCache, usePowerRankingLightCache } from '../hooks/useSupabaseCache';
import { useLeagueData } from '../hooks/useLeagueData';
import '../index.css';
import { gerarObjetivosPorEquipe } from '../utils/powerRankingObjectives';
import { fetchSeasonLifecycleConfig, canEditPowerRanking, phaseLabelPt } from '../utils/seasonLifecycle';
import { fetchGoogleSheetCsvText } from '../utils/fetchGoogleSheetCsv';
import { buildStatsUpsertForMotorhome, displayPilarInt } from '../utils/powerRankingMotorhome';

// Cores dos pilares
const COLORS = {
    PILOTO: '#000000',
    POWER_RANKING: '#FFD700', // Amarelo
    PERFORMANCE: '#3B82F6', // Azul
    CONDUTA: '#22C55E', // Verde
    RACECRAFT: '#EF4444', // Vermelho
    OVERALL: '#8B5CF6', // Roxo
    HISTORICO: '#475569' // Cinza escuro
};

const DRAFT_URLS = {
    carreira: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=914372939&single=true&output=csv',
    light: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=905408135&single=true&output=csv',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AdminPowerRanking() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [pilotos, setPilotos] = useState([]);
    const [condutaData, setCondutaData] = useState({}); // { piloto_id: { round: {...} } }
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGrid, setSelectedGrid] = useState('all'); // 'all', 'carreira', 'light'
    const [selectedSeason, setSelectedSeason] = useState(20); // Mantido para carregar dados
    const [seasonCtx, setSeasonCtx] = useState(null);
    const [saving, setSaving] = useState({}); // { piloto_id_round: true/false }
    const [isPublishing, setIsPublishing] = useState(false);
    const [hasSupabaseSession, setHasSupabaseSession] = useState(null);

    const fetchActiveAuthUser = useCallback(async () => {
        const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;
        if (sessionRes?.session?.user) return sessionRes.session.user;

        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) {
            const msg = userErr?.message || '';
            if (/auth session missing/i.test(msg)) return null;
            throw userErr;
        }
        return userRes?.user || null;
    }, []);

    useEffect(() => {
        let cancelled = false;
        const refreshSessionState = async () => {
            try {
                const user = await fetchActiveAuthUser();
                if (!cancelled) setHasSupabaseSession(Boolean(user));
            } catch {
                if (!cancelled) setHasSupabaseSession(false);
            }
        };
        refreshSessionState();
        window.addEventListener('focus', refreshSessionState);
        return () => {
            cancelled = true;
            window.removeEventListener('focus', refreshSessionState);
        };
    }, [fetchActiveAuthUser]);

    const handleRecalcularTudo = () => {
        if (seasonCtx != null && !canEditPowerRanking(seasonCtx, selectedSeason)) {
            alert('🔒 Temporada somente leitura (fase encerrada/pré-temporada ou outra temporada).');
            return;
        }
        setObjetivosData({});
        setObjetivosTextos({});
        setPilaresData({});
        setPrData({});
        pilaresDataRef.current = {};
        setRecalculoVersion((prev) => prev + 1);
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const c = await fetchSeasonLifecycleConfig();
                if (!cancelled) {
                    setSeasonCtx(c);
                    if (c?.currentSeason) setSelectedSeason(c.currentSeason);
                }
            } catch (e) {
                console.warn('season lifecycle config:', e);
            }
        })();
        return () => { cancelled = true; };
    }, []);
    
    const { data: rawPRCarreira, loading: loadingPRCarreira } = usePowerRankingCache(selectedSeason);
    const { data: rawPRLight, loading: loadingPRLight } = usePowerRankingLightCache(selectedSeason);
    const { rawCarreira, rawLight, draftCarreira, draftLight } = useLeagueData();
    const loadingPR = loadingPRCarreira || loadingPRLight;
    const [prData, setPrData] = useState({}); // { nome_piloto: { total, performance, conduta, racecraft, overall, historico } }
    const [pilaresData, setPilaresData] = useState({}); // { nome_piloto: { performance, conduta, racecraft, overall, historico } }
    const pilaresDataRef = useRef({}); // Ref para preservar valores sem causar re-renderizações
    const [historicoData, setHistoricoData] = useState({}); // { nome_piloto: { temporadas: { season: prValue } } }
    const [historicoBrutoData, setHistoricoBrutoData] = useState({}); // { nome_piloto: valorBruto } - valores brutos antes da normalização
    const [temporadasData, setTemporadasData] = useState({}); // { nome_piloto: quantidadeTemporadas }
    const [corridasData, setCorridasData] = useState({}); // { nome_piloto: { total: número, pontuacao: 60-100 } }
    const [telemetriaData, setTelemetriaData] = useState({}); // { nome_piloto: { ritmoCorrida: delta, ritmoClassificacao: score } }
    const [pontosData, setPontosData] = useState({}); // { nome_piloto: { corrida: total, sprint: total, qualy: total } }
    const [objetivosData, setObjetivosData] = useState({}); // { nome_piloto: { objetivo1: pontos, objetivo2: pontos, ... } }
    const [objetivosTextos, setObjetivosTextos] = useState({}); // { nome_piloto: [texto1, texto2, ...] }
    const [objetivosClassificacaoVersion, setObjetivosClassificacaoVersion] = useState(0);
    const [recalculoVersion, setRecalculoVersion] = useState(0);
    const [punicoesData, setPunicoesData] = useState({}); // { nome_piloto: total_pontos_veredito }
    const [defesasFaltantesData, setDefesasFaltantesData] = useState({}); // { nome_piloto: quantidade_faltas_defesa }
    const [advertenciasData, setAdvertenciasData] = useState({}); // { nome_piloto: quantidade_advertencias }

    // Função para calcular faltas verificando se o piloto tem registro em cada etapa nos Resultados
    const calcularFaltasPorResultados = useCallback((pilotoObj) => {
        if (!pilotoObj || (!rawCarreira.length && !rawLight.length)) return 0;
        
        const gridPiloto = (pilotoObj.grid || 'carreira').toLowerCase();
        const dados = gridPiloto === 'light' ? rawLight : rawCarreira;
        const nomePiloto = (pilotoObj.nome || '').trim();
        
        const normalizarNomeLocal = (nome) => {
            if (!nome) return '';
            return String(nome)
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };
        
        const nomePilotoNorm = normalizarNomeLocal(nomePiloto);
        const etapas = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08'];
        const etapasNumeros = ['1', '2', '3', '4', '5', '6', '7', '8'];
        
        const etapasRealizadas = new Set();
        dados.forEach(row => {
            const season = parseInt(row[3] || '0');
            const round = (row[4] || '').trim();
            if (season === parseInt(selectedSeason) && round && (etapas.includes(round) || etapasNumeros.includes(round))) {
                const roundNormalizado = etapasNumeros.includes(round) ? `R0${round}` : round;
                etapasRealizadas.add(roundNormalizado);
            }
        });
        
        if (etapasRealizadas.size === 0) return 0;
        
        const etapasComPresenca = new Set();
        dados.forEach(row => {
            const nome = (row[9] || '').trim();
            const season = parseInt(row[3] || '0');
            const round = (row[4] || '').trim();
            const nomeNorm = normalizarNomeLocal(nome);
            const roundNormalizado = etapasNumeros.includes(round) ? `R0${round}` : round;
            
            if (season === parseInt(selectedSeason) && nomeNorm === nomePilotoNorm && round && etapasRealizadas.has(roundNormalizado)) {
                etapasComPresenca.add(roundNormalizado);
            }
        });
        
        return Math.max(0, etapasRealizadas.size - etapasComPresenca.size);
    }, [rawCarreira, rawLight, selectedSeason]);

    // Função auxiliar para buscar pontos de punição com matching flexível
    const buscarPunicoes = useCallback((nomePiloto) => {
        if (!nomePiloto) return 0;
        // Tentar match exato primeiro
        if (punicoesData[nomePiloto] !== undefined) {
            return punicoesData[nomePiloto];
        }
        // Tentar match normalizado
        const nomeNorm = (nomePiloto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
        const nomeEncontrado = Object.keys(punicoesData).find(n => {
            const nNorm = (n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
            return nNorm === nomeNorm;
        });
        return nomeEncontrado ? punicoesData[nomeEncontrado] : 0;
    }, [punicoesData]);

    // Função auxiliar para buscar defesas faltantes com matching flexível
    const buscarDefesasFaltantes = useCallback((nomePiloto) => {
        if (!nomePiloto) return 0;
        // Tentar match exato primeiro
        if (defesasFaltantesData[nomePiloto] !== undefined) {
            return defesasFaltantesData[nomePiloto];
        }
        // Tentar match normalizado
        const nomeNorm = (nomePiloto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
        const nomeEncontrado = Object.keys(defesasFaltantesData).find(n => {
            const nNorm = (n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
            return nNorm === nomeNorm;
        });
        return nomeEncontrado ? defesasFaltantesData[nomeEncontrado] : 0;
    }, [defesasFaltantesData]);

    // Função auxiliar para buscar advertências com matching flexível
    const buscarAdvertencias = useCallback((nomePiloto) => {
        if (!nomePiloto) return 0;
        // Tentar match exato primeiro
        if (advertenciasData[nomePiloto] !== undefined) {
            return advertenciasData[nomePiloto];
        }
        // Tentar match normalizado
        const nomeNorm = (nomePiloto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
        const nomeEncontrado = Object.keys(advertenciasData).find(n => {
            const nNorm = (n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
            return nNorm === nomeNorm;
        });
        return nomeEncontrado ? advertenciasData[nomeEncontrado] : 0;
    }, [advertenciasData]);

    // Carregar pilotos baseado nas tabelas de classificação (Carreira e Light)
    // Determinar grid verificando em qual tabela o piloto aparece com equipe
    useEffect(() => {
        const carregarPilotosPorClassificacao = async () => {
            try {
                // Aguardar dados de classificação carregarem
                if (!rawCarreira || !rawLight || rawCarreira.length === 0 || rawLight.length === 0) {
                    return; // Aguardar dados carregarem
                }

                // 1. Buscar todos os pilotos da tabela pilotos
                const { data: allPilotos, error: pilotosError } = await supabase
                    .from('pilotos')
                    .select('id, nome, equipe, grid, cod_idml')
                    .in('grid', ['carreira', 'light'])
                    .order('nome');

                if (pilotosError) {
                    // Se der erro por coluna não existir, tentar sem cod_idml
                    if (pilotosError.message?.includes('column') && pilotosError.message?.includes('cod_idml')) {
                        const { data: pilotosSemCod, error: errorSemCod } = await supabase
                            .from('pilotos')
                            .select('id, nome, equipe, grid')
                            .in('grid', ['carreira', 'light'])
                            .order('nome');
                        
                        if (errorSemCod) throw errorSemCod;
                        // Continuar com pilotosSemCod
                        return;
                    }
                    throw pilotosError;
                }

                if (!allPilotos || allPilotos.length === 0) {
                    setPilotos([]);
                    return;
                }


                // 2. Função para normalizar nome (definir antes de usar)
                const normalizarNome = (nome) => {
                    return (nome || '')
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/\s+/g, ' ') // Normalizar espaços múltiplos
                        .trim();
                };
                
                // 3. Analisar tabelas de classificação para determinar grid de cada piloto
                // Estrutura: row[9] = nome piloto, row[10] = equipe, row[3] = temporada
                const pilotosPorGrid = { carreira: new Set(), light: new Set() };
                
                // Processar classificação Carreira
                rawCarreira.forEach(row => {
                    const nome = (row[9] || '').trim();
                    const equipe = (row[10] || '').trim();
                    const season = parseInt(row[3] || '0');
                    
                    // Verificar se é da temporada atual e tem equipe válida (não é reserva)
                    if (nome && equipe && season === selectedSeason) {
                        const equipeLower = equipe.toLowerCase();
                        // Excluir reservas
                        if (!equipeLower.includes('reserva') && equipeLower !== 'reserva' && equipe !== '') {
                            pilotosPorGrid.carreira.add(nome);
                        }
                    }
                });
                
                // Processar classificação Light
                rawLight.forEach(row => {
                    const nome = (row[9] || '').trim();
                    const equipe = (row[10] || '').trim();
                    const season = parseInt(row[3] || '0');
                    
                    // Verificar se é da temporada atual e tem equipe válida (não é reserva)
                    if (nome && equipe && season === selectedSeason) {
                        const equipeLower = equipe.toLowerCase();
                        // Excluir reservas
                        if (!equipeLower.includes('reserva') && equipeLower !== 'reserva' && equipe !== '') {
                            pilotosPorGrid.light.add(nome);
                        }
                    }
                });

                // 3.1 Complementar com o draft da temporada selecionada:
                // garante presença no painel mesmo sem corrida registrada na etapa 1.
                const addDraftPilotos = (rows, gridKey) => {
                    (rows || []).forEach((row) => {
                        const nome = (row?.[0] || '').toString().trim();
                        if (!nome || nome === 'Piloto' || nome === 'NOME' || nome === 'Nome' || nome.includes('#')) return;
                        const season = parseInt(String(row?.[2] ?? '').trim(), 10);
                        if (season !== parseInt(selectedSeason, 10)) return;
                        pilotosPorGrid[gridKey].add(nome);
                    });
                };

                addDraftPilotos(draftCarreira, 'carreira');
                addDraftPilotos(draftLight, 'light');
                

                // Função auxiliar para busca flexível (tenta diferentes variações)
                const nomesSaoSimilares = (nome1, nome2) => {
                    const norm1 = normalizarNome(nome1);
                    const norm2 = normalizarNome(nome2);
                    
                    // Match exato após normalização
                    if (norm1 === norm2) return true;
                    
                    // Match se ambos contêm palavras-chave importantes
                    const palavras1 = norm1.split(/\s+/).filter(p => p.length > 2);
                    const palavras2 = norm2.split(/\s+/).filter(p => p.length > 2);
                    
                    // Se pelo menos 2 palavras importantes coincidem, considerar similar
                    const palavrasComuns = palavras1.filter(p => palavras2.includes(p));
                    if (palavrasComuns.length >= 2) return true;
                    
                    // Match parcial (um nome contém o outro)
                    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
                    
                    return false;
                };

                // 4. Criar mapas de nomes normalizados das classificações para busca mais eficiente
                // Também criar mapas originais para busca flexível
                const nomesCarreiraNormalizados = new Set(
                    Array.from(pilotosPorGrid.carreira).map(n => normalizarNome(n))
                );
                const nomesLightNormalizados = new Set(
                    Array.from(pilotosPorGrid.light).map(n => normalizarNome(n))
                );
                
                // Mapas originais para busca flexível
                const nomesCarreiraOriginais = Array.from(pilotosPorGrid.carreira);
                const nomesLightOriginais = Array.from(pilotosPorGrid.light);

                // 5. Determinar grid de cada piloto e evitar duplicações
                // Usar Map com nome normalizado como chave para evitar duplicações por nome
                const pilotosUnicos = new Map(); // key: nome normalizado
                const pilotosPorId = new Map(); // key: id (para referência)
                
                allPilotos.forEach(piloto => {
                    const nomeNormalizado = normalizarNome(piloto.nome);
                    
                    // Verificar se já existe piloto com mesmo nome normalizado
                    if (pilotosUnicos.has(nomeNormalizado)) {
                        // Se já existe, não adicionar novamente (manter o primeiro encontrado)
                        return;
                    }
                    
                    // Verificar se já existe piloto com mesmo ID
                    if (pilotosPorId.has(piloto.id)) {
                        return;
                    }
                    
                    // Busca exata primeiro
                    let estaNoCarreira = nomesCarreiraNormalizados.has(nomeNormalizado);
                    let estaNoLight = nomesLightNormalizados.has(nomeNormalizado);
                    
                    // Se não encontrou por busca exata, tentar busca flexível
                    if (!estaNoCarreira && !estaNoLight) {
                        estaNoCarreira = nomesCarreiraOriginais.some(nomeClass => 
                            nomesSaoSimilares(piloto.nome, nomeClass)
                        );
                        estaNoLight = nomesLightOriginais.some(nomeClass => 
                            nomesSaoSimilares(piloto.nome, nomeClass)
                        );
                        
                    }
                    
                    // Determinar grid: priorizar onde aparece, se aparecer em ambos, usar carreira
                    let gridDeterminado = null;
                    if (estaNoCarreira && !estaNoLight) {
                        gridDeterminado = 'carreira';
                    } else if (estaNoLight && !estaNoCarreira) {
                        gridDeterminado = 'light';
                    } else if (estaNoCarreira && estaNoLight) {
                        // Se aparecer em ambos, usar carreira (ou pode ser um erro nos dados)
                        gridDeterminado = 'carreira';
                    } else {
                        // Se não aparecer em nenhum, não incluir (pode ser reserva ou não ter corrido)
                        return;
                    }
                    
                    // Adicionar ao Map usando nome normalizado como chave
                    pilotosUnicos.set(nomeNormalizado, {
                        ...piloto,
                        grid: gridDeterminado
                    });
                    pilotosPorId.set(piloto.id, piloto);
                });

                // 6. Adicionar pilotos que aparecem nas classificações mas não estão na tabela pilotos
                // Isso cobre casos de pilotos novos que ainda não foram cadastrados
                const pilotosNasClassificacoes = new Set([
                    ...Array.from(pilotosPorGrid.carreira),
                    ...Array.from(pilotosPorGrid.light)
                ]);
                
                pilotosNasClassificacoes.forEach(nomeNaClassificacao => {
                    const nomeNormalizado = normalizarNome(nomeNaClassificacao);
                    
                    // Verificar se já existe este piloto (por nome normalizado)
                    if (pilotosUnicos.has(nomeNormalizado)) {
                        return; // Já existe, pular
                    }
                    
                    // Determinar o grid deste piloto
                    const estaNoCarreira = pilotosPorGrid.carreira.has(nomeNaClassificacao);
                    const estaNoLight = pilotosPorGrid.light.has(nomeNaClassificacao);
                    
                    let gridDeterminado = null;
                    if (estaNoCarreira && !estaNoLight) {
                        gridDeterminado = 'carreira';
                    } else if (estaNoLight && !estaNoCarreira) {
                        gridDeterminado = 'light';
                    } else if (estaNoCarreira && estaNoLight) {
                        gridDeterminado = 'carreira'; // Priorizar carreira
                    }
                    
                    // Buscar equipe nas classificações
                    const dadosGrid = gridDeterminado === 'carreira' ? rawCarreira : rawLight;
                    const linhaComEquipe = dadosGrid.find(row => {
                        const nome = (row[9] || '').trim();
                        const season = parseInt(row[3] || '0');
                        return nome === nomeNaClassificacao && season === selectedSeason;
                    });
                    
                    const equipe = linhaComEquipe ? (linhaComEquipe[10] || '').trim() : 'Equipe não definida';
                    
                    // Criar piloto temporário (sem ID do Supabase)
                    const pilotoTemp = {
                        id: `temp_${nomeNormalizado}`, // ID temporário
                        nome: nomeNaClassificacao,
                        equipe: equipe,
                        grid: gridDeterminado,
                        _isTemp: true // Flag para indicar que é temporário
                    };
                    
                    pilotosUnicos.set(nomeNormalizado, pilotoTemp);
                });

                const pilotosFinais = Array.from(pilotosUnicos.values());

                setPilotos(pilotosFinais);
            } catch (err) {
                console.error('Erro ao carregar pilotos por classificação:', err);
                alert('❌ Erro ao carregar pilotos: ' + (err.message || 'Erro desconhecido'));
            }
        };

        carregarPilotosPorClassificacao();
    }, [selectedSeason, rawCarreira, rawLight, draftCarreira, draftLight]);

    // Carregar dados de conduta
    useEffect(() => {
        const carregarConduta = async () => {
            try {
                const { data, error } = await supabase
                    .from('power_ranking_conduta')
                    .select('*')
                    .eq('season', selectedSeason);

                if (error) {
                    // Verificar se é erro de tabela não encontrada (404, 406, PGRST116, PGRST205)
                    const errorCode = error.code || error.status;
                    const isTableNotFound = 
                        errorCode === 'PGRST205' || 
                        errorCode === 'PGRST116' ||
                        errorCode === 404 ||
                        errorCode === 406 ||
                        error.message?.includes('does not exist') ||
                        error.message?.includes('not found') ||
                        error.message?.includes('Could not find the table');
                    
                    if (isTableNotFound) {
                        console.warn('⚠️ Tabela power_ranking_conduta não existe ainda. Execute o script SQL em scripts/create_power_ranking_conduta.sql');
                        console.info('📖 Veja scripts/README_POWER_RANKING_CONDUTA.md para instruções detalhadas');
                        // Inicializar com dados vazios para não quebrar a aplicação
                        setCondutaData({});
                        return;
                    }
                    
                    throw error;
                }

                // Organizar por piloto_id -> round
                const organized = {};
                (data || []).forEach(item => {
                    if (!organized[item.piloto_id]) {
                        organized[item.piloto_id] = {};
                    }
                    organized[item.piloto_id][item.round] = item;
                });

                setCondutaData(organized);
            } catch (err) {
                console.error('❌ Erro ao carregar dados de conduta:', err);
                // Inicializar com dados vazios para não quebrar a aplicação
                setCondutaData({});
            }
        };

        if (selectedSeason) {
            carregarConduta();
        }
    }, [selectedSeason]);
    
    // Carregar punições e defesas da Central de Análises e Tabela de Vereditos
    useEffect(() => {
        const carregarDadosAdministrativos = async () => {
            if (!selectedSeason) return;
            
            try {
                // Acumular DIRETAMENTE por nome do piloto (sem usar Map por lanceId)
                // Isso garante que todas as análises sejam contabilizadas
                const punicoesPorPiloto = {}; // { nome: totalPontos }
                const advertenciasPorPiloto = {}; // { nome: count }
                const faltasDefesaPorPiloto = {}; // { nome: count }
                const lancesProcessados = new Set(); // Para evitar duplicidade por item.id

                // 1. Buscar da Central de Análises (notificacoes_admin - Sistema de Júri)
                const { data: notificacoes, error: notifyError } = await supabase
                    .from('notificacoes_admin')
                    .select('*');

                if (notifyError) throw notifyError;

                const punicoesTabela = {
                    'advertencia': { pontos: 0 },  // Alerta Disciplinar = 0pts (sem desconto)
                    'leve': { pontos: 5 },
                    'media': { pontos: 10 },
                    'grave': { pontos: 15 },
                    'gravissima': { pontos: 20 }
                };

                notificacoes?.forEach(item => {
                    if (item.tipo !== 'nova_acusacao' && item.tipo !== 'analise_realizada') return;
                    
                    const dados = item.dados || {};
                    const season = parseInt(dados.season || dados.temporada || 0);
                    if (season !== parseInt(selectedSeason)) return;

                    const nomeAcusado = typeof dados.acusado === 'string' ? dados.acusado : dados.acusado?.nome;
                    if (!nomeAcusado) return;

                    const lanceId = dados.id || dados.lance_id || item.id;
                    const votos = dados.votos || [];
                    const votosCulpadoCount = votos.filter(v => v.culpado).length;
                    const votosInocenteCount = votos.filter(v => !v.culpado).length;
                    const decidido = dados.status === 'analise_realizada' || votosCulpadoCount >= 3 || votosInocenteCount >= 3;
                    
                    // Debug: Log para pilotos específicos
                    if (nomeAcusado.toLowerCase().includes('lucas') || nomeAcusado.toLowerCase().includes('monteiro')) {
                        console.log(`🔍 [DEBUG] Processando lance de ${nomeAcusado}:`, {
                            lanceId,
                            status: dados.status,
                            votosCulpado: votosCulpadoCount,
                            votosInocente: votosInocenteCount,
                            decidido,
                            temVeredito: !!dados.veredito,
                            vereditoSemVideo: dados.veredito?.semVideo,
                            temDefesa: !!(dados.defesa && (dados.defesa.descricaoDefesa || dados.defesa.videoLinkDefesa)),
                            votosSemVideo: votos.filter(v => v.semVideo).length
                        });
                    }

                    // Verificar falta de vídeo TAMBÉM quando há veredito com semVideo, independente de "decidido"
                    const vereditoAtual = dados.veredito;
                    if (vereditoAtual && vereditoAtual.semVideo) {
                        faltasDefesaPorPiloto[nomeAcusado] = (faltasDefesaPorPiloto[nomeAcusado] || 0) + 1;
                        console.log(`📹 [DEFESA VIA VEREDITO] ${nomeAcusado}: semVideo=true no veredito. Total: ${faltasDefesaPorPiloto[nomeAcusado]}`);
                    } else if (decidido) {
                        // Verificar se houve perda de pontos por não enviar vídeo de defesa
                        // Isso pode estar no veredito.semVideo ou nos votos individuais
                        let semVideoDefesa = false;
                        
                        // 1. Verificar no veredito finalizado (prioridade máxima)
                        const vereditoCheck = dados.veredito;
                        if (vereditoCheck && vereditoCheck.semVideo) {
                            semVideoDefesa = true;
                            console.log(`📹 [DEFESA] ${nomeAcusado}: semVideo no veredito`);
                        }
                        
                        // 2. Verificar nos votos individuais (qualquer voto com semVideo)
                        if (!semVideoDefesa) {
                            const votosSemVideo = votos.filter(v => v.semVideo).length;
                            if (votosSemVideo > 0) {
                                semVideoDefesa = true;
                                console.log(`📹 [DEFESA] ${nomeAcusado}: ${votosSemVideo} voto(s) com semVideo`);
                            }
                        }
                        
                        // 3. Fallback: verificar se não há defesa enviada (método antigo)
                        if (!semVideoDefesa) {
                            const temDefesa = dados.defesa && (dados.defesa.descricaoDefesa || dados.defesa.videoLinkDefesa);
                            if (!temDefesa) {
                                semVideoDefesa = true;
                                console.log(`📹 [DEFESA] ${nomeAcusado}: sem defesa enviada (fallback)`);
                            }
                        }
                        
                        if (semVideoDefesa) {
                            faltasDefesaPorPiloto[nomeAcusado] = (faltasDefesaPorPiloto[nomeAcusado] || 0) + 1;
                            console.log(`📹 [DEFESA] Contabilizando falta de defesa para ${nomeAcusado}. Total: ${faltasDefesaPorPiloto[nomeAcusado]}`);
                        }
                    }

                    let pontosDeducted = 0;
                    let punicaoTipo = null;
                    const veredito = dados.veredito;
                    
                    if (veredito && veredito.culpado) {
                        // Piloto foi julgado CULPADO - pegar pontos perdidos do veredito
                        pontosDeducted = veredito.pontosPerdidos || 0;
                        punicaoTipo = veredito.punicao || null;
                    } else if (veredito && !veredito.culpado && veredito.semVideo) {
                        // Piloto foi INOCENTADO mas perdeu pontos por não enviar vídeo
                        pontosDeducted = veredito.pontosPerdidos || 5; // Geralmente 5 pontos
                        punicaoTipo = 'semVideo';
                        console.log(`📹 [PUNIÇÃO] ${nomeAcusado}: INOCENTADO mas sem vídeo, pontos perdidos: ${pontosDeducted}`);
                    } else if (votosCulpadoCount >= 3) {
                        const contagemPunicoes = {};
                        let temAgravante = false;
                        votos.filter(v => v.culpado).forEach(v => {
                            const key = v.punicao;
                            contagemPunicoes[key] = (contagemPunicoes[key] || 0) + 1;
                            if (v.agravante) temAgravante = true;
                        });
                        let punicaoMaisVotada = null;
                        let maxVotos = 0;
                        Object.entries(contagemPunicoes).forEach(([punicao, count]) => {
                            if (count > maxVotos) { maxVotos = count; punicaoMaisVotada = punicao; }
                        });
                        if (punicaoMaisVotada && punicoesTabela[punicaoMaisVotada]) {
                            pontosDeducted = punicoesTabela[punicaoMaisVotada].pontos + (temAgravante ? 5 : 0);
                            punicaoTipo = punicaoMaisVotada;
                        }
                    }

                    // Usar item.id para evitar processar o mesmo registro duas vezes
                    const registroId = item.id;
                    
                    if (pontosDeducted > 0 && !lancesProcessados.has(registroId)) {
                        lancesProcessados.add(registroId);
                        
                        // Acumular punições diretamente por piloto
                        punicoesPorPiloto[nomeAcusado] = (punicoesPorPiloto[nomeAcusado] || 0) + pontosDeducted;
                        
                        // Debug para TODOS os pilotos com punições
                        console.log(`💰 [PUNIÇÃO] ${nomeAcusado} Registro ${registroId}:`, {
                            pontosDeducted,
                            punicaoTipo,
                            culpado: veredito?.culpado,
                            semVideo: veredito?.semVideo,
                            pontosPerdidosVeredito: veredito?.pontosPerdidos,
                            totalAcumulado: punicoesPorPiloto[nomeAcusado]
                        });
                    }

                    if (punicaoTipo === 'advertencia' && !lancesProcessados.has(`adv_${registroId}`)) {
                        lancesProcessados.add(`adv_${registroId}`);
                        advertenciasPorPiloto[nomeAcusado] = (advertenciasPorPiloto[nomeAcusado] || 0) + 1;
                    }
                });

                // 2. Buscar da Tabela de Vereditos (verdicts - Sistema de Stewards)
                const { data: verdicts, error: verdictsError } = await supabase
                    .from('verdicts')
                    .select(`
                        id,
                        pontos_deducted,
                        lance_id,
                        lances!inner (
                            season,
                            acusacoes!inner (
                                piloto_acusado_id,
                                pilotos!piloto_acusado_id (nome)
                            )
                        )
                    `)
                    .eq('lances.season', selectedSeason)
                    .eq('resultado', 'culpado');

                if (!verdictsError && verdicts) {
                    verdicts.forEach(v => {
                        const acusacoes = v.lances?.acusacoes;
                        if (acusacoes && Array.isArray(acusacoes)) {
                            acusacoes.forEach(acc => {
                                const nomePiloto = acc.pilotos?.nome;
                                if (nomePiloto && v.lance_id) {
                                    const pontos = parseInt(v.pontos_deducted || 0);
                                    // Salvar punição do lance, priorizando veredito dos stewards se já existir do júri
                                    punicoesPorLance.set(v.lance_id, { nome: nomePiloto, pontos: pontos });
                                }
                            });
                        }
                    });
                }

                // Debug detalhado para Lucas Monteiro
                const lucasKey = Object.keys(faltasDefesaPorPiloto).find(k => 
                    k.toLowerCase().includes('lucas') || k.toLowerCase().includes('monteiro')
                );
                const lucasKeyPunicoes = Object.keys(punicoesPorPiloto).find(k => 
                    k.toLowerCase().includes('lucas') || k.toLowerCase().includes('monteiro')
                );
                
                console.log('📊 [ADMIN PR] Dados administrativos carregados:', {
                    temporada: selectedSeason,
                    punicoes: punicoesPorPiloto,
                    defesasFaltantes: faltasDefesaPorPiloto,
                    advertencias: advertenciasPorPiloto,
                    totalRegistrosProcessados: lancesProcessados.size,
                    lucasMonteiro: {
                        defesasFaltantes: lucasKey ? faltasDefesaPorPiloto[lucasKey] : 'NÃO ENCONTRADO',
                        pontosDefesa: lucasKey ? faltasDefesaPorPiloto[lucasKey] * 5 : 0,
                        punicoesTotais: lucasKeyPunicoes ? punicoesPorPiloto[lucasKeyPunicoes] : 'NÃO ENCONTRADO',
                        nomeDefesa: lucasKey,
                        nomePunicoes: lucasKeyPunicoes
                    }
                });
                
                setPunicoesData(punicoesPorPiloto);
                setDefesasFaltantesData(faltasDefesaPorPiloto);
                setAdvertenciasData(advertenciasPorPiloto);

            } catch (err) {
                console.error('❌ Erro ao carregar dados administrativos:', err);
            }
        };

        carregarDadosAdministrativos();
    }, [selectedSeason]);

    // Estado para armazenar o maior PR histórico (meta de 100%) - separado por grid
    const [maxPRHistorico, setMaxPRHistorico] = useState({ carreira: 0, light: 0 });
    const [maxPRInfo, setMaxPRInfo] = useState({ carreira: { piloto: '', temporada: 0, valor: 0 }, light: { piloto: '', temporada: 0, valor: 0 } });

    // Processar dados históricos de Power Ranking (apenas últimas 5 temporadas)
    // Filtrar por grid atual do piloto - usar dados corretos por grid
    useEffect(() => {
        if (pilotos.length === 0) return;
        if ((!rawPRCarreira || rawPRCarreira.length === 0) && (!rawPRLight || rawPRLight.length === 0)) return;
        if (!selectedSeason) return;

        // Definir intervalo de temporadas: últimas 5 (T-0 a T-4)
        const temporadaAtual = parseInt(selectedSeason); // Garantir que é número
        const temporadaMaisAntiga = temporadaAtual - 4; // T-4
        const temporadasValidas = new Set();
        for (let offset = 0; offset <= 4; offset++) {
            const temp = temporadaAtual - offset;
            // Excluir explicitamente T12 se estiver no intervalo
            if (temp !== 12) {
                temporadasValidas.add(temp);
            }
        }
        
        // Mapeamento de nomes antigos para nomes atuais (para lidar com mudanças de nome)
        // Formato: { 'nome_antigo_normalizado': 'nome_atual' }
        const nomesAntigosParaAtuais = {
            // Alias bidirecionais para preservar histórico entre temporadas.
            'egon drews': 'Egon Drews',
            'egondrews': 'Egon Drews',
            'egon jackson': 'Egon Drews',
            'egonjackson': 'Egon Drews',
            'rafael martins': 'Rafa Martins',
            'rafaelmartins': 'Rafa Martins',
            'rafa martins': 'Rafa Martins',
            'rafamartins': 'Rafa Martins',
        };
        
        // Função para normalizar nome (mesma usada em outros lugares)
        const normalizarNomeHistorico = (nome) => {
            return (nome || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };
        
        // Função para converter nome antigo para nome atual
        const converterNomeParaAtual = (nomeNaPlanilha) => {
            const nomeNorm = normalizarNomeHistorico(nomeNaPlanilha);
            // Verificar se é um nome antigo conhecido
            if (nomesAntigosParaAtuais[nomeNorm]) {
                return nomesAntigosParaAtuais[nomeNorm];
            }
            // Se não for nome antigo, retornar o nome original
            return nomeNaPlanilha.trim();
        };

        // Criar mapeamento de piloto -> grid atual
        // Também criar mapa normalizado para busca flexível
        const gridPorPiloto = {};
        const gridPorPilotoNormalizado = {}; // nome normalizado -> nome original
        
        pilotos.forEach(piloto => {
            if (piloto.nome && piloto.grid) {
                const nomeLimpo = piloto.nome.trim();
                gridPorPiloto[nomeLimpo] = piloto.grid.toLowerCase();
                
                // Também criar entrada normalizada para busca flexível
                const nomeNorm = normalizarNomeHistorico(nomeLimpo);
                gridPorPilotoNormalizado[nomeNorm] = nomeLimpo;
            }
        });
        
        console.log('📋 PILOTOS NO SUPABASE (grid=light):', pilotos.filter(p => p.grid === 'light').map(p => p.nome).slice(0, 15));
        console.log('📋 gridPorPilotoNormalizado (primeiros 10):', Object.entries(gridPorPilotoNormalizado).slice(0, 10));
        
        // Organizar PRs por piloto e temporada, separados por grid
        const historicoPorPiloto = {};
        const historicoPorGrid = { carreira: {}, light: {} }; // { grid: { piloto: { season: prValue } } }
        let maiorPRCarreira = 0;
        let maiorPRLight = 0;
        let maiorPRInfoCarreira = { piloto: '', temporada: 0, valor: 0 };
        let maiorPRInfoLight = { piloto: '', temporada: 0, valor: 0 };

        // Processar dados do grid Carreira
        if (rawPRCarreira && rawPRCarreira.length > 0) {
            rawPRCarreira.forEach(row => {
                const nomeRaw = (row[0] || '').toString().trim();
                const seasonStr = (row[9] || '').toString().trim();
                const totalPR = parseFloat((row[8] || '0').toString().replace(',', '.'));

                if (nomeRaw && seasonStr && !isNaN(parseInt(seasonStr)) && !isNaN(totalPR) && totalPR > 0) {
                    const season = parseInt(seasonStr);
                    if (!temporadasValidas.has(season)) return;

                    const nomeAtual = converterNomeParaAtual(nomeRaw);
                    const nomeFinal = gridPorPilotoNormalizado[normalizarNomeHistorico(nomeAtual)] || nomeAtual;
                    
                    if (!historicoPorPiloto[nomeFinal]) historicoPorPiloto[nomeFinal] = {};
                    // Usar o maior PR encontrado para o piloto naquela temporada (caso apareça em mais de uma linha)
                    historicoPorPiloto[nomeFinal][season] = Math.max(historicoPorPiloto[nomeFinal][season] || 0, totalPR);
                    
                    // Para o cálculo do Máximo do Grid, associamos ao grid onde o dado foi encontrado
                    if (!historicoPorGrid.carreira[nomeFinal]) historicoPorGrid.carreira[nomeFinal] = {};
                    historicoPorGrid.carreira[nomeFinal][season] = Math.max(historicoPorGrid.carreira[nomeFinal][season] || 0, totalPR);
                }
            });
        }

        // Processar dados do grid Light
        if (rawPRLight && rawPRLight.length > 0) {
            console.log('📋 Processando histórico Light - Total linhas:', rawPRLight.length);
            console.log('📋 Temporadas válidas:', Array.from(temporadasValidas).sort((a, b) => b - a));
            
            // Verificar se Egon e Alann estão NA PLANILHA (independente de temporada)
            const egonRows = rawPRLight.filter(row => {
                const nome = (row[0] || '').toString().trim();
                return nome.toLowerCase().includes('egon') || nome.toLowerCase().includes('jackson');
            });
            console.log('🔍 Linhas com "Egon/Jackson" na planilha:', egonRows.length);
            if (egonRows.length > 0) {
                console.log('🔍 Primeiras 3 linhas do Egon:', egonRows.slice(0, 3).map(r => ({
                    nome: r[0],
                    temporada: r[9],
                    pr: r[8]
                })));
            }
            
            const alannRows = rawPRLight.filter(row => {
                const nome = (row[0] || '').toString().trim();
                return nome.toLowerCase().includes('alann');
            });
            console.log('🔍 Linhas com "Alann" na planilha:', alannRows.length);
            if (alannRows.length > 0) {
                console.log('🔍 Primeiras 3 linhas do Alann:', alannRows.slice(0, 3).map(r => ({
                    nome: r[0],
                    temporada: r[9],
                    pr: r[8]
                })));
            }
            
            const pilotosProcessadosHistorico = new Set();

            rawPRLight.forEach(row => {
                const nomeRaw = (row[0] || '').toString().trim();
                const seasonStr = (row[9] || '').toString().trim();
                const totalPR = parseFloat((row[8] || '0').toString().replace(',', '.'));

                if (nomeRaw && seasonStr && !isNaN(parseInt(seasonStr)) && !isNaN(totalPR) && totalPR > 0) {
                    const season = parseInt(seasonStr);
                    if (!temporadasValidas.has(season)) return;

                    const nomeAtual = converterNomeParaAtual(nomeRaw);
                    const nomeNormalizado = normalizarNomeHistorico(nomeAtual);
                    const nomeFinal = gridPorPilotoNormalizado[nomeNormalizado] || nomeAtual;
                    
                    // Debug específico para Egon e Alann
                    if (nomeRaw.toLowerCase().includes('egon') || nomeRaw.toLowerCase().includes('alann')) {
                        console.log(`🔍 DEBUG - Nome: "${nomeRaw}" | nomeAtual: "${nomeAtual}" | nomeNormalizado: "${nomeNormalizado}" | nomeFinal: "${nomeFinal}"`);
                        console.log(`🔍 gridPorPilotoNormalizado[${nomeNormalizado}]:`, gridPorPilotoNormalizado[nomeNormalizado]);
                    }
                    
                    if (!pilotosProcessadosHistorico.has(nomeFinal)) {
                        console.log(`✅ Histórico Light - Piloto: "${nomeFinal}" (original: "${nomeRaw}") | Season: ${season} | PR: ${totalPR}`);
                        pilotosProcessadosHistorico.add(nomeFinal);
                    }

                    if (!historicoPorPiloto[nomeFinal]) historicoPorPiloto[nomeFinal] = {};
                    historicoPorPiloto[nomeFinal][season] = Math.max(historicoPorPiloto[nomeFinal][season] || 0, totalPR);
                    
                    if (!historicoPorGrid.light[nomeFinal]) historicoPorGrid.light[nomeFinal] = {};
                    historicoPorGrid.light[nomeFinal][season] = Math.max(historicoPorGrid.light[nomeFinal][season] || 0, totalPR);
                }
            });
            
            console.log('📊 Total pilotos únicos com histórico (Light):', pilotosProcessadosHistorico.size);
            console.log('📊 Pilotos processados:', Array.from(pilotosProcessadosHistorico).slice(0, 10));
        }

        // Encontrar o maior PR por grid (apenas nas últimas 5 temporadas)
        Object.keys(historicoPorGrid.carreira).forEach(nome => {
            Object.keys(historicoPorGrid.carreira[nome]).forEach(seasonStr => {
                const season = parseInt(seasonStr);
                
                // Verificar se a temporada está no intervalo válido (últimas 5)
                if (!temporadasValidas.has(season)) {
                    return; // Pular temporadas fora do intervalo
                }
                
                const prTotal = historicoPorGrid.carreira[nome][season];
                
                if (prTotal > maiorPRCarreira) {
                    maiorPRCarreira = prTotal;
                    maiorPRInfoCarreira = {
                        piloto: nome,
                        temporada: season,
                        valor: prTotal
                    };
                }
            });
        });

        Object.keys(historicoPorGrid.light).forEach(nome => {
            Object.keys(historicoPorGrid.light[nome]).forEach(seasonStr => {
                const season = parseInt(seasonStr);
                
                // Verificar se a temporada está no intervalo válido (últimas 5)
                if (!temporadasValidas.has(season)) {
                    return; // Pular temporadas fora do intervalo
                }
                
                const prTotal = historicoPorGrid.light[nome][season];
                
                if (prTotal > maiorPRLight) {
                    maiorPRLight = prTotal;
                    maiorPRInfoLight = {
                        piloto: nome,
                        temporada: season,
                        valor: prTotal
                    };
                }
            });
        });

        console.log('📊 HISTÓRICO FINAL (primeiros 10 pilotos):', Object.entries(historicoPorPiloto).slice(0, 10));
        
        setHistoricoData(historicoPorPiloto);
        setMaxPRHistorico({ carreira: maiorPRCarreira, light: maiorPRLight });
        setMaxPRInfo({ 
            carreira: maiorPRInfoCarreira, 
            light: maiorPRInfoLight 
        });
        
        // Verificação de erro crítico: T12 sendo incluída incorretamente
        if (maiorPRCarreira > 0 || maiorPRLight > 0) {
            // Verificar se T12 está sendo incluída incorretamente
            if (maiorPRInfoCarreira.temporada === 12) {
                console.error('❌ ERRO: T12 está sendo considerada como maior PR! Isso não deveria acontecer.');
                console.error('   Temporadas válidas:', Array.from(temporadasValidas).sort((a, b) => b - a));
                console.error('   selectedSeason:', selectedSeason);
            }
        }
    }, [rawPRCarreira, rawPRLight, pilotos, selectedSeason]);

    // Função para calcular média ponderada do histórico (considerando apenas o grid atual do piloto)
    // IMPORTANTE: Sempre considera as 5 temporadas, atribuindo 0 pontos para temporadas sem participação
    const calcularMediaPonderadaHistorico = useCallback((nomePiloto, gridPiloto) => {
        const historico = historicoData[nomePiloto] || {};
        const temporadaAtual = selectedSeason;
        
        // Pesos decrescentes para as últimas 5 temporadas (incluindo a atual)
        const pesos = {
            0: 0.35,  // T-0 (temporada atual)
            1: 0.25,  // T-1 (temporada anterior)
            2: 0.20,  // T-2
            3: 0.15,  // T-3
            4: 0.05   // T-4
        };

        // Sempre considerar as 5 temporadas, mesmo que o piloto não tenha participado
        // Temporadas sem participação recebem 0 pontos
        let somaPonderada = 0;
        let pesoTotal = 0;

        // Iterar pelas últimas 5 temporadas (T-0 a T-4)
        for (let offset = 0; offset <= 4; offset++) {
            const season = temporadaAtual - offset;
            const peso = pesos[offset] || 0;
            
            // Se o piloto tem dados para esta temporada, usar o valor; senão, usar 0
            const prValue = (historico[season] && historico[season] > 0) ? historico[season] : 0;
            
            // Sempre adicionar ao cálculo, mesmo que seja 0
            somaPonderada += prValue * peso;
            pesoTotal += peso;
        }

        // Os pesos sempre somam 1.0 (100%), então não precisamos normalizar
        // Mas vamos garantir que pesoTotal seja 1.0 para consistência
        if (pesoTotal > 0) {
            return somaPonderada; // pesoTotal já é 1.0, então não precisa dividir
        }

        return 0; // Fallback (não deveria acontecer)
    }, [historicoData, selectedSeason]);

    // Processar dados de Power Ranking da temporada atual e calcular pilares
    // Usar dados corretos baseado no grid do piloto
    useEffect(() => {
        if (pilotos.length === 0) return;
        if ((!rawPRCarreira || rawPRCarreira.length === 0) && (!rawPRLight || rawPRLight.length === 0)) return;

        // Criar mapeamento de piloto -> grid atual
        const gridPorPiloto = {};
        pilotos.forEach(piloto => {
            if (piloto.nome && piloto.grid) {
                gridPorPiloto[piloto.nome] = piloto.grid.toLowerCase();
            }
        });
        
        const prMap = {};
        const pilaresMap = {};

        // Mapeamento de nomes antigos para nomes atuais (mesmo usado no histórico)
        const nomesAntigosParaAtuaisPR = {
            // Alias bidirecionais para preservar histórico entre temporadas.
            'egon drews': 'Egon Drews',
            'egondrews': 'Egon Drews',
            'egon jackson': 'Egon Drews',
            'egonjackson': 'Egon Drews',
            'rafael martins': 'Rafa Martins',
            'rafaelmartins': 'Rafa Martins',
            'rafa martins': 'Rafa Martins',
            'rafamartins': 'Rafa Martins',
        };
        
        // Função para converter nome antigo para nome atual
        const converterNomeParaAtualPR = (nomeNaPlanilha) => {
            const nomeNorm = (nomeNaPlanilha || '')
                .toString()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            // Verificar se é um nome antigo conhecido
            if (nomesAntigosParaAtuaisPR[nomeNorm]) {
                return nomesAntigosParaAtuaisPR[nomeNorm].trim();
            }
            // Se não for nome antigo, retornar o nome original limpo
            return (nomeNaPlanilha || '').toString().trim();
        };

        // Função auxiliar para normalizar nome (mesma usada no carregamento de pilotos)
        const normalizarNomePR = (nome) => {
            return (nome || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

        // Criar mapa normalizado de nomes de pilotos -> nome original
        const nomesPilotosNormalizados = {};
        const gridPorPilotoNormalizadoPR = {}; // nome normalizado -> nome original
        Object.keys(gridPorPiloto).forEach(nomeOriginal => {
            const nomeNorm = normalizarNomePR(nomeOriginal);
            const nomeLimpo = nomeOriginal.trim();
            nomesPilotosNormalizados[nomeNorm] = nomeLimpo;
            gridPorPilotoNormalizadoPR[nomeNorm] = nomeLimpo;
        });
        
        // 0. Inicializar prMap e pilaresMap com todos os pilotos da tabela para garantir que ninguém fique de fora
        pilotos.forEach(p => {
            if (!prMap[p.nome]) {
                prMap[p.nome] = { total: 0, grid: p.grid || 'carreira', performance: 60, conduta: 100, racecraft: 60, overall: 60, historico: 60 };
                pilaresMap[p.nome] = { performance: 60, conduta: 100, racecraft: 60, overall: 60, historico: 60 };
            }
        });

        const pilotosProcessados = new Set();

        // Processar dados do grid Carreira
        if (rawPRCarreira && rawPRCarreira.length > 0) {
            
            rawPRCarreira.forEach(row => {
                const nomeNaPlanilha = (row[0] || '').trim();
                const season = (row[9] || '').trim();
                const totalPR = parseFloat((row[8] || '0').replace(',', '.'));

                if (nomeNaPlanilha && season === String(selectedSeason) && !isNaN(totalPR) && totalPR > 0) {
                    const nomeConvertido = converterNomeParaAtualPR(nomeNaPlanilha);
                    
                    let gridAtual = gridPorPiloto[nomeConvertido];
                    let nomePilotoParaUsar = nomeConvertido;
                    
                    if (!gridAtual) {
                        const nomeNorm = normalizarNomePR(nomeConvertido);
                        const nomeOriginalEncontrado = nomesPilotosNormalizados[nomeNorm];
                        if (nomeOriginalEncontrado) {
                            gridAtual = gridPorPiloto[nomeOriginalEncontrado];
                            nomePilotoParaUsar = nomeOriginalEncontrado.trim();
                        }
                    } else {
                        nomePilotoParaUsar = nomePilotoParaUsar.trim();
                    }
                    
                    // Se estiver na planilha Carreira, vamos processar independente do gridAtual detectado
                    nomePilotoParaUsar = nomePilotoParaUsar.trim();
                    
                    if (!pilotosProcessados.has(nomePilotoParaUsar)) {
                        pilotosProcessados.add(nomePilotoParaUsar);
                    }
                    
                    if (!prMap[nomePilotoParaUsar]) {
                        prMap[nomePilotoParaUsar] = { total: 0, grid: 'carreira', performance: 60, conduta: 100, racecraft: 60, overall: 60, historico: 60 };
                        pilaresMap[nomePilotoParaUsar] = { performance: 60, conduta: 100, racecraft: 60, overall: 60, historico: 60 };
                    }
                    // Se veio da planilha carreira, assume carreira se não tiver grid definido
                    if (!prMap[nomePilotoParaUsar].grid) prMap[nomePilotoParaUsar].grid = 'carreira';
                    prMap[nomePilotoParaUsar].total = Math.max(prMap[nomePilotoParaUsar].total, totalPR);
                }
            });
        }

        // Processar dados do grid Light
        if (rawPRLight && rawPRLight.length > 0) {
            const pilotosProcessadosLight = new Set();
            
            rawPRLight.forEach(row => {
                const nomeNaPlanilha = (row[0] || '').trim();
                const season = (row[9] || '').trim();
                const totalPR = parseFloat((row[8] || '0').replace(',', '.'));

                if (nomeNaPlanilha && season === String(selectedSeason) && !isNaN(totalPR) && totalPR > 0) {
                    const nomeConvertido = converterNomeParaAtualPR(nomeNaPlanilha).trim();

                    if (!pilotosProcessados.has(nomeConvertido)) {
                        pilotosProcessados.add(nomeConvertido);
                    }
                    
                    let gridAtual = gridPorPiloto[nomeConvertido];
                    let nomePilotoParaUsar = nomeConvertido.trim();
                    
                    if (!gridAtual) {
                        const nomeNorm = normalizarNomePR(nomeConvertido);
                        let nomeOriginalEncontrado = nomesPilotosNormalizados[nomeNorm];
                        if (!nomeOriginalEncontrado) {
                            nomeOriginalEncontrado = gridPorPilotoNormalizadoPR[nomeNorm];
                        }
                        if (nomeOriginalEncontrado) {
                            gridAtual = gridPorPiloto[nomeOriginalEncontrado];
                            nomePilotoParaUsar = nomeOriginalEncontrado.trim();
                        }
                    }
                    
                    nomePilotoParaUsar = nomePilotoParaUsar.trim();
                    
                    if (!pilotosProcessadosLight.has(nomePilotoParaUsar)) {
                        pilotosProcessadosLight.add(nomePilotoParaUsar);
                    }

                    if (!prMap[nomePilotoParaUsar]) {
                        prMap[nomePilotoParaUsar] = { total: 0, grid: 'light', performance: 60, conduta: 100, racecraft: 60, overall: 60, historico: 60 };
                        pilaresMap[nomePilotoParaUsar] = { performance: 60, conduta: 100, racecraft: 60, overall: 60, historico: 60 };
                    }
                    // Se veio da planilha light, assume light se não tiver grid definido
                    if (!prMap[nomePilotoParaUsar].grid) prMap[nomePilotoParaUsar].grid = 'light';
                    prMap[nomePilotoParaUsar].total = Math.max(prMap[nomePilotoParaUsar].total, totalPR);
                }
            });
        }
        
        // Calcular o máximo de PR por grid (mesmo critério do HISTÓRICO)
        // O maior PR de cada grid representa 100% para aquele grid
        const maxPRPorGrid = { carreira: 0, light: 0 };
        
        // Calcular máximo PR do grid Carreira
        const prsCarreira = Object.keys(prMap)
            .filter(nome => (prMap[nome].grid || gridPorPiloto[nome]) === 'carreira')
            .map(nome => prMap[nome].total)
            .filter(total => total > 0);
        maxPRPorGrid.carreira = prsCarreira.length > 0 ? Math.max(...prsCarreira) : 0;
        
        // Calcular máximo PR do grid Light
        const prsLight = Object.keys(prMap)
            .filter(nome => (prMap[nome].grid || gridPorPiloto[nome]) === 'light')
            .map(nome => prMap[nome].total)
            .filter(total => total > 0);
        maxPRPorGrid.light = prsLight.length > 0 ? Math.max(...prsLight) : 0;

        // Calcular pilares
        Object.keys(prMap).forEach(nome => {
            // Performance: normalizar PR total da temporada atual em relação ao maior PR do seu grid (60-84)
            // Usa o mesmo cálculo do HISTÓRICO: normalizar para escala 60-84
            const prTotal = prMap[nome].total;
            const gridPiloto = prMap[nome].grid || gridPorPiloto[nome] || 'carreira';
            const maxPRDoGrid = maxPRPorGrid[gridPiloto] || 0;
            
            if (maxPRDoGrid > 0 && prTotal > 0) {
                // Calcular percentual: (PR do piloto / maior PR do grid) * 100
                const percentual = (prTotal / maxPRDoGrid) * 100;
                // Normalizar para escala 60-84: percentual de 0-100% vira 60-84
                const performanceNormalizado = 60 + (percentual / 100) * 24; // 60 + (percentual * 0.24)
                // Arredondar para cima e limitar no máximo 100 (para comportar bônus NC/Punish)
                pilaresMap[nome].performance = Math.ceil(Math.min(100, performanceNormalizado));
            } else {
                // Se não tem PR ou maxPR é 0, trazer o mínimo aceitável que é 60
                pilaresMap[nome].performance = 60;
            }
            
            // Conduta: inicializar com 100, será atualizado se houver dados
            pilaresMap[nome].conduta = 100;
            
            // Racecraft: inicializar com 0, será atualizado se houver dados
            pilaresMap[nome].racecraft = 0;
            
            // Overall: inicializar com 60, será atualizado se houver dados
            pilaresMap[nome].overall = 60;
            
            // Histórico: inicializar com 60, será calculado com normalização no próximo efeito
            pilaresMap[nome].historico = 60;
        });

        setPrData(prMap);
        
        // Atualizar ref com os valores calculados
        pilaresDataRef.current = pilaresMap;
    }, [rawPRCarreira, rawPRLight, selectedSeason, calcularMediaPonderadaHistorico, pilotos]);

        // Função auxiliar para normalizar nome (reutilizar)
        const normalizarNomePR = (nome) => {
            return (nome || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

    // Calcular dados de conduta e atualizar histórico para cada piloto
    useEffect(() => {
        if (!pilotos.length) return;

        const updatedPilares = { ...pilaresDataRef.current }; // Preservar valores já calculados (incluindo performance) usando ref
        const valoresHistoriaBrutos = {}; // Armazenar valores brutos para normalização
        
        // Primeiro, calcular valores brutos do histórico para todos os pilotos
        pilotos.forEach(piloto => {
            // CRÍTICO: Sempre preservar performance de pilaresDataRef se existir e for > 0
            const performancePreservado = pilaresDataRef.current[piloto.nome]?.performance;
            
            if (!updatedPilares[piloto.nome]) {
                // Se não existe, criar mas preservar performance se já foi calculado
                updatedPilares[piloto.nome] = { 
                    performance: (performancePreservado !== undefined && performancePreservado !== 0) ? performancePreservado : (pilaresData[piloto.nome]?.performance || 60), 
                    conduta: 100, 
                    racecraft: pilaresData[piloto.nome]?.racecraft || 60, 
                    overall: pilaresData[piloto.nome]?.overall || 60, 
                    historico: 60 
                };
            } else {
                // CRÍTICO: Preservar performance, racecraft e overall se já foram calculados
                // NUNCA sobrescrever performance se já existe
                updatedPilares[piloto.nome] = {
                    ...updatedPilares[piloto.nome],
                    performance: (performancePreservado !== undefined && performancePreservado !== 0) ? performancePreservado : (updatedPilares[piloto.nome].performance || 60),
                    racecraft: updatedPilares[piloto.nome].racecraft || pilaresData[piloto.nome]?.racecraft || 60,
                    overall: updatedPilares[piloto.nome].overall || pilaresData[piloto.nome]?.overall || 60,
                    conduta: updatedPilares[piloto.nome].conduta || 0,
                    historico: updatedPilares[piloto.nome].historico || 60
                };
            }

            // Calcular pontos de conduta baseado nas flags (apenas base para condutaData)
            if (condutaData && Object.keys(condutaData).length > 0) {
                // Não subtrair aqui, o cálculo final é feito no motor unificado
            }

            // Calcular valor bruto do histórico (média ponderada) - considerando apenas o grid atual
            const gridPiloto = (piloto.grid || 'carreira').toLowerCase();
            valoresHistoriaBrutos[piloto.nome] = calcularMediaPonderadaHistorico(piloto.nome, gridPiloto);
        });

        // Salvar valores brutos para exibição na coluna "HISTÓRIA"
        setHistoricoBrutoData(valoresHistoriaBrutos);

        // Normalizar valores do histórico para escala 0-100
        // Calcular o máximo histórico por grid (mesmo critério do PERFORMANCE)
        const maxHistoricoPorGrid = { carreira: 0, light: 0 };
        
        // Calcular máximo histórico do grid Carreira
        const historicosCarreira = pilotos
            .filter(p => (p.grid || 'carreira').toLowerCase() === 'carreira')
            .map(p => valoresHistoriaBrutos[p.nome] || 0)
            .filter(v => v > 0);
        maxHistoricoPorGrid.carreira = historicosCarreira.length > 0 ? Math.max(...historicosCarreira) : 0;
        
        // Calcular máximo histórico do grid Light
        const historicosLight = pilotos
            .filter(p => (p.grid || 'carreira').toLowerCase() === 'light')
            .map(p => valoresHistoriaBrutos[p.nome] || 0)
            .filter(v => v > 0);
        maxHistoricoPorGrid.light = historicosLight.length > 0 ? Math.max(...historicosLight) : 0;
        
        // Cada piloto recebe o percentual que sua média ponderada representa do máximo histórico do seu grid
        // Média ponderada: 40% HISTÓRIA + 30% TEMPORADAS + 30% CORRIDAS
        pilotos.forEach(piloto => {
            const valorBruto = valoresHistoriaBrutos[piloto.nome] || 0;
            const gridPiloto = (piloto.grid || 'carreira').toLowerCase();
            const maxHistoricoDoGrid = maxHistoricoPorGrid[gridPiloto] || 0;
            
            let historicoNormalizado = 60; // Valor mínimo base
            
            if (valorBruto > 0 && maxHistoricoDoGrid > 0) {
                // Calcular percentual: (média ponderada do piloto / maior pontuação do histórico do grid) * 100
                const percentual = (valorBruto / maxHistoricoDoGrid) * 100;
                // Normalizar para escala 60-100: percentual de 0-100% vira 60-100
                historicoNormalizado = 60 + (percentual / 100) * 40; // 60 + (percentual * 0.4)
                historicoNormalizado = Math.min(100, historicoNormalizado);
            }
            
            // Pontuação de TEMPORADAS (mínimo 60)
            const pontuacaoTemporadas = Math.max(60, temporadasData[piloto.nome] || 0);
            
            // Pontuação de CORRIDAS (mínimo 60)
            const dadosCorridas = corridasData[piloto.nome] || { pontuacao: 60 };
            const pontuacaoCorridas = dadosCorridas.pontuacao || 60;
            
            // Média ponderada: 40% HISTÓRIA + 30% TEMPORADAS + 30% CORRIDAS
            const historicoFinal = (historicoNormalizado * 0.40) + (pontuacaoTemporadas * 0.30) + (pontuacaoCorridas * 0.30);
            
            // Arredondar para cima e limitar entre 60 e 100
            const valorFinal = Math.ceil(Math.max(60, Math.min(100, historicoFinal)));
            
            if (!updatedPilares[piloto.nome]) {
                updatedPilares[piloto.nome] = { performance: 60, conduta: 100, racecraft: 60, overall: 60, historico: valorFinal };
            } else {
                updatedPilares[piloto.nome].historico = valorFinal;
            }
        });

        // Atualizar ref apenas (Conduta será calculada no motor unificado)
        pilaresDataRef.current = updatedPilares;
    }, [condutaData, pilotos, calcularMediaPonderadaHistorico, maxPRHistorico, temporadasData, corridasData, punicoesData, defesasFaltantesData, buscarPunicoes, buscarDefesasFaltantes]);

    // Contar temporadas que cada piloto participou (todas as temporadas, não apenas últimas 5)
    useEffect(() => {
        if (pilotos.length === 0) return;
        if ((!rawPRCarreira || rawPRCarreira.length === 0) && (!rawPRLight || rawPRLight.length === 0)) return;

        const temporadasPorPiloto = {};
        
        // Função para normalizar nome
        const normalizarNome = (nome) => {
            return (nome || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };
        
        // Mapeamento de nomes antigos para nomes atuais
        const nomesAntigosParaAtuais = {
            'egon drews': 'Egon Drews',
            'egondrews': 'Egon Drews',
            'egon jackson': 'Egon Drews',
            'egonjackson': 'Egon Drews',
            'rafael martins': 'Rafa Martins',
            'rafaelmartins': 'Rafa Martins',
            'rafa martins': 'Rafa Martins',
            'rafamartins': 'Rafa Martins',
        };
        
        const converterNomeParaAtual = (nomeNaPlanilha) => {
            const nomeNorm = normalizarNome(nomeNaPlanilha);
            if (nomesAntigosParaAtuais[nomeNorm]) {
                return nomesAntigosParaAtuais[nomeNorm].trim();
            }
            return (nomeNaPlanilha || '').toString().trim();
        };
        
        // Processar dados do grid Carreira - contar todas as temporadas (independente do grid atual)
        if (rawPRCarreira && rawPRCarreira.length > 0) {
            rawPRCarreira.forEach(row => {
                const nomeNaPlanilha = (row[0] || '').trim();
                const seasonStr = (row[9] || '').trim();
                const totalPR = parseFloat((row[8] || '0').replace(',', '.'));
                
                if (nomeNaPlanilha && seasonStr && !isNaN(parseInt(seasonStr)) && !isNaN(totalPR) && totalPR > 0) {
                    const season = parseInt(seasonStr);
                    const nomeAtual = converterNomeParaAtual(nomeNaPlanilha);
                    
                    // Adicionar temporada ao Set (independente do grid atual)
                    // O Set garante que temporadas duplicadas sejam contadas apenas uma vez
                    if (!temporadasPorPiloto[nomeAtual]) {
                        temporadasPorPiloto[nomeAtual] = new Set();
                    }
                    temporadasPorPiloto[nomeAtual].add(season);
                }
            });
        }
        
        // Processar dados do grid Light - contar todas as temporadas (independente do grid atual)
        if (rawPRLight && rawPRLight.length > 0) {
            console.log('📅 Processando temporadas Light - Total linhas:', rawPRLight.length);
            const pilotosTemporadasLight = new Set();
            
            rawPRLight.forEach(row => {
                const nomeNaPlanilha = (row[0] || '').trim();
                const seasonStr = (row[9] || '').trim();
                const totalPR = parseFloat((row[8] || '0').replace(',', '.'));
                
                if (nomeNaPlanilha && seasonStr && !isNaN(parseInt(seasonStr)) && !isNaN(totalPR) && totalPR > 0) {
                    const season = parseInt(seasonStr);
                    const nomeAtual = converterNomeParaAtual(nomeNaPlanilha);
                    
                    if (!pilotosTemporadasLight.has(nomeAtual)) {
                        console.log(`✅ Temporadas Light - Piloto: "${nomeAtual}" (original: "${nomeNaPlanilha}")`);
                        pilotosTemporadasLight.add(nomeAtual);
                    }
                    
                    // Adicionar temporada ao Set (independente do grid atual)
                    // Se o piloto já tem essa temporada do grid Carreira, o Set não duplica
                    if (!temporadasPorPiloto[nomeAtual]) {
                        temporadasPorPiloto[nomeAtual] = new Set();
                    }
                    temporadasPorPiloto[nomeAtual].add(season);
                }
            });
            
            console.log('📊 Total pilotos únicos com temporadas (Light):', pilotosTemporadasLight.size);
        }
        
        // Converter Sets para pontuação baseada na quantidade de temporadas
        // 20 temporadas = 100, 19 = 99, 18 = 98, etc.
        const temporadasDataCalculado = {};
        
        Object.keys(temporadasPorPiloto).forEach(nome => {
            const quantidade = temporadasPorPiloto[nome].size;
            // Fórmula: quantidadeTemporadas + 80 (20 = 100, 19 = 99, 18 = 98, etc.)
            // Limitar máximo em 100
            const pontuacao = Math.min(100, quantidade + 80);
            temporadasDataCalculado[nome] = pontuacao;
        });
        
        console.log('📊 RESULTADO TEMPORADAS (primeiros 10):', Object.entries(temporadasDataCalculado).slice(0, 10));
        
        setTemporadasData(temporadasDataCalculado);
    }, [pilotos, rawPRCarreira, rawPRLight]);

    // Contar total de corridas que cada piloto participou (últimas 5 temporadas)
    // Grid Carreira: 34 corridas = 100% (32 das T16-T19 + 2 da T20)
    // Grid Light: 35 corridas = 100% (32 das T16-T19 + 3 da T20)
    useEffect(() => {
        if (pilotos.length === 0) return;
        if ((!rawPRCarreira || rawPRCarreira.length === 0) && (!rawPRLight || rawPRLight.length === 0)) return;

        // Definir máximo de corridas por grid
        // T-0 (T20): Carreira = 2 etapas, Light = 3 etapas
        // T-1 a T-4 (T16-T19): 8 corridas cada = 32 corridas
        const CORRIDAS_TEMPORADAS_ANTERIORES = 32; // 4 temporadas x 8 corridas
        const CORRIDAS_T0_CARREIRA = 2;
        const CORRIDAS_T0_LIGHT = 3;
        const MAX_CORRIDAS_CARREIRA = CORRIDAS_TEMPORADAS_ANTERIORES + CORRIDAS_T0_CARREIRA; // 34
        const MAX_CORRIDAS_LIGHT = CORRIDAS_TEMPORADAS_ANTERIORES + CORRIDAS_T0_LIGHT; // 35

        const corridasPorPiloto = {}; // { nome: { total: número, grid: 'carreira'|'light' } }
        
        // Função para normalizar nome
        const normalizarNome = (nome) => {
            return (nome || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };
        
        // Mapeamento de nomes antigos para nomes atuais
        const nomesAntigosParaAtuais = {
            'egon drews': 'Egon Drews',
            'egondrews': 'Egon Drews',
            'egon jackson': 'Egon Drews',
            'egonjackson': 'Egon Drews',
            'rafael martins': 'Rafa Martins',
            'rafaelmartins': 'Rafa Martins',
            'rafa martins': 'Rafa Martins',
            'rafamartins': 'Rafa Martins',
        };
        
        const converterNomeParaAtual = (nomeNaPlanilha) => {
            const nomeNorm = normalizarNome(nomeNaPlanilha);
            if (nomesAntigosParaAtuais[nomeNorm]) {
                return nomesAntigosParaAtuais[nomeNorm].trim();
            }
            return (nomeNaPlanilha || '').toString().trim();
        };

        // Definir intervalo de temporadas: últimas 5 (T-0 a T-4)
        const temporadaAtual = parseInt(selectedSeason) || 20;
        const temporadasValidas = new Set();
        for (let i = 0; i < 5; i++) {
            temporadasValidas.add(temporadaAtual - i);
        }
        
        // Processar dados do grid Carreira - contar etapas/corridas
        if (rawPRCarreira && rawPRCarreira.length > 0) {
            rawPRCarreira.forEach(row => {
                const nomeNaPlanilha = (row[0] || '').trim();
                const seasonStr = (row[9] || '').trim();
                const etapaStr = (row[10] || '').trim(); // Supondo que etapa está na coluna 10
                const totalPR = parseFloat((row[8] || '0').replace(',', '.'));
                
                if (nomeNaPlanilha && seasonStr && !isNaN(parseInt(seasonStr)) && !isNaN(totalPR) && totalPR > 0) {
                    const season = parseInt(seasonStr);
                    if (!temporadasValidas.has(season)) return;
                    
                    const nomeAtual = converterNomeParaAtual(nomeNaPlanilha);
                    
                    if (!corridasPorPiloto[nomeAtual]) {
                        corridasPorPiloto[nomeAtual] = { total: 0, grid: 'carreira' };
                    }
                    // Cada linha com PR > 0 representa uma participação em corrida
                    corridasPorPiloto[nomeAtual].total += 1;
                }
            });
        }
        
        // Processar dados do grid Light - contar etapas/corridas
        if (rawPRLight && rawPRLight.length > 0) {
            rawPRLight.forEach(row => {
                const nomeNaPlanilha = (row[0] || '').trim();
                const seasonStr = (row[9] || '').trim();
                const totalPR = parseFloat((row[8] || '0').replace(',', '.'));
                
                if (nomeNaPlanilha && seasonStr && !isNaN(parseInt(seasonStr)) && !isNaN(totalPR) && totalPR > 0) {
                    const season = parseInt(seasonStr);
                    if (!temporadasValidas.has(season)) return;
                    
                    const nomeAtual = converterNomeParaAtual(nomeNaPlanilha);
                    
                    if (!corridasPorPiloto[nomeAtual]) {
                        corridasPorPiloto[nomeAtual] = { total: 0, grid: 'light' };
                    }
                    // Cada linha com PR > 0 representa uma participação em corrida
                    corridasPorPiloto[nomeAtual].total += 1;
                    corridasPorPiloto[nomeAtual].grid = 'light'; // Atualiza grid se veio do Light
                }
            });
        }
        
        // Calcular pontuação para cada piloto
        // Fórmula: (corridas / maxCorridas) * 30 + 70, mas se 0 corridas = 60, se 1+ corridas = mínimo 70
        const corridasDataCalculado = {};
        
        // Associar grid do piloto usando a tabela de pilotos
        const gridPorPiloto = {};
        pilotos.forEach(p => {
            gridPorPiloto[p.nome] = (p.grid || 'carreira').toLowerCase();
        });
        
        Object.keys(corridasPorPiloto).forEach(nome => {
            const { total } = corridasPorPiloto[nome];
            const gridPiloto = gridPorPiloto[nome] || corridasPorPiloto[nome].grid || 'carreira';
            const maxCorridas = gridPiloto === 'light' ? MAX_CORRIDAS_LIGHT : MAX_CORRIDAS_CARREIRA;
            
            let pontuacao;
            if (total === 0) {
                pontuacao = 60;
            } else {
                // Calcular porcentagem e converter para escala 70-100
                const percentual = Math.min(1, total / maxCorridas); // Limitar a 100%
                pontuacao = Math.round(70 + (percentual * 30)); // 70 a 100
                pontuacao = Math.min(100, pontuacao); // Garantir máximo de 100
            }
            
            corridasDataCalculado[nome] = { total, pontuacao, maxCorridas };
        });
        
        // Garantir que todos os pilotos tenham dados (mesmo sem corridas)
        pilotos.forEach(p => {
            if (!corridasDataCalculado[p.nome]) {
                const gridPiloto = (p.grid || 'carreira').toLowerCase();
                const maxCorridas = gridPiloto === 'light' ? MAX_CORRIDAS_LIGHT : MAX_CORRIDAS_CARREIRA;
                corridasDataCalculado[p.nome] = { total: 0, pontuacao: 60, maxCorridas };
            }
        });
        
        console.log('🏁 RESULTADO CORRIDAS (primeiros 10):', Object.entries(corridasDataCalculado).slice(0, 10));
        
        setCorridasData(corridasDataCalculado);
    }, [pilotos, rawPRCarreira, rawPRLight, selectedSeason]);

    // Calcular dados de telemetria (RITMO DE CORRIDA e RITMO DE CLASSIFICAÇÃO)
    useEffect(() => {
        if (!rawCarreira || !rawLight || !selectedSeason) return;

        const parseIntFlex = (value) => {
            if (value === null || value === undefined) return NaN;
            const text = String(value).trim();
            if (!text) return NaN;
            const direct = parseInt(text, 10);
            if (!isNaN(direct)) return direct;
            const match = text.match(/\d+/);
            return match ? parseInt(match[0], 10) : NaN;
        };

        const targetSeason = parseIntFlex(selectedSeason);
        if (!Number.isFinite(targetSeason) || targetSeason <= 0) return;

        const telemetriaMap = {};
        
        // Função auxiliar para processar dados de um grid
        const processarGridTelemetria = (data, gridType) => {
            const driverMap = new Map();
            
            data.forEach(row => {
                const s = parseIntFlex(row[3]);
                if (s !== targetSeason) return;
                
                const name = (row[9] || '').trim();
                if (!name) return;
                
                const qualy = parseIntFlex(row[6]);
                const race = parseIntFlex(row[8]);
                
                if (!driverMap.has(name)) {
                    driverMap.set(name, { 
                        qualySum: 0, 
                        raceSum: 0, 
                        deltaSum: 0, 
                        racesCount: 0 
                    });
                }
                
                const driver = driverMap.get(name);
                if (!isNaN(qualy) && !isNaN(race)) {
                    driver.qualySum += qualy;
                    driver.raceSum += race;
                    driver.deltaSum += (qualy - race); // Posição qualy - posição race (positivo = ganhou posições)
                    driver.racesCount++;
                }
            });
            
            // Calcular deltas e posições médias primeiro para encontrar o range
            const deltas = [];
            driverMap.forEach((stats, name) => {
                if (stats.racesCount > 0) {
                    const avgDelta = stats.deltaSum / stats.racesCount;
                    const avgRace = stats.raceSum / stats.racesCount;
                    deltas.push({
                        name,
                        delta: avgDelta,
                        avgRace: avgRace
                    });
                }
            });
            
            // Encontrar o melhor delta para normalização
            const maxDelta = Math.max(...deltas.map(d => d.delta), 0);

            // Calcular score relativo de QUALY por percentil (melhor avgQualy => score mais alto)
            const qualyRanks = [];
            driverMap.forEach((stats, name) => {
                if (stats.racesCount > 0) {
                    const avgQualy = stats.qualySum / stats.racesCount;
                    qualyRanks.push({ name, avgQualy });
                }
            });
            qualyRanks.sort((a, b) => a.avgQualy - b.avgQualy);
            const totalQualy = qualyRanks.length;
            const qualyScoreByName = {};
            qualyRanks.forEach((item, index) => {
                const percentil = totalQualy <= 1 ? 1 : (1 - (index / (totalQualy - 1)));
                // Escala diferenciada para QUALY (60-100), para não ficar igual ao POS. Q
                const score = Math.round(60 + (percentil * 40));
                qualyScoreByName[item.name] = Math.max(60, Math.min(100, score));
            });
            
            // Função para converter delta em percentual (mesma lógica da tela de telemetria)
            const deltaToPercent = (delta, avgRace) => {
                const estaNoTop3 = avgRace <= 3;
                const estaEmP4ouP5 = avgRace >= 4 && avgRace <= 5;
                
                if (delta >= 0) {
                    // Ganhou posições
                    if (delta === 0) {
                        // Manter posição: Top 3 = 95%, P4/P5 = 90%, outros = 80%
                        if (estaNoTop3) return 95;
                        if (estaEmP4ouP5) return 90;
                        return 80;
                    }
                    // Ganhou posições: base percentual até 100% (melhor delta)
                    if (maxDelta <= 0) {
                        // Se ninguém ganhou posições além de delta 0, usar base percentual
                        if (estaNoTop3) return 95;
                        if (estaEmP4ouP5) return 90;
                        return 80;
                    }
                    const basePercent = estaNoTop3 ? 95 : (estaEmP4ouP5 ? 90 : 80);
                    const calculatedPercent = basePercent + (delta / maxDelta) * (100 - basePercent);
                    return Math.ceil(Math.max(basePercent, Math.min(100, calculatedPercent)));
                } else {
                    // Perdeu posições
                    if (estaNoTop3) {
                        // Se está no top 3, mesmo perdendo posições, ainda tem bom ritmo
                        // Delta -1 = 90%, -2 = 85%, -3 = 80%, etc.
                        const percent = Math.max(70, Math.min(95, 95 + (delta * 2.5)));
                        return Math.ceil(percent);
                    } else if (estaEmP4ouP5) {
                        // Se está em P4 ou P5, mesmo perdendo posições, ainda tem bom ritmo
                        // Delta -1 = 85%, -2 = 80%, -3 = 75%, etc.
                        const percent = Math.max(70, Math.min(90, 90 + (delta * 3)));
                        return Math.ceil(percent);
                    } else {
                        // Fora dos top 5: penalização maior por perder posições
                        // Delta -1 = 75%, -2 = 70%, -3 = 65%, etc.
                        const percent = Math.max(0, Math.min(80, 80 + (delta * 5)));
                        return Math.ceil(percent);
                    }
                }
            };
            
            // Calcular médias e scores
            driverMap.forEach((stats, name) => {
                if (stats.racesCount > 0) {
                    // POS. Q (posição média de qualy): 1º=100, 2º=99, ..., 20º=81
                    const avgQualy = stats.qualySum / stats.racesCount;
                    const posQScore = Math.max(81, Math.min(100, Math.ceil(101 - avgQualy)));
                    // QUALY (ritmo de classificação relativo ao grid): percentil da média de qualy
                    const qualyScore = qualyScoreByName[name] ?? posQScore;
                    
                    // RITMO DE CORRIDA: percentual baseado no delta e posição média de corrida - mesma fórmula da tela de telemetria
                    const avgDelta = stats.deltaSum / stats.racesCount;
                    const avgRace = stats.raceSum / stats.racesCount;
                    const ritmoCorrida = deltaToPercent(avgDelta, avgRace);
                    
                    // POS. R (posição média de corrida): 1º=100, 2º=99, ..., 20º=81
                    const posRScore = Math.max(81, Math.min(100, Math.ceil(101 - avgRace)));
                    
                    // RACECRAFT: média ponderada de CORRIDA (30%), POS. Q (20%), QUALY (20%), POS. R (30%)
                    // 60% para CORRIDA + POS. R, 40% para POS. Q + QUALY
                    const racecraft = (ritmoCorrida * 0.30) + (posQScore * 0.20) + (qualyScore * 0.20) + (posRScore * 0.30);
                    
                    telemetriaMap[name] = {
                        ritmoCorrida: ritmoCorrida,
                        ritmoClassificacao: qualyScore,
                        ritmo: posRScore,
                        posQScore: posQScore,
                        posRScore: posRScore,
                        racecraft: Math.max(60, Math.ceil(racecraft)),
                        posicaoMediaQualy: parseFloat(avgQualy.toFixed(2)),
                        posicaoMediaRace: parseFloat(avgRace.toFixed(2))
                    };
                }
            });
        };
        
        // Processar ambos os grids
        processarGridTelemetria(rawCarreira, 'carreira');
        processarGridTelemetria(rawLight, 'light');
        
        setTelemetriaData(telemetriaMap);
    }, [rawCarreira, rawLight, selectedSeason]);

    // Calcular RACECRAFT baseado na média ponderada das colunas CORRIDA, POS. Q, QUALY e POS. R
    useEffect(() => {
        if (!telemetriaData || Object.keys(telemetriaData).length === 0) return;
        if (seasonCtx != null && !canEditPowerRanking(seasonCtx, selectedSeason)) return;

        setPilaresData(prevPilares => {
            const updatedPilares = { ...prevPilares };
            
            Object.keys(telemetriaData).forEach(nomePiloto => {
                const dados = telemetriaData[nomePiloto];
                if (!dados) return;
                
                // CORRIDA (ritmoCorrida) - 30%
                // POS. Q (posQScore) - 20%
                // QUALY (ritmoClassificacao) - 20%
                // POS. R (posRScore) - 30%
                // Total: 60% para CORRIDA + POS. R, 40% para POS. Q + QUALY
                const corrida = dados.ritmoCorrida || 0;
                const posQ = dados.posQScore || dados.ritmoClassificacao || 0;
                const qualy = dados.ritmoClassificacao || 0;
                const posR = dados.posRScore || dados.ritmo || 0;
                
                const racecraft = (corrida * 0.30) + (posQ * 0.20) + (qualy * 0.20) + (posR * 0.30);
                
                if (!updatedPilares[nomePiloto]) {
                    updatedPilares[nomePiloto] = { performance: 60, conduta: 100, racecraft: 60, overall: 60, historico: 60 };
                }
                updatedPilares[nomePiloto].racecraft = Math.max(60, Math.ceil(racecraft));
            });
            
            return updatedPilares;
        });
    }, [telemetriaData, seasonCtx, selectedSeason]);

    useEffect(() => {
        const handleUpdate = () => setObjetivosClassificacaoVersion((prev) => prev + 1);
        const handleStorage = (event) => {
            if (event.key === 'prObjetivosClassificacao') {
                handleUpdate();
            }
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener('prObjetivosClassificacaoUpdated', handleUpdate);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('prObjetivosClassificacaoUpdated', handleUpdate);
        };
    }, []);

    // Calcular pontos dos objetivos contratuais
    useEffect(() => {
        if (pilotos.length === 0 || !rawCarreira || !rawLight) return;
        if (!selectedSeason) return;

        const calcularObjetivos = async () => {
            try {
                // 1. Buscar contratos dos pilotos
                const { data: contracts, error: contractsError } = await supabase
                    .from('contracts')
                    .select(`
                        *,
                        equipes (name, tier)
                    `)
                    .eq('season', selectedSeason);

                if (contractsError) {
                    return;
                }

                const normalizeNameKey = (value) => (value || '')
                    .toString()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();

                const fetchDraftMap = async (gridKey) => {
                    const url = DRAFT_URLS[gridKey];
                    if (!url) return {};
                    try {
                        const csvText = await fetchGoogleSheetCsvText(url, { timeoutMs: 15000 });
                        if (!csvText || !csvText.trim()) return {};
                        return await new Promise((resolve) => {
                            Papa.parse(csvText, {
                                header: false,
                                skipEmptyLines: true,
                                complete: (result) => {
                                    const rows = Array.isArray(result.data) ? result.data : [];
                                    const map = {};
                                    rows.slice(1).forEach((row) => {
                                        const nome = row?.[0];
                                        const equipe = row?.[12];
                                        if (!nome || !equipe) return;
                                        const key = normalizeNameKey(nome);
                                        if (!key) return;
                                        map[key] = equipe.toString().trim();
                                    });
                                    resolve(map);
                                },
                                error: () => resolve({}),
                            });
                        });
                    } catch (err) {
                        console.warn(`⚠️ Falha ao carregar draft ${gridKey}:`, err);
                        return {};
                    }
                };

                const [draftCarreiraMap, draftLightMap] = await Promise.all([
                    fetchDraftMap('carreira'),
                    fetchDraftMap('light'),
                ]);

                // 2. Criar mapa de contratos por piloto (usando cod_idml ou nome)
                const contratosPorPiloto = {};
                contracts?.forEach(contract => {
                    const piloto = pilotos.find(p => 
                        (p.cod_idml && p.cod_idml === contract.pilot_cod_idml) ||
                        (!contract.pilot_cod_idml && p.nome && p.nome.toLowerCase() === contract.pilot_cod_idml?.toLowerCase())
                    );
                    if (piloto) {
                        const gridPiloto = (contract.grid || piloto.grid || 'carreira').toLowerCase();
                        const draftMap = gridPiloto === 'light' ? draftLightMap : draftCarreiraMap;
                        const equipeDraft = draftMap[normalizeNameKey(piloto.nome)];
                        contratosPorPiloto[piloto.nome] = {
                            equipe: equipeDraft || contract.equipes?.name || '',
                            tier: contract.equipes?.tier || 'bronze',
                            grid: contract.grid || piloto.grid
                        };
                    }
                });

                // 3. Função para gerar objetivos baseado na equipe (mesma lógica do Dashboard)
                const normalizeObjetivoKey = (value) => (value || '')
                    .toString()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();

                const objetivosClassificacaoMap = await (async () => {
                    const normalizedMap = {};

                    try {
                        const rawMap = JSON.parse(localStorage.getItem('prObjetivosClassificacao') || '{}');
                        Object.entries(rawMap || {}).forEach(([key, value]) => {
                            const normalizedKey = normalizeObjetivoKey(key);
                            if (normalizedKey) {
                                normalizedMap[normalizedKey] = (value || '').toString().toLowerCase();
                            }
                        });
                    } catch {
                        // Manter mapa vazio caso localStorage falhe
                    }

                    const { data, error } = await supabase
                        .from('objetivos_classificacao')
                        .select('objetivo_texto, classificacao');

                    if (!error && Array.isArray(data)) {
                        data.forEach((row) => {
                            const normalizedKey = normalizeObjetivoKey(row?.objetivo_texto);
                            if (normalizedKey) {
                                normalizedMap[normalizedKey] = (row?.classificacao || '').toString().toLowerCase();
                            }
                        });
                    }

                    return normalizedMap;
                })();

                // 4. Calcular estatísticas de cada piloto na temporada atual
                const calcularEstatisticasPiloto = (nomePiloto, grid) => {
                    const dados = grid === 'carreira' ? rawCarreira : rawLight;
                    const stats = {
                        vitorias: 0,
                        podios: 0,
                        top5: 0,
                        top10: 0,
                        corridasComPontos: 0,
                        totalCorridas: 0,
                        posicaoFinal: null,
                        totalPontos: 0
                    };

                    const nomePilotoNorm = normalizeNameKey(nomePiloto);

                    const pontosPorPosicao = {
                        1: 25,
                        2: 18,
                        3: 15,
                        4: 12,
                        5: 10,
                        6: 8,
                        7: 6,
                        8: 4,
                        9: 2,
                        10: 1
                    };

                    const getPontosByPosicao = (posicao) => pontosPorPosicao[posicao] || 0;

                    // Calcular estatísticas
                    dados.forEach(row => {
                        const nome = (row[9] || '').trim();
                        const season = parseInt(row[3] || '0');
                        const racePos = parseInt(row[8] || '0');
                        
                        // Tentar múltiplas colunas para pontos (15 = Pts Finais, 13 = PTS Corrida, 14 = PTS Sprint)
                        let pontos = 0;
                        const ptsFinais = row[15];
                        const ptsCorrida = row[13];
                        const ptsSprint = row[14];
                        const sprintPos = parseInt(row[7] || '0');
                        
                        // Priorizar Pts Finais (corrida principal), mas se vazio usar fallback da posição
                        if (ptsFinais !== undefined && ptsFinais !== null && ptsFinais !== '') {
                            pontos = parseFloat(ptsFinais.toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                        } else if (ptsCorrida !== undefined && ptsCorrida !== null && ptsCorrida !== '') {
                            pontos = parseFloat(ptsCorrida.toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                        } else if (racePos > 0 && racePos <= 10) {
                            pontos = getPontosByPosicao(racePos);
                        }

                        // SEMPRE somar pontos da Sprint (seja pela coluna 14 ou pela posição)
                        let pontosSprintCalculados = 0;
                        if (ptsSprint !== undefined && ptsSprint !== null && ptsSprint !== '') {
                            pontosSprintCalculados = parseFloat(ptsSprint.toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                        } else if (sprintPos >= 1 && sprintPos <= 8) {
                            // Se não tiver pontos na coluna 14, usa a constante de pontuação da sprint
                            const POINTS_SPRINT_LOCAL = [8, 7, 6, 5, 4, 3, 2, 1];
                            pontosSprintCalculados = POINTS_SPRINT_LOCAL[sprintPos - 1];
                        }
                        
                        pontos += pontosSprintCalculados;

                        if (normalizeNameKey(nome) === nomePilotoNorm && season === selectedSeason) {
                            stats.totalCorridas++;
                            if (racePos === 1) stats.vitorias++;
                            if (racePos >= 1 && racePos <= 3) stats.podios++;
                            if (racePos >= 1 && racePos <= 5) stats.top5++;
                            if (racePos >= 1 && racePos <= 10) stats.top10++;
                            // Considerar corrida com pontos se: tem pontos OU terminou no top 10 (pontuação padrão F1)
                            if (pontos > 0 || (racePos >= 1 && racePos <= 10)) {
                                stats.corridasComPontos++;
                            }
                            stats.totalPontos += pontos;
                        }
                    });

                    // Calcular posição final no campeonato (soma de pontos)
                    const pilotosPontos = {};
                    
                    // Inicializar todos os pilotos do grid atual com 0 pontos para garantir que tenham uma posição
                    pilotos.forEach(p => {
                        if ((p.grid || 'carreira').toLowerCase() === grid.toLowerCase()) {
                            pilotosPontos[p.nome] = 0;
                        }
                    });

                    dados.forEach(row => {
                        const nomeRaw = (row[9] || '').trim();
                        const season = parseInt(row[3] || '0');
                        
                        if (season === selectedSeason && nomeRaw) {
                            // Tentar match normalizado com os pilotos do estado
                            const nNorm = normalizeNameKey(nomeRaw);
                            const pilotoEncontrado = pilotos.find(p => normalizeNameKey(p.nome) === nNorm);
                            const nomeFinal = pilotoEncontrado ? pilotoEncontrado.nome : nomeRaw;

                            // Tentar múltiplas colunas para pontos
                            let pontos = 0;
                            const ptsFinais = row[15];
                            const ptsCorrida = row[13];
                            const ptsSprint = row[14];
                            const racePos = parseInt(row[8] || '0');
                            const sprintPos = parseInt(row[7] || '0');
                            
                            // Priorizar Pts Finais (corrida principal), mas se vazio usar fallback da posição
                            if (ptsFinais !== undefined && ptsFinais !== null && ptsFinais !== '') {
                                pontos = parseFloat(ptsFinais.toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                            } else if (ptsCorrida !== undefined && ptsCorrida !== null && ptsCorrida !== '') {
                                pontos = parseFloat(ptsCorrida.toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                            } else if (racePos > 0 && racePos <= 10) {
                                const POINTS_RACE_LOCAL = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
                                pontos = POINTS_RACE_LOCAL[racePos - 1];
                            }

                            // SEMPRE somar pontos da Sprint (seja pela coluna 14 ou pela posição)
                            let pontosSprintCalculados = 0;
                            if (ptsSprint !== undefined && ptsSprint !== null && ptsSprint !== '') {
                                pontosSprintCalculados = parseFloat(ptsSprint.toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                            } else if (sprintPos >= 1 && sprintPos <= 8) {
                                const POINTS_SPRINT_LOCAL = [8, 7, 6, 5, 4, 3, 2, 1];
                                pontosSprintCalculados = POINTS_SPRINT_LOCAL[sprintPos - 1];
                            }
                            
                            pontos += pontosSprintCalculados;

                            if (!pilotosPontos[nomeFinal]) pilotosPontos[nomeFinal] = 0;
                            pilotosPontos[nomeFinal] += pontos;
                        }
                    });

                    const ranking = Object.entries(pilotosPontos)
                        .sort((a, b) => b[1] - a[1])
                        .map(([nome], index) => ({ nome, posicao: index + 1 }));

                    const pilotoRanking = ranking.find(r => normalizeNameKey(r.nome) === nomePilotoNorm);
                    stats.posicaoFinal = pilotoRanking?.posicao || null;

                    return stats;
                };

                // 5. Função para calcular etapas da temporada
                const calcularEtapasTemporada = (grid) => {
                    const dados = grid === 'carreira' ? rawCarreira : rawLight;
                    const roundsUnicos = new Set();
                    
                    dados.forEach(row => {
                        const season = parseInt(row[3] || '0');
                        const round = row[4]; // Coluna E - Round
                        if (season === selectedSeason && round) {
                            roundsUnicos.add(round);
                        }
                    });
                    
                    const etapasRealizadas = roundsUnicos.size;
                    const etapasTotalEsperado = 8; // Total padrão de etapas por temporada (pode ser ajustado)
                    const etapasRestantes = Math.max(0, etapasTotalEsperado - etapasRealizadas);
                    
                    return {
                        realizadas: etapasRealizadas,
                        total: etapasTotalEsperado,
                        restantes: etapasRestantes
                    };
                };

                // 6. Função para verificar cumprimento de objetivo e atribuir pontos
                const verificarObjetivo = (objetivo, stats, totalFaltas = 0, totalNC = 0, etapasInfo = { realizadas: 0, total: 8, restantes: 0 }, debugNome = '') => {
                    const objLower = objetivo.toLowerCase();
                    let pontos = 0;
                    let tipoObjetivo = 'Não reconhecido';
                    const classificacao = objetivosClassificacaoMap[normalizeObjetivoKey(objetivo)];
                    const forcarQualitativo = classificacao === 'qualitativo';
                    const bloquearQualitativo = classificacao === 'quantitativo';

                    // Objetivos de posição final no campeonato - Regra de afastamento do target
                    // Deve sempre seguir a regra de posições, mesmo que classificação esteja incorreta
                    const matchPosicao = objLower.match(/entre os (\d+|dois|tres|três|quatro|cinco)\s+primeiros(?:\s+do\s+campeonato)?/i);
                    if (matchPosicao && stats.posicaoFinal) {
                        tipoObjetivo = 'Posição Final (Afastamento)';
                        const metaTexto = matchPosicao[1];
                        const mapaMetas = { dois: 2, tres: 3, três: 3, quatro: 4, cinco: 5 };
                        const meta = parseInt(metaTexto, 10) || mapaMetas[metaTexto];
                        
                        if (meta && stats.posicaoFinal <= meta) {
                            // Está dentro da meta (ex: P1, P2 ou P3 para meta Top 3)
                            pontos = 20;
                        } else {
                            // Está fora da meta, perde 1 ponto por posição de afastamento
                            const afastamento = meta ? (stats.posicaoFinal - meta) : 0;
                            pontos = Math.max(0, 20 - (afastamento * 1));
                        }
                        // Garantir piso mínimo para não zerar totalmente quando há posição válida
                        return Math.ceil(Math.max(2, pontos));
                    }

                    // Objetivos com formato "TOP N" do campeonato de pilotos
                    const matchTopCampeonato = objLower.match(/top\s*(\d+).*(campeonato|pilotos)|(?:campeonato|pilotos).*top\s*(\d+)/i);
                    if (matchTopCampeonato && stats.posicaoFinal) {
                        const meta = parseInt(matchTopCampeonato[1] || matchTopCampeonato[3], 10);
                        if (Number.isFinite(meta) && meta > 0) {
                            if (stats.posicaoFinal <= meta) return 20;
                            const afastamento = stats.posicaoFinal - meta;
                            return Math.ceil(Math.max(2, 20 - afastamento));
                        }
                    }

                    // Objetivo extra dos campeões T20 (McLaren/Ferrari): repetir top2 e construtores
                    if (objLower.includes('objetivo extra (campeoes t20)') || (objLower.includes('top2') && objLower.includes('construtores'))) {
                        if (!stats.posicaoFinal) return 12;
                        if (stats.posicaoFinal <= 2) return 20;
                        const afastamento = stats.posicaoFinal - 2;
                        return Math.ceil(Math.max(2, 20 - afastamento));
                    }

                    if (forcarQualitativo) {
                        pontos = Math.max(0, 20 - (totalFaltas * 1.5));
                        return pontos;
                    }

                    // Objetivos de Consistência (NC / Faltas) - Regra específica solicitada
                    if (objLower.includes('terminar corridas de forma consistente')) {
                        tipoObjetivo = 'Consistência NC';
                        pontos = Math.max(0, 20 - (totalFaltas * 3) - (totalNC * 1));
                        return pontos;
                    }

                    // Objetivos de título (pilotos)
                    const matchTitulo = objLower.match(/t[íi]tulo de pilotos|lutar pelo t[íi]tulo/i);
                    if (matchTitulo && stats.posicaoFinal) {
                        tipoObjetivo = 'Título';
                        const meta = 1;
                        pontos = 12;
                        if (stats.posicaoFinal <= meta) {
                            pontos = 20;
                        } else {
                            const diferenca = stats.posicaoFinal - meta;
                            if (diferenca <= 3) {
                                pontos += Math.max(0, 3 - diferenca);
                            }
                        }
                        return Math.ceil(Math.min(20, pontos));
                    }

                    // Objetivos de vitórias
                    const matchVitorias = objLower.match(/pelo menos (\d+) vit[óo]ria/i);
                    if (matchVitorias) {
                        tipoObjetivo = 'Vitórias';
                        const meta = parseInt(matchVitorias[1]);
                        // Início: 12 pontos
                        pontos = 12;
                        // Cada vitória ganha 1 ponto (progresso)
                        pontos += stats.vitorias;
                        // Se atingiu o objetivo completamente, total = 20 pontos
                        if (stats.vitorias >= meta) {
                            pontos = 20;
                        }
                        return Math.ceil(Math.min(20, pontos)); // Máximo 20 pontos
                    }

                    // Objetivos de pódios
                    const matchPodios = objLower.match(/pelo menos (\d+) p[óo]dio/i);
                    if (matchPodios) {
                        tipoObjetivo = 'Pódios';
                        const meta = parseInt(matchPodios[1]);
                        // Início: 12 pontos
                        pontos = 12;
                        // Cada pódio ganha 1 ponto (progresso)
                        pontos += stats.podios;
                        // Se atingiu o objetivo completamente, total = 20 pontos
                        if (stats.podios >= meta) {
                            pontos = 20;
                        }
                        return Math.ceil(Math.min(20, pontos)); // Máximo 20 pontos
                    }

                    // Objetivos de Top 5
                    const matchTop5 = objLower.match(/pelo menos (\d+) top 5/i);
                    if (matchTop5) {
                        tipoObjetivo = 'Top 5';
                        const meta = parseInt(matchTop5[1]);
                        // Início: 12 pontos
                        pontos = 12;
                        // Cada top 5 ganha 1 ponto (progresso)
                        pontos += stats.top5;
                        // Se atingiu o objetivo completamente, total = 20 pontos
                        if (stats.top5 >= meta) {
                            pontos = 20;
                        }
                        return Math.ceil(Math.min(20, pontos)); // Máximo 20 pontos
                    }

                    // Objetivos de Top 10 / Pontuação (Top 10)
                    if (objLower.includes('top 10') || objLower.includes('top10') || objLower.includes('conquistar pontos')) {
                        tipoObjetivo = 'Top 10';
                        const matchTop10 = objLower.match(/pelo menos (\d+) top 10|pelo menos (\d+) top10/i);
                        const meta = matchTop10 ? parseInt(matchTop10[1] || matchTop10[2]) : Math.ceil(etapasInfo.total * 0.5);
                        pontos = 12;
                        pontos += stats.top10;
                        if (stats.top10 >= meta) {
                            pontos = 20;
                        }
                        return Math.ceil(Math.min(20, pontos));
                    }

                    // Objetivos de pódio em percentual das provas
                    const matchPodioPercent = objLower.match(/p[óo]dio.*(\d+)\s*%/i);
                    if (matchPodioPercent) {
                        tipoObjetivo = 'Pódio Percentual';
                        const percent = parseInt(matchPodioPercent[1]);
                        const totalEtapas = etapasInfo.total || 0;
                        const meta = totalEtapas > 0 ? Math.ceil(totalEtapas * (percent / 100)) : 0;
                        pontos = 12;
                        pontos += stats.podios;
                        if (meta > 0 && stats.podios >= meta) {
                            pontos = 20;
                        }
                        return Math.ceil(Math.min(20, pontos));
                    }

                    // Objetivos de pontuação consistente
                    if (objLower.includes('pontuar na maioria') || objLower.includes('pontuar em pelo menos')) {
                        tipoObjetivo = 'Pontuação Consistente';
                        const matchPontos = objLower.match(/pelo menos (\d+) corridas/i);
                        let meta = 0;
                        
                        if (matchPontos) {
                            meta = parseInt(matchPontos[1]);
                        } else {
                            // Se não especificar número, considerar 50% das corridas totais da temporada
                            const totalEtapas = etapasInfo.total;
                            meta = Math.ceil(totalEtapas * 0.5);
                        }
                        
                        // Início: 12 pontos
                        pontos = 12;
                        // Cada corrida com pontos ganha 1 ponto (progresso)
                        pontos += stats.corridasComPontos;
                        // Se atingiu o objetivo completamente, total = 20 pontos
                        if (stats.corridasComPontos >= meta) {
                            pontos = 20;
                        }
                        
                        return Math.ceil(Math.min(20, pontos)); // Máximo 20 pontos
                    }

                    // Objetivos de construtores (tratados como pontuação consistente)
                    if (objLower.includes('construtores') || objLower.includes('campeonato de construtores')) {
                        tipoObjetivo = 'Construtores';
                        const totalEtapas = etapasInfo.total || 0;
                        const meta = totalEtapas ? Math.ceil(totalEtapas * 0.5) : 0;
                        pontos = 12;
                        pontos += stats.corridasComPontos;
                        if (meta > 0 && stats.corridasComPontos >= meta) {
                            pontos = 20;
                        }
                        return Math.ceil(Math.min(20, pontos));
                    }

                    // Se não se encaixa em nenhum padrão quantitativo, então é objetivo qualitativo
                    // Objetivos qualitativos: não dependem de resultados (vitórias, pódios, pontos, posições)
                    if (bloquearQualitativo) {
                        return 0;
                    }
                    tipoObjetivo = 'Objetivo Qualitativo';
                    // Objetivos qualitativos: Início = 20 pontos, cada falta (W.O.) reduz 1.5 pontos
                    // Retornamos o valor exato (float) para que o desconto seja aplicado corretamente em cada objetivo
                    // O arredondamento para cima será feito apenas no cálculo do pilar OVERALL final
                    pontos = Math.max(0, 20 - (totalFaltas * 1.5));
                    return pontos; // Retorna valor exato sem arredondamento aqui
                };

                // 6. Calcular pontos para cada piloto
                const objetivosCalculados = {};
                const textosCalculados = {};
                pilotos.forEach(piloto => {
                    let contrato = contratosPorPiloto[piloto.nome];
                    const isLeandroSopena = piloto.nome.toLowerCase().includes('leandro') && piloto.nome.toLowerCase().includes('sope');
                    const isJulioMelo = piloto.nome.toLowerCase().includes('julio') && piloto.nome.toLowerCase().includes('melo');
                    
                    if (!contrato) {
                        const gridPiloto = (piloto.grid || 'carreira').toLowerCase();
                        const draftMap = gridPiloto === 'light' ? draftLightMap : draftCarreiraMap;
                        const equipeDraft = draftMap[normalizeNameKey(piloto.nome)];
                        if (equipeDraft) {
                            contrato = {
                                equipe: equipeDraft,
                                tier: 'bronze',
                                grid: gridPiloto
                            };
                        }
                    }

                    if (!contrato) {
                        // Piloto sem contrato - todos objetivos com 0
                        objetivosCalculados[piloto.nome] = {
                            objetivo1: 0,
                            objetivo2: 0,
                            objetivo3: 0,
                            objetivo4: 0,
                            objetivo5: 0,
                            objetivo6: 0
                        };
                        textosCalculados[piloto.nome] = [];
                        return;
                    }

                    const objetivos = gerarObjetivosPorEquipe(
                        contrato.equipe,
                        contrato.tier,
                        piloto.nome,
                        contrato.grid || piloto.grid || ''
                    );
                    textosCalculados[piloto.nome] = objetivos;
                    const gridAtual = (piloto.grid || contrato.grid || 'carreira').toLowerCase();
                    let stats = calcularEstatisticasPiloto(piloto.nome, gridAtual);
                    const gridContrato = (contrato.grid || '').toLowerCase();
                    if (!stats.posicaoFinal && gridContrato && gridContrato !== gridAtual) {
                        const statsAlternativo = calcularEstatisticasPiloto(piloto.nome, gridContrato);
                        if (statsAlternativo.posicaoFinal) {
                            stats = statsAlternativo;
                        }
                    }
                    const etapasInfo = calcularEtapasTemporada(gridAtual);
                    
                    // Calcular total de faltas (W.O.) do piloto - automático por resultados
                    const totalFaltas = calcularFaltasPorResultados(piloto);

                    // Calcular total de NC (Did Not Finish) - baseado nos checkboxes manuais
                    const totalNC = (() => {
                        if (!condutaData || !condutaData[piloto.id]) return 0;
                        const etapasArr = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08'];
                        let count = 0;
                        etapasArr.forEach(round => {
                            if (condutaData[piloto.id][round]?.nc === true) count++;
                        });
                        return count;
                    })();

                    const pontosObjetivos = {
                        objetivo1: objetivos[0] ? verificarObjetivo(objetivos[0], stats, totalFaltas, totalNC, etapasInfo, (isLeandroSopena ? 'Leandro Sopeña' : '') || (isJulioMelo ? 'Julio Melo' : '')) : 0,
                        objetivo2: objetivos[1] ? verificarObjetivo(objetivos[1], stats, totalFaltas, totalNC, etapasInfo, (isLeandroSopena ? 'Leandro Sopeña' : '') || (isJulioMelo ? 'Julio Melo' : '')) : 0,
                        objetivo3: objetivos[2] ? verificarObjetivo(objetivos[2], stats, totalFaltas, totalNC, etapasInfo, (isLeandroSopena ? 'Leandro Sopeña' : '') || (isJulioMelo ? 'Julio Melo' : '')) : 0,
                        objetivo4: objetivos[3] ? verificarObjetivo(objetivos[3], stats, totalFaltas, totalNC, etapasInfo, (isLeandroSopena ? 'Leandro Sopeña' : '') || (isJulioMelo ? 'Julio Melo' : '')) : 0,
                        objetivo5: objetivos[4] ? verificarObjetivo(objetivos[4], stats, totalFaltas, totalNC, etapasInfo, (isLeandroSopena ? 'Leandro Sopeña' : '') || (isJulioMelo ? 'Julio Melo' : '')) : 0,
                        objetivo6: objetivos[5] ? verificarObjetivo(objetivos[5], stats, totalFaltas, totalNC, etapasInfo, (isLeandroSopena ? 'Leandro Sopeña' : '') || (isJulioMelo ? 'Julio Melo' : '')) : 0
                    };

                    objetivosCalculados[piloto.nome] = pontosObjetivos;
                });

                setObjetivosData(objetivosCalculados);
                setObjetivosTextos(textosCalculados);
            } catch (error) {
                console.error('❌ Erro ao calcular objetivos contratuais:', error);
            }
        };

        calcularObjetivos();
    }, [pilotos, rawCarreira, rawLight, selectedSeason, condutaData, objetivosClassificacaoVersion, recalculoVersion]);

    // --- MOTOR DE CÁLCULO UNIFICADO ---
    // Este efeito centraliza o cálculo de TODOS os pilares para garantir consistência e evitar sobreposição
    useEffect(() => {
        const calculateEverything = () => {
            if (pilotos.length === 0) return;
            if (loadingPR) return; // Aguardar dados do Power Ranking carregarem

            console.log('⚡ Iniciando cálculo unificado de pilares...');

            const updated = {};
            const normalizeNomeKey = (value) => (value || '')
                .toString()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            const telemetriaByNormalized = {};
            Object.entries(telemetriaData || {}).forEach(([nomeTelemetria, dados]) => {
                const key = normalizeNomeKey(nomeTelemetria);
                if (!key || !dados || telemetriaByNormalized[key]) return;
                telemetriaByNormalized[key] = dados;
            });
            
            // 1. Preparar dados base para normalização
            const maxPRPorGrid = { carreira: 0, light: 0 };
            const prTotaisS20 = {}; // { nome: totalPR }
            const historicosBrutos = {}; // { nome: mediaPonderada }

            // Processar PR S20 para Performance
            const processarPR = (data) => {
                data.forEach(row => {
                    const nomeRaw = (row[0] || '').toString().trim();
                    const season = (row[9] || '').toString().trim();
                    const totalPR = parseFloat((row[8] || '0').toString().replace(',', '.'));
                    if (nomeRaw && season === String(selectedSeason) && !isNaN(totalPR) && totalPR > 0) {
                        const nomeAtual = (row[0] || '').toString().trim(); 
                        // Tentar converter se for nome antigo conhecido
                        const nomesAntigos = {
                            'egon drews': 'Egon Drews',
                            'egondrews': 'Egon Drews',
                            'egon jackson': 'Egon Drews',
                            'egonjackson': 'Egon Drews',
                            'rafael martins': 'Rafa Martins',
                            'rafaelmartins': 'Rafa Martins',
                            'rafa martins': 'Rafa Martins',
                            'rafamartins': 'Rafa Martins',
                        };
                        const nNorm = nomeAtual.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
                        const nomeFinal = nomesAntigos[nNorm] || nomeAtual;
                        prTotaisS20[nomeFinal] = Math.max(prTotaisS20[nomeFinal] || 0, totalPR);
                    }
                });
            };
            processarPR(rawPRCarreira || []);
            processarPR(rawPRLight || []);

            // Calcular Máximos e Médias Ponderadas
            pilotos.forEach(p => {
                const grid = (p.grid || 'carreira').toLowerCase();
                const total = prTotaisS20[p.nome] || 0;
                if (total > maxPRPorGrid[grid]) maxPRPorGrid[grid] = total;
                historicosBrutos[p.nome] = calcularMediaPonderadaHistorico(p.nome, grid);
            });

            // Máximos de Histórico
            const maxHistPorGrid = { carreira: 0, light: 0 };
            pilotos.forEach(p => {
                const hb = historicosBrutos[p.nome] || 0;
                const grid = (p.grid || 'carreira').toLowerCase();
                if (hb > maxHistPorGrid[grid]) maxHistPorGrid[grid] = hb;
            });

            // 2. Calcular cada pilar para cada piloto
            pilotos.forEach(piloto => {
                const nome = piloto.nome;
                const grid = (piloto.grid || 'carreira').toLowerCase();

                // --- PILAR 1: PERFORMANCE (60-84) + Extras (NC/Punish) ---
                let perf = 60;
                const totalS20 = prTotaisS20[nome] || 0;
                const maxS20 = maxPRPorGrid[grid] || 0;
                if (totalS20 > 0 && maxS20 > 0) {
                    const pct = (totalS20 / maxS20) * 100;
                    perf = 60 + (pct * 0.24);
                }

                // Somar/Subtrair pontos de NC RACE e PUNISH RACE
                // Para um desconto de apenas 1 ponto:
                // Desmarcado (limpo) = +1 ponto, Marcado (X) = 0 pontos (perde o bônus)
                for (let r = 1; r <= 8; r++) {
                    const rData = (condutaData && condutaData[piloto.id] && condutaData[piloto.id][r]) || {};
                    
                    // NC RACE
                    if (rData.nc !== true) perf += 1;

                    // PUNISH RACE
                    if (rData.punish_race !== true) perf += 1;
                }

                // --- PILAR 2: CONDUTA (Base 100) ---
                let cond = 100;
                if (condutaData && condutaData[piloto.id]) {
                    const rounds = condutaData[piloto.id];
                    let jaDescontouFoto = false;
                    Object.values(rounds).forEach(data => {
                        // Foto (-5) - Agora true significa INFRAÇÃO (X Vermelho)
                        if (data.foto_oficial_enviada === true && !jaDescontouFoto) {
                            cond -= 5;
                            jaDescontouFoto = true;
                        }
                        // X Vermelho (-1 cada) - Agora true significa INFRAÇÃO (X Vermelho) em todas
                        if (data.lista_presenca_respondida === true) cond -= 1;
                        if (data.numeracao_errada === true) cond -= 1;
                        if (data.telemetria_fechada === true) cond -= 1;
                        // Manual (-X)
                        if (data.pontos_descontados) cond -= data.pontos_descontados;
                    });
                }
                // Faltas W.O. (-3 cada)
                cond -= (calcularFaltasPorResultados(piloto) * 3);
                
                // Análises (Metade do valor exibido)
                const punicaoIncidentes = buscarPunicoes(nome);
                const faltasDefesaQtde = buscarDefesasFaltantes(nome);
                const valorExibidoDefesa = faltasDefesaQtde * 5;
                const valorExibidoPunicoesReal = Math.max(0, punicaoIncidentes - valorExibidoDefesa);
                
                cond -= (valorExibidoDefesa / 2);
                cond -= (valorExibidoPunicoesReal / 2);
                
                const advertenciasQtde = buscarAdvertencias(nome);
                cond -= advertenciasQtde;

                // --- PILAR 3: RACECRAFT (Mínimo 60) ---
                const rt = telemetriaData[nome] || telemetriaByNormalized[normalizeNomeKey(nome)] || {};
                let race = Math.max(60, rt.racecraft || 60);

                // --- PILAR 4: OVERALL (Soma metas) ---
                const obj = objetivosData[nome] || {};
                // Objetivo 6 é informativo/estratégico (campeões/equipes favoritas) e não entra no OVERALL.
                let over = (obj.objetivo1 || 0) + (obj.objetivo2 || 0) + (obj.objetivo3 || 0) + (obj.objetivo4 || 0) + (obj.objetivo5 || 0);
                // OVERALL sempre respeita piso 60, mas não deve ser travado em 60
                // para pilotos sem PR na etapa (ex.: faltantes com objetivos válidos).
                over = Math.max(60, over);

                // --- PILAR 5: HISTÓRICO (60-100) = 40% HISTÓRIA + 30% TEMPORADAS + 30% CORRIDAS ---
                let hbNorm = 60;
                const hbVal = historicosBrutos[nome] || 0;
                const maxHb = maxHistPorGrid[grid] || 0;
                if (hbVal > 0 && maxHb > 0) hbNorm = 60 + ((hbVal / maxHb) * 40);
                const pontTemp = Math.max(60, temporadasData[nome] || 0);
                const dadosCorridas = corridasData[nome] || { pontuacao: 60 };
                const pontCorridas = dadosCorridas.pontuacao ?? 60;
                let histFinal = (hbNorm * 0.40) + (pontTemp * 0.30) + (pontCorridas * 0.30);

                const finalPerf = Math.ceil(Math.min(100, perf));
                const finalCond = Math.max(0, cond);
                const finalRace = Math.ceil(Math.min(100, race));
                const finalOver = Math.ceil(Math.min(100, over));
                const finalHist = Math.ceil(Math.max(60, Math.min(100, histFinal)));

                const prCalculado = Math.ceil(
                    (finalPerf * 0.30) + 
                    (finalRace * 0.25) + 
                    (finalOver * 0.20) + 
                    (finalCond * 0.15) + 
                    (finalHist * 0.10)
                );
                // Cada falta (W.O.) do piloto tira 2 pontos do Power Ranking final
                const faltas = calcularFaltasPorResultados(piloto);
                const prFinal = Math.max(0, prCalculado - (faltas * 2));

                updated[nome] = {
                    performance: finalPerf,
                    conduta: finalCond,
                    racecraft: finalRace,
                    overall: finalOver,
                    historico: finalHist,
                    power_ranking: prFinal,
                    prAntesFaltas: prCalculado,
                    faltas
                };

                // Log detalhado do cálculo para pilotos solicitados
                const pilotosDetalhe = ['Yuri Rodrigues', 'Pedro Folha', 'Ricardo Wielewski', 'Iuri Luchyan', 'Julio Melo'];
                if (pilotosDetalhe.some(n => nome.toLowerCase().includes(n.toLowerCase()))) {
                    const contrib = (finalPerf * 0.30) + (finalRace * 0.25) + (finalOver * 0.20) + (finalCond * 0.15) + (finalHist * 0.10);
                    console.log(`📊 Power Ranking – ${nome}`, {
                        performance: finalPerf, racecraft: finalRace, overall: finalOver, conduta: finalCond, historico: finalHist,
                        formula: `(${finalPerf}×0,30 + ${finalRace}×0,25 + ${finalOver}×0,20 + ${finalCond}×0,15 + ${finalHist}×0,10)`,
                        prAntesFaltas: prCalculado, contribuicaoBruta: contrib.toFixed(2),
                        faltas, prFinal
                    });
                }
            });

            // Garantir entrada para todos
            pilotos.forEach(p => {
                if (!updated[p.nome]) {
                    const defaultP = { performance: 60, conduta: 100, racecraft: 60, overall: 60, historico: 60 };
                    const prBase = Math.ceil(
                        (defaultP.performance * 0.30) + 
                        (defaultP.racecraft * 0.25) + 
                        (defaultP.overall * 0.20) + 
                        (defaultP.conduta * 0.15) + 
                        (defaultP.historico * 0.10)
                    );
                    const faltas = calcularFaltasPorResultados(p);
                    defaultP.power_ranking = Math.max(0, prBase - faltas);
                    defaultP.prAntesFaltas = prBase;
                    defaultP.faltas = faltas;
                    updated[p.nome] = defaultP;
                }
            });

            setPilaresData(updated);
            setHistoricoBrutoData(historicosBrutos);
        };

        calculateEverything();
    }, [pilotos, selectedSeason, loadingPR, rawPRCarreira, rawPRLight, condutaData, punicoesData, defesasFaltantesData, advertenciasData, telemetriaData, objetivosData, temporadasData, corridasData, calcularMediaPonderadaHistorico, buscarPunicoes, buscarDefesasFaltantes, buscarAdvertencias, calcularFaltasPorResultados, recalculoVersion]);

    // Marcar como carregado
    useEffect(() => {
        if (pilotos.length > 0 && !loadingPR) {
            setLoading(false);
        }
    }, [pilotos, loadingPR]);

    // Filtrar pilotos por busca e grid
    const filteredPilotos = pilotos
        .filter(piloto => {
            const matchesSearch = piloto.nome.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesGrid = selectedGrid === 'all' || piloto.grid === selectedGrid;
            return matchesSearch && matchesGrid;
        })
        .sort((a, b) => {
            // Ordenar alfabeticamente por nome
            return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        });

    // Função para atualizar flag manual
    const handleUpdateFlag = async (pilotoId, roundLabel, flagName, value) => {
        if (seasonCtx != null && !canEditPowerRanking(seasonCtx, selectedSeason)) {
            alert('🔒 Edição bloqueada para esta temporada/fase.');
            return;
        }
        const key = `${pilotoId}_${roundLabel}`;
        setSaving(prev => ({ ...prev, [key]: true }));

        // Converter "R01" para 1, etc.
        const round = parseInt(roundLabel.toString().replace(/[^\d]/g, '')) || 1;

        try {
            const { data: existing } = await supabase
                .from('power_ranking_conduta')
                .select('id')
                .eq('piloto_id', pilotoId)
                .eq('season', selectedSeason)
                .eq('round', round)
                .single();

            const updateData = {
                piloto_id: pilotoId,
                season: selectedSeason,
                round: round,
                [flagName]: value,
                updated_at: new Date().toISOString()
            };

            let error;
            if (existing) {
                const { error: updateError } = await supabase
                    .from('power_ranking_conduta')
                    .update(updateData)
                    .eq('id', existing.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('power_ranking_conduta')
                    .insert([updateData]);
                error = insertError;
            }

            if (error) throw error;

            setCondutaData(prev => {
                const newData = { ...prev };
                if (!newData[pilotoId]) newData[pilotoId] = {};
                if (!newData[pilotoId][round]) {
                    newData[pilotoId][round] = {
                        piloto_id: pilotoId,
                        season: selectedSeason,
                        round: round
                    };
                }
                newData[pilotoId][round][flagName] = value;
                return newData;
            });
        } catch (err) {
            console.error('Erro ao atualizar flag:', err);
            alert('❌ Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    // Função para publicar resultados no Motorhome (Silenciosa para Auto-save)
    // Sempre calcula power_ranking a partir dos pilares ao persistir (causa raiz: evita gravar 0 quando um efeito atualizou pilares sem setar power_ranking)
    const publicarSilencioso = useCallback(async (dadosPilares) => {
        if (!pilotos.length || Object.keys(dadosPilares).length === 0) return;
        if (seasonCtx != null && !canEditPowerRanking(seasonCtx, selectedSeason)) return;

        try {
            const user = await fetchActiveAuthUser();
            if (!user) {
                setHasSupabaseSession(false);
                return;
            }
            setHasSupabaseSession(true);

            const skippedPilotos = [];
            const statsToUpsert = pilotos.map(p => {
                const pilotoId = String(p?.id || '').trim();
                if (!UUID_RE.test(pilotoId)) {
                    skippedPilotos.push(p?.nome || pilotoId || 'Piloto sem ID');
                    return null;
                }
                const stats = dadosPilares[p.nome];
                if (!stats) return null;
                const faltas = stats.faltas !== undefined ? stats.faltas : calcularFaltasPorResultados(p);
                return buildStatsUpsertForMotorhome({
                    piloto_id: pilotoId,
                    season: selectedSeason,
                    stats,
                    faltas,
                });
            }).filter(Boolean);

            if (statsToUpsert.length > 0) {
                const { error: rpcErr } = await supabase.rpc('publish_power_ranking_stats_upsert', {
                    p_rows: statsToUpsert,
                });
                if (rpcErr) throw rpcErr;
                console.log('🔄 Sincronização automática com Motorhome concluída.');
                if (skippedPilotos.length > 0) {
                    console.warn(
                        `[PR Motorhome] ${skippedPilotos.length} piloto(s) sem UUID válido ignorado(s) na publicação automática.`,
                        skippedPilotos,
                    );
                }
            }
        } catch (err) {
            const msg = err?.message || '';
            if (/auth session missing/i.test(msg)) {
                setHasSupabaseSession(false);
                return;
            }
            const isRls =
                err?.code === '42501' || /row-level security|violates row-level security/i.test(msg);
            if (isRls) {
                console.error(
                    '[PR Motorhome] Falha ao publicar (RLS ou RPC). Rode scripts/fix_power_ranking_stats_rls_steward.sql (função publish_power_ranking_stats_upsert) e confira steward.',
                    err,
                );
            } else {
                console.warn('Erro na sincronização automática:', err);
            }
        }
    }, [pilotos, selectedSeason, calcularFaltasPorResultados, seasonCtx, fetchActiveAuthUser]);

    // Auto-save: sempre que pilaresData mudar, sincronizar com o banco após 2 segundos de inatividade
    useEffect(() => {
        if (Object.keys(pilaresData).length === 0) return;
        
        const timer = setTimeout(() => {
            publicarSilencioso(pilaresData);
        }, 2000);

        return () => clearTimeout(timer);
    }, [pilaresData, publicarSilencioso]);

    // Função para publicar resultados no Motorhome
    // Sempre calcula power_ranking a partir dos pilares ao persistir (mesma causa raiz que publicarSilencioso)
    const handlePublicarMotorhome = async () => {
        if (seasonCtx != null && !canEditPowerRanking(seasonCtx, selectedSeason)) {
            alert('🔒 Publicação bloqueada: temporada congelada ou somente leitura.');
            return;
        }
        if (!window.confirm('Deseja publicar as pontuações atuais para visualização no Motorhome dos pilotos?')) return;
        
        setIsPublishing(true);
        try {
            const user = await fetchActiveAuthUser();
            if (!user) {
                setHasSupabaseSession(false);
                const goLogin = window.confirm(
                    '❌ Sessão do Supabase não encontrada.\n\n' +
                    'Para publicar no Motorhome, faça login em /login com a conta steward.\n\n' +
                    'Deseja abrir a tela de login agora?',
                );
                if (goLogin) navigate('/login');
                return;
            }
            setHasSupabaseSession(true);

            const loginEmail = (user.email || user.user_metadata?.email || '').trim();
            const loginUid = (user.id || '').trim();

            // Pré-checagem explícita para evitar erro genérico na RPC principal.
            const { data: isSteward, error: stewardErr } = await supabase.rpc('auth_is_steward_for_rls');
            if (stewardErr) {
                throw new Error(
                    `Falha ao validar permissão steward (${stewardErr.code || 'sem-codigo'}): ${stewardErr.message || 'erro desconhecido'}`,
                );
            }
            if (!isSteward) {
                alert(
                    '❌ Seu login atual não está autorizado como steward.\n\n' +
                    `Usuário logado: ${loginEmail || '(sem e-mail)'}\n` +
                    `UID: ${loginUid || '(sem UID)'}\n\n` +
                    'Verifique se este mesmo e-mail está em pilotos.email com is_steward = true e faça logout/login.',
                );
                return;
            }

            const skippedPilotos = [];
            const statsToUpsert = pilotos.map(p => {
                const pilotoId = String(p?.id || '').trim();
                if (!UUID_RE.test(pilotoId)) {
                    skippedPilotos.push(p?.nome || pilotoId || 'Piloto sem ID');
                    return null;
                }
                const stats = pilaresData[p.nome];
                if (!stats) return null;
                const faltas = stats.faltas !== undefined ? stats.faltas : calcularFaltasPorResultados(p);
                return buildStatsUpsertForMotorhome({
                    piloto_id: pilotoId,
                    season: selectedSeason,
                    stats,
                    faltas,
                });
            }).filter(Boolean);

            if (statsToUpsert.length === 0) {
                alert('⚠️ Nenhum dado calculado para publicar.');
                return;
            }

            const { error } = await supabase.rpc('publish_power_ranking_stats_upsert', {
                p_rows: statsToUpsert,
            });

            if (error) throw error;

            if (skippedPilotos.length > 0) {
                alert(
                    `✅ Pontuações publicadas com sucesso para ${statsToUpsert.length} piloto(s).\n\n` +
                    `${skippedPilotos.length} piloto(s) foram ignorados por não terem cadastro com UUID válido em pilotos:\n` +
                    skippedPilotos.slice(0, 8).join(', ') +
                    (skippedPilotos.length > 8 ? '...' : ''),
                );
            } else {
                alert('✅ Pontuações publicadas com sucesso! Agora elas aparecerão no Motorhome dos pilotos.');
            }
        } catch (err) {
            console.error('Erro ao publicar no Motorhome:', err);
            const msg = err.message || 'Erro desconhecido';
            const code = err.code;
            const isRls =
                code === '42501'
                || /row-level security|violates row-level security|Steward necessário/i.test(msg);
            if (isRls) {
                alert(
                    '❌ Publicação recusada (permissão steward ou RPC ausente).\n\n' +
                    '1) No Supabase → SQL Editor, rode o script completo scripts/fix_power_ranking_stats_rls_steward.sql (cria a RPC publish_power_ranking_stats_upsert).\n' +
                    '2) Confirme is_steward = true e e-mail em pilotos = e-mail do login no Auth.\n' +
                    '3) Faça logout/login no site após mudanças no banco.\n\n' +
                    `Detalhe técnico: [${code || 'sem-codigo'}] ${msg}`
                );
            } else {
                alert(`❌ Erro ao publicar: [${code || 'sem-codigo'}] ${msg}`);
            }
        } finally {
            setIsPublishing(false);
        }
    };

    // Obter valor da flag
    const getFlagValue = (pilotoId, roundLabel, flagName, defaultValue = false) => {
        // Converter label para número da etapa para buscar no objeto indexado por número
        const round = typeof roundLabel === 'string' ? (parseInt(roundLabel.replace(/[^\d]/g, '')) || 1) : roundLabel;
        return condutaData[pilotoId]?.[round]?.[flagName] ?? defaultValue;
    };

    // Função para obter todas as flags editáveis
    const getEditableFlags = () => {
        return [
            { colKey: 'envio_foto', flagName: 'foto_oficial_enviada', isSingle: true },
            { colKey: 'lista', flagName: 'lista_presenca_respondida', isSingle: false },
            { colKey: 'num_id', flagName: 'numeracao_errada', isSingle: false },
            { colKey: 'telemetria_conduta', flagName: 'telemetria_fechada', isSingle: false },
            { colKey: 'nc', flagName: 'nc', isSingle: false },
            { colKey: 'punish_race', flagName: 'punish_race', isSingle: false }
        ];
    };

    // Função otimizada para batch update de flags
    const handleBatchUpdateFlags = async (updates) => {
        // updates: [{ pilotoId, round, flagName, value }, ...]
        if (!updates || updates.length === 0) return;
        if (seasonCtx != null && !canEditPowerRanking(seasonCtx, selectedSeason)) {
            alert('🔒 Edição bloqueada para esta temporada/fase.');
            return;
        }

        try {
            // Atualizar estado local primeiro para feedback imediato
            setCondutaData(prev => {
                const newData = { ...prev };
                updates.forEach(({ pilotoId, round, flagName, value }) => {
                    if (!newData[pilotoId]) newData[pilotoId] = {};
                    if (!newData[pilotoId][round]) {
                        newData[pilotoId][round] = {
                            piloto_id: pilotoId,
                            season: selectedSeason,
                            round: round
                        };
                    }
                    newData[pilotoId][round][flagName] = value;
                });
                return newData;
            });

            // Agrupar updates por piloto_id + round para mesclar múltiplas flags no mesmo registro
            const groupedRecords = new Map();
            updates.forEach(({ pilotoId, round, flagName, value }) => {
                const key = `${pilotoId}_${round}`;
                if (!groupedRecords.has(key)) {
                    groupedRecords.set(key, {
                        piloto_id: pilotoId,
                        season: selectedSeason,
                        round: round,
                        updated_at: new Date().toISOString()
                    });
                }
                groupedRecords.get(key)[flagName] = value;
            });

            const recordsToUpsert = Array.from(groupedRecords.values());

            // Fazer upsert em batch (Supabase faz merge automático com onConflict)
            const { error } = await supabase
                .from('power_ranking_conduta')
                .upsert(recordsToUpsert, { 
                    onConflict: 'piloto_id,season,round',
                    ignoreDuplicates: false
                });

            if (error) throw error;
        } catch (err) {
            console.error('Erro ao fazer batch update:', err);
            alert('❌ Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
            // Recarregar dados em caso de erro
            try {
                const { data } = await supabase
                    .from('power_ranking_conduta')
                    .select('*')
                    .eq('season', selectedSeason);
                if (data) {
                    const organized = {};
                    data.forEach(item => {
                        if (!organized[item.piloto_id]) organized[item.piloto_id] = {};
                        organized[item.piloto_id][item.round] = item;
                    });
                    setCondutaData(organized);
                }
            } catch (reloadErr) {
                console.error('Erro ao recarregar dados:', reloadErr);
            }
        }
    };

    // Desmarcar todos os checkboxes de uma linha (piloto)
    const handleUncheckRow = async (pilotoId) => {
        if (seasonCtx != null && !canEditPowerRanking(seasonCtx, selectedSeason)) return;
        if (!window.confirm('Deseja desmarcar todos os checkboxes desta linha?')) return;
        
        const flags = getEditableFlags();
        const etapas = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08'];
        
        const updates = [];
        flags.forEach(flag => {
            if (flag.isSingle) {
                updates.push({
                    pilotoId,
                    round: 1,
                    flagName: flag.flagName,
                    value: false
                });
            } else {
                etapas.forEach(round => {
                    const roundNum = parseInt(round.replace(/[^\d]/g, '')) || 1;
                    updates.push({
                        pilotoId,
                        round: roundNum,
                        flagName: flag.flagName,
                        value: false
                    });
                });
            }
        });

        await handleBatchUpdateFlags(updates);
    };

    // Desmarcar todos os checkboxes de uma coluna (flag)
    const handleUncheckColumn = async (colKey) => {
        if (seasonCtx != null && !canEditPowerRanking(seasonCtx, selectedSeason)) return;
        console.log('handleUncheckColumn chamado com:', colKey);
        
        const flagMap = {
            'envio_foto': { flagName: 'foto_oficial_enviada', isSingle: true },
            'lista': { flagName: 'lista_presenca_respondida', isSingle: false },
            'num_id': { flagName: 'numeracao_errada', isSingle: false },
            'telemetria_conduta': { flagName: 'telemetria_fechada', isSingle: false },
            'nc': { flagName: 'nc', isSingle: false },
            'punish_race': { flagName: 'punish_race', isSingle: false }
        };

        const flag = flagMap[colKey];
        if (!flag) {
            console.error('Coluna não encontrada no flagMap:', colKey);
            alert(`Coluna "${colKey}" não é editável ou não foi encontrada.`);
            return;
        }

        // Obter coluna para mostrar nome amigável (usar definição direta para evitar problema de escopo)
        const colLabels = {
            'envio_foto': 'ENVIO DE FOTO',
            'lista': 'LISTA',
            'num_id': 'NUM-ID',
            'telemetria_conduta': 'TELEMETRIA',
            'nc': 'NC RACE',
            'punish_race': 'PUNISH RACE'
        };
        const colLabel = colLabels[colKey] || colKey;

        if (!window.confirm(`Deseja desmarcar todos os checkboxes da coluna "${colLabel}" para todos os pilotos?`)) {
            console.log('Usuário cancelou a operação');
            return;
        }

        console.log('Iniciando desmarcação da coluna:', colKey, 'Flag:', flag.flagName);

        const etapas = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08'];
        
        // Usar pilotos filtrados (os que estão visíveis na tabela)
        const pilotosParaProcessar = pilotos
            .filter(piloto => {
                const matchesSearch = piloto.nome.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesGrid = selectedGrid === 'all' || piloto.grid === selectedGrid;
                return matchesSearch && matchesGrid;
            });
        
        console.log('Pilotos para processar:', pilotosParaProcessar.length);

        const updates = [];
        pilotosParaProcessar.forEach(piloto => {
            if (flag.isSingle) {
                updates.push({
                    pilotoId: piloto.id,
                    round: 1,
                    flagName: flag.flagName,
                    value: false
                });
            } else {
                etapas.forEach(round => {
                    const roundNum = parseInt(round.replace(/[^\d]/g, '')) || 1;
                    updates.push({
                        pilotoId: piloto.id,
                        round: roundNum,
                        flagName: flag.flagName,
                        value: false
                    });
                });
            }
        });

        console.log('Total de updates a processar:', updates.length);
        await handleBatchUpdateFlags(updates);
        console.log('Desmarcação concluída');
    };

    // Desmarcar todos os checkboxes de todos os pilotos
    const handleUncheckAll = async () => {
        if (seasonCtx != null && !canEditPowerRanking(seasonCtx, selectedSeason)) return;
        if (!window.confirm('Deseja desmarcar TODOS os checkboxes de TODOS os pilotos? Esta ação não pode ser desfeita facilmente.')) return;
        
        const flags = getEditableFlags();
        const etapas = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08'];
        
        // Usar pilotos filtrados (os que estão visíveis na tabela)
        const pilotosParaProcessar = pilotos
            .filter(piloto => {
                const matchesSearch = piloto.nome.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesGrid = selectedGrid === 'all' || piloto.grid === selectedGrid;
                return matchesSearch && matchesGrid;
            });
        
        const updates = [];
        pilotosParaProcessar.forEach(piloto => {
            flags.forEach(flag => {
                if (flag.isSingle) {
                    updates.push({
                        pilotoId: piloto.id,
                        round: 1,
                        flagName: flag.flagName,
                        value: false
                    });
                } else {
                    etapas.forEach(round => {
                        const roundNum = parseInt(round.replace(/[^\d]/g, '')) || 1;
                        updates.push({
                            pilotoId: piloto.id,
                            round: roundNum,
                            flagName: flag.flagName,
                            value: false
                        });
                    });
                }
            });
        });

        await handleBatchUpdateFlags(updates);
    };

    // Calcular Power Ranking final (média dos pilares)
    const calcularPRFinal = (pilotoNome) => {
        const pilares = pilaresData[pilotoNome] || {};
        const valores = [
            pilares.performance || 0,
            pilares.conduta || 0,
            pilares.racecraft || 0,
            pilares.overall || 0,
            pilares.historico || 0
        ].filter(v => v > 0);
        
        if (valores.length === 0) return 0;
        return valores.reduce((a, b) => a + b, 0) / valores.length;
    };

    if (loading) {
        return (
            <div style={{ padding: '100px', textAlign: 'center', color: 'white' }}>
                Carregando Power Ranking...
            </div>
        );
    }

    const editsLocked = seasonCtx != null && !canEditPowerRanking(seasonCtx, selectedSeason);
    const seasonOptions = Array.from({ length: 16 }, (_, i) => 31 - i);

    // Definir colunas da tabela
    const columns = [
        { key: 'piloto', label: 'PILOTO', color: COLORS.PILOTO, width: 200, sticky: true, stickyLeft: 50 },
        { key: 'power_ranking', label: 'POWER RANKING', color: COLORS.POWER_RANKING, width: 120, sticky: true, stickyLeft: 250 },
        { key: 'performance', label: 'PERFORMANCE', color: COLORS.PERFORMANCE, width: 120 },
        { key: 'nc', label: 'NC RACE', color: COLORS.PERFORMANCE, width: 200, subitem: true, editable: true },
        { key: 'punish_race', label: 'PUNISH RACE', color: COLORS.PERFORMANCE, width: 200, subitem: true, editable: true },
        { key: 'pr_races', label: 'PR RACES', color: COLORS.PERFORMANCE, width: 100, subitem: true },
        { key: 'conduta', label: 'CONDUTA', color: COLORS.CONDUTA, width: 120 },
        { key: 'envio_foto', label: 'ENVIO DE FOTO', color: COLORS.CONDUTA, width: 120, subitem: true, editable: true },
        { key: 'faltas', label: 'FALTAS', color: COLORS.CONDUTA, width: 100, subitem: true },
        { key: 'lista', label: 'LISTA', color: COLORS.CONDUTA, width: 200, subitem: true, editable: true },
        { key: 'num_id', label: 'NUM-ID', color: COLORS.CONDUTA, width: 200, subitem: true, editable: true },
        { key: 'telemetria_conduta', label: 'TELEMETRIA', color: COLORS.CONDUTA, width: 200, subitem: true, editable: true },
        { key: 'defesa', label: 'DEFESA', color: COLORS.CONDUTA, width: 100, subitem: true },
        { key: 'advert', label: 'ADVERT', color: COLORS.CONDUTA, width: 90, subitem: true },
        { key: 'punicoes', label: 'PUNIÇÕES', color: COLORS.CONDUTA, width: 100, subitem: true },
        { key: 'racecraft', label: 'RACECRAFT', color: COLORS.RACECRAFT, width: 120 },
        { key: 'corrida', label: 'CORRIDA', color: COLORS.RACECRAFT, width: 100, subitem: true },
        { key: 'sprint', label: 'POS. Q', color: COLORS.RACECRAFT, width: 100, subitem: true },
        { key: 'qualy', label: 'QUALY', color: COLORS.RACECRAFT, width: 100, subitem: true },
        { key: 'ritmo', label: 'POS. R', color: COLORS.RACECRAFT, width: 100, subitem: true },
        { key: 'overall', label: 'OVERALL', color: COLORS.OVERALL, width: 120 },
        { key: 'objetivo1', label: 'OBJETIVO 1', color: COLORS.OVERALL, width: 100, subitem: true },
        { key: 'objetivo2', label: 'OBJETIVO 2', color: COLORS.OVERALL, width: 100, subitem: true },
        { key: 'objetivo3', label: 'OBJETIVO 3', color: COLORS.OVERALL, width: 100, subitem: true },
        { key: 'objetivo4', label: 'OBJETIVO 4', color: COLORS.OVERALL, width: 100, subitem: true },
        { key: 'objetivo5', label: 'OBJETIVO 5', color: COLORS.OVERALL, width: 100, subitem: true },
        { key: 'objetivo6', label: 'OBJETIVO 6', color: COLORS.OVERALL, width: 100, subitem: true },
        { key: 'historico', label: 'HISTÓRICO', color: COLORS.HISTORICO, width: 120 },
        { key: 'temporadas', label: 'TEMPORADAS', color: COLORS.HISTORICO, width: 120 },
        { key: 'corridas', label: 'CORRIDAS', color: COLORS.HISTORICO, width: 120 },
        { key: 'historia', label: 'HISTÓRIA', color: COLORS.HISTORICO, width: 100, subitem: true }
    ];

    return (
        <div className="adm-content" style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ color: '#F8FAFC', marginBottom: '20px' }}>
                    📊 Power Ranking - Painel Administrativo
                </h2>
                {editsLocked && (
                    <div style={{
                        background: 'rgba(251, 191, 36, 0.12)',
                        border: '1px solid rgba(251, 191, 36, 0.5)',
                        color: '#fef3c7',
                        padding: '12px 16px',
                        borderRadius: 8,
                        marginBottom: 16,
                        fontSize: 14
                    }}>
                        🔒 <strong>Somente leitura</strong> — temporada congelada, fase pré-temporada ou temporada diferente da
                        atual do site (T{seasonCtx?.currentSeason ?? '—'}). Ajuste a temporada no seletor ou altere a fase em <strong>ADM → Temporada</strong>.
                    </div>
                )}
                {hasSupabaseSession === false && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.45)',
                        color: '#fecaca',
                        padding: '12px 16px',
                        borderRadius: 8,
                        marginBottom: 16,
                        fontSize: 14,
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                    }}>
                        <span>
                            ⚠️ Sem sessão Supabase ativa neste navegador. O painel admin local funciona, mas publicar no Motorhome exige login em <strong>/login</strong>.
                        </span>
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: '1px solid rgba(254, 202, 202, 0.7)',
                                background: 'transparent',
                                color: '#fee2e2',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            Ir para Login
                        </button>
                    </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                    <label style={{ color: '#94A3B8', fontSize: 14 }}>
                        Temporada (planilha / PR):{' '}
                        <select
                            value={selectedSeason}
                            onChange={(e) => setSelectedSeason(Number(e.target.value))}
                            style={{
                                marginLeft: 8,
                                padding: '8px 12px',
                                background: '#1E293B',
                                border: '1px solid #475569',
                                borderRadius: 6,
                                color: '#F8FAFC',
                                fontSize: 14
                            }}
                        >
                            {seasonOptions.map((s) => (
                                <option key={s} value={s}>T{s}</option>
                            ))}
                        </select>
                    </label>
                    {seasonCtx && (
                        <span style={{ color: '#94A3B8', fontSize: 13 }}>
                            Ciclo: <strong style={{ color: '#e2e8f0' }}>{phaseLabelPt(seasonCtx.phase)}</strong>
                            {' · '}Site T{seasonCtx.currentSeason}
                            {' · '}Última encerrada T{seasonCtx.lastClosedSeason}
                        </span>
                    )}
                </div>
                <a
                    href="/admin/powerranking-objetivos"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        background: '#1F2937',
                        color: '#F8FAFC',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        marginBottom: '20px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    ⚙️ Objetivos (Quali/Quanti)
                </a>
                <button
                    type="button"
                    onClick={handleRecalcularTudo}
                    disabled={editsLocked}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        background: '#0F172A',
                        color: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        marginLeft: '10px',
                        cursor: editsLocked ? 'not-allowed' : 'pointer',
                        opacity: editsLocked ? 0.5 : 1
                    }}
                >
                    🔄 Recalcular tudo
                </button>

                {/* Filtros */}
                <div style={{
                    display: 'flex',
                    gap: '15px',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                        <label style={{ color: '#94A3B8', fontSize: '14px', display: 'block', marginBottom: '5px' }}>
                            Buscar Piloto:
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Digite o nome do piloto..."
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#1E293B',
                                border: '1px solid #475569',
                                borderRadius: '6px',
                                color: '#F8FAFC',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div style={{ minWidth: '150px' }}>
                        <label style={{ color: '#94A3B8', fontSize: '14px', display: 'block', marginBottom: '5px' }}>
                            Grid:
                        </label>
                        <select
                            value={selectedGrid}
                            onChange={(e) => setSelectedGrid(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#1E293B',
                                border: '1px solid #475569',
                                borderRadius: '6px',
                                color: '#F8FAFC',
                                fontSize: '14px'
                            }}
                        >
                            <option value="all">Todos</option>
                            <option value="carreira">Carreira</option>
                            <option value="light">Light</option>
                        </select>
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                            onClick={handleUncheckAll}
                            disabled={loading || editsLocked}
                            style={{
                                padding: '10px 20px',
                                background: '#EF4444',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#FFFFFF',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: loading || editsLocked ? 'not-allowed' : 'pointer',
                                opacity: loading || editsLocked ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                            }}
                            title="Desmarcar todos os checkboxes de todos os pilotos"
                        >
                            🗑️ DESMARCAR TUDO
                        </button>
                        <button
                            onClick={handlePublicarMotorhome}
                            disabled={isPublishing || loading || editsLocked}
                            style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #FFD700 0%, #FDB931 100%)',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#0F172A',
                                fontWeight: '800',
                                fontSize: '14px',
                                cursor: (isPublishing || loading || editsLocked) ? 'not-allowed' : 'pointer',
                                opacity: (isPublishing || loading || editsLocked) ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 15px rgba(255, 215, 0, 0.2)'
                            }}
                        >
                            {isPublishing ? 'PUBLICANDO...' : '🚀 PUBLICAR NO MOTORHOME'}
                        </button>
                    </div>
                </div>

                {/* Tabela estilo planilha */}
                <div style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: '70vh',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    background: '#0F172A'
                }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        minWidth: '2400px'
                    }}>
                        <thead style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <tr>
                                {/* Cabeçalho para botão de desmarcar linha */}
                                <th style={{
                                    padding: '12px 8px',
                                    textAlign: 'center',
                                    borderBottom: '2px solid #475569',
                                    borderRight: '1px solid #334155',
                                    color: '#FFFFFF',
                                    fontWeight: 'bold',
                                    fontSize: '11px',
                                    background: '#475569',
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 11,
                                    minWidth: '50px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    Ações
                                </th>
                                {columns.map((col, idx) => {
                                    const isEditable = col.editable && col.subitem;
                                    const editableCols = ['envio_foto', 'lista', 'num_id', 'telemetria_conduta', 'nc', 'punish_race'];
                                    const showUncheckButton = isEditable && editableCols.includes(col.key);
                                    
                                    return (
                                        <th
                                            key={col.key}
                                            style={{
                                                padding: '12px 8px',
                                                textAlign: col.key === 'power_ranking' ? 'center' : (col.sticky ? 'left' : 'center'),
                                                borderBottom: '2px solid #475569',
                                                borderRight: '1px solid #334155',
                                                color: '#FFFFFF',
                                                fontWeight: 'bold',
                                                fontSize: col.subitem ? '11px' : '13px',
                                                background: col.color,
                                                position: col.sticky ? 'sticky' : 'relative',
                                                left: col.sticky ? (col.stickyLeft !== undefined ? col.stickyLeft : 0) : 'auto',
                                                zIndex: col.sticky ? 11 : 10,
                                                minWidth: col.width,
                                                whiteSpace: 'nowrap',
                                                verticalAlign: 'middle'
                                            }}
                                        >
                                            <div style={{ 
                                                display: 'flex', 
                                                flexDirection: 'row', 
                                                gap: '6px', 
                                                alignItems: 'center',
                                                justifyContent: col.key === 'power_ranking' ? 'center' : (col.sticky ? 'flex-start' : 'center'),
                                                flexWrap: 'nowrap'
                                            }}>
                                                <span style={{ 
                                                    whiteSpace: 'nowrap',
                                                    flexShrink: 0
                                                }}>{col.label}</span>
                                                {showUncheckButton && (
                                                    <button
                                                        onClick={() => handleUncheckColumn(col.key)}
                                                        disabled={loading || editsLocked}
                                                        style={{
                                                            padding: '3px 6px',
                                                            background: '#EF4444',
                                                            border: 'none',
                                                            borderRadius: '3px',
                                                            color: '#FFFFFF',
                                                            fontWeight: '600',
                                                            fontSize: '9px',
                                                            cursor: loading || editsLocked ? 'not-allowed' : 'pointer',
                                                            opacity: loading || editsLocked ? 0.5 : 1,
                                                            whiteSpace: 'nowrap',
                                                            flexShrink: 0
                                                        }}
                                                        title={`Desmarcar todos os checkboxes da coluna ${col.label}`}
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPilotos.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} style={{
                                        padding: '40px',
                                        textAlign: 'center',
                                        color: '#94A3B8'
                                    }}>
                                        {searchTerm ? 'Nenhum piloto encontrado' : 'Nenhum piloto cadastrado'}
                                    </td>
                                </tr>
                            ) : (
                                filteredPilotos.map((piloto, rowIdx) => {
                                    const prTotal = prData[piloto.nome]?.total || calcularPRFinal(piloto.nome);
                                    const pilares = pilaresData[piloto.nome] || {};
                                    
                                    // Definir as 8 etapas da temporada (aceita ambos formatos: "1" e "R01")
                                    const etapas = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08'];
                                    
                                    const totalFaltas = calcularFaltasPorResultados(piloto);
                                    
                                    const flags = {
                                        faltas: totalFaltas,
                                        defesa: etapas.reduce((total, round) => {
                                            return total + (getFlagValue(piloto.id, round, 'defesa_nao_enviada', false) ? 1 : 0);
                                        }, 0)
                                    };
                                    
                                    // Função auxiliar para buscar dados de telemetria com matching flexível
                                    const buscarTelemetria = (campo) => {
                                        const nomePiloto = piloto.nome.trim();
                                        // Tentar match exato primeiro
                                        let dados = telemetriaData[nomePiloto];
                                        if (dados && dados[campo] !== undefined) {
                                            return dados[campo];
                                        }
                                        // Tentar match normalizado
                                        const nomeNorm = (nomePiloto || '')
                                            .toLowerCase()
                                            .normalize('NFD')
                                            .replace(/[\u0300-\u036f]/g, '')
                                            .replace(/\s+/g, ' ')
                                            .trim();
                                        const nomeEncontrado = Object.keys(telemetriaData).find(n => {
                                            const nNorm = (n || '')
                                                .toLowerCase()
                                                .normalize('NFD')
                                                .replace(/[\u0300-\u036f]/g, '')
                                                .replace(/\s+/g, ' ')
                                                .trim();
                                            return nNorm === nomeNorm;
                                        });
                                        if (nomeEncontrado && telemetriaData[nomeEncontrado]) {
                                            return telemetriaData[nomeEncontrado][campo];
                                        }
                                        return undefined;
                                    };

                                    const getCellValue = (colKey) => {
                                        switch (colKey) {
                                            case 'piloto':
                                                return piloto.nome;
                                            case 'power_ranking':
                                                return (pilares.power_ranking !== undefined && pilares.power_ranking !== null)
                                                    ? String(displayPilarInt('power_ranking', pilares.power_ranking))
                                                    : '-';
                                            case 'performance':
                                                return (pilares.performance && pilares.performance > 0)
                                                    ? String(displayPilarInt('performance', pilares.performance))
                                                    : '-';
                                            case 'pr_races':
                                                // PR RACES: mostrar o PR total da temporada atual
                                                return prTotal > 0 ? prTotal.toFixed(2) : '-';
                                            case 'conduta':
                                                return String(displayPilarInt('conduta', pilares.conduta));
                                            case 'envio_foto':
                                                // ENVIO DE FOTO: apenas um checkbox (usar R01 como referência)
                                                return 'SINGLE_CHECKBOX';
                                            case 'lista':
                                            case 'num_id':
                                            case 'telemetria_conduta':
                                            case 'nc':
                                            case 'punish_race':
                                                // Retornar array de etapas para renderizar checkboxes
                                                return 'CHECKBOXES'; // Marcador especial
                                            case 'faltas':
                                                return flags.faltas > 0 ? `${flags.faltas}` : '0';
                                            case 'defesa':
                                                const faltasDefesaVal = buscarDefesasFaltantes(piloto.nome);
                                                const pontosFaltaDefesaDisplay = faltasDefesaVal * 5;
                                                return pontosFaltaDefesaDisplay > 0 ? pontosFaltaDefesaDisplay.toString() : '0';
                                            case 'advert':
                                                const advertenciasVal = buscarAdvertencias(piloto.nome);
                                                return advertenciasVal > 0 ? advertenciasVal.toString() : '0';
                                            case 'punicoes':
                                                // Mostrar apenas punições de INCIDENTES (sem incluir a falta de defesa)
                                                // Isso evita duplicação com a coluna DEFESA
                                                const totalPunicoesVal = buscarPunicoes(piloto.nome);
                                                const descontoDefesaVal = buscarDefesasFaltantes(piloto.nome) * 5;
                                                const punicoesIncidentesVal = Math.max(0, totalPunicoesVal - descontoDefesaVal);
                                                return punicoesIncidentesVal > 0 ? punicoesIncidentesVal.toString() : '0';
                                            case 'racecraft':
                                                return (pilares.racecraft && pilares.racecraft > 0)
                                                    ? String(displayPilarInt('racecraft', pilares.racecraft))
                                                    : '-';
                                            case 'corrida':
                                                // CORRIDA: RITMO DE CORRIDA (percentual 0-100 da tela Telemetria como número simples)
                                                const ritmoCorridaCorrida = buscarTelemetria('ritmoCorrida');
                                                return ritmoCorridaCorrida !== undefined ? ritmoCorridaCorrida.toString() : '-';
                                            case 'sprint':
                                                // POS. Q: posição média de qualy convertida para pontos (1º=100, 2º=99, ..., 20º=81)
                                                const posQScore = buscarTelemetria('posQScore') ?? buscarTelemetria('ritmoClassificacao');
                                                return posQScore !== undefined ? posQScore.toString() : '-';
                                            case 'qualy':
                                                // QUALY: RITMO DE CLASSIFICAÇÃO (percentual 0-100 da tela Telemetria como número simples)
                                                const ritmoClassificacaoQualy = buscarTelemetria('ritmoClassificacao');
                                                return ritmoClassificacaoQualy !== undefined ? ritmoClassificacaoQualy.toString() : '-';
                                            case 'ritmo':
                                                // POS. R: posição média de corrida convertida para pontos (1º=100, 2º=99, ..., 20º=81)
                                                const posRScore = buscarTelemetria('posRScore') ?? buscarTelemetria('ritmo');
                                                return posRScore !== undefined ? posRScore.toString() : '-';
                                            case 'overall':
                                                const valOverall = pilares.overall || 0;
                                                return valOverall > 0 ? String(displayPilarInt('overall', pilares.overall)) : '0';
                                            case 'objetivo1':
                                            case 'objetivo2':
                                            case 'objetivo3':
                                            case 'objetivo4':
                                            case 'objetivo5':
                                            case 'objetivo6':
                                                const objetivoNum = colKey.replace('objetivo', '');
                                                const objetivoKey = `objetivo${objetivoNum}`;
                                                const pontosObjetivo = objetivosData[piloto.nome]?.[objetivoKey];
                                                const textoObjetivo = objetivosTextos[piloto.nome]?.[parseInt(objetivoNum) - 1];
                                                
                                                return (
                                                    <div style={{ position: 'relative' }} title={textoObjetivo}>
                                                        {(pontosObjetivo !== undefined) ? pontosObjetivo.toString() : '-'}
                                                    </div>
                                                );
                                            case 'historico':
                                                return String(displayPilarInt('historico', pilares.historico));
                                            case 'historia':
                                                // Mostrar o valor bruto da média ponderada (para referência)
                                                const valBrutoHistoria = historicoBrutoData[piloto.nome] || 0;
                                                return valBrutoHistoria > 0 ? valBrutoHistoria.toFixed(2) : '0.00';
                                            case 'temporadas':
                                                const pontTemporadas = Math.max(60, temporadasData[piloto.nome] || 0);
                                                return pontTemporadas.toString();
                                            case 'corridas':
                                                const dadosCorridas = corridasData[piloto.nome] || { total: 0, pontuacao: 60, maxCorridas: 34 };
                                                // Mostrar total de corridas / máximo (pontuação)
                                                return `${dadosCorridas.total}/${dadosCorridas.maxCorridas} (${dadosCorridas.pontuacao})`;
                                            default:
                                                return '-';
                                        }
                                    };

                                    const getFlagName = (colKey) => {
                                        const map = {
                                            'envio_foto': 'foto_oficial_enviada',
                                            'lista': 'lista_presenca_respondida',
                                            'num_id': 'numeracao_errada',
                                            'telemetria_conduta': 'telemetria_fechada',
                                            'nc': 'nc',
                                            'punish_race': 'punish_race'
                                        };
                                        return map[colKey];
                                    };

                                    const getDefaultValue = (colKey) => {
                                        // Padrão: false (Limpo/Sem infração) para todos os novos registros
                                        return false;
                                    };

                                    return (
                                        <tr key={piloto.id} style={{
                                            borderBottom: '1px solid #334155',
                                            background: rowIdx % 2 === 0 ? '#0F172A' : '#1E293B'
                                        }}>
                                            {/* Botão para desmarcar linha - coluna extra antes do nome do piloto */}
                                            <td style={{
                                                padding: '8px',
                                                textAlign: 'center',
                                                borderRight: '1px solid #334155',
                                                position: 'sticky',
                                                left: 0,
                                                background: rowIdx % 2 === 0 ? '#0F172A' : '#1E293B',
                                                zIndex: 2,
                                                minWidth: '50px'
                                            }}>
                                                <button
                                                    onClick={() => handleUncheckRow(piloto.id)}
                                                    disabled={loading || editsLocked}
                                                    style={{
                                                        padding: '8px',
                                                        background: '#475569',
                                                        border: '1px solid #64748B',
                                                        borderRadius: '4px',
                                                        color: '#FFFFFF',
                                                        fontWeight: '600',
                                                        fontSize: '16px',
                                                        cursor: loading || editsLocked ? 'not-allowed' : 'pointer',
                                                        opacity: loading || editsLocked ? 0.5 : 1,
                                                        width: '32px',
                                                        height: '32px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        margin: '0 auto'
                                                    }}
                                                    title="Desmarcar todos os checkboxes desta linha"
                                                >
                                                    ☐
                                                </button>
                                            </td>
                                            {columns.map((col) => {
                                                const value = getCellValue(col.key);
                                                const isEditable = col.editable && col.subitem;
                                                const flagName = isEditable ? getFlagName(col.key) : null;
                                                const rowBg = rowIdx % 2 === 0 ? '#0F172A' : '#1E293B';

                                                return (
                                                    <td
                                                        key={col.key}
                                                        style={{
                                                            padding: '10px 8px',
                                                            textAlign: col.key === 'power_ranking' ? 'center' : (col.sticky ? 'left' : 'center'),
                                                            borderRight: '1px solid #334155',
                                                            color: col.key === 'power_ranking' ? '#FFD700' : 
                                                                   (col.key.startsWith('objetivo') ? '#FFFFFF' : '#F8FAFC'),
                                                            fontWeight: col.key === 'power_ranking' || !col.subitem ? 'bold' : 'normal',
                                                            fontSize: col.subitem ? '12px' : '13px',
                                                            position: col.sticky ? 'sticky' : 'relative',
                                                            left: col.sticky ? (col.stickyLeft !== undefined ? col.stickyLeft : 0) : 'auto',
                                                            background: col.sticky ? rowBg : 'transparent',
                                                            zIndex: col.sticky ? 1 : 0,
                                                            minWidth: col.width
                                                        }}
                                                    >
                                                        {isEditable && value === 'SINGLE_CHECKBOX' ? (
                                                            // ENVIO DE FOTO: apenas um checkbox (usar R01 como referência)
                                                            (() => {
                                                                const flagNameAtual = getFlagName(col.key);
                                                                const defaultValue = getDefaultValue(col.key);
                                                                const isInfraction = getFlagValue(piloto.id, 'R01', flagNameAtual, defaultValue);
                                                                
                                                                const savingKey = `${piloto.id}_R01`;
                                                                const isSavingRound = saving[savingKey] || false;
                                                                
                                                                return (
                                                                    <div
                                                                        onClick={() => {
                                                                            if (isSavingRound || editsLocked) return;
                                                                            handleUpdateFlag(piloto.id, 'R01', flagNameAtual, !isInfraction);
                                                                        }}
                                                                        style={{
                                                                            width: '20px',
                                                                            height: '20px',
                                                                            borderRadius: '4px',
                                                                            border: '1px solid #475569',
                                                                            background: isInfraction ? '#EF4444' : '#1E293B',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            margin: '0 auto',
                                                                            cursor: isSavingRound || editsLocked ? 'not-allowed' : 'pointer',
                                                                            opacity: isSavingRound || editsLocked ? 0.5 : 1,
                                                                            transition: 'all 0.2s ease',
                                                                            color: 'white',
                                                                            fontSize: '12px',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                    >
                                                                        {isInfraction && '✕'}
                                                                    </div>
                                                                );
                                                            })()
                                                        ) : isEditable && value === 'CHECKBOXES' ? (
                                                            // Renderizar 8 checkboxes (um para cada etapa)
                                                            <div style={{
                                                                display: 'flex',
                                                                gap: '4px',
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                                flexWrap: 'wrap'
                                                            }}>
                                                                {etapas.map((round, idx) => {
                                                                    const flagNameAtual = getFlagName(col.key);
                                                                    const defaultValue = getDefaultValue(col.key);
                                                                    const isInfraction = getFlagValue(piloto.id, round, flagNameAtual, defaultValue);
                                                                    
                                                                    const savingKey = `${piloto.id}_${round}`;
                                                                    const isSavingRound = saving[savingKey] || false;
                                                                    
                                                                    return (
                                                                        <div key={round} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                                            <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 'bold' }}>{idx + 1}</span>
                                                                            <div
                                                                                onClick={() => {
                                                                                    if (isSavingRound || editsLocked) return;
                                                                                    handleUpdateFlag(piloto.id, round, flagNameAtual, !isInfraction);
                                                                                }}
                                                                                title={`${round} - Etapa ${idx + 1}`}
                                                                                style={{
                                                                                    width: '18px',
                                                                                    height: '18px',
                                                                                    borderRadius: '4px',
                                                                                    border: '1px solid #475569',
                                                                                    background: isInfraction ? '#EF4444' : '#1E293B',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    cursor: isSavingRound || editsLocked ? 'not-allowed' : 'pointer',
                                                                                    opacity: isSavingRound || editsLocked ? 0.5 : 1,
                                                                                    transition: 'all 0.2s ease',
                                                                                    color: 'white',
                                                                                    fontSize: '11px',
                                                                                    fontWeight: 'bold'
                                                                                }}
                                                                            >
                                                                                {isInfraction && '✕'}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : col.key === 'power_ranking' && (pilares.prAntesFaltas !== undefined || pilares.faltas !== undefined) ? (
                                                            (() => {
                                                                const P = pilares.performance ?? 0, R = pilares.racecraft ?? 0, O = pilares.overall ?? 0, C = pilares.conduta ?? 0, H = pilares.historico ?? 0;
                                                                const faltas = pilares.faltas ?? 0;
                                                                const antes = pilares.prAntesFaltas ?? Math.ceil((P * 0.30) + (R * 0.25) + (O * 0.20) + (C * 0.15) + (H * 0.10));
                                                                const formula = `(${P}×0,30 + ${R}×0,25 + ${O}×0,20 + ${C}×0,15 + ${H}×0,10) = ${antes}${faltas > 0 ? ` − ${faltas} falta(s) = ${pilares.power_ranking ?? (antes - faltas)}` : ''}`;
                                                                return (
                                                                    <span title={formula} style={{ cursor: 'help', borderBottom: '1px dotted rgba(255,215,0,0.6)' }}>
                                                                        {value}
                                                                    </span>
                                                                );
                                                            })()
                                                        ) : (
                                                            value
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: '#1E293B',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    fontSize: '13px'
                }}>
                    <strong style={{ color: '#F8FAFC' }}>ℹ️ Informações:</strong>
                    <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                        <li>Total de pilotos: {filteredPilotos.length}</li>
                        <li>Pilotos com Power Ranking: {Object.keys(prData).length}</li>
                        <li>Os pilares são calculados a partir dos subitens</li>
                        <li>O Power Ranking final é a média dos 5 pilares</li>
                        <li>Marque/desmarque os checkboxes para atualizar as flags de conduta</li>
                        <li>As alterações são salvas automaticamente</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
