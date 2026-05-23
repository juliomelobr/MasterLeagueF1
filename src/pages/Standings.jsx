import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../components/Footer';
import { useLeagueData } from '../hooks/useLeagueData';
import { supabase } from '../supabaseClient';

// --- CONSTANTES DE PONTUAÇÃO ---
const POINTS_RACE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const POINTS_SPRINT = [8, 7, 6, 5, 4, 3, 2, 1];

// --- ÍCONES SVG ---
const FastLapIcon = () => (<svg className="fl-icon" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
const PoleIcon = () => <span className="pole-icon">P</span>;
const RecordIcon = () => (<svg className="rh-icon-small" viewBox="0 0 24 24" fill="currentColor" width="20"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg>);

// CORES DE BANDEIRAS
const flagColors = {
    'BÉLGICA': ['#000000', '#FDDA24', '#EF3340'], 'HOLANDA': ['#AE1C28', '#FFFFFF', '#21468B'], 'ITÁLIA': ['#009246', '#FFFFFF', '#CE2B37'], 'AZERBAIJÃO': ['#00B5E2', '#EF3340', '#509E2F'], 'SINGAPURA': ['#EF3340', '#FFFFFF'], 'EUA': ['#B22234', '#FFFFFF', '#3C3B6E'], 'MÉXICO': ['#006847', '#FFFFFF', '#CE1126'], 'BRASIL': ['#009C3B', '#FFDF00', '#002776'], 'LAS VEGAS': ['#B22234', '#FFFFFF', '#3C3B6E'], 'QATAR': ['#8D1B3D', '#FFFFFF'], 'ABU DHABI': ['#EF3340', '#007A3D', '#FFFFFF', '#000000'], 'BAHREIN': ['#EF3340', '#FFFFFF'], 'ARÁBIA SAUDITA': ['#006C35', '#FFFFFF'], 'AUSTRÁLIA': ['#00008B', '#FFFFFF', '#EF3340'], 'JAPÃO': ['#FFFFFF', '#BC002D'], 'CHINA': ['#DE2910', '#FFDE00'], 'MIAMI': ['#B22234', '#FFFFFF', '#3C3B6E'], 'EMÍLIA-ROMAGNA': ['#009246', '#FFFFFF', '#CE2B37'], 'MÔNACO': ['#EF3340', '#FFFFFF'], 'CANADÁ': ['#EF3340', '#FFFFFF'], 'ESPANHA': ['#AA151B', '#F1BF00'], 'ÁUSTRIA': ['#EF3340', '#FFFFFF'], 'INGLATERRA': ['#FFFFFF', '#CE1124', '#00247D'], 'HUNGRIA': ['#CE2939', '#FFFFFF', '#477050'],     'DEFAULT': ['#1E293B', '#0F172A'],
    'TEXAS': ['#B22234', '#FFFFFF', '#3C3B6E'],
    'AUSTIN': ['#B22234', '#FFFFFF', '#3C3B6E']
};

// --- COMPONENTES AUXILIARES ---
const DriverImage = ({ name, gridType, season, className, style }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    const seasonSrc = `/pilotos/${gridType}/s${season}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    
    const [imgSrc, setImgSrc] = useState(seasonSrc);
    useEffect(() => { setImgSrc(seasonSrc); }, [name, gridType, season]);
    
    const handleError = () => {
        if (imgSrc.includes(`/s${season}/`)) {
            setImgSrc(smlSrc);
        } else if (imgSrc.includes('/SML/')) {
            setImgSrc(shadowSrc);
        }
    };
    
    return <img src={imgSrc} className={className} style={style} alt="" onError={handleError} />;
};

const Countdown = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState({});
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime(); const distance = targetDate - now;
            if (distance < 0) { clearInterval(timer); setTimeLeft(null); } 
            else { setTimeLeft({ days: Math.floor(distance / (1000 * 60 * 60 * 24)), hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)) }); }
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);
    if (!timeLeft) return <div>Corrida em Andamento!</div>;
    return (
        <div className="countdown-box">
            <div className="cd-item"><div className="cd-val">{timeLeft.days}</div><div className="cd-label">Dias</div></div>
            <div className="cd-item"><div className="cd-val">{timeLeft.hours}</div><div className="cd-label">Horas</div></div>
            <div className="cd-item"><div className="cd-val">{timeLeft.minutes}</div><div className="cd-label">Min</div></div>
        </div>
    );
};

const DriverModal = ({ driver, gridType, season, onClose, teamColor, teamLogo }) => {
    if (!driver) return null;
    const labelStyle = { color: '#CBD5E1', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' };
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>
                <div className="driver-card-layout">
                    <div className="card-left" style={{"--team-color": teamColor}}>
                        <DriverImage name={driver.name} gridType={gridType} season={season} className="card-driver-photo" />
                    </div>
                    <div className="card-right">
                        {teamLogo && <img src={teamLogo} className="card-team-logo" />}
                        <h2 className="card-name">{driver.name}</h2>
                        <h3 className="card-team-name" style={{color: teamColor}}>{driver.team}</h3>
                        <div className="stats-grid" style={{"--team-color": teamColor}}>
                            <div className="stat-box"><span style={labelStyle}>Pontos</span><div className="stat-value">{driver.stats.points}</div></div>
                            <div className="stat-box"><span style={labelStyle}>Vitórias</span><div className="stat-value">{driver.stats.wins}</div></div>
                            <div className="stat-box"><span style={labelStyle}>Pódios</span><div className="stat-value">{driver.stats.podiums}</div></div>
                            <div className="stat-box"><span style={labelStyle}>Poles</span><div className="stat-value">{driver.stats.poles}</div></div>
                            <div className="stat-box"><span style={labelStyle}>Corridas</span><div className="stat-value">{driver.stats.races}</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const collectDraftNamesForSeason = (rows, season) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const seasonNum = parseInt(String(season), 10);
    if (!Number.isFinite(seasonNum)) return [];

    const seen = new Set();
    const list = [];

    rows.forEach((row) => {
        const name = (row?.[0] || '').toString().trim();
        if (!name || name === 'Piloto' || name === 'NOME' || name === 'Nome' || name.includes('#')) return;

        const rowSeason = parseInt(String(row?.[2] ?? '').trim(), 10);
        if (rowSeason !== seasonNum) return;

        const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        list.push(name);
    });

    return list;
};

// --- COMPONENTE STANDINGS (ANTIGA HOME) ---
function Standings() {
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const { rawCarreira, rawLight, draftCarreira, draftLight, tracks, seasons, loading } = useLeagueData();
    const [searchParams] = useSearchParams();
    const gridFromURL = searchParams.get('grid');
    const [gridType, setGridType] = useState(gridFromURL === 'light' ? 'light' : 'carreira');
    const [viewType, setViewType] = useState('drivers');
    
    // Atualizar gridType quando o parâmetro da URL mudar
    useEffect(() => {
        if (gridFromURL === 'light') {
            setGridType('light');
        } else if (gridFromURL === 'carreira') {
            setGridType('carreira');
        }
    }, [gridFromURL]);
    const [selectedSeason, setSelectedSeason] = useState(0);
    const [rounds, setRounds] = useState([]);
    const [selectedRound, setSelectedRound] = useState(0);
    const [historicalRecord, setHistoricalRecord] = useState({ time: "9:59.999", driver: "-", season: "-" });
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [punicoes, setPunicoes] = useState({}); // { 'Nome do Piloto': pontosPerdidos }
    
    // Cache de punições para evitar re-fetching
    const punicoesCache = useRef({});
    const punicoesRawData = useRef(null);

    // Memoizar normalizeStr para evitar recálculos
    const normalizeStr = useCallback((str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : "", []);
    
    // Função auxiliar para normalizar nome do piloto (usada para comparação de punições)
    const normalizeNomePiloto = useCallback((nome) => {
        if (!nome) return '';
        // Remove acentuação, espaços extras e converte para minúsculas para comparação case-insensitive
        return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, ' ').toLowerCase();
    }, []);

    // Buscar punições do Supabase UMA VEZ e cachear
    useEffect(() => {
        const buscarTodasPunicoes = async () => {
            // Se já temos os dados raw, não buscar novamente
            if (punicoesRawData.current) return;
            
            try {
                const { data, error } = await supabase
                    .from('notificacoes_admin')
                    .select('dados')
                    .eq('tipo', 'nova_acusacao');

                if (!error && data) {
                    punicoesRawData.current = data;
                }
            } catch (err) {
                console.error('❌ [Punições] Erro ao buscar punições:', err);
            }
        };

        buscarTodasPunicoes();
    }, []); // Buscar apenas uma vez na montagem

    // Processar punições quando temporada/grid mudar (usando dados cacheados)
    useEffect(() => {
        const processarPunicoes = () => {
            const seasonValido = selectedSeason && (parseInt(selectedSeason) > 0 || selectedSeason > 0);
            
            if (!seasonValido || !punicoesRawData.current) {
                setPunicoes({});
                return;
            }
            
            // Verificar cache
            const cacheKey = `${selectedSeason}-${gridType}`;
            if (punicoesCache.current[cacheKey]) {
                setPunicoes(punicoesCache.current[cacheKey]);
                return;
            }

            // Processar vereditos e somar pontos perdidos por piloto
            const punicoesMap = {};
            
            (punicoesRawData.current || []).forEach((item) => {
                const veredito = item.dados?.veredito;
                const acusado = item.dados?.acusado;
                const etapa = item.dados?.etapa || {};
                const temporadaLance = etapa?.season || etapa?.temporada || item.dados?.season || item.dados?.temporada || null;
                const gridLance = etapa?.grid || item.dados?.grid || null;
                
                // Verificar se tem veredito e se é para a temporada e grid atual (ou se não tem info, aplicar a todas)
                const temporadaCompativel = temporadaLance ? parseInt(temporadaLance) === parseInt(selectedSeason) : true;
                const gridCompativel = gridLance ? gridLance === gridType : true;
                const aplicarPunicao = !veredito ? false : temporadaCompativel && gridCompativel;
                
                const pontosPerdidos = parseInt(veredito?.pontosPerdidos, 10) || 0;
                const vereditoFinalizado = item.dados?.status === 'analise_realizada' || Boolean(veredito?.dataVeredito);
                if (vereditoFinalizado && veredito && acusado && acusado.nome && aplicarPunicao && pontosPerdidos > 0) {
                    // Normalizar nome do piloto para comparação
                    const nomePilotoNormalizado = normalizeNomePiloto(acusado.nome);
                    
                    if (pontosPerdidos > 0 && nomePilotoNormalizado) {
                        // Somar pontos perdidos (um piloto pode ter múltiplas punições)
                        punicoesMap[nomePilotoNormalizado] = (punicoesMap[nomePilotoNormalizado] || 0) + pontosPerdidos;
                    }
                }
            });

            // Salvar no cache
            punicoesCache.current[cacheKey] = punicoesMap;
            setPunicoes(punicoesMap);
        };

        processarPunicoes();
    }, [selectedSeason, gridType, normalizeNomePiloto]); // Reprocessar quando a temporada ou grid mudar

    // Função auxiliar para extrair número de uma string (ex: "Etapa 8" -> 8, "8" -> 8)
    const extrairNumero = (str) => {
        if (!str) return 0;
        // Remove espaços e converte para string
        const texto = String(str).trim();
        // Tenta parseInt primeiro (para números puros)
        const num = parseInt(texto);
        if (!isNaN(num)) return num;
        // Se não funcionar, procura por dígitos no texto
        const match = texto.match(/\d+/);
        const resultado = match ? parseInt(match[0]) : 0;
        
        if (texto && texto.length > 0 && texto !== String(resultado)) {
            console.log('📝 [extrairNumero] Extraindo:', texto, '->', resultado);
        }
        
        return resultado;
    };

    // Função auxiliar para encontrar a temporada e etapa mais recentes
    const filtrarMaisRecente = (dados) => {
        if (!dados || dados.length === 0) return { temporada: 0, etapa: 0 };

        // 1. Identifica todas as temporadas disponíveis
        const todasTemporadas = new Set();
        const todasEtapasPorTemporada = {}; // { season: Set(rounds) }

        dados.forEach((row) => {
            const s = extrairNumero(row[3]);
            if (s > 0) {
                todasTemporadas.add(s);
                if (!todasEtapasPorTemporada[s]) todasEtapasPorTemporada[s] = new Set();
                const r = extrairNumero(row[4]);
                if (r > 0) todasEtapasPorTemporada[s].add(r);
            }
        });

        if (todasTemporadas.size === 0) return { temporada: 0, etapa: 0 };

        // 2. Identifica a maior temporada
        const temporadaAtual = Math.max(...Array.from(todasTemporadas));

        // 3. Identifica a maior etapa disponível nesta temporada (independente de ter resultados)
        const etapas = Array.from(todasEtapasPorTemporada[temporadaAtual] || []);
        const etapaAtual = etapas.length > 0 ? Math.max(...etapas) : 0;

        return { temporada: temporadaAtual, etapa: etapaAtual };
    };

    // useEffect para inicializar temporada quando dados carregarem
    useEffect(() => {
        if (!loading && seasons.length > 0 && selectedSeason === 0) {
            // Para outras abas, pegar a maior temporada normalmente
            if (viewType !== 'results') {
                const maxSeason = Math.max(...seasons.map(s => parseInt(s)));
                setSelectedSeason(maxSeason);
                // Não sobrescrever gridType se já foi definido pela URL
                if (!gridFromURL) {
                    setGridType('carreira');
                }
            }
        }
    }, [seasons, loading, viewType, gridFromURL]);

    // useEffect específico para garantir que quando a aba RESULTS for selecionada,
    // sempre mostre a maior temporada com a maior etapa (do grid atual)
    useEffect(() => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        if (viewType === 'results' && !loading && rawData && rawData.length > 0) {
            const maisRecente = filtrarMaisRecente(rawData);
            
            if (maisRecente.temporada > 0) {
                setSelectedSeason(maisRecente.temporada);
                
                if (maisRecente.etapa > 0) {
                    setSelectedRound(maisRecente.etapa);
                }
            }
        }
    }, [viewType, loading, rawCarreira, rawLight, gridType]);

    useEffect(() => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        if (!rawData || rawData.length === 0) return;

        const roundSet = new Set();
        const roundsComResultados = new Set();
        let maxRoundWithResults = 0;
        
        const targetSeason = parseInt(selectedSeason);

        rawData.forEach(row => {
            const s = extrairNumero(row[3]);
            if (s === targetSeason) {
                const r = extrairNumero(row[4]);
                if (r > 0) {
                    roundSet.add(r);
                    const pos = parseInt(row[8]);
                    if (!isNaN(pos) && pos > 0) {
                        roundsComResultados.add(r);
                        if (r > maxRoundWithResults) maxRoundWithResults = r;
                    }
                }
            }
        });
        
        const sortedRounds = Array.from(roundSet).filter(r => r > 0).sort((a, b) => b - a);
        const sortedRoundsComResultados = Array.from(roundsComResultados).filter(r => r > 0).sort((a, b) => b - a);
        
        // No dropbox de Resultados e Etapas, mostramos todos os rounds da temporada
        setRounds(sortedRounds);
        
        // Se estivermos na aba de resultados, prioriza a maior etapa disponível (solicitação do usuário)
        if (viewType === 'results') {
            if (sortedRounds.length > 0) {
                // Sempre seleciona a etapa de maior número
                setSelectedRound(sortedRounds[0]);
            }
        } else if ((selectedRound === 0 || selectedRound === "0") && sortedRounds.length > 0) {
            setSelectedRound(sortedRounds[0]);
        }
    }, [selectedSeason, gridType, rawCarreira, rawLight, viewType]);

    useEffect(() => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        let currentGPName = "";
        for(let row of rawData) { if (parseInt(row[3]) === parseInt(selectedSeason) && parseInt(row[4]) === parseInt(selectedRound)) { currentGPName = normalizeStr(row[5]); break; } }
        if(currentGPName) {
            let bestTime = "9:59.999"; let bestDriver = "-"; let bestSeason = "-";
            [...rawCarreira, ...rawLight].forEach(row => {
                if(normalizeStr(row[5]) === currentGPName) {
                    const lap = row[11]; 
                    if (lap && lap.length > 4 && lap < bestTime) { bestTime = lap; bestDriver = row[9]; bestSeason = row[3]; }
                }
            });
            setHistoricalRecord({ time: bestTime !== "9:59.999" ? bestTime : "-", driver: bestDriver, season: bestSeason });
        }
    }, [selectedSeason, selectedRound, gridType, rawCarreira, rawLight]);

    // MEMOIZADO: Mapa de stats por piloto para acesso rápido
    const driverStatsMap = useMemo(() => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        if (!rawData || rawData.length === 0) return {};
        
        const statsMap = {};
        const targetSeason = parseInt(selectedSeason);
        
        rawData.forEach(row => {
            const s = parseInt(row[3]);
            if (s !== targetSeason) return;
            
            const driverName = row[9];
            if (!driverName) return;
            
            if (!statsMap[driverName]) {
                statsMap[driverName] = { points: 0, wins: 0, podiums: 0, poles: 0, races: 0 };
            }
            
            const stats = statsMap[driverName];
            stats.races++;
            
            const qualy = parseInt(row[6]); 
            if (qualy === 1) stats.poles++;
            
            const racePos = parseInt(row[8]); 
            if (racePos === 1) stats.wins++; 
            if (racePos >= 1 && racePos <= 3) stats.podiums++;
            
            let p = 0;
            if (s >= 20) { 
                p = parseFloat((row[15]||'0').replace(',', '.')); 
                if (isNaN(p)) p = 0;
                if (p === 0 && racePos >= 1 && racePos <= 10) p = POINTS_RACE[racePos - 1];
            } else {
                if (racePos >= 1 && racePos <= 10) p = POINTS_RACE[racePos - 1];
            }
            
            const sprintPos = parseInt(row[7]);
            if (sprintPos >= 1 && sprintPos <= 8) p += POINTS_SPRINT[sprintPos - 1];
            
            stats.points += p;
        });
        
        // Aplicar punições
        Object.keys(statsMap).forEach(driverName => {
            const nomePilotoNormalizado = normalizeNomePiloto(driverName);
            const pontosPerdidos = punicoes[nomePilotoNormalizado] || 0;
            statsMap[driverName].points = (statsMap[driverName].points - pontosPerdidos).toFixed(0);
        });
        
        return statsMap;
    }, [gridType, rawCarreira, rawLight, selectedSeason, punicoes, normalizeNomePiloto]);
    
    // Função rápida para buscar stats (usa o mapa memoizado)
    const getDriverStats = useCallback((driverName) => {
        return driverStatsMap[driverName] || { points: 0, wins: 0, podiums: 0, poles: 0, races: 0 };
    }, [driverStatsMap]);
    
    const handleDriverClick = useCallback((driver) => { 
        setSelectedDriver({ ...driver, stats: getDriverStats(driver.name) }); 
    }, [getDriverStats]);
    
    // Função para formatar nome: primeiro nome primeira letra maiúscula (sem negrito), segundo nome todo maiúsculo (negrito)
    const formatDriverName = (fullName) => {
        if (!fullName) return '';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        const lastName = parts.slice(1).join(' ').toUpperCase();
        return (
            <>
                <span style={{fontWeight: 400, display: 'block'}}>{firstName}</span>
                <span style={{fontWeight: 900, display: 'block'}}>{lastName}</span>
            </>
        );
    };
    
    // Função para formatar nome em uma linha (para lista de classificação)
    const formatDriverNameOneLine = (fullName) => {
        if (!fullName) return '';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        const lastName = parts.slice(1).join(' ').toUpperCase();
        return (
            <>
                <span style={{fontWeight: 400}}>{firstName}</span>
                <span style={{fontWeight: 400}}>&nbsp;</span>
                <span style={{fontWeight: 900}}>{lastName}</span>
            </>
        );
    };
    
    const getTeamLogo = useCallback((teamName) => {
        if(!teamName) return null;
        const t = teamName.toLowerCase().replace(/\s/g, ''); 
        // Equipe de reservas usa logo da Master League F1
        if(t.includes("reserva")) return "/team-logos/logo-ml.png";
        if(t.includes("ferrari")) return "/team-logos/f1-ferrari.png"; 
        if(t.includes("mercedes")) return "/team-logos/f1-mercedes.png"; 
        if(t.includes("renault")) return "/team-logos/f1-renault.png";
        if(t.includes("alpine")) return "/team-logos/f1-alpine.png"; 
        if(t.includes("racingpoint") || (t.includes("racing") && t.includes("point"))) return "/team-logos/f1-racingpoint.png";
        if(t.includes("vcarb") || (t.includes("racing") && t.includes("bulls"))) return "/team-logos/f1-racingbulls.png"; 
        if(t.includes("redbull") || t.includes("oracle") || t.includes("red bull")) return "/team-logos/f1-redbull.png"; 
        if(t.includes("mclaren")) return "/team-logos/f1-mclaren.png"; 
        if(t.includes("aston")) return "/team-logos/f1-astonmartin.png"; 
        if(t.includes("haas")) return "/team-logos/f1-haas.png"; 
        if(t.includes("alfaromeo") || t.includes("alfa romeo") || (t.includes("alfa") && !t.includes("tauri"))) return "/team-logos/f1-alfaromeo.png"; 
        if(t.includes("alphatauri") || t.includes("alpha tauri")) return "/team-logos/f1-alphatauri.png"; 
        if(t.includes("tororosso") || t.includes("toro rosso") || t.includes("toro")) return "/team-logos/f1-tororosso.png";
        if(t.includes("williams")) return "/team-logos/f1-williams.png"; 
        if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "/team-logos/f1-sauber.png";
        return null;
    }, []);
    const getTeamColor = useCallback((teamName) => {
        if(!teamName) return "#94A3B8";
        const t = teamName.toLowerCase();
        if(t.includes("red bull") || t.includes("oracle")) return "var(--f1-redbull)"; if(t.includes("ferrari")) return "var(--f1-ferrari)"; if(t.includes("mercedes")) return "var(--f1-mercedes)"; if(t.includes("mclaren")) return "var(--f1-mclaren)"; if(t.includes("aston")) return "var(--f1-aston)"; if(t.includes("alpine")) return "var(--f1-alpine)"; if(t.includes("haas")) return "var(--f1-haas)"; if(t.includes("williams")) return "var(--f1-williams)"; if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "var(--f1-sauber)"; if(t.includes("vcarb") || t.includes("racing") && t.includes("bulls")) return "var(--f1-vcarb)";
        return "#94A3B8";
    }, []);

    // MEMOIZADO: getDrivers só recalcula quando os dados de entrada mudam
    const drivers = useMemo(() => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        const draftRows = gridType === 'carreira' ? draftCarreira : draftLight;
        const sourceRows = Array.isArray(rawData) ? rawData : [];
        
        const totals = {};
        const targetSeason = parseInt(selectedSeason);
        
        sourceRows.forEach(row => {
            const s = parseInt(row[3]); 
            if (s !== targetSeason) return;
            const name = row[9]; 
            const team = row[10]; 
            if (!name) return;
            
            if (!totals[name]) {
                totals[name] = { name, team: team || 'Sem equipe', points: 0, bestPosition: Infinity };
            } else if ((!totals[name].team || totals[name].team === 'Sem equipe') && team) {
                totals[name].team = team;
            }
            
            // Rastrear melhor posição (menor número = melhor)
            const racePos = parseInt(row[8]);
            const sprintPos = parseInt(row[7]);
            
            if (racePos >= 1 && racePos < totals[name].bestPosition) {
                totals[name].bestPosition = racePos;
            }
            if (sprintPos >= 1 && sprintPos < totals[name].bestPosition) {
                totals[name].bestPosition = sprintPos;
            }
            
            // Calcular pontos (depende da temporada)
            if (s >= 20) { 
                let p = 0;
                if (row.length > 15 && row[15] !== undefined && row[15] !== '') {
                    p = parseFloat(String(row[15]).replace(',', '.').replace(/\s/g, '')); 
                    if (isNaN(p)) p = 0;
                }
                
                if (p === 0 && racePos >= 1 && racePos <= 10) {
                    p = POINTS_RACE[racePos - 1];
                }
                
                if (sprintPos >= 1 && sprintPos <= 8) {
                    p += POINTS_SPRINT[sprintPos - 1];
                }
                
                totals[name].points += p;
            } else { 
                let p = 0;
                if (racePos >= 1 && racePos <= 10) {
                    p += POINTS_RACE[racePos - 1];
                }
                if (sprintPos >= 1 && sprintPos <= 8) {
                    p += POINTS_SPRINT[sprintPos - 1];
                }
                totals[name].points += p;
            }
        });

        const draftNames = collectDraftNamesForSeason(draftRows, targetSeason);
        draftNames.forEach((name) => {
            if (!totals[name]) {
                totals[name] = { name, team: 'Sem equipe', points: 0, bestPosition: Infinity };
            }
        });
        
        // Subtrair pontos perdidos em punições para cada piloto
        Object.keys(totals).forEach(nomePiloto => {
            const nomePilotoNormalizado = normalizeNomePiloto(nomePiloto);
            const pontosPerdidos = punicoes[nomePilotoNormalizado] || 0;
            
            totals[nomePiloto].pontosPerdidos = pontosPerdidos;
            
            if (pontosPerdidos > 0) {
                totals[nomePiloto].points = totals[nomePiloto].points - pontosPerdidos;
            }
        });
        
        // Ordenar por: 1) Pontos, 2) Melhor posição, 3) Nome alfabético
        const sorted = Object.values(totals).sort((a, b) => {
            const pontosA = parseFloat(a.points) || 0;
            const pontosB = parseFloat(b.points) || 0;
            
            if (pontosB !== pontosA) return pontosB - pontosA;
            
            if (a.bestPosition !== b.bestPosition) {
                if (a.bestPosition === Infinity) return 1;
                if (b.bestPosition === Infinity) return -1;
                return a.bestPosition - b.bestPosition;
            }
            
            return a.name.localeCompare(b.name, 'pt-BR');
        });

        return sorted.map((d, i) => ({ ...d, pos: i + 1, pontosPerdidos: d.pontosPerdidos || 0 }));
    }, [gridType, rawCarreira, rawLight, draftCarreira, draftLight, selectedSeason, punicoes, normalizeNomePiloto]);
    
    // Manter compatibilidade com código existente
    const getDrivers = useCallback(() => drivers, [drivers]);

    // Regra única para responsividade: "mobile" = até 768px; "PC" = acima disso
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isPhone, setIsPhone] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
            setIsPhone(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // MEMOIZADO: getConstructors usa o array de drivers já memoizado
    const constructors = useMemo(() => {
        if (!drivers || drivers.length === 0) return [];
        
        const teams = {};
        drivers.forEach(d => {
            // Ignorar equipes "Reserva"
            const teamName = (d.team || '').toLowerCase().trim();
            if (!teamName || teamName === 'reserva' || teamName === 'sem equipe' || teamName === '-') return;
            
            if (!teams[d.team]) {
                teams[d.team] = { team: d.team, points: 0, driversList: [] };
            }
            teams[d.team].points += d.points;
            if (!teams[d.team].driversList.includes(d.name)) {
                teams[d.team].driversList.push(d.name);
            }
        });
        return Object.values(teams).sort((a, b) => b.points - a.points).map((t, i) => ({ ...t, pos: i + 1 }));
    }, [drivers]);
    
    // Manter compatibilidade com código existente
    const getConstructors = useCallback(() => constructors, [constructors]);
    // MEMOIZADO: getRaceResults só recalcula quando os dados de entrada mudam
    const raceResults = useMemo(() => { 
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight; 
        if (!rawData || rawData.length === 0) return [];
        
        const results = [];
        const currentSeasonInt = parseInt(selectedSeason);
        const currentRoundInt = parseInt(selectedRound);

        rawData.forEach(row => {
            const s = parseInt(row[3]); 
            const r = parseInt(row[4]);
            if (s === currentSeasonInt && r === currentRoundInt && r > 0) {
                const pos = parseInt(row[8]);
                if (row[9] && row[9] !== '-') {
                    let stagePoints = 0; 
                    if (!isNaN(pos) && pos >= 1 && pos <= 10) stagePoints += POINTS_RACE[pos - 1]; 
                    const qualyPos = parseInt(row[6]);
                    const sprintPos = parseInt(row[7]); 
                    if (!isNaN(sprintPos) && sprintPos >= 1 && sprintPos <= 8) stagePoints += POINTS_SPRINT[sprintPos - 1];
                    results.push({ 
                        pos: isNaN(pos) || pos === 0 ? 99 : pos,
                        qualyPos: isNaN(qualyPos) ? 99 : qualyPos,
                        sprintPos: isNaN(sprintPos) ? 99 : sprintPos,
                        name: row[9], 
                        team: row[10], 
                        date: row[0], 
                        gp: row[5], 
                        fastestLap: row[11] || '-', 
                        poleTime: row[12] || '-',
                        totalPoints: stagePoints 
                    });
                }
            }
        });
        return results.sort((a, b) => a.pos - b.pos);
    }, [gridType, rawCarreira, rawLight, selectedSeason, selectedRound]);
    
    // Manter compatibilidade
    const getRaceResults = useCallback(() => raceResults, [raceResults]);

    // Função para obter informações do GP com fallbacks (especialmente para bandeiras dos EUA)
    const getGPInfo = (gpName) => {
        if (!gpName) return { flag: null };
        const normalized = normalizeStr(gpName);
        let info = { ...tracks[normalized] } || { flag: null };

        // Fallback robusto para bandeiras dos EUA
        if (!info.flag || info.flag.includes('image.png')) {
            if (normalized.includes('TEXAS') || normalized.includes('MIAMI') || 
                normalized.includes('VEGAS') || normalized.includes('AUSTIN')) {
                info.flag = 'https://flagcdn.com/w40/us.png';
            }
        }
        return info;
    };
    
    // Função para parsear tempo de volta
    const parseTime = (timeStr) => {
        if (!timeStr || timeStr === '-') return Infinity;
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            const [minutes, seconds] = parts;
            return parseInt(minutes) * 60000 + parseFloat(seconds) * 1000;
        }
        return Infinity;
    };
    // MEMOIZADO: getCalendar só recalcula quando os dados de entrada mudam
    const calendarData = useMemo(() => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight; 
        if (!rawData || rawData.length === 0) return { races: [], nextRace: null };
        
        const raceMap = new Map();
        const currentSeasonInt = parseInt(selectedSeason);
        
        rawData.forEach(row => {
            const s = parseInt(row[3]); 
            if (s !== currentSeasonInt) return; 
            const r = parseInt(row[4]);
            const modeloRaw = String(row?.[2] || '').toLowerCase();
            const isSprintRound = modeloRaw.includes('sprint');
            if(!isNaN(r) && r > 0 && !raceMap.has(r)) {
                raceMap.set(r, { round: r, date: row[0], gp: row[5], winner: null, winnerTeam: null, isSprint: isSprintRound });
            }
            if (!isNaN(r) && r > 0 && isSprintRound && raceMap.has(r)) {
                raceMap.get(r).isSprint = true;
            }
            if(r > 0 && parseInt(row[8]) === 1) { 
                const race = raceMap.get(r); 
                if(race) { race.winner = row[9]; race.winnerTeam = row[10]; } 
            }
        });
        
        const races = Array.from(raceMap.values()).sort((a,b) => a.round - b.round);
        const parseDate = (dateStr) => { 
            if (!dateStr) return 0; 
            if (dateStr.includes('/')) { 
                const [d, m, y] = dateStr.split('/'); 
                return new Date(`${y}-${m}-${d}`).getTime(); 
            } 
            return new Date(dateStr).getTime(); 
        };
        
        const today = new Date().getTime(); 
        let nextRace = null;
        const processedRaces = races.map(race => { 
            const rDate = parseDate(race.date); 
            let status = 'soon'; 
            if (race.winner) status = 'done'; 
            else if (rDate >= today) { 
                status = 'next'; 
                if (!nextRace) nextRace = { ...race, timestamp: rDate }; 
            } 
            return { ...race, status }; 
        });
        
        return { races: processedRaces, nextRace };
    }, [gridType, rawCarreira, rawLight, selectedSeason]);
    
    // Manter compatibilidade
    const getCalendar = useCallback(() => calendarData, [calendarData]);

    const renderContent = () => {
        if (loading) return <div style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>Carregando Dados...</div>;
        if (gridType === 'light' && parseInt(selectedSeason) < 16) return <div style={{textAlign:'center', padding:'60px', color:'white'}}>TEMPORADA NÃO DISPONÍVEL NO GRID LIGHT</div>;

        if (viewType === 'calendar') {
            // Usa os dados memoizados diretamente
            const { races, nextRace } = calendarData;
            const nextInfo = nextRace ? getGPInfo(nextRace.gp) : null;
            return (
                <>
                    {nextRace && (
                        <div className="next-race-card">
                            <div className="nr-label">PRÓXIMA CORRIDA</div><div className="nr-title">{nextRace.gp}</div><div className="nr-date">{nextRace.date}</div><Countdown targetDate={nextRace.timestamp} />{nextInfo && nextInfo.circuit && <img src={nextInfo.circuit} style={{height:'80px', filter:'invert(1)'}} />}
                        </div>
                    )}
                    <div className="calendar-grid">
                        {races.map(race => {
                            const isNext = nextRace && nextRace.round === race.round; const pillText = isNext ? 'EM BREVE' : (race.winner ? 'CONCLUÍDA' : 'AGENDADA'); const gpName = normalizeStr(race.gp); const gpInfo = getGPInfo(race.gp); const flagColor = flagColors[gpName] ? flagColors[gpName][0] : '#334155';
                            return (
                                <div key={race.round} className={`cal-card ${isNext ? 'next' : ''} ${race.isSprint ? 'sprint' : ''}`}>
                                    <div className="cal-accent-bar" style={{background: flagColor}}></div>
                                    <div className="cal-info-col">
                                        <div className="cal-round-row">
                                            <span style={{fontSize:'0.75rem', fontWeight:'700', color:'#94A3B8'}}>ROUND {race.round}</span>
                                            {race.isSprint && <span className="cal-sprint-chip">SPRINT</span>}
                                        </div>
                                        <div className="cal-gp-title">{race.gp}</div>
                                        <div style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', color:'#CBD5E1'}}>{gpInfo.flag && <img src={gpInfo.flag} style={{width:'24px', height:'16px', borderRadius:'2px'}} />}<span>{race.date}</span></div>
                                    </div>
                                    <div className="cal-winner-col">
                                        {race.winner ? <><div style={{fontSize:'0.6rem', fontWeight:'700', color:'#FCD34D', marginBottom:'4px'}}>VENCEDOR</div><DriverImage name={race.winner} gridType={gridType} season={selectedSeason} className="cal-winner-photo" style={{width:'45px', height:'45px', borderRadius:'50%', border:`2px solid ${getTeamColor(race.winnerTeam)}`}} /><div className="cal-winner-name">{race.winner}</div></> : <div style={{padding:'6px 8px', borderRadius:'20px', fontSize:'0.65rem', fontWeight:'700', background: isNext ? '#06B6D4' : 'rgba(255,255,255,0.1)', color: isNext ? '#0F172A' : '#94A3B8'}}>{pillText}</div>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            );
        }
        // ... (VIEWTYPE DRIVERS/TEAMS/RESULTS MANTIDO IGUAL AO ANTERIOR - Resumido aqui para caber, mas use o código completo da versão anterior)
        if (viewType === 'drivers') {
            // Usa o array memoizado diretamente
            const topCount = isMobile ? 3 : 5;
            const topDrivers = drivers.slice(0, topCount);
            const rest = drivers.slice(topCount);
            
            return (
                <>
                    {/* TOP CARDS */}
                    <div className="top5-container">
                        {topDrivers.map(driver => {
                            const teamColor = getTeamColor(driver.team);
                            const teamLogo = getTeamLogo(driver.team);
                            const maxPoints = topDrivers[0]?.points || driver.points;
                            const progressPercent = maxPoints > 0 ? (driver.points / maxPoints) * 100 : 0;
                            
                            // Debug
                            if (driver.name && driver.name.toLowerCase().includes('alann')) {
                                console.log('🔍 Driver no top5:', {
                                    name: driver.name,
                                    pontosPerdidos: driver.pontosPerdidos,
                                    points: driver.points,
                                    hasPunicao: driver.pontosPerdidos > 0
                                });
                            }
                            
                            return (
                                <article 
                                    key={driver.pos} 
                                    className="top5-card-new" 
                                    style={{"--team-color": teamColor}}
                                    onClick={() => handleDriverClick(driver)}
                                >
                                    {/* Rank Number - Top Left */}
                                    <div className="top5-rank-number">{driver.pos}º</div>
                                    
                                    {/* Driver Photo */}
                                    <div className="top5-photo-container">
                                        <DriverImage 
                                            name={driver.name} 
                                            gridType={gridType} 
                                            season={selectedSeason} 
                                            className="top5-photo"
                                        />
                                    </div>
                                    
                                    {/* Driver Info */}
                                    <div className="top5-info">
                                        <div className="top5-driver-name">{formatDriverName(driver.name)}</div>
                                            <div className="top5-team-info">
                                                {/* Team Logo - Above Name */}
                                                {teamLogo && (
                                                    <div className="top5-team-logo-top">
                                                        <img src={teamLogo} alt={driver.team} />
                                                    </div>
                                                )}
                                            <span className="top5-team-name" style={{color: teamColor}}>{driver.team}</span>
                                            </div>
                                        {/* Points Bar */}
                                        <div className="top5-points-bar">
                                            <div 
                                                className="top5-points-fill" 
                                                style={{
                                                    width: `${progressPercent}%`
                                                }}
                                            ></div>
                                        </div>
                                        </div>
                                        
                                    {/* Points Value */}
                                    <div className="top5-points-container">
                                        <div className="top5-points-wrapper">
                                            <div className="top5-points-value">{driver.points.toFixed(0)}</div>
                                            <div className="top5-points-label">PONTOS</div>
                                        </div>
                                        {/* Punições */}
                                        {driver.pontosPerdidos > 0 && (
                                            <div style={{
                                                marginTop: '8px',
                                                padding: '4px 8px',
                                                background: 'rgba(239, 68, 68, 0.2)',
                                                border: '1px solid #EF4444',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                color: '#EF4444',
                                                fontWeight: 'bold'
                                            }}>
                                                ⚠️ -{driver.pontosPerdidos} pts
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                    
                    {/* LISTA DE CLASSIFICAÇÃO (6º - 18º) */}
                    <div className="classification-section-new">
                                {rest.map(driver => {
                                    const teamColor = getTeamColor(driver.team);
                                    const teamLogo = getTeamLogo(driver.team);
                                    
                                    // Debug
                                    if (driver.name && driver.name.toLowerCase().includes('alann')) {
                                        console.log('🔍 Driver no rest:', {
                                            name: driver.name,
                                            pontosPerdidos: driver.pontosPerdidos,
                                            points: driver.points,
                                            hasPunicao: driver.pontosPerdidos > 0
                                        });
                                    }
                                    
                                    return (
                                        <div 
                                            key={driver.pos} 
                                            className="classification-row-new" 
                                            style={{"--team-color": teamColor}}
                                            onClick={() => handleDriverClick(driver)}
                                        >
                                            <div className="classification-left">
                                                <span className="classification-position">{driver.pos}º</span>
                                                <div className="classification-avatar" style={{"--team-color": teamColor}}>
                                                    <DriverImage 
                                                        name={driver.name} 
                                                        gridType={gridType} 
                                                        season={selectedSeason} 
                                                        className="classification-photo"
                                                    />
                                                </div>
                                        <div className="classification-driver-name">
                                            {formatDriverNameOneLine(driver.name)}
                                            <div className="classification-team-logo-mobile">
                                                {teamLogo ? (
                                                    <img src={teamLogo} className="classification-team-logo" alt={driver.team} />
                                                ) : (
                                                    <div className="classification-team-initial" style={{"--team-color": teamColor}}>
                                                        {driver.team.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <small style={{fontSize: '0.65rem', opacity: 0.7, fontWeight: 400}}>{driver.team}</small>
                                                {/* Punições na versão mobile */}
                                                {driver.pontosPerdidos > 0 && (
                                                    <div style={{
                                                        marginTop: '4px',
                                                        padding: '2px 6px',
                                                        background: 'rgba(239, 68, 68, 0.2)',
                                                        border: '1px solid #EF4444',
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        color: '#EF4444',
                                                        fontWeight: 'bold',
                                                        display: 'inline-block'
                                                    }}>
                                                        ⚠️ -{driver.pontosPerdidos} pts
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                            </div>
                                            <div className="classification-right" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
                                                <div className="classification-team-info">
                                                    {teamLogo ? (
                                                        <img src={teamLogo} className="classification-team-logo" alt={driver.team} />
                                                    ) : (
                                                        <div className="classification-team-initial" style={{"--team-color": teamColor}}>
                                                            {driver.team.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                            <span className="classification-team-name">
                                                        {driver.team}
                                                    </span>
                                                </div>
                                        <div style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'flex-end', 
                                            gap: '4px',
                                            minWidth: '80px'
                                        }}>
                                            <div className="classification-points">
                                                <span className="classification-points-value">{driver.points.toFixed(0)}</span>
                                                <span className="classification-points-label">PTS</span>
                                            </div>
                                            {/* Punições - Desktop e Mobile */}
                                            {driver.pontosPerdidos > 0 && (
                                                <div 
                                                    className="classification-punicoes"
                                                    style={{
                                                        padding: '4px 10px',
                                                        background: 'rgba(239, 68, 68, 0.25)',
                                                        border: '1px solid #EF4444',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        color: '#EF4444',
                                                        fontWeight: 'bold',
                                                        whiteSpace: 'nowrap',
                                                        display: 'flex !important',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        visibility: 'visible !important',
                                                        opacity: '1 !important',
                                                        position: 'static !important',
                                                        width: 'auto !important',
                                                        height: 'auto !important',
                                                        margin: '0 !important'
                                                    }}>
                                                    ⚠️ -{driver.pontosPerdidos} pts
                                                </div>
                                            )}
                                        </div>
                                            </div>
                                        </div>
                                    );
                                })}
                </div>
                </>
            );
        }
        if (viewType === 'teams') {
            // Usa o array memoizado diretamente
            return (
                <>
                    <div className="classification-section-new">
                        {constructors.map(team => {
                            const teamColor = getTeamColor(team.team);
                            const teamLogo = getTeamLogo(team.team);
                            return (
                                <div 
                                    key={team.pos} 
                                    className="classification-row-new" 
                                    style={{"--team-color": teamColor}}
                                >
                                    <div className="classification-left">
                                        <span className="classification-position">{team.pos}º</span>
                                        <div className="classification-team-logo-container">
                                            {teamLogo ? (
                                                <img src={teamLogo} className="classification-team-logo" alt={team.team} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <div className="classification-team-initial" style={{"--team-color": teamColor}}>
                                                    {team.team.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="classification-team-content-mobile">
                                            <div className="classification-team-name-main">{team.team}</div>
                                            <div className="classification-team-drivers-list">
                                                {team.driversList && team.driversList.length > 0
                                                    ? (isPhone
                                                        ? team.driversList.map(abbreviateDriverName).join(' & ')
                                                        : team.driversList.join(' & '))
                                                    : ""}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="classification-right classification-right-teams">
                                        {!isPhone && (
                                            <div className="team-members-photos" aria-label="Pilotos da equipe">
                                                {(team.driversList || []).map((driverName) => (
                                                    <div key={`${team.team}-${driverName}`} className="team-member-photo-frame">
                                                        <DriverImage
                                                            name={driverName}
                                                            gridType={gridType}
                                                            season={selectedSeason}
                                                            className="team-member-photo-img"
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="classification-points">
                                            <span className="classification-points-value">{team.points.toFixed(0)}</span>
                                            <span className="classification-points-label">PTS</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
                </>
            );
        }
        if (viewType === 'results') {
            // Usa os dados memoizados diretamente
            if(raceResults.length === 0) return <div style={{padding:'40px', textAlign:'center', color:'#94A3B8'}}>Sem resultados para esta etapa.</div>;
            
            const podium = raceResults.slice(0,3); 
            const rest = raceResults.slice(3); 
            const p1 = podium.find(p=>p.pos===1); 
            const p2 = podium.find(p=>p.pos===2); 
            const p3 = podium.find(p=>p.pos===3); 
            const gpInfo = getGPInfo(raceResults[0].gp);
            
            // Encontrar a melhor volta (menor tempo)
            const validLaps = raceResults.filter(r => r.fastestLap && r.fastestLap !== '-').map(r => ({...r, timeMs: parseTime(r.fastestLap)}));
            const bestLapData = validLaps.length > 0 ? validLaps.reduce((best, current) => current.timeMs < best.timeMs ? current : best) : null;
            const bestLap = bestLapData ? bestLapData.fastestLap : null;
            const poleInfo = raceResults.find(r => r.qualyPos === 1 && r.poleTime && r.poleTime !== '-');
            const sprintWinner = raceResults.find(r => r.sprintPos === 1);
            
            return (
                <>
                    <div className="race-header-card">
                        <div className="rh-left">
                            <div className="rh-flag-container">
                                {gpInfo.flag && <img src={gpInfo.flag} className="rh-flag" alt="" />}
                                {isPhone && gpInfo.circuit && <img src={gpInfo.circuit} className="rh-circuit-mobile" style={{filter:'invert(1)'}} alt="" />}
                            </div>
                            <div className="rh-info">
                                <div className="rh-gp">{raceResults[0].gp}</div>
                                <div className="rh-details-line">{gpInfo.circuitName}<span className="rh-divider">|</span><span className="rh-date">{raceResults[0].date}</span></div>
                            </div>
                        </div>
                        <div className="rh-right">
                            <div className="rh-record"><RecordIcon/> Recorde: <strong>{historicalRecord.time}</strong></div>
                            {!isPhone && gpInfo.circuit && <img src={gpInfo.circuit} className="rh-circuit" style={{height:50, marginTop:5, filter:'invert(1)'}} alt="" />}
                        </div>
                    </div>
                    
                    <div className="results-layout">
                        <div className="podium-container">
                            <div className="podium-left">
                                {p2 && (
                                    <div key={p2.name} className={`podium-step podium-p${p2.pos}`} style={{"--team-color":getTeamColor(p2.team)}} onClick={()=>handleDriverClick(p2)}>
                                        <div className="podium-position-left">{p2.pos}º</div>
                                        <div className="podium-team-logo-top">
                                            {getTeamLogo(p2.team) ? (
                                                <img src={getTeamLogo(p2.team)} className="podium-team-logo-top-img" alt={p2.team} />
                                            ) : (
                                                <div className="podium-team-initial-top" style={{"--team-color": getTeamColor(p2.team)}}>
                                                    {p2.team.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="podium-photo-container">
                                            <DriverImage name={p2.name} gridType={gridType} season={selectedSeason} className="podium-photo"/>
                                        </div>
                                        <div className="podium-base">
                                            <div className="podium-driver-name">{formatDriverName(p2.name)}</div>
                                            <div className="podium-team-info">
                                                <span className="podium-team-name" style={{color: getTeamColor(p2.team)}}>
                                                    {p2.team}
                                                </span>
                                            </div>
                                            <div className="podium-stats">
                                                {p2.fastestLap && p2.fastestLap !== '-' && (
                                                    <div className={`podium-fastest-lap ${p2.fastestLap === bestLap ? 'best-lap' : ''}`}>
                                                        <FastLapIcon />
                                                        {p2.fastestLap}
                                                    </div>
                                                )}
                                                <div className="podium-stat-item points">+{p2.totalPoints}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="podium-center">
                                {p1 && (
                                    <div key={p1.name} className={`podium-step podium-p${p1.pos}`} style={{"--team-color":getTeamColor(p1.team)}} onClick={()=>handleDriverClick(p1)}>
                                        <div className="podium-position-left">{p1.pos}º</div>
                                        <div className="podium-team-logo-top">
                                            {getTeamLogo(p1.team) ? (
                                                <img src={getTeamLogo(p1.team)} className="podium-team-logo-top-img" alt={p1.team} />
                                            ) : (
                                                <div className="podium-team-initial-top" style={{"--team-color": getTeamColor(p1.team)}}>
                                                    {p1.team.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="podium-photo-container">
                                            <DriverImage name={p1.name} gridType={gridType} season={selectedSeason} className="podium-photo"/>
                                        </div>
                                        <div className="podium-base">
                                            <div className="podium-driver-name">{formatDriverName(p1.name)}</div>
                                            <div className="podium-team-info">
                                                <span className="podium-team-name" style={{color: getTeamColor(p1.team)}}>
                                                    {p1.team}
                                                </span>
                                            </div>
                                            <div className="podium-stats">
                                                {p1.fastestLap && p1.fastestLap !== '-' && (
                                                    <div className={`podium-fastest-lap ${p1.fastestLap === bestLap ? 'best-lap' : ''}`}>
                                                        <FastLapIcon />
                                                        {p1.fastestLap}
                                                    </div>
                                                )}
                                                <div className="podium-stat-item points">+{p1.totalPoints}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="podium-right">
                                {p3 && (
                                    <div key={p3.name} className={`podium-step podium-p${p3.pos}`} style={{"--team-color":getTeamColor(p3.team)}} onClick={()=>handleDriverClick(p3)}>
                                        <div className="podium-position-left">{p3.pos}º</div>
                                        <div className="podium-team-logo-top">
                                            {getTeamLogo(p3.team) ? (
                                                <img src={getTeamLogo(p3.team)} className="podium-team-logo-top-img" alt={p3.team} />
                                            ) : (
                                                <div className="podium-team-initial-top" style={{"--team-color": getTeamColor(p3.team)}}>
                                                    {p3.team.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="podium-photo-container">
                                            <DriverImage name={p3.name} gridType={gridType} season={selectedSeason} className="podium-photo"/>
                                        </div>
                                        <div className="podium-base">
                                            <div className="podium-driver-name">{formatDriverName(p3.name)}</div>
                                            <div className="podium-team-info">
                                                <span className="podium-team-name" style={{color: getTeamColor(p3.team)}}>
                                                    {p3.team}
                                                </span>
                                            </div>
                                            <div className="podium-stats">
                                                {p3.fastestLap && p3.fastestLap !== '-' && (
                                                    <div className={`podium-fastest-lap ${p3.fastestLap === bestLap ? 'best-lap' : ''}`}>
                                                        <FastLapIcon />
                                                        {p3.fastestLap}
                                                    </div>
                                                )}
                                                <div className="podium-stat-item points">+{p3.totalPoints}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {(poleInfo || sprintWinner) && (
                            <div className="race-special-results">
                                {poleInfo && (
                                    <div className="race-special-card pole">
                                        <div className="race-pole-line">
                                            <span className="race-special-label"><PoleIcon /> Pole Position</span>
                                            {getTeamLogo(poleInfo.team) && (
                                                <img className="race-special-team-logo" src={getTeamLogo(poleInfo.team)} alt={poleInfo.team} />
                                            )}
                                            <DriverImage name={poleInfo.name} gridType={gridType} season={selectedSeason} className="race-special-driver-photo" />
                                            <strong className="race-special-driver">{poleInfo.name}</strong>
                                            <span className="race-special-time">{poleInfo.poleTime}</span>
                                        </div>
                                        {sprintWinner && (
                                            <div className="race-sprint-line">
                                                <span className="race-special-label">Vencedor Sprint</span>
                                                {getTeamLogo(sprintWinner.team) && (
                                                    <img className="race-special-team-logo" src={getTeamLogo(sprintWinner.team)} alt={sprintWinner.team} />
                                                )}
                                                <DriverImage name={sprintWinner.name} gridType={gridType} season={selectedSeason} className="race-special-driver-photo" />
                                                <strong className="race-special-driver">{sprintWinner.name}</strong>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!poleInfo && sprintWinner && (
                                    <div className="race-special-card sprint">
                                        <div className="race-sprint-line">
                                            <span className="race-special-label">Vencedor Sprint</span>
                                            {getTeamLogo(sprintWinner.team) && (
                                                <img className="race-special-team-logo" src={getTeamLogo(sprintWinner.team)} alt={sprintWinner.team} />
                                            )}
                                            <DriverImage name={sprintWinner.name} gridType={gridType} season={selectedSeason} className="race-special-driver-photo" />
                                            <strong className="race-special-driver">{sprintWinner.name}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="classification-section-new">
                        {rest.map(r => {
                            const teamColor = getTeamColor(r.team);
                            const teamLogo = getTeamLogo(r.team);
                            return (
                                <div 
                                    key={r.pos} 
                                    className="classification-row-new results-row" 
                                    style={{"--team-color": teamColor}}
                                    onClick={() => handleDriverClick(r)}
                                >
                                    <div className="classification-left">
                                        <span className="classification-position">{r.pos}º</span>
                                        <div className="classification-avatar" style={{"--team-color": teamColor}}>
                                            <DriverImage 
                                                name={r.name} 
                                                gridType={gridType} 
                                                season={selectedSeason} 
                                                className="classification-photo"
                                            />
                                        </div>
                                        <div className="classification-driver-name">
                                            <div className="results-mobile-driver-row">
                                                <span className="results-mobile-driver-name">{formatDriverNameOneLine(r.name)}</span>
                                                {isPhone && (
                                                    <div className="classification-points-mobile">
                                                        <span className="classification-points-value">+{r.totalPoints}</span>
                                                        <span className="classification-points-label">PTS</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="classification-team-logo-mobile">
                                                {teamLogo ? (
                                                    <img src={teamLogo} className="classification-team-logo" alt={r.team} />
                                                ) : (
                                                    <div className="classification-team-initial" style={{"--team-color": teamColor}}>
                                                        {r.team.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <small style={{fontSize: '0.65rem', opacity: 0.7, fontWeight: 400}}>{r.team}</small>
                                                {isPhone && r.fastestLap && r.fastestLap !== '-' && (
                                                    <div className={`classification-fastest-lap-mobile ${r.fastestLap === bestLap ? 'best-lap' : ''}`}>
                                                        <FastLapIcon />
                                                        {r.fastestLap}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="classification-right">
                                        <div className="classification-team-info">
                                            {teamLogo ? (
                                                <img src={teamLogo} className="classification-team-logo" alt={r.team} />
                                            ) : (
                                                <div className="classification-team-initial" style={{"--team-color": teamColor}}>
                                                    {r.team.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="classification-team-name">{r.team}</span>
                                        </div>
                                        {r.fastestLap && r.fastestLap !== '-' && (
                                            <div className={`classification-fastest-lap ${r.fastestLap === bestLap ? 'best-lap' : ''}`}>
                                                <FastLapIcon />
                                                {r.fastestLap}
                                            </div>
                                        )}
                                        <div className="classification-points">
                                            <span className="classification-points-value">+{r.totalPoints}</span>
                                            <span className="classification-points-label">PTS</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            );
        }
    };

    const handleViewTypeChange = (newViewType) => {
        setViewType(newViewType);
        
        // Se mudar para resultados, usa a função auxiliar para encontrar temporada e etapa mais recentes
        if (newViewType === 'results') {
            // Usar o grid atual (pode ser light ou carreira) baseado na URL
            const rawData = gridType === 'light' ? rawLight : rawCarreira;
            const maisRecente = filtrarMaisRecente(rawData);
            
            if (maisRecente.temporada > 0) {
                setSelectedSeason(maisRecente.temporada);
                
                if (maisRecente.etapa > 0) {
                    setSelectedRound(maisRecente.etapa);
                }
            }
        }
    };

    // Usa os dados memoizados diretamente
    const nextGPName = normalizeStr(calendarData.nextRace?.gp || "");
    const nextInfo = getGPInfo(nextGPName);

    return (
        <div className="page-wrapper">
            <section className="standings-section">
                <div className="tabs-container">
                    <button className={`tab-btn ${viewType === 'drivers' ? (gridType === 'carreira' ? 'active-tab-carreira' : 'active-tab-light') : ''}`} onClick={() => handleViewTypeChange('drivers')}>PILOTOS</button>
                    <button className={`tab-btn ${viewType === 'teams' ? (gridType === 'carreira' ? 'active-tab-carreira' : 'active-tab-light') : ''}`} onClick={() => handleViewTypeChange('teams')}>EQUIPES</button>
                    <button className={`tab-btn ${viewType === 'results' ? (gridType === 'carreira' ? 'active-tab-carreira' : 'active-tab-light') : ''}`} onClick={() => handleViewTypeChange('results')}>RESULTADOS</button>
                    <button className={`tab-btn ${viewType === 'calendar' ? (gridType === 'carreira' ? 'active-tab-carreira' : 'active-tab-light') : ''}`} onClick={() => handleViewTypeChange('calendar')}>ETAPAS</button>
                </div>
                
                <div className="section-header">
                    <div className="title-container">
                        <h2 className="section-title" style={{marginBottom: '0', lineHeight: '1'}}>
                            {viewType === 'drivers' && "CLASSIFICAÇÃO DE PILOTOS"}
                            {viewType === 'teams' && "CLASSIFICAÇÃO DE EQUIPES"}
                            {viewType === 'results' && "RESULTADOS POR ETAPA"}
                            {viewType === 'calendar' && "ETAPAS"}
                        </h2>
                        <div style={{fontSize: '2rem', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', marginTop: '5px', color: gridType === 'carreira' ? 'var(--carreira-wine)' : 'var(--light-blue)'}}>{gridType === 'carreira' ? 'GRID CARREIRA' : 'GRID LIGHT'}</div>
                    </div>

                    <div className="controls-wrapper">
                        <div className="grid-toggle">
                            <button onClick={() => setGridType('carreira')} className={`grid-btn ${gridType === 'carreira' ? 'active-carreira' : ''}`}>GRID CARREIRA</button>
                            <button onClick={() => setGridType('light')} className={`grid-btn ${gridType === 'light' ? 'active-light' : ''}`}>GRID LIGHT</button>
                        </div>
                        <div className="dropdown-group">
                            <select
                                className="season-select"
                                value={selectedSeason}
                                onChange={(e) => {
                                    setSelectedSeason(e.target.value);
                                }}
                            >
                                {seasons.map(s => <option key={s} value={s}>Temporada {s}</option>)}
                            </select>
                            {viewType === 'results' && (
                                <select
                                    className="season-select"
                                    value={selectedRound}
                                    onChange={(e) => {
                                        setSelectedRound(e.target.value);
                                    }}
                                    style={{ borderColor: 'var(--highlight-cyan)' }}
                                >
                                    {rounds.map(r => <option key={r} value={r}>Etapa {r}</option>)}
                                </select>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className={`table-container ${gridType === 'carreira' ? 'glow-carreira' : 'glow-light'}`}>{renderContent()}</div>
            </section>
            
            {selectedDriver && <DriverModal driver={selectedDriver} gridType={gridType} season={selectedSeason} onClose={() => setSelectedDriver(null)} teamColor={getTeamColor(selectedDriver.team)} teamLogo={getTeamLogo(selectedDriver.team)} />}
            <Footer />
        </div>
    );
}

export default Standings;