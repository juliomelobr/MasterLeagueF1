import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { importDraftPilotos, importAllDraftPilotos, getDraftPilotos } from '../utils/importDraftPilotos';
import { DriverImage, formatDriverName, getTeamLogo as utilsGetTeamLogo, getTeamColor as utilsGetTeamColor } from '../utils/classificacaoUtils';
import { sendWhatsappNotification } from '../utils/whatsappNotify';
import { isMobileDevice, getDeviceInfo } from '../utils/deviceDetection';
import '../index.css';

// Estilos adicionais
const styles = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

/**
 * PÃ¡gina administrativa para gerenciar o draft
 */
export default function AdminDraftImport() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    
    // DetecÃ§Ã£o de dispositivo mobile
    const [deviceInfo, setDeviceInfo] = useState(() => getDeviceInfo());
    useEffect(() => {
        const handleResize = () => setDeviceInfo(getDeviceInfo());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [pilotos, setPilotos] = useState({ light: [], carreira: [] });
    const [stats, setStats] = useState({ light: 0, carreira: 0, total: 0 });
    const [message, setMessage] = useState({ type: null, text: '' });
    const LAST_IMPORT_REPORT_KEY = 'mlf1:lastImportReport:draftImport';
    const [lastImportReport, setLastImportReport] = useState(() => {
        try {
            const raw = localStorage.getItem(LAST_IMPORT_REPORT_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }); // { at, light, carreira, totalImported, success }
    const [showPilotModal, setShowPilotModal] = useState(false);
    const [editingPilot, setEditingPilot] = useState(null); // null = criar novo, objeto = editar
    const [pilotForm, setPilotForm] = useState({
        nome: '',
        grid: 'light',
        ordem_escolha: 1,
        power_ranking_pts: 0,
        whatsapp: '',
        cod_idml: '',
        season: 20
    });
    const [savingPilot, setSavingPilot] = useState(false);
    const [deletingPilot, setDeletingPilot] = useState(null);
    const [teams, setTeams] = useState({ light: [], carreira: [] });
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'import' ou 'negotiations'
    const [selectedGrid, setSelectedGrid] = useState('carreira'); // 'carreira' ou 'light' para a VisÃ£o Geral
    const [contracts, setContracts] = useState([]); // Pilotos com contrato assinado
    const [pilotosByCodIdml, setPilotosByCodIdml] = useState({}); // Mapa de pilotos cadastrados (tabela pilotos) por COD IDML
    const [negotiationsGrid, setNegotiationsGrid] = useState('carreira'); // Grid selecionado na aba NegociaÃ§Ãµes
    // SeleÃ§Ãµes do painel precisam ser separadas por grid para nÃ£o "vazar" do Light para Carreira (e vice-versa)
    // { carreira: { pilotoId: [teamId...] }, light: { pilotoId: [teamId...] } }
    const [proposals, setProposals] = useState({ carreira: {}, light: {} });
    const [pilotoPropostasStatus, setPilotoPropostasStatus] = useState({}); // { cod_idml: { hasProposal: bool, hasContract: bool, team: object, teamsWithProposals: array } }
    const [offerSentCountByTeamByGrid, setOfferSentCountByTeamByGrid] = useState({ carreira: {}, light: {} }); // { grid: { teamId: count } }

    // NormalizaÃ§Ãµes (sem inferir grid de contrato: se `contracts.grid` estiver vazio/inconsistente,
    // nÃ£o contamos esse contrato em nenhum grid para evitar bloqueios errados).
    const normalizeGrid = (g) => (g ?? '').toString().trim().toLowerCase();
    const normalizeCodIdml = (cod) => (cod ? String(cod).trim().toUpperCase() : null);
    const getContractGrid = (contract) => {
        const g = normalizeGrid(contract?.grid);
        return g || null;
    };

    useEffect(() => {
        try {
            if (lastImportReport) {
                localStorage.setItem(LAST_IMPORT_REPORT_KEY, JSON.stringify(lastImportReport));
            } else {
                localStorage.removeItem(LAST_IMPORT_REPORT_KEY);
            }
        } catch {
            // ignore
        }
    }, [lastImportReport]);

    useEffect(() => {
        // Injetar estilos
        const styleSheet = document.createElement("style");
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
        return () => document.head.removeChild(styleSheet);
    }, []);

    // AutenticaÃ§Ã£o - verificar se Ã© steward
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    navigate('/login');
                    setLoadingAuth(false);
                    return;
                }

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    navigate('/login');
                    setLoadingAuth(false);
                    return;
                }

                // Verificar se Ã© steward
                const { data: piloto, error: pilotoError } = await supabase
                    .from('pilotos')
                    .select('is_steward')
                    .eq('email', user.email)
                    .maybeSingle();

                if (pilotoError || !piloto) {
                    navigate('/dashboard');
                    setLoadingAuth(false);
                    return;
                }

                if (piloto.is_steward) {
                    setIsAuthenticated(true);
                } else {
                    navigate('/dashboard');
                }
            } catch (err) {
                console.error('Erro na autenticaÃ§Ã£o:', err);
                navigate('/dashboard');
            } finally {
                setLoadingAuth(false);
            }
        };

        checkAuth();
    }, [navigate]);

    // Carregar pilotos existentes
    const loadPilotos = async () => {
        setLoading(true);
        try {
            const allPilotos = await getDraftPilotos();
            console.log('ðŸ“Š [VISÃƒO GERAL] Total de pilotos carregados:', allPilotos.length);
            
            // Normalizar grid para comparaÃ§Ã£o (trim + lowercase)
            const normalizeGridForFilter = (g) => (g || '').toString().trim().toLowerCase();
            
            // Filtrar pilotos por grid com normalizaÃ§Ã£o
            const light = allPilotos.filter(p => {
                const gridNormalizado = normalizeGridForFilter(p.grid);
                const isLight = gridNormalizado === 'light';
                if (isLight) {
                    console.log(`âœ… [VISÃƒO GERAL] Piloto ${p.nome} no grid LIGHT (grid: "${p.grid}")`);
                }
                return isLight;
            });
            
            const carreira = allPilotos.filter(p => {
                const gridNormalizado = normalizeGridForFilter(p.grid);
                const isCarreira = gridNormalizado === 'carreira';
                if (isCarreira) {
                    console.log(`âœ… [VISÃƒO GERAL] Piloto ${p.nome} no grid CARREIRA (grid: "${p.grid}")`);
                }
                return isCarreira;
            });

            // Log de debug para verificar se hÃ¡ pilotos com grid incorreto
            const pilotosSemGrid = allPilotos.filter(p => {
                const gridNormalizado = normalizeGridForFilter(p.grid);
                return gridNormalizado !== 'light' && gridNormalizado !== 'carreira';
            });
            
            if (pilotosSemGrid.length > 0) {
                console.warn('âš ï¸ [VISÃƒO GERAL] Pilotos com grid invÃ¡lido:', pilotosSemGrid.map(p => ({
                    nome: p.nome,
                    grid: p.grid,
                    gridNormalizado: normalizeGridForFilter(p.grid)
                })));
            }

            console.log('ðŸ“Š [VISÃƒO GERAL] Filtragem final:', {
                total: allPilotos.length,
                light: light.length,
                carreira: carreira.length,
                semGrid: pilotosSemGrid.length
            });

            setPilotos({ light, carreira });
            setStats({
                light: light.length,
                carreira: carreira.length,
                total: allPilotos.length
            });
        } catch (error) {
            console.error('Erro ao carregar pilotos:', error);
            setMessage({ type: 'error', text: 'Erro ao carregar pilotos existentes' });
        } finally {
            setLoading(false);
        }
    };

    // Carregar pilotos cadastrados (tabela pilotos) para resolver nomes/fotos na VisÃ£o Geral via pilot_cod_idml
    const loadPilotosCadastro = async () => {
        try {
            const { data, error } = await supabase
                .from('pilotos')
                .select('nome, cod_idml')
                .not('cod_idml', 'is', null);

            if (error) throw error;

            const map = {};
            (data || []).forEach(p => {
                const cod = normalizeCodIdml(p.cod_idml);
                if (cod) map[cod] = p;
            });
            setPilotosByCodIdml(map);
        } catch (error) {
            console.error('Erro ao carregar pilotos cadastrados (pilotosByCodIdml):', error);
        }
    };

    // Carregar pilotos com contrato
    const loadContracts = async () => {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    *,
                    equipes (*)
                `)
                .eq('season', 20);
            
            // Log detalhado dos contratos carregados
            if (data && data.length > 0) {
                console.log('ðŸ“‹ [CONTRATOS] Total de contratos carregados:', data.length);
                const gridCounts = {};
                data.forEach(c => {
                    const grid = getContractGrid(c);
                    const gridKey = grid || 'SEM_GRID';
                    gridCounts[gridKey] = (gridCounts[gridKey] || 0) + 1;
                    
                    // Log de contratos com grid invÃ¡lido ou sem grid
                    if (!grid || (grid !== 'light' && grid !== 'carreira')) {
                        console.warn(`âš ï¸ [CONTRATOS] Contrato com grid invÃ¡lido: piloto ${c.pilot_cod_idml}, equipe ${c.team_id}, grid: "${c.grid}"`);
                    }
                });
                console.log('ðŸ“Š [CONTRATOS] Contagem por grid:', gridCounts);
            }

            if (error) throw error;
            setContracts(data || []);
        } catch (error) {
            console.error('Erro ao carregar contratos:', error);
        }
    };

    // Carregar status de propostas e contratos por cÃ³digo do piloto
    const loadPilotoPropostasStatus = async () => {
        try {
            // Buscar todas as propostas enviadas do grid atual
            const { data: propostasData, error: propostasError } = await supabase
                .from('interests')
                .select(`
                    *,
                    equipes (*)
                `)
                .eq('status', 'OFFER_SENT')
                .eq('grid', negotiationsGrid)
                .eq('season', 20);

            // Buscar todos os contratos da temporada
            const { data: contratosData, error: contratosError } = await supabase
                .from('contracts')
                .select(`
                    *,
                    equipes (*)
                `)
                .eq('season', 20);

            if (propostasError) console.error('Erro ao buscar propostas:', propostasError);
            if (contratosError) console.error('Erro ao buscar contratos:', contratosError);

            const statusMap = {};
            
            // Processar propostas
            if (propostasData) {
                const teamCounts = {};
                propostasData.forEach(proposta => {
                    const codIdmlNormalizado = normalizeCodIdml(proposta.pilot_cod_idml);
                    const teamIdForCount = proposta.team_id || proposta.equipes?.id;
                    if (teamIdForCount) {
                        const tid = String(teamIdForCount);
                        teamCounts[tid] = (teamCounts[tid] || 0) + 1;
                    }
                    if (codIdmlNormalizado) {
                        if (!statusMap[codIdmlNormalizado]) {
                            statusMap[codIdmlNormalizado] = { hasProposal: false, hasContract: false, team: null, teamsWithProposals: [] };
                        }
                        statusMap[codIdmlNormalizado].hasProposal = true;
                        if (proposta.equipes && proposta.equipes.id) {
                            const teamId = proposta.equipes.id;
                            if (!statusMap[codIdmlNormalizado].teamsWithProposals.includes(teamId)) {
                                statusMap[codIdmlNormalizado].teamsWithProposals.push(teamId);
                            }
                        }
                    }
                });

                // Persistir contagem por equipe apenas do grid atual
                setOfferSentCountByTeamByGrid(prev => ({
                    ...prev,
                    [negotiationsGrid]: teamCounts
                }));
            } else {
                setOfferSentCountByTeamByGrid(prev => ({ ...prev, [negotiationsGrid]: {} }));
            }

            // Processar contratos
            if (contratosData) {
                contratosData.forEach(contrato => {
                    const codIdmlNormalizado = normalizeCodIdml(contrato.pilot_cod_idml);
                    if (codIdmlNormalizado) {
                        if (!statusMap[codIdmlNormalizado]) {
                            statusMap[codIdmlNormalizado] = { hasProposal: false, hasContract: false, team: null, teamsWithProposals: [] };
                        }
                        statusMap[codIdmlNormalizado].hasContract = true;
                        statusMap[codIdmlNormalizado].hasProposal = false;
                        statusMap[codIdmlNormalizado].team = contrato.equipes;
                        statusMap[codIdmlNormalizado].teamsWithProposals = [];
                        statusMap[codIdmlNormalizado].contractGrid = getContractGrid(contrato);
                    }
                });
            }

            setPilotoPropostasStatus(statusMap);
        } catch (error) {
            console.error('Erro ao carregar status de propostas:', error);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            loadPilotos();
            loadPilotosCadastro();
            loadTeams();
            loadContracts();
            loadPilotoPropostasStatus();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            loadPilotoPropostasStatus();
        }
    }, [negotiationsGrid, isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        loadPilotoPropostasStatus();
        loadContracts();
        const intervalId = setInterval(() => {
            loadPilotoPropostasStatus();
            loadContracts();
        }, 5000);
        return () => clearInterval(intervalId);
    }, [isAuthenticated, negotiationsGrid]);

    const getTeamLogo = (teamName) => utilsGetTeamLogo(teamName);
    const getTeamColor = (teamName) => {
        const color = utilsGetTeamColor(teamName);
        if (color && !color.startsWith('var')) return color;
        const cssVars = {
            'var(--f1-redbull)': '#3671C6',
            'var(--f1-ferrari)': '#E8002D',
            'var(--f1-mercedes)': '#27F4D2',
            'var(--f1-mclaren)': '#FF8000',
            'var(--f1-aston)': '#229971',
            'var(--f1-alpine)': '#FD4BC7',
            'var(--f1-haas)': '#B6BABD',
            'var(--f1-williams)': '#64C4FF',
            'var(--f1-sauber)': '#52E252',
            'var(--f1-vcarb)': '#6692FF'
        };
        return cssVars[color] || "#94A3B8";
    };

    const hexToRgba = (hex, alpha = 1) => {
        if (!hex) return `rgba(148,163,184,${alpha})`;
        const h = String(hex).trim();
        if (!h.startsWith('#') || (h.length !== 7 && h.length !== 4)) return `rgba(148,163,184,${alpha})`;
        const full = h.length === 4
            ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`
            : h;
        const r = parseInt(full.slice(1, 3), 16);
        const g = parseInt(full.slice(3, 5), 16);
        const b = parseInt(full.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    };

    const splitNameTwoLines = (fullName) => {
        if (!fullName) return { first: '', last: '' };
        const parts = String(fullName).trim().split(/\s+/);
        if (parts.length === 1) {
            const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
            return { first, last: '' };
        }
        const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        const last = parts.slice(1).join(' ').toUpperCase();
        return { first, last };
    };

    const defaultTeams = [
        { id: 'redbull', name: 'Red Bull Racing', slots: 2 },
        { id: 'ferrari', name: 'Ferrari', slots: 2 },
        { id: 'mercedes', name: 'Mercedes', slots: 2 },
        { id: 'mclaren', name: 'McLaren', slots: 2 },
        { id: 'aston', name: 'Aston Martin', slots: 2 },
        { id: 'alpine', name: 'Alpine', slots: 2 },
        { id: 'williams', name: 'Williams', slots: 2 },
        { id: 'haas', name: 'Haas', slots: 2 },
        { id: 'sauber', name: 'Sauber', slots: 2 },
        { id: 'vcarb', name: 'Racing Bulls', slots: 2 }
    ];

    const loadTeams = async () => {
        try {
            const { data: equipesData, error } = await supabase.from('equipes').select('*');
            const normalizeTeamName = (n) => (n ?? '').toString().toLowerCase().trim();
            const getTeamSortOrder = (teamName) => {
                const t = normalizeTeamName(teamName);
                if (t.includes('mclaren')) return 1;
                if (t.includes('ferrari')) return 2;
                if (t.includes('red bull') || t.includes('redbull') || t.includes('oracle')) return 3;
                if (t.includes('mercedes')) return 4; // garante Mercedes antes de Aston
                if (t.includes('aston')) return 5;
                if (t.includes('alpine')) return 6;
                if (t.includes('racing bulls') || t.includes('racingbulls') || t.includes('vcarb')) return 7;
                if (t.includes('williams')) return 8;
                if (t.includes('haas')) return 9;
                if (t.includes('sauber') || t.includes('stake') || t.includes('kick')) return 10;
                return 99;
            };
            const sortTeams = (list) => [...list].sort((a, b) => {
                const ao = getTeamSortOrder(a.name);
                const bo = getTeamSortOrder(b.name);
                if (ao !== bo) return ao - bo;
                // desempate estÃ¡vel
                return normalizeTeamName(a.name).localeCompare(normalizeTeamName(b.name));
            });
            if (error || !equipesData || equipesData.length === 0) {
                const sorted = sortTeams(defaultTeams);
                setTeams({ light: sorted, carreira: sorted });
            } else {
                const sorted = sortTeams(equipesData);
                setTeams({ light: sorted, carreira: sorted });
            }
        } catch (error) {
            console.error('Erro ao carregar equipes:', error);
            setTeams({ light: defaultTeams, carreira: defaultTeams });
        }
    };

    const handleImport = async (grid = null, replace = false) => {
        setImporting(true);
        try {
            const result = grid ? await importDraftPilotos(grid, replace) : await importAllDraftPilotos(replace);
            if (result.success) {
                setMessage({ type: 'success', text: grid ? `âœ… ${result.imported} pilotos importados do grid ${grid}!` : `âœ… ${result.totalImported} pilotos importados!` });

                // Guardar relatÃ³rio detalhado para exibir na tela
                if (grid) {
                    setLastImportReport(prev => ({
                        ...(prev || {}),
                        at: new Date().toISOString(),
                        success: true,
                        totalImported: (grid === 'light' ? (result.imported || 0) : (prev?.totalImported || 0)) + (grid === 'carreira' ? (result.imported || 0) : 0),
                        [grid]: result
                    }));
                } else {
                    setLastImportReport({
                        at: new Date().toISOString(),
                        success: true,
                        totalImported: result.totalImported || 0,
                        light: result.light,
                        carreira: result.carreira
                    });
                }
                await loadPilotos();
            } else {
                setMessage({ type: 'error', text: `âŒ Erro: ${result.error}` });
                if (grid) {
                    setLastImportReport(prev => ({
                        ...(prev || {}),
                        at: new Date().toISOString(),
                        success: false,
                        [grid]: result
                    }));
                } else {
                    setLastImportReport({
                        at: new Date().toISOString(),
                        success: false,
                        error: result.error,
                        light: result.light,
                        carreira: result.carreira
                    });
                }
            }
        } catch (error) {
            setMessage({ type: 'error', text: `âŒ Erro: ${error.message}` });
            setLastImportReport({ at: new Date().toISOString(), success: false, error: error.message });
        } finally {
            setImporting(false);
        }
    };

    const handleImportReplaceAll = async () => {
        const ok = window.confirm(
            'âš ï¸ SUBSTITUIR DADOS DO DRAFT?\n\nIsso vai APAGAR o draft atual da temporada 20 (Carreira + Light) e importar novamente das planilhas.\n\nUse isso para remover duplicados e â€œdevolverâ€ pilotos ao grid correto.'
        );
        if (!ok) return;
        await handleImport(null, true);
    };

    const handleFixContractsGridFromDraft = async () => {
        const ok = window.confirm(
            'Corrigir GRID dos contratos usando o DRAFT como fonte?\n\nIsso atualiza contracts.grid na temporada 20 para bater com o grid do piloto no draft.\n\n(Ãštil quando contrato foi salvo com grid errado.)'
        );
        if (!ok) return;

        setImporting(true);
        setMessage({ type: null, text: '' });
        try {
            // 1) Pegar draft atual do banco (fonte)
            const allDraft = await getDraftPilotos(null, 20);
            const mapCodToGrid = {};
            const ambiguous = new Set();

            for (const p of allDraft || []) {
                const cod = normalizeCodIdml(p.cod_idml);
                const g = normalizeGrid(p.grid);
                if (!cod || (g !== 'light' && g !== 'carreira')) continue;
                if (!mapCodToGrid[cod]) {
                    mapCodToGrid[cod] = g;
                } else if (mapCodToGrid[cod] !== g) {
                    ambiguous.add(cod);
                }
            }

            // 2) Atualizar contratos
            const currentContracts = Array.isArray(contracts) ? contracts : [];
            const updates = [];

            for (const c of currentContracts) {
                const id = c.id;
                if (!id) continue;
                const cod = normalizeCodIdml(c.pilot_cod_idml);
                if (!cod) continue;
                if (ambiguous.has(cod)) continue; // evita mover piloto com cod duplicado em grids

                const expectedGrid = mapCodToGrid[cod];
                if (!expectedGrid) continue;

                const currentGrid = normalizeGrid(c.grid);
                const normalizedCod = cod;

                const needsGridFix = currentGrid !== expectedGrid;
                const needsCodFix = String(c.pilot_cod_idml || '') !== normalizedCod;

                if (needsGridFix || needsCodFix) {
                    updates.push({ id, expectedGrid, normalizedCod, currentGrid });
                }
            }

            if (updates.length === 0) {
                setMessage({ type: 'success', text: 'âœ… Nenhum contrato precisou de correÃ§Ã£o (grid jÃ¡ estÃ¡ consistente com o draft).' });
                return;
            }

            await Promise.all(
                updates.map(u =>
                    supabase
                        .from('contracts')
                        .update({
                            grid: u.expectedGrid,
                            pilot_cod_idml: u.normalizedCod
                        })
                        .eq('id', u.id)
                )
            );

            await loadContracts();
            await loadPilotos();
            setMessage({ type: 'success', text: `âœ… Contratos corrigidos: ${updates.length}. (Grid ajustado conforme o draft.)` });
        } catch (e) {
            console.error('Erro ao corrigir grid dos contratos:', e);
            setMessage({ type: 'error', text: `âŒ Erro ao corrigir contratos: ${e?.message || 'erro desconhecido'}` });
        } finally {
            setImporting(false);
        }
    };

    const handleSendProposals = async (piloto) => {
        const gridProposals = proposals?.[negotiationsGrid] || {};
        const pilotoProposals = gridProposals[piloto.id] || [];
        const codIdmlNormalizado = (piloto.cod_idml || '').trim().toUpperCase();
        const currentGrid = negotiationsGrid.toLowerCase();
        const painelUrl = 'https://masterleaguef1.com.br/dashboard';

        try {
            // Verificar disponibilidade final de cada equipe selecionada
            for (const teamId of pilotoProposals) {
                const team = teams[negotiationsGrid].find(t => String(t.id) === String(teamId));
                const tid = String(teamId);
                
                const closedContractsCount = contracts.filter(c => 
                    String(c.team_id) === tid && 
                    (getContractGrid(c) === currentGrid)
                ).length;

                // Contagem oficial direto do banco (por TEAM + GRID + SEASON)
                const { count: dbOfferSentCount, error: countError } = await supabase
                    .from('interests')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'OFFER_SENT')
                    .eq('season', 20)
                    .eq('grid', negotiationsGrid)
                    .eq('team_id', teamId);
                if (countError) throw countError;
                const sentProposalsCount = dbOfferSentCount || 0;
                
                if (closedContractsCount + sentProposalsCount >= 2) {
                    alert(`âŒ A equipe ${team?.name || teamId} jÃ¡ atingiu o limite de 2 vagas (contratos ou propostas enviadas).`);
                    return;
                }
            }

            const propostasToInsert = pilotoProposals.map(teamId => ({
                pilot_cod_idml: codIdmlNormalizado,
                team_id: teamId,
                grid: negotiationsGrid,
                season: 20,
                status: 'OFFER_SENT',
                created_at: new Date().toISOString()
            }));
            const { error } = await supabase.from('interests').insert(propostasToInsert);
            if (error) throw error;
            alert(`âœ… Proposta enviada para ${formatDriverName(piloto.nome)}!`);
            setProposals(prev => {
                const next = { ...prev };
                const gp = { ...(next?.[negotiationsGrid] || {}) };
                delete gp[piloto.id];
                next[negotiationsGrid] = gp;
                return next;
            });
            await loadPilotoPropostasStatus();

            // Notificar piloto via WhatsApp (Twilio/Z-API pela Edge Function)
            if (piloto.whatsapp) {
                const message = [
                    'ðŸ“¨ NOVA PROPOSTA - MASTER LEAGUE F1',
                    '',
                    `OlÃ¡ ${formatDriverName(piloto.nome)}!`,
                    `VocÃª recebeu ${pilotoProposals.length} proposta${pilotoProposals.length > 1 ? 's' : ''} para correr na Temporada 20 (${negotiationsGrid.toUpperCase()}).`,
                    'Acesse o Painel do Piloto e abra a Caixa de Mensagens para avaliar e escolher sua equipe.',
                    '',
                    'â° IMPORTANTE: VocÃª tem 10 horas para responder Ã s propostas. ApÃ³s esse prazo, as propostas serÃ£o automaticamente canceladas.',
                    '',
                    `ðŸ”— Painel do Piloto: ${painelUrl}`,
                ].join('\n');

                const notif = await sendWhatsappNotification({
                    phone: piloto.whatsapp,
                    email: piloto.email || `${codIdmlNormalizado || 'piloto'}@masterleaguef1.com`,
                    nome: piloto.nome,
                    message,
                });

                if (!notif.success) {
                    console.warn('âš ï¸ Falha ao notificar piloto sobre nova proposta:', notif.error);
                }
            } else {
                console.warn('âš ï¸ Piloto sem WhatsApp cadastrado, notificaÃ§Ã£o nÃ£o enviada.');
            }
        } catch (error) {
            alert(`âŒ Erro: ${error.message}`);
        }
    };

    if (loadingAuth) {
        return (
            <div style={{ minHeight: '100vh', background: '#0F172A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="loader">Carregando...</div>
            </div>
        );
    }

    // Contador de contratos deve respeitar o grid selecionado na aba de propostas.
    // Um contrato no Light NÃƒO pode consumir vaga no Carreira (e vice-versa).
    const closedContractsCount = contracts.filter(c => getContractGrid(c) === normalizeGrid(negotiationsGrid)).length;
    const contractsMissingGridCount = contracts.filter(c => !getContractGrid(c)).length;

    return (
        <div style={{ minHeight: '100vh', background: '#0F172A', color: 'white', padding: deviceInfo.isMobile ? '12px' : '20px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: deviceInfo.isMobile ? 'column' : 'row',
                    justifyContent: 'space-between', 
                    alignItems: deviceInfo.isMobile ? 'flex-start' : 'center', 
                    gap: deviceInfo.isMobile ? '12px' : '0',
                    marginBottom: deviceInfo.isMobile ? '20px' : '30px', 
                    background: 'rgba(30, 41, 59, 0.5)', 
                    padding: deviceInfo.isMobile ? '16px' : '20px', 
                    borderRadius: '15px', 
                    border: '1px solid rgba(255,255,255,0.1)' 
                }}>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ margin: 0, fontSize: deviceInfo.isMobile ? '1.3rem' : '1.8rem', color: '#FFD700', fontWeight: '800' }}>GERENCIAMENTO DE DRAFT</h1>
                        <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: deviceInfo.isMobile ? '0.75rem' : '1rem' }}>Temporada 20 | Controle de Propostas e Contratos</p>
                    </div>
                    <button 
                        onClick={() => navigate('/admin')} 
                        style={{ 
                            background: 'transparent', 
                            border: '1px solid #94A3B8', 
                            color: '#94A3B8', 
                            padding: deviceInfo.isMobile ? '10px 16px' : '8px 15px', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            fontSize: deviceInfo.isMobile ? '0.85rem' : '0.9rem',
                            whiteSpace: 'nowrap',
                            minHeight: deviceInfo.isMobile ? '44px' : 'auto'
                        }}
                    >
                        Voltar ao Painel
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ 
                    display: 'flex', 
                    gap: deviceInfo.isMobile ? '6px' : '10px', 
                    marginBottom: deviceInfo.isMobile ? '16px' : '20px',
                    overflowX: deviceInfo.isMobile ? 'auto' : 'visible',
                    WebkitOverflowScrolling: 'touch',
                    paddingBottom: deviceInfo.isMobile ? '4px' : '0'
                }}>
                    {['overview', 'negotiations', 'import'].map(tab => (
                    <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                        style={{
                                padding: deviceInfo.isMobile ? '10px 16px' : '12px 25px',
                                borderRadius: '10px',
                            border: 'none',
                                background: activeTab === tab ? '#1E293B' : 'transparent',
                                color: activeTab === tab ? '#FFD700' : 'rgba(255,255,255,0.5)',
                            fontWeight: '700',
                            cursor: 'pointer',
                                transition: 'all 0.2s',
                                borderBottom: activeTab === tab ? '3px solid #FFD700' : '3px solid transparent',
                                fontSize: deviceInfo.isMobile ? '0.75rem' : '0.9rem',
                                whiteSpace: 'nowrap',
                                minHeight: deviceInfo.isMobile ? '44px' : 'auto'
                        }}
                    >
                            {tab === 'overview' ? 'ðŸŒ VISÃƒO GERAL' : tab === 'negotiations' ? 'ðŸ“¨ PROPOSTAS' : 'ðŸ“¥ IMPORTAR'}
                    </button>
                    ))}
                </div>

                {/* Content: Overview */}
                {activeTab === 'overview' && (
                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <div style={{ display: 'flex', gap: deviceInfo.isMobile ? '8px' : '10px', marginBottom: deviceInfo.isMobile ? '16px' : '20px' }}>
                            <button 
                                onClick={() => setSelectedGrid('carreira')} 
                                style={{ 
                                    padding: deviceInfo.isMobile ? '12px 18px' : '10px 20px', 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    background: selectedGrid === 'carreira' ? '#FFD700' : '#1E293B', 
                                    color: selectedGrid === 'carreira' ? '#000' : '#FFF', 
                                    fontWeight: '700', 
                                    cursor: 'pointer',
                                    fontSize: deviceInfo.isMobile ? '0.85rem' : '0.9rem',
                                    flex: deviceInfo.isMobile ? 1 : 'auto',
                                    minHeight: deviceInfo.isMobile ? '44px' : 'auto'
                                }}
                            >
                                Carreira
                            </button>
                            <button 
                                onClick={() => setSelectedGrid('light')} 
                                style={{ 
                                    padding: deviceInfo.isMobile ? '12px 18px' : '10px 20px', 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    background: selectedGrid === 'light' ? '#FFD700' : '#1E293B', 
                                    color: selectedGrid === 'light' ? '#000' : '#FFF', 
                                    fontWeight: '700', 
                                    cursor: 'pointer',
                                    fontSize: deviceInfo.isMobile ? '0.85rem' : '0.9rem',
                                    flex: deviceInfo.isMobile ? 1 : 'auto',
                                    minHeight: deviceInfo.isMobile ? '44px' : 'auto'
                                }}
                            >
                                Light
                            </button>
                        </div>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: deviceInfo.isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', 
                            gap: deviceInfo.isMobile ? '16px' : '22px' 
                        }}>
                            {teams[selectedGrid].map(team => {
                                const selectedGridNorm = normalizeGrid(selectedGrid);
                                
                                // Filtrar contratos por equipe e grid com logs detalhados
                                // IMPORTANTE: Apenas exibir contratos que correspondem ao grid selecionado
                                const teamContracts = contracts
                                    .filter(c => {
                                        const teamMatch = String(c.team_id) === String(team.id);
                                        if (!teamMatch) return false;
                                        
                                        const contractGrid = getContractGrid(c);
                                        
                                        // Verificar se o contrato tem grid vÃ¡lido
                                        if (!contractGrid || (contractGrid !== 'light' && contractGrid !== 'carreira')) {
                                            console.warn(`âš ï¸ [VISÃƒO GERAL] Contrato sem grid vÃ¡lido: piloto ${c.pilot_cod_idml}, equipe ${team.name}, grid: "${c.grid}"`);
                                            return false;
                                        }
                                        
                                        const gridMatch = contractGrid === selectedGridNorm;
                                        
                                        // Log detalhado para debug
                                        if (!gridMatch) {
                                            console.warn(`âš ï¸ [VISÃƒO GERAL] Contrato filtrado (grid nÃ£o corresponde): piloto ${c.pilot_cod_idml}, equipe ${team.name}, grid do contrato: "${contractGrid}", grid selecionado: "${selectedGridNorm}"`);
                                        } else {
                                            console.log(`âœ… [VISÃƒO GERAL] Contrato aceito: piloto ${c.pilot_cod_idml}, equipe ${team.name}, grid: "${contractGrid}"`);
                                        }
                                        
                                        return gridMatch;
                                    })
                                    .sort((a, b) => new Date(a.signed_at || a.created_at || 0) - new Date(b.signed_at || b.created_at || 0));
                                
                                // Log para verificar quantos contratos foram encontrados
                                if (teamContracts.length > 0) {
                                    console.log(`ðŸ“‹ [VISÃƒO GERAL] Equipe ${team.name} (${selectedGridNorm}): ${teamContracts.length} contrato(s) encontrado(s)`);
                                    teamContracts.forEach((c, idx) => {
                                        console.log(`  - Contrato ${idx + 1}: piloto ${c.pilot_cod_idml}, grid: "${c.grid}", grid normalizado: "${getContractGrid(c)}"`);
                                    });
                                }
                                const color = getTeamColor(team.name);
                                const c1 = hexToRgba(color, 0.22);
                                const c2 = hexToRgba(color, 0.10);
                                return (
                                    <div
                                        key={team.id}
                                        style={{
                                            position: 'relative',
                                            background: `linear-gradient(135deg, ${c1} 0%, rgba(15,23,42,0.95) 58%, ${c2} 100%)`,
                                            borderRadius: '18px',
                                            overflow: 'hidden',
                                            borderLeft: `5px solid ${color}`,
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                                            minHeight: '220px',
                                        }}
                                    >
                                        {/* Marca dâ€™Ã¡gua */}
                                        <img
                                            src={getTeamLogo(team.name)}
                                                alt=""
                                                style={{
                                                    position: 'absolute',
                                                right: '-10px',
                                                bottom: '-10px',
                                                width: '200px',
                                                height: '200px',
                                                objectFit: 'contain',
                                                opacity: 0.09,
                                                filter: 'grayscale(1) contrast(0.9)',
                                                pointerEvents: 'none',
                                                zIndex: 0,
                                            }}
                                        />
                                        <div style={{ position: 'relative', zIndex: 1, padding: '18px', background: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <img src={getTeamLogo(team.name)} alt="" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
                                            <h3 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '0.01em' }}>{team.name}</h3>
                                            </div>
                                        <div style={{ position: 'relative', zIndex: 1, padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {[0, 1].map(slotIdx => {
                                                const contract = teamContracts[slotIdx];
                                                const cod = normalizeCodIdml(contract?.pilot_cod_idml);
                                                // Buscar o piloto no grid do contrato, nÃ£o no grid selecionado
                                                const contractGrid = getContractGrid(contract);
                                                const gridParaBuscar = contractGrid || selectedGrid;
                                                
                                                // Buscar primeiro no grid do contrato (correto)
                                                let pilotoDraft = null;
                                                if (contract && cod) {
                                                    // IMPORTANTE: Verificar se o grid do contrato corresponde ao grid selecionado
                                                    // Se nÃ£o corresponder, nÃ£o deve buscar o piloto (erro de dados)
                                                    if (contractGrid && contractGrid !== selectedGridNorm) {
                                                        console.error(`âŒ [VISÃƒO GERAL] ERRO: Contrato do piloto ${cod} tem grid "${contractGrid}" mas estÃ¡ sendo exibido na aba "${selectedGridNorm}"!`);
                                                        console.error(`   Detalhes do contrato:`, {
                                                            pilot_cod_idml: cod,
                                                            team_id: contract.team_id,
                                                            grid_original: contract.grid,
                                                            grid_normalizado: contractGrid,
                                                            selectedGrid: selectedGrid,
                                                            selectedGridNorm: selectedGridNorm
                                                        });
                                                    }
                                                    
                                                    // Buscar no grid do contrato (nÃ£o no grid selecionado)
                                                    const gridParaBuscarPiloto = contractGrid || selectedGridNorm;
                                                    const gridNormalizado = normalizeGrid(gridParaBuscarPiloto);
                                                    
                                                    // Buscar no grid correto do contrato
                                                    pilotoDraft = pilotos[gridNormalizado]?.find(p => {
                                                        const pCod = normalizeCodIdml(p.cod_idml);
                                                        const match = pCod === cod;
                                                        if (match) {
                                                            console.log(`âœ… [VISÃƒO GERAL] Piloto ${p.nome} encontrado no grid ${gridNormalizado} (grid do contrato: ${contractGrid}, grid selecionado: ${selectedGridNorm})`);
                                                        }
                                                        return match;
                                                    });
                                                    
                                                    // Se nÃ£o encontrou no grid do contrato, tentar no outro grid (fallback)
                                                    // Mas apenas se o grid do contrato corresponder ao grid selecionado
                                                    if (!pilotoDraft && contractGrid === selectedGridNorm) {
                                                        const outroGrid = gridNormalizado === 'carreira' ? 'light' : 'carreira';
                                                        pilotoDraft = pilotos[outroGrid]?.find(p => {
                                                            const pCod = normalizeCodIdml(p.cod_idml);
                                                            const match = pCod === cod;
                                                            if (match) {
                                                                console.warn(`âš ï¸ [VISÃƒO GERAL] Piloto ${p.nome} encontrado no grid ${outroGrid} mas contrato estÃ¡ no grid ${contractGrid}!`);
                                                            }
                                                            return match;
                                                        });
                                                    }
                                                }
                                                
                                                const pilotoCadastro = cod ? pilotosByCodIdml[cod] : null;
                                                const piloto = pilotoDraft || pilotoCadastro || null;
                                                return (
                                                    <div
                                                        key={slotIdx}
                                                        style={{
                                                            background: piloto ? `linear-gradient(90deg, ${hexToRgba(color, 0.18)} 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.04) 100%)` : 'rgba(255,255,255,0.04)',
                                                            padding: '14px',
                                                            borderRadius: '14px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '14px',
                                                            border: piloto ? `1px solid ${color}33` : '1px solid rgba(255,255,255,0.06)',
                                                            boxShadow: piloto ? `inset 0 0 0 1px ${color}22` : 'none',
                                                        }}
                                                    >
                                                            {piloto ? (
                                                            <>
                                                                <DriverImage
                                                                    name={piloto.nome}
                                                                    gridType={contractGrid || selectedGrid}
                                                                    season={20}
                                                style={{
                                                                        width: '60px',
                                                                        height: '60px',
                                                                        borderRadius: '14px',
                                                                        border: `2px solid ${color}`,
                                                                        boxShadow: `0 0 0 5px ${color}22, 0 14px 22px rgba(0,0,0,0.42)`,
                                                                    }}
                                                                />
                                                                    <div style={{ flex: 1 }}>
                                                                    <div
                                                                        style={{
                                                                            fontSize: '1.0rem',
                                                                            fontWeight: '900',
                                                                            whiteSpace: 'nowrap',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis'
                                                                        }}
                                                                        title={formatDriverName(piloto.nome)}
                                                                    >
                                                                        {formatDriverName(piloto.nome)}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.75rem', color: color, fontWeight: '800', marginTop: '2px' }}>âœ… CONFIRMADO</div>
                                                </div>
                                                                <button onClick={async () => {
                                                                    if (!window.confirm('Cancelar contrato?')) return;
                                                                    const codIdml = (piloto.cod_idml || '').trim().toUpperCase();
                                                                    // 1) Cancelar contrato
                                                                    await supabase
                                                                        .from('contracts')
                                                                        .delete()
                                                                        .eq('pilot_cod_idml', codIdml)
                                                                        .eq('team_id', team.id)
                                                                        .eq('grid', contractGrid || selectedGrid)
                                                                        .eq('season', 20);

                                                                    // 2) Cancelar propostas vinculadas ao contrato (OFFER_SENT/ACCEPTED) para liberar novo envio
                                                                    await supabase
                                                                        .from('interests')
                                                                        .update({ status: 'WITHDRAWN', updated_at: new Date().toISOString() })
                                                                        .eq('pilot_cod_idml', codIdml)
                                                                        .eq('grid', selectedGrid)
                                                                        .eq('season', 20)
                                                                        .in('status', ['OFFER_SENT', 'ACCEPTED']);

                                                                    await loadContracts();
                                                                    await loadPilotoPropostasStatus();
                                                                }} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', color: '#EF4444', width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer' }}>âœ•</button>
                                                            </>
                                                        ) : (
                                                            contract ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                                                    <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.92)', fontWeight: '900' }}>
                                                                        Contrato encontrado
                                                                    </div>
                                                                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace' }}>
                                                                        COD: {cod || '-'}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
                                                                        Grid: {(contractGrid || '-').toUpperCase()}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>
                                                                    Vaga DisponÃ­vel
                                                                </div>
                                                            )
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                    </div>
                )}

                {/* Content: Negotiations (Layout Melhorado aqui) */}
                {activeTab === 'negotiations' && (
                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: deviceInfo.isMobile ? 'column' : 'row',
                            justifyContent: 'space-between', 
                            alignItems: deviceInfo.isMobile ? 'stretch' : 'center', 
                            gap: deviceInfo.isMobile ? '12px' : '0',
                            marginBottom: deviceInfo.isMobile ? '16px' : '20px' 
                        }}>
                            <div style={{ display: 'flex', gap: deviceInfo.isMobile ? '8px' : '10px', width: deviceInfo.isMobile ? '100%' : 'auto' }}>
                                <button 
                                    onClick={() => setNegotiationsGrid('carreira')} 
                                    style={{ 
                                        padding: deviceInfo.isMobile ? '12px 18px' : '10px 20px', 
                                        borderRadius: '8px', 
                                        border: 'none', 
                                        background: negotiationsGrid === 'carreira' ? '#FFD700' : '#1E293B', 
                                        color: negotiationsGrid === 'carreira' ? '#000' : '#FFF', 
                                        fontWeight: '700', 
                                        cursor: 'pointer',
                                        fontSize: deviceInfo.isMobile ? '0.85rem' : '0.9rem',
                                        flex: deviceInfo.isMobile ? 1 : 'auto',
                                        minHeight: deviceInfo.isMobile ? '44px' : 'auto'
                                    }}
                                >
                                    Carreira
                                </button>
                                <button 
                                    onClick={() => setNegotiationsGrid('light')} 
                                    style={{ 
                                        padding: deviceInfo.isMobile ? '12px 18px' : '10px 20px', 
                                        borderRadius: '8px', 
                                        border: 'none', 
                                        background: negotiationsGrid === 'light' ? '#FFD700' : '#1E293B', 
                                        color: negotiationsGrid === 'light' ? '#000' : '#FFF', 
                                        fontWeight: '700', 
                                        cursor: 'pointer',
                                        fontSize: deviceInfo.isMobile ? '0.85rem' : '0.9rem',
                                        flex: deviceInfo.isMobile ? 1 : 'auto',
                                        minHeight: deviceInfo.isMobile ? '44px' : 'auto'
                                    }}
                                >
                                    Light
                                </button>
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                gap: deviceInfo.isMobile ? '8px' : '15px',
                                flexDirection: deviceInfo.isMobile ? 'column' : 'row',
                                width: deviceInfo.isMobile ? '100%' : 'auto'
                            }}>
                                <div style={{ 
                                    background: 'rgba(34, 197, 94, 0.1)', 
                                    padding: deviceInfo.isMobile ? '10px 14px' : '10px 20px', 
                                    borderRadius: '10px', 
                                    border: '1px solid #22C55E', 
                                    color: '#22C55E', 
                                    fontWeight: '700',
                                    fontSize: deviceInfo.isMobile ? '0.75rem' : '0.85rem',
                                    textAlign: 'center',
                                    flex: deviceInfo.isMobile ? 1 : 'auto'
                                }}>
                                    ðŸ¤ CONTRATOS: {closedContractsCount}
                                </div>
                                {contractsMissingGridCount > 0 && (
                                    <div style={{ 
                                        background: 'rgba(245, 158, 11, 0.12)', 
                                        padding: deviceInfo.isMobile ? '10px 14px' : '10px 16px', 
                                        borderRadius: '10px', 
                                        border: '1px solid rgba(245, 158, 11, 0.55)', 
                                        color: '#F59E0B', 
                                        fontWeight: '800',
                                        fontSize: deviceInfo.isMobile ? '0.75rem' : '0.85rem',
                                        textAlign: 'center',
                                        flex: deviceInfo.isMobile ? 1 : 'auto'
                                    }}>
                                        âš ï¸ SEM GRID: {contractsMissingGridCount}
                                    </div>
                                )}
                                <button
                                    onClick={() => setProposals(prev => ({ ...prev, [negotiationsGrid]: {} }))}
                                    style={{ 
                                        background: 'rgba(239, 68, 68, 0.1)', 
                                        padding: deviceInfo.isMobile ? '10px 14px' : '10px 20px', 
                                        borderRadius: '10px', 
                                        border: '1px solid #EF4444', 
                                        color: '#EF4444', 
                                        fontWeight: '700', 
                                        cursor: 'pointer',
                                        fontSize: deviceInfo.isMobile ? '0.75rem' : '0.85rem',
                                        whiteSpace: 'nowrap',
                                        minHeight: deviceInfo.isMobile ? '44px' : 'auto',
                                        flex: deviceInfo.isMobile ? 1 : 'auto'
                                    }}
                                >
                                    Limpar SeleÃ§Ãµes
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {pilotos[negotiationsGrid].map(piloto => {
                                const codIdmlNormalizado = (piloto.cod_idml || '').trim().toUpperCase();
                                const pilotoStatus = pilotoPropostasStatus[codIdmlNormalizado];
                                const hasContract = pilotoStatus?.hasContract;
                                const hasProposal = pilotoStatus?.hasProposal;
                                                const contractTeam = pilotoStatus?.team;
                                const gridProposals = proposals?.[negotiationsGrid] || {};
                                const pilotoProposals = gridProposals[piloto.id] || [];
                                const availableTeams = teams[negotiationsGrid] || [];
                                
                                // Debug: verificar se as equipes estÃ£o sendo carregadas
                                if (deviceInfo.isMobile && availableTeams.length === 0) {
                                    console.warn('âš ï¸ [MOBILE] Nenhuma equipe disponÃ­vel para o grid:', negotiationsGrid, 'teams:', teams);
                                }

                                            return (
                                    <div key={piloto.id} style={{ 
                                        background: hasContract ? 'rgba(30, 41, 59, 0.8)' : 'rgba(30, 41, 59, 0.4)', 
                                        padding: deviceInfo.isMobile ? '12px' : '15px', 
                                                        borderRadius: '12px',
                                        border: hasContract ? `1px solid ${getTeamColor(contractTeam?.name)}66` : '1px solid rgba(255,255,255,0.05)',
                                                        display: 'flex',
                                                        flexDirection: deviceInfo.isMobile ? 'column' : 'row',
                                                        alignItems: deviceInfo.isMobile ? 'stretch' : 'center',
                                        gap: deviceInfo.isMobile ? '12px' : '20px',
                                        boxShadow: hasContract ? `inset 0 0 20px ${getTeamColor(contractTeam?.name)}11` : 'none',
                                        overflow: 'visible',
                                        position: 'relative'
                                    }}>
                                        {/* Foto e Info do Piloto */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: deviceInfo.isMobile ? '12px' : '15px', flex: 1, minWidth: 0 }}>
                                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                                                <DriverImage
                                                                    name={piloto.nome}
                                                                    gridType={negotiationsGrid}
                                                                    season={20}
                                                    style={{ 
                                                        width: deviceInfo.isMobile ? '50px' : '60px', 
                                                        height: deviceInfo.isMobile ? '50px' : '60px', 
                                                        borderRadius: '8px',
                                                        border: hasContract ? `2px solid ${getTeamColor(contractTeam?.name)}` : '1px solid rgba(255,255,255,0.1)',
                                                        opacity: hasContract ? 1 : 0.9,
                                                        boxShadow: hasContract ? `0 0 10px ${getTeamColor(contractTeam?.name)}44` : 'none'
                                                    }} 
                                                />
                                                                    {hasContract && (
                                                    <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: getTeamColor(contractTeam?.name), width: deviceInfo.isMobile ? '20px' : '24px', height: deviceInfo.isMobile ? '20px' : '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0F172A', zIndex: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                                        <img src={getTeamLogo(contractTeam?.name)} alt="" style={{ width: deviceInfo.isMobile ? '12px' : '16px', height: deviceInfo.isMobile ? '12px' : '16px', objectFit: 'contain' }} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                    <h3 style={{ margin: 0, fontSize: deviceInfo.isMobile ? '0.95rem' : '1.1rem', color: '#F8FAFC', wordBreak: 'break-word' }}>{formatDriverName(piloto.nome)}</h3>
                                                    {hasContract && <span style={{ fontSize: deviceInfo.isMobile ? '0.6rem' : '0.65rem', background: getTeamColor(contractTeam?.name), color: '#000', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', textTransform: 'uppercase' }}>CONTRATADO</span>}
                                                                </div>
                                                <div style={{ fontSize: deviceInfo.isMobile ? '0.75rem' : '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                                    Ordem: {piloto.ordem_escolha} | PR: {piloto.power_ranking_pts}
                                                    {piloto.cod_idml && <span style={{ marginLeft: '10px', fontStyle: 'italic', color: 'rgba(255,255,255,0.25)' }}>ID: {piloto.cod_idml}</span>}
                                                                </div>
                                                            </div>
                                                        </div>

                                        {/* AÃ§Ãµes / Status */}
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: deviceInfo.isMobile ? 'stretch' : 'center', 
                                            gap: deviceInfo.isMobile ? '12px' : '15px', 
                                            flexDirection: deviceInfo.isMobile ? 'column' : 'row', 
                                            width: deviceInfo.isMobile ? '100%' : 'auto',
                                            minWidth: 0,
                                            overflow: 'visible'
                                        }}>
                                            {hasContract ? (
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: deviceInfo.isMobile ? '10px' : '12px', 
                                                    background: 'rgba(255,255,255,0.03)', 
                                                    padding: deviceInfo.isMobile ? '10px 12px' : '8px 15px', 
                                                    borderRadius: '10px', 
                                                    border: `1px solid ${getTeamColor(contractTeam?.name)}33`,
                                                    width: deviceInfo.isMobile ? '100%' : 'auto',
                                                    justifyContent: deviceInfo.isMobile ? 'space-between' : 'flex-start'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: deviceInfo.isMobile ? '10px' : '12px', flex: 1 }}>
                                                        {getTeamLogo(contractTeam?.name) && (
                                                            <div style={{
                                                                width: deviceInfo.isMobile ? '32px' : '36px',
                                                                height: deviceInfo.isMobile ? '32px' : '36px',
                                                                borderRadius: '10px',
                                                                background: 'rgba(255,255,255,0.04)',
                                                                border: `1px solid ${getTeamColor(contractTeam?.name)}33`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: deviceInfo.isMobile ? '4px' : '6px',
                                                                flexShrink: 0
                                                            }}>
                                                                <img
                                                                    src={getTeamLogo(contractTeam?.name)}
                                                                    alt={contractTeam?.name || ''}
                                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                                />
                                                            </div>
                                                        )}
                                                        <div style={{ textAlign: deviceInfo.isMobile ? 'left' : 'right', minWidth: 0, flex: 1 }}>
                                                            <div style={{ fontSize: deviceInfo.isMobile ? '0.6rem' : '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Equipe Fechada</div>
                                                            <div style={{ fontSize: deviceInfo.isMobile ? '0.85rem' : '1rem', fontWeight: '800', color: getTeamColor(contractTeam?.name), wordBreak: 'break-word' }}>{contractTeam?.name}</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={async () => {
                                                        if (!window.confirm(`âš ï¸ Cancelar contrato de ${formatDriverName(piloto.nome)}?`)) return;
                                                        try {
                                                            const targetGrid = pilotoStatus?.contractGrid || negotiationsGrid;
                                                            // 1) Cancelar contrato
                                                            await supabase
                                                                .from('contracts')
                                                                .delete()
                                                                .eq('pilot_cod_idml', codIdmlNormalizado)
                                                                .eq('grid', targetGrid)
                                                                .eq('season', 20);

                                                            // 2) Cancelar propostas vinculadas ao contrato (OFFER_SENT/ACCEPTED) para liberar novo envio
                                                            await supabase
                                                                .from('interests')
                                                                .update({ status: 'WITHDRAWN', updated_at: new Date().toISOString() })
                                                                .eq('pilot_cod_idml', codIdmlNormalizado)
                                                                .eq('grid', targetGrid)
                                                                .eq('season', 20)
                                                                .in('status', ['OFFER_SENT', 'ACCEPTED']);
                                                            await loadPilotoPropostasStatus(); await loadContracts();
                                                        } catch (error) { alert(error.message); }
                                                    }} style={{ 
                                                        background: '#EF444422', 
                                                        border: '1.5px solid #EF4444', 
                                                        color: '#EF4444', 
                                                        width: deviceInfo.isMobile ? '36px' : '32px', 
                                                        height: deviceInfo.isMobile ? '36px' : '32px', 
                                                        borderRadius: '8px', 
                                                        cursor: 'pointer', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center', 
                                                        fontSize: deviceInfo.isMobile ? '1.2rem' : '1.1rem',
                                                        flexShrink: 0,
                                                        touchAction: 'manipulation',
                                                        minHeight: deviceInfo.isMobile ? '44px' : 'auto'
                                                    }} title="Cancelar Contrato">âœ•</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
                                                    {/* Cancelar envio vem na frente (antes do contador e Ã­cones) */}
                                                    {hasProposal && !hasContract && (
                                                        <button
                                                            onClick={async () => {
                                                                if (!window.confirm(`âš ï¸ Cancelar o envio de propostas para ${formatDriverName(piloto.nome)}?`)) return;
                                                                try {
                                                                    const cod = (piloto.cod_idml || '').trim().toUpperCase();
                                                                    const { error } = await supabase
                                                                        .from('interests')
                                                                        .update({ status: 'WITHDRAWN', updated_at: new Date().toISOString() })
                                                                        .eq('pilot_cod_idml', cod)
                                                                        .eq('grid', negotiationsGrid)
                                                                        .eq('season', 20)
                                                                        .eq('status', 'OFFER_SENT');
                                                                    if (error) throw error;

                                                                    setProposals(prev => {
                                                                        const next = { ...prev };
                                                                        const gp = { ...(next?.[negotiationsGrid] || {}) };
                                                                        delete gp[piloto.id];
                                                                        next[negotiationsGrid] = gp;
                                                                        return next;
                                                                    });

                                                                    await loadPilotoPropostasStatus();
                                                                    alert('âœ… Propostas canceladas. VocÃª jÃ¡ pode enviar novas propostas.');
                                                                } catch (e) {
                                                                    alert(`âŒ Erro ao cancelar propostas: ${e.message}`);
                                                                }
                                                            }}
                                                            style={{
                                                                width: deviceInfo.isMobile ? '44px' : '42px',
                                                                height: deviceInfo.isMobile ? '44px' : '42px',
                                                                padding: '0',
                                                                borderRadius: '8px',
                                                                border: '1px solid rgba(239, 68, 68, 0.65)',
                                                                background: 'rgba(239, 68, 68, 0.12)',
                                                                color: '#FCA5A5',
                                                                fontWeight: '900',
                                                                cursor: 'pointer',
                                                                fontSize: deviceInfo.isMobile ? '1.1rem' : '1rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0,
                                                                touchAction: 'manipulation'
                                                            }}
                                                            title="Cancelar envio (WITHDRAWN)"
                                                        >
                                                            âœ‹
                                                        </button>
                                                    )}

                                                    {!deviceInfo.isMobile && (
                                                        <div style={{ 
                                                            fontSize: '0.85rem', 
                                                            color: 'rgba(255,255,255,0.5)', 
                                                            marginRight: '10px', 
                                                            whiteSpace: 'nowrap',
                                                            alignSelf: 'center'
                                                        }}>
                                                            ({pilotoProposals.length}/3)
                                                        </div>
                                                    )}

                                                    {deviceInfo.isMobile && (
                                                        <div style={{ 
                                                            fontSize: '0.75rem', 
                                                            color: 'rgba(255,255,255,0.5)', 
                                                            marginBottom: '4px',
                                                            width: '100%'
                                                        }}>
                                                            Selecionadas: ({pilotoProposals.length}/3)
                                                        </div>
                                                    )}

                                                    <div style={{ 
                                                        display: 'flex', 
                                                        gap: deviceInfo.isMobile ? '8px' : '10px', 
                                                        alignItems: 'center', 
                                                        flex: deviceInfo.isMobile ? 'none' : 1, 
                                                        minWidth: 0, 
                                                        overflowX: 'auto', 
                                                        overflowY: 'hidden',
                                                        paddingBottom: deviceInfo.isMobile ? '8px' : '2px',
                                                        paddingRight: deviceInfo.isMobile ? '4px' : '0',
                                                        paddingLeft: deviceInfo.isMobile ? '0' : '0',
                                                        WebkitOverflowScrolling: 'touch',
                                                        width: deviceInfo.isMobile ? '100%' : 'auto',
                                                        maxWidth: deviceInfo.isMobile ? '100%' : 'none',
                                                        minHeight: deviceInfo.isMobile ? '60px' : 'auto',
                                                        height: deviceInfo.isMobile ? 'auto' : 'auto',
                                                        scrollbarWidth: 'thin',
                                                        scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                                                        position: 'relative',
                                                        zIndex: 1,
                                                        visibility: 'visible',
                                                        opacity: 1,
                                                        marginTop: deviceInfo.isMobile ? '4px' : '0',
                                                        marginBottom: deviceInfo.isMobile ? '4px' : '0',
                                                        backgroundColor: deviceInfo.isMobile ? 'rgba(255,255,255,0.01)' : 'transparent',
                                                        border: deviceInfo.isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                                        borderRadius: deviceInfo.isMobile ? '8px' : '0',
                                                        paddingTop: deviceInfo.isMobile ? '8px' : '0',
                                                        paddingBottom: deviceInfo.isMobile ? '8px' : '0',
                                                        paddingLeft: deviceInfo.isMobile ? '4px' : '0',
                                                        paddingRight: deviceInfo.isMobile ? '4px' : '0'
                                                    }}>
                                                        {availableTeams && availableTeams.length > 0 ? availableTeams.map(team => {
                                                        const isSelected = pilotoProposals.includes(team.id);
                                                        const teamColor = getTeamColor(team.name);
                                                        const tid = String(team.id);
                                                        const currentGrid = normalizeGrid(negotiationsGrid);
                                                        
                                                        // 1. Contratos Fechados (oficiais no banco)
                                                        const closedContractsCount = contracts.filter(c => 
                                                            String(c.team_id) === tid && 
                                                            (getContractGrid(c) === currentGrid)
                                                        ).length;

                                                        // 2. Propostas Enviadas (aguardando resposta) - contador por GRID (nÃ£o vaza entre carreira/light)
                                                        const sentProposalsCount = (offerSentCountByTeamByGrid?.[negotiationsGrid]?.[tid] || 0);

                                                        // Vagas jÃ¡ ocupadas oficialmente (Contrato + Proposta Enviada)
                                                        const officialOccupied = closedContractsCount + sentProposalsCount;

                                                        // 3. SeleÃ§Ãµes pendentes no painel (outros pilotos que marcaram agora) - APENAS DO GRID ATUAL
                                                        const otherPendingCount = Object.entries(gridProposals).filter(([pid, pTeams]) => 
                                                            String(pid) !== String(piloto.id) && 
                                                            (pTeams || []).map(String).includes(tid)
                                                        ).length;

                                                        const isSent = pilotoStatus?.teamsWithProposals?.map(String).includes(tid);
                                                        
                                                        // Regra de Ouro: Contratos + Enviadas + Pendentes <= 2
                                                        // Se eu nÃ£o selecionei e (Oficiais + Outros Pendentes) >= 2, bloqueia.
                                                        const isBlocked = !isSelected && (officialOccupied + otherPendingCount >= 2);
                                                        const isFull = officialOccupied >= 2;

                                                        const isDisabled = isSelected ? false : (pilotoProposals.length >= 3 || isFull || isBlocked || hasProposal);

                                                        return (
                                                            <button key={team.id} onClick={() => {
                                                                if (isSent || hasContract) return;
                                                                if (isSelected) {
                                                                    setProposals(prev => {
                                                                        const next = { ...prev };
                                                                        const gp = { ...(next?.[negotiationsGrid] || {}) };
                                                                        const cur = gp[piloto.id] || [];
                                                                        gp[piloto.id] = cur.filter(t => String(t) !== String(team.id));
                                                                        next[negotiationsGrid] = gp;
                                                                        return next;
                                                                    });
                                                                } else if (!isDisabled) {
                                                                    setProposals(prev => {
                                                                        const next = { ...prev };
                                                                        const gp = { ...(next?.[negotiationsGrid] || {}) };
                                                                        const cur = gp[piloto.id] || [];
                                                                        gp[piloto.id] = [...cur, team.id];
                                                                        next[negotiationsGrid] = gp;
                                                                        return next;
                                                                    });
                                                                }
                                                            }} disabled={isDisabled || isSent} style={{
                                                                width: deviceInfo.isMobile ? '44px' : '50px', 
                                                                height: deviceInfo.isMobile ? '44px' : '50px', 
                                                                borderRadius: '10px', 
                                                                border: isSent ? '3px solid #EF4444' : `2px solid ${isSelected ? teamColor : 'rgba(255,255,255,0.1)'}`,
                                                                background: isSelected ? `${teamColor}22` : isSent ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                                                cursor: (isDisabled || isSent) ? 'not-allowed' : 'pointer', 
                                                                transition: 'all 0.2s', 
                                                                padding: deviceInfo.isMobile ? '6px' : '8px', 
                                                                position: 'relative', 
                                                                opacity: (isDisabled && !isSelected) ? 0.3 : 1,
                                                                flexShrink: 0,
                                                                touchAction: 'manipulation'
                                                            }}>
                                                                {isSent && <div style={{ position: 'absolute', top: '-5px', right: '-5px', width: '18px', height: '18px', borderRadius: '50%', background: '#EF4444', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0F172A' }}>ðŸ“¨</div>}
                                                                <img src={getTeamLogo(team.name)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: isSelected || isSent ? 'none' : 'grayscale(1) opacity(0.5)' }} />
                                                                </button>
                                                            );
                                                        }) : (
                                                            <div style={{ 
                                                                padding: deviceInfo.isMobile ? '12px' : '16px', 
                                                                color: 'rgba(255,255,255,0.5)', 
                                                                fontSize: deviceInfo.isMobile ? '0.75rem' : '0.85rem',
                                                                textAlign: 'center',
                                                                width: '100%',
                                                                minHeight: deviceInfo.isMobile ? '60px' : 'auto',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                {teams[negotiationsGrid]?.length === 0 ? 'Carregando equipes...' : 'Nenhuma equipe disponÃ­vel'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {deviceInfo.isMobile && availableTeams && availableTeams.length > 0 && (
                                                        <div style={{ 
                                                            fontSize: '0.7rem', 
                                                            color: 'rgba(255,255,255,0.4)', 
                                                            marginTop: '4px',
                                                            textAlign: 'center',
                                                            width: '100%',
                                                            fontStyle: 'italic'
                                                        }}>
                                                            Deslize horizontalmente para ver todas as equipes
                                                        </div>
                                                    )}
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '10px', 
                                                        marginLeft: deviceInfo.isMobile ? '0' : 'auto',
                                                        width: deviceInfo.isMobile ? '100%' : 'auto',
                                                        justifyContent: deviceInfo.isMobile ? 'stretch' : 'flex-end'
                                                    }}>
                                                        <button
                                                            onClick={() => handleSendProposals(piloto)}
                                                            disabled={hasProposal || pilotoProposals.length === 0}
                                                            style={{
                                                                padding: deviceInfo.isMobile ? '12px 20px' : '10px 20px',
                                                                borderRadius: '8px',
                                                                border: 'none',
                                                                background: hasProposal ? '#334155' : '#4F46E5',
                                                                color: 'white',
                                                                fontWeight: '700',
                                                                cursor: (hasProposal || pilotoProposals.length === 0) ? 'not-allowed' : 'pointer',
                                                                fontSize: deviceInfo.isMobile ? '0.85rem' : '0.9rem',
                                                                whiteSpace: 'nowrap',
                                                                width: deviceInfo.isMobile ? '100%' : 'auto',
                                                                minHeight: deviceInfo.isMobile ? '44px' : 'auto',
                                                                touchAction: 'manipulation'
                                                            }}
                                                        >
                                                            {hasProposal ? 'ðŸ“¨ Enviada' : 'âœ‰ï¸ Enviar'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                                    </div>
                                                </div>
                                            );
                            })}
                        </div>
                    </div>
                )}

                {/* Aba "Painel de Controle" removida */}
                {activeTab === 'import' && (
                    <div style={{ background: '#1E293B', padding: '30px', borderRadius: '15px' }}>
                        <h2 style={{ color: '#FFD700' }}>Importar Dados</h2>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '20px', flexWrap: 'wrap' }}>
                        <button
                                onClick={() => handleImport(null)}
                            disabled={importing}
                                style={{ padding: '15px 30px', borderRadius: '10px', background: importing ? '#334155' : '#22C55E', color: '#0B1220', fontWeight: '900', cursor: importing ? 'not-allowed' : 'pointer' }}
                                title="Importa Carreira + Light"
                            >
                                IMPORTAR AMBOS
                        </button>
                            <button
                                onClick={handleImportReplaceAll}
                                disabled={importing}
                                style={{ padding: '15px 30px', borderRadius: '10px', background: importing ? '#334155' : '#F59E0B', color: '#0B1220', fontWeight: '900', cursor: importing ? 'not-allowed' : 'pointer' }}
                                title="Apaga draft atual (T20) e importa novamente (remove duplicados e corrige grids)"
                            >
                                IMPORTAR AMBOS (SUBSTITUIR)
                            </button>
                            <button onClick={() => handleImport('carreira')} disabled={importing} style={{ padding: '15px 30px', borderRadius: '10px', background: '#4F46E5', color: '#FFF', fontWeight: '700', cursor: 'pointer' }}>Importar Carreira</button>
                            <button onClick={() => handleImport('light')} disabled={importing} style={{ padding: '15px 30px', borderRadius: '10px', background: '#4F46E5', color: '#FFF', fontWeight: '700', cursor: 'pointer' }}>Importar Light</button>
                            <button
                                onClick={handleFixContractsGridFromDraft}
                                disabled={importing}
                                style={{ padding: '15px 30px', borderRadius: '10px', background: importing ? '#334155' : '#06B6D4', color: '#0B1220', fontWeight: '900', cursor: importing ? 'not-allowed' : 'pointer' }}
                                title="Ajusta contracts.grid (T20) para bater com o grid do piloto no draft"
                            >
                                CORRIGIR GRID DOS CONTRATOS
                            </button>
                    </div>
                        {message.text && <div style={{ marginTop: '20px', padding: '15px', borderRadius: '8px', background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: message.type === 'success' ? '#22C55E' : '#EF4444' }}>{message.text}</div>}

                        {/* RelatÃ³rio do Ãºltimo import por grid */}
                        {lastImportReport && (
                            <div style={{ marginTop: '22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                                {['carreira', 'light'].map((g) => {
                                    const r = lastImportReport[g];
                                    const ok = r?.success;
                                    const bg = ok ? 'rgba(34,197,94,0.08)' : r ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)';
                                    const border = ok ? '1px solid rgba(34,197,94,0.35)' : r ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(255,255,255,0.08)';
                                    const title = g === 'carreira' ? 'CARREIRA' : 'LIGHT';
                                    return (
                                        <div key={g} style={{ background: bg, border, borderRadius: '12px', padding: '14px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <div style={{ fontWeight: '900', letterSpacing: '0.04em' }}>{title}</div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
                                                    {lastImportReport.at ? new Date(lastImportReport.at).toLocaleString() : ''}
                        </div>
                    </div>
                                            {r ? (
                                                <>
                                                    <div style={{ fontSize: '14px', fontWeight: '800' }}>
                                                        {r.success ? 'âœ… Sucesso' : 'âŒ Falhou'}
                </div>
                                                    <div style={{ marginTop: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
                                                        Importados: <b>{r.imported ?? 0}</b> / Total lido: <b>{r.total ?? '-'}</b>
                    </div>
                                                    {r.warning && (
                                                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#F59E0B', fontWeight: '800' }}>
                                                            âš ï¸ {r.warning}
                            </div>
                                                    )}
                                                    {r.error && (
                                                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#FCA5A5', fontWeight: '800' }}>
                                                            {r.error}
                                    </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                                                    Sem importaÃ§Ã£o recente.
                                                            </div>
                                                        )}
                                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Listagem linha a linha do Ãºltimo import */}
                        {lastImportReport && (
                            <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {['carreira', 'light'].map((g) => {
                                    const r = lastImportReport[g];
                                    const title = g === 'carreira' ? 'LINHAS IMPORTADAS â€” CARREIRA' : 'LINHAS IMPORTADAS â€” LIGHT';
                                    const rows = Array.isArray(r?.items) ? r.items : [];
                                    if (!r) return null;
                                    return (
                                        <div key={g} style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontWeight: '900', color: '#E2E8F0' }}>{title}</div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
                                                    {rows.length} linhas
                            </div>
                                    </div>
                                            <div style={{ maxHeight: '360px', overflow: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                                        <tr style={{ background: 'rgba(255,255,255,0.04)', position: 'sticky', top: 0 }}>
                                                            <th style={{ textAlign: 'left', padding: '10px 12px', color: 'rgba(255,255,255,0.7)', width: '56px' }}>#</th>
                                                            <th style={{ textAlign: 'left', padding: '10px 12px', color: 'rgba(255,255,255,0.7)' }}>Nome</th>
                                                            <th style={{ textAlign: 'left', padding: '10px 12px', color: 'rgba(255,255,255,0.7)', width: '90px' }}>Ordem</th>
                                                            <th style={{ textAlign: 'left', padding: '10px 12px', color: 'rgba(255,255,255,0.7)', width: '80px' }}>PR</th>
                                                            <th style={{ textAlign: 'left', padding: '10px 12px', color: 'rgba(255,255,255,0.7)', width: '140px' }}>COD IDML</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                                        {rows.map((p, idx) => (
                                                            <tr key={`${g}-${idx}`} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.55)' }}>{idx + 1}</td>
                                                                <td style={{ padding: '10px 12px', fontWeight: '800', color: '#F8FAFC' }}>{p.nome || '-'}</td>
                                                                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.85)' }}>{p.ordem_escolha ?? '-'}</td>
                                                                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.85)' }}>{p.power_ranking_pts ?? '-'}</td>
                                                                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{p.cod_idml || '-'}</td>
                                                </tr>
                                            ))}
                                                        {rows.length === 0 && (
                                                            <tr>
                                                                <td colSpan={5} style={{ padding: '12px', color: 'rgba(255,255,255,0.55)' }}>
                                                                    Nenhuma linha disponÃ­vel para exibiÃ§Ã£o (sem itens retornados).
                                                                </td>
                                                            </tr>
                                                        )}
                                        </tbody>
                                    </table>
                            </div>
                        </div>
                                    );
                                })}
                    </div>
                )}
                </div>
                )}
            </div>
        </div>
    );
}
