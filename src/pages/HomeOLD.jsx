import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLeagueData } from '../hooks/useLeagueData';
import { supabase } from '../supabaseClient';
import Papa from 'papaparse';
import Footer from '../components/Footer';

// URL do CSV de Notícias - SUBSTITUA PELA URL DA SUA PLANILHA
// Para obter a URL: Compartilhar > Qualquer pessoa com o link > Publicar na web > CSV
const NEWS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=197415613&single=true&output=csv';

const fetchWithProxy = async (url) => {
    try {
        const response = await fetch(url);
        if (response.ok) return await response.text();
        throw new Error(`Direct fetch status: ${response.status}`);
    } catch (e) {
        console.warn('⚠️ Falha no fetch direto, tentando via proxy:', e.message);
        const proxyUrl = "https://corsproxy.io/?";
        try {
            const response = await fetch(proxyUrl + encodeURIComponent(url));
            if (!response.ok) throw new Error(`Proxy error! status: ${response.status}`);
            const text = await response.text();
            if (!text || text.trim().length === 0) throw new Error('Resposta vazia do proxy');
            return text;
        } catch (proxyError) {
            console.error('❌ Erro fatal ao buscar planilha:', proxyError);
            throw proxyError;
        }
    }
};

// --- ÍCONES ---
const ArrowRightIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>);
const CalendarIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>);
const FastLapIcon = () => (<svg className="fl-icon" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
const RecordIcon = () => (<svg className="rh-icon-small" viewBox="0 0 24 24" fill="currentColor" width="20"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg>);

const POINTS_RACE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const POINTS_SPRINT = [8, 7, 6, 5, 4, 3, 2, 1];

const flagColors = { 'BÉLGICA': ['#000000', '#FDDA24', '#EF3340'], 'HOLANDA': ['#AE1C28', '#FFFFFF', '#21468B'], 'ITÁLIA': ['#009246', '#FFFFFF', '#CE2B37'], 'AZERBAIJÃO': ['#00B5E2', '#EF3340', '#509E2F'], 'SINGAPURA': ['#EF3340', '#FFFFFF'], 'EUA': ['#B22234', '#FFFFFF', '#3C3B6E'], 'MÉXICO': ['#006847', '#FFFFFF', '#CE1126'], 'BRASIL': ['#009C3B', '#FFDF00', '#002776'], 'LAS VEGAS': ['#B22234', '#FFFFFF', '#3C3B6E'], 'QATAR': ['#8D1B3D', '#FFFFFF'], 'ABU DHABI': ['#EF3340', '#007A3D', '#FFFFFF', '#000000'], 'BAHREIN': ['#EF3340', '#FFFFFF'], 'ARÁBIA SAUDITA': ['#006C35', '#FFFFFF'], 'AUSTRÁLIA': ['#00008B', '#FFFFFF', '#EF3340'], 'JAPÃO': ['#FFFFFF', '#BC002D'], 'CHINA': ['#DE2910', '#FFDE00'], 'MIAMI': ['#B22234', '#FFFFFF', '#3C3B6E'], 'EMÍLIA-ROMAGNA': ['#009246', '#FFFFFF', '#CE2B37'], 'MÔNACO': ['#EF3340', '#FFFFFF'], 'CANADÁ': ['#EF3340', '#FFFFFF'], 'ESPANHA': ['#AA151B', '#F1BF00'], 'ÁUSTRIA': ['#EF3340', '#FFFFFF'], 'INGLATERRA': ['#FFFFFF', '#CE1124', '#00247D'], 'HUNGRIA': ['#CE2939', '#FFFFFF', '#477050'], 'DEFAULT': ['#1E293B', '#0F172A'] };

const DriverImage = ({ name, gridType, season, className, style, forceSML = false }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    // Prioriza pasta da temporada primeiro, depois SML, depois shadow
    const seasonSrc = `/pilotos/${gridType}/s${season}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const fallbackS19Src = `/pilotos/${gridType}/s19/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    
    const handleError = (e) => {
        if (e.target.src.includes(`/s${season}/`)) {
            e.target.src = smlSrc;
        } else if (e.target.src.includes('/SML/')) {
            // Se não existir no SML, tenta a pasta s19 do próprio grid (muitos pilotos ainda têm foto lá)
            if (!e.target.src.includes(`/s19/`)) e.target.src = fallbackS19Src;
            else e.target.src = shadowSrc;
        } else if (e.target.src.includes(`/s19/`)) {
            e.target.src = shadowSrc;
        }
    };
    
    return <img src={forceSML ? smlSrc : seasonSrc} className={className} style={style} onError={handleError} alt="" />;
};

// Função para obter logo da equipe
const getTeamLogo = (teamName, gridType = null, isDraft = false) => {
    // Se for draft (T20 ainda não começou), usa logo ML conforme solicitado
    if (isDraft) return "/team-logos/logo-ml.png";

    // Fallback por grid (para carrosséis da Home)
    const fallbackByGrid = {
        carreira: '/logos/logo-ml-carreira.png',
        light: '/logos/logo-ml-light.png'
    };
    const fallback = fallbackByGrid[gridType] || '/team-logos/logo-ml.png';
    if (!teamName || teamName.trim() === "") return fallback;
    const t = teamName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (t.includes('redbull') || t.includes('red bull') || t.includes('oracle')) return '/team-logos/f1-redbull.png';
    if (t.includes('ferrari')) return '/team-logos/f1-ferrari.png';
    if (t.includes('mercedes')) return '/team-logos/f1-mercedes.png';
    if (t.includes('renault')) return '/team-logos/f1-renault.png';
    if (t.includes('mclaren')) return '/team-logos/f1-mclaren.png';
    if (t.includes('aston')) return '/team-logos/f1-astonmartin.png';
    if (t.includes('alpine')) return '/team-logos/f1-alpine.png';
    if (t.includes('alfaromeo') || t.includes('alfa romeo') || (t.includes('alfa') && !t.includes('tauri'))) return '/team-logos/f1-alfaromeo.png';
    if (t.includes('alphatauri') || t.includes('alpha tauri')) return '/team-logos/f1-alphatauri.png';
    if (t.includes('tororosso') || t.includes('toro rosso') || t.includes('toro')) return '/team-logos/f1-tororosso.png';
    if (t.includes('williams')) return '/team-logos/f1-williams.png';
    if (t.includes('haas')) return '/team-logos/f1-haas.png';
    if (t.includes('sauber') || t.includes('stake') || t.includes('kick')) return '/team-logos/f1-sauber.png';
    if (t.includes('racingpoint') || (t.includes('racing') && t.includes('point'))) return '/team-logos/f1-racingpoint.png';
    if (t.includes('vcarb') || (t.includes('racing') && t.includes('bulls'))) return '/team-logos/f1-racingbulls.png';
    return fallback;
};

const Countdown = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState(null);
    useEffect(() => {
        if(!targetDate) return;
        const timer = setInterval(() => {
            const now = new Date().getTime(); const distance = targetDate - now;
            if (distance < 0) { clearInterval(timer); setTimeLeft(null); } 
            else { setTimeLeft({ days: Math.floor(distance / (1000 * 60 * 60 * 24)), hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)) }); }
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);
    if (!timeLeft) return <div className="live-badge">AO VIVO</div>;
    return <div className="hub-countdown"><div className="cd-unit"><span>{timeLeft.days}</span><small>DIAS</small></div>:<div className="cd-unit"><span>{timeLeft.hours}</span><small>HRS</small></div>:<div className="cd-unit"><span>{timeLeft.minutes}</span><small>MIN</small></div></div>;
};

const DriverModal = ({ driver, gridType, season, onClose, teamColor, teamLogo }) => {
    if (!driver) return null;
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
                            <div className="stat-box"><span>Pontos</span><div className="stat-value">{driver.stats.points}</div></div>
                            <div className="stat-box"><span>Vitórias</span><div className="stat-value">{driver.stats.wins}</div></div>
                            <div className="stat-box"><span>Pódios</span><div className="stat-value">{driver.stats.podiums}</div></div>
                            <div className="stat-box"><span>Poles</span><div className="stat-value">{driver.stats.poles}</div></div>
                            <div className="stat-box"><span>Corridas</span><div className="stat-value">{driver.stats.races}</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function Home() {
    const navigate = useNavigate();
    const location = useLocation();

    // Verificar se é um retorno de OAuth de jurado (detectar hash na URL)
    // IMPORTANTE: Só redirecionar se for jurado E NÃO for piloto
    useEffect(() => {
        const checkOAuthReturn = async () => {
            // Se há um hash de autenticação na URL (retorno do OAuth)
            if (window.location.hash && window.location.hash.includes('access_token')) {
                console.log('🔄 Detectado retorno de OAuth na Home...');
                
                // Aguardar a sessão ser processada
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session) {
                    const email = session.user.email?.toLowerCase().trim();
                    console.log('📧 Email do OAuth:', email);
                    
                    // PRIMEIRO: Verificar se é piloto
                    const { data: pilotoCheck } = await supabase
                        .from('pilotos')
                        .select('email')
                        .eq('email', email)
                        .maybeSingle();
                    
                    // Se for piloto, NÃO redirecionar (deixar acessar como piloto)
                    if (pilotoCheck) {
                        console.log('✅ Email é de piloto. Não redirecionando para /veredito.');
                        // Limpar hash da URL
                        window.history.replaceState({}, '', window.location.pathname);
                        return;
                    }
                    
                    // Só verificar jurado se NÃO for piloto
                    const { data: jurado } = await supabase
                        .from('jurados')
                        .select('*')
                        .eq('email_google', email)
                        .eq('ativo', true)
                        .maybeSingle();
                    
                    if (jurado) {
                        console.log('✅ É jurado (e não é piloto)! Redirecionando para /veredito...');
                        navigate('/veredito');
                        // Limpar hash da URL
                        window.history.replaceState({}, '', window.location.pathname);
                        return;
                    }
                    
                    // Limpar hash da URL se não for nem piloto nem jurado
                    window.history.replaceState({}, '', window.location.pathname);
                }
            }
        };
        
        checkOAuthReturn();
    }, [navigate]);

    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const { rawCarreira, rawLight, rawGridsT20, draftCarreira, draftLight, tracks, seasons, loading } = useLeagueData();
    
    const [viewType, setViewType] = useState('hub'); 
    const [gridType, setGridType] = useState('carreira');
    const [selectedSeason, setSelectedSeason] = useState(0);
    const [rounds, setRounds] = useState([]);
    const [selectedRound, setSelectedRound] = useState(0);
    const [historicalRecord, setHistoricalRecord] = useState({ time: "9:59.999", driver: "-", season: "-" });
    const [selectedDriver, setSelectedDriver] = useState(null);

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

    const [nextRaceData, setNextRaceData] = useState(null);
    const [topDrivers, setTopDrivers] = useState([]);
    const [topDriversLight, setTopDriversLight] = useState([]);
    const [seasonDrivers, setSeasonDrivers] = useState([]); // Carrossel Carreira (T20)
    const [seasonDriversLightFull, setSeasonDriversLightFull] = useState([]); // Carrossel Light (T20)
    const [news, setNews] = useState([]);
    const [newsImageVersions, setNewsImageVersions] = useState({}); // { [slot:number]: updated_at:string }
    const [punicoes, setPunicoes] = useState({}); // { 'nome-normalizado': pontosPerdidos }

    const scrollRef = useRef(null);
    const scrollRefLight = useRef(null);
    const [isPaused, setIsPaused] = useState(false);
    const [isPausedLight, setIsPausedLight] = useState(false);

    const normalizeStr = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : "";
    
    // Função para normalizar nome do piloto (usada para comparação de punições)
    const normalizeNomePiloto = (nome) => {
        if (!nome) return '';
        return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, ' ').toLowerCase();
    };

    // Extrai número seguro de string (ex: "Etapa 8" => 8)
    const extrairNumero = (str) => {
        if (str === null || str === undefined) return 0;
        const texto = String(str).trim();
        const direto = parseInt(texto);
        if (!isNaN(direto)) return direto;
        const match = texto.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    };

    // URL Sync
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const view = params.get('view');
        const grid = params.get('grid');
        if (view) setViewType(view); else setViewType('hub');
        if (grid) setGridType(grid);
    }, [location]);

    // Buscar punições do Supabase (vereditos finalizados)
    useEffect(() => {
        const buscarPunicoes = async () => {
            const seasonValido = selectedSeason && (parseInt(selectedSeason) > 0 || selectedSeason > 0);
            if (!seasonValido) {
                setPunicoes({});
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('notificacoes_admin')
                    .select('dados')
                    .eq('dados->>status', 'analise_realizada');

                if (error) {
                    console.error('Erro ao buscar punições:', error);
                    return;
                }

                const punicoesMap = {};
                (data || []).forEach(item => {
                    const veredito = item.dados?.veredito;
                    const acusado = item.dados?.acusado;
                    const etapa = item.dados?.etapa || {};
                    const temporadaLance = etapa?.season || etapa?.temporada || item.dados?.season || item.dados?.temporada || null;
                    const gridLance = etapa?.grid || item.dados?.grid || null;

                    const temporadaCompativel = temporadaLance ? parseInt(temporadaLance) === parseInt(selectedSeason) : true;
                    const gridCompativel = gridLance ? gridLance === gridType : true;

                    if (veredito && acusado && acusado.nome && veredito.pontosPerdidos && temporadaCompativel && gridCompativel) {
                        const nomePilotoNormalizado = normalizeNomePiloto(acusado.nome);
                        const pontosPerdidos = parseInt(veredito.pontosPerdidos) || 0;
                        if (pontosPerdidos > 0 && nomePilotoNormalizado) {
                            punicoesMap[nomePilotoNormalizado] = (punicoesMap[nomePilotoNormalizado] || 0) + pontosPerdidos;
                        }
                    }
                });

                setPunicoes(punicoesMap);
            } catch (err) {
                console.error('Erro ao buscar punições:', err);
            }
        };

        buscarPunicoes();
    }, [selectedSeason, gridType]);

    // Auto-scroll
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || loading || seasonDrivers.length === 0) return;
        const interval = setInterval(() => {
            if (!isPaused) {
                if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) el.scrollLeft = 0;
                else el.scrollLeft += 1;
            }
        }, 30);
        return () => clearInterval(interval);
    }, [isPaused, loading, seasonDrivers]);

    // Auto-scroll (Grid Light T20)
    useEffect(() => {
        const el = scrollRefLight.current;
        if (!el || loading || seasonDriversLightFull.length === 0) return;
        const interval = setInterval(() => {
            if (!isPausedLight) {
                if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) el.scrollLeft = 0;
                else el.scrollLeft += 1;
            }
        }, 30);
        return () => clearInterval(interval);
    }, [isPausedLight, loading, seasonDriversLightFull]);

    // Buscar notícias do Google Sheets (feed de resumos na home)
    useEffect(() => {
        const fetchNews = async () => {
            
            const setFallbackNews = () => {
                setNews([
                    {
                        id: 1,
                        title: "GP de Abu Dhabi: Campeão é Coroado",
                        excerpt: "Confira todos os detalhes da última etapa da temporada e a celebração do novo campeão da Master League F1.",
                        date: "15 Jan 2025",
                        category: "Corrida",
                        image: "/banner-masterleague.png",
                        featured: true
                    },
                    {
                        id: 2,
                        title: "Análise: Melhor Volta da Temporada",
                        excerpt: "Relembre os recordes de volta rápida que marcaram a temporada e os pilotos que se destacaram.",
                        date: "12 Jan 2025",
                        category: "Análise",
                        image: null,
                        featured: false
                    },
                    {
                        id: 3,
                        title: "Grid Light: Novos Desafios",
                        excerpt: "A competição no Grid Light está mais acirrada do que nunca. Veja quem está na briga pelo título.",
                        date: "10 Jan 2025",
                        category: "Grid Light",
                        image: null,
                        featured: false
                    }
                ]);
            };

            try {
                const csvText = await fetchWithProxy(NEWS_CSV_URL);
                
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const data = results.data;
                        const newsList = [];
                        

                        if (!data || data.length === 0) {
                            console.warn('⚠️ Nenhuma notícia encontrada na planilha');
                            setFallbackNews();
                            return;
                        }
                        
                        data.forEach((row, index) => {
                            // Ignorar linhas com #REF! ou IDs inválidos
                            const idStr = (row.id || row.ID || '').toString().trim();
                            if (idStr.includes('#REF!') || idStr.includes('#') || idStr === '') {
                                return; // Pular esta linha
                            }
                            
                            // Colunas esperadas: id, title, excerpt, date, category, image, featured, link
                            const newsId = parseInt(idStr) || (index + 1);
                            const imageFromSheet = (row.image || row.Imagem || row.imagem || row.image_url || row.Image_URL || '').trim();
                            
                            // Função para converter link do Google Drive para formato direto
                            const convertGoogleDriveLink = (url) => {
                                if (!url || url.trim() === '') return null;
                                
                                const originalUrl = url.trim();
                                
                                // Se já está no formato correto, retorna como está
                                if (originalUrl.includes('drive.google.com/uc?export=view&id=')) {
                                    return originalUrl;
                                }
                                
                                // Padrão 1: drive.google.com/file/d/ID/view?usp=...
                                const driveMatch1 = originalUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
                                if (driveMatch1) {
                                    const fileId = driveMatch1[1];
                                    const converted = `https://drive.google.com/uc?export=view&id=${fileId}`;
                                    return converted;
                                }
                                
                                // Padrão 2: /d/ID/ (link compartilhado)
                                const shareMatch = originalUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                if (shareMatch) {
                                    const fileId = shareMatch[1];
                                    const converted = `https://drive.google.com/uc?export=view&id=${fileId}`;
                                    return converted;
                                }
                                
                                return originalUrl;
                            };
                            
                            // Se não tiver imagem na planilha, tenta buscar automaticamente por ID
                            let imageUrl = imageFromSheet ? convertGoogleDriveLink(imageFromSheet) : null;
                            if (!imageUrl) {
                                // Tenta buscar imagem local: /noticias/Noticia1.jpg, Noticia2.jpg, etc.
                                imageUrl = `/noticias/Noticia${newsId}.jpg`; // Padrão, será verificado no render
                            }
                            
                            const newsItem = {
                                id: newsId,
                                title: (row.title || row.Título || row.titulo || '').trim(),
                                subtitle: (row.subtitle || row.subtitulo || row.Subtítulo || '').trim(),
                                excerpt: (row.excerpt || row.Resumo || row.resumo || row.descricao || row.Descrição || '').trim(),
                                date: (row.date || row.Data || row.data || '').trim(),
                                category: (row.category || row.Categoria || row.categoria || 'Notícia').trim(),
                                image: imageUrl,
                                featured: (row.featured || row.Destaque || row.destaque || '').toString().toLowerCase() === 'true' || row.featured === '1' || row.Destaque === '1' || row.featured === 'TRUE',
                                link: (row.link || row.Link || row.url || row.URL || row.href || row.Href || '').trim() || null
                            };
                            
                            // Validar se tem título (obrigatório) e se não está vazio
                            if (newsItem.title && newsItem.title.length > 0 && !newsItem.title.includes('|')) {
                                newsList.push(newsItem);
                            }
                        });
                        
                        // Função auxiliar para parsear data (mantida para referência se precisar no futuro)
                        const parseDate = (dateStr) => {
                            if (!dateStr) return 0;
                            const date = new Date(dateStr);
                            return isNaN(date.getTime()) ? 0 : date.getTime();
                        };
                        
                        // REGRA: A notícia com número (ID) maior sempre será a principal
                            // Ordenar por ID decrescente
                            newsList.sort((a, b) => b.id - a.id);
                            
                            setNews(newsList);
                        },
                        error: (error) => {
                            console.error('❌ Erro ao parsear CSV de notícias:', error);
                            setFallbackNews();
                        }
                    });
                } catch (err) {
                    console.error('Erro ao carregar notícias:', err);
                    setFallbackNews();
                }
            };
        fetchNews();
    }, []);

    // Componente para gerenciar o carregamento de imagens das notícias com múltiplos fallbacks
    const NewsImage = ({ newsItem, supaUrl, title, subtitle, category, date }) => {
        const [imgSrc, setImgSrc] = useState(null);
        const [extensionIndex, setExtensionIndex] = useState(-1);
        const extensions = ['png', 'jpg', 'jpeg', 'webp'];
        const [triedSupa, setTriedSupa] = useState(false);
        const [triedExternal, setTriedExternal] = useState(false);

        useEffect(() => {
            const hasExternalUrl =
                newsItem.image &&
                (newsItem.image.startsWith('http://') || newsItem.image.startsWith('https://'));

            if (hasExternalUrl) {
                setImgSrc(newsItem.image);
                setTriedExternal(true);
            } else if (supaUrl) {
                setImgSrc(supaUrl);
                setTriedSupa(true);
            } else {
                // Inicia tentativa local
                setExtensionIndex(0);
                setImgSrc(`/noticias/Noticia${newsItem.id}.${extensions[0]}`);
            }
        }, [newsItem.image, newsItem.id, supaUrl]);

        const handleError = () => {
            // 1. Se falhou a imagem externa, tenta Supabase
            if (triedExternal && !triedSupa) {
                if (supaUrl) {
                    setImgSrc(supaUrl);
                    setTriedSupa(true);
                    return;
                }
                // Se não tem supaUrl, pula para local
                setExtensionIndex(0);
                setImgSrc(`/noticias/Noticia${newsItem.id}.${extensions[0]}`);
                setTriedSupa(true);
                return;
            }

            // 2. Se falhou Supabase, tenta local
            if (triedSupa && extensionIndex === -1) {
                setExtensionIndex(0);
                setImgSrc(`/noticias/Noticia${newsItem.id}.${extensions[0]}`);
                return;
            }

            // 3. Tentativas locais sequenciais
            if (extensionIndex !== -1 && extensionIndex < extensions.length - 1) {
                const nextIndex = extensionIndex + 1;
                setExtensionIndex(nextIndex);
                setImgSrc(`/noticias/Noticia${newsItem.id}.${extensions[nextIndex]}`);
                return;
            }

            // 4. Se tudo falhou, tenta banner padrão ou esconde
            if (imgSrc !== '/banner-masterleague.png') {
                setImgSrc('/banner-masterleague.png');
            } else {
                setImgSrc('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'); // Transparente
            }
        };

        return (
            <div className="news-feed-image">
                <img 
                    src={imgSrc || '/banner-masterleague.png'} 
                    alt={newsItem.title} 
                    onError={handleError}
                    loading="lazy"
                    style={{ opacity: imgSrc ? 1 : 0, transition: 'opacity 0.3s' }}
                />
                <div className="news-feed-overlay">
                    {category && date && (
                        <div className="news-feed-meta-overlay">
                            <span className="news-feed-category">{category}</span>
                            <span className="news-feed-date">{date}</span>
                        </div>
                    )}
                    {title && <h3 className="news-feed-title-overlay">{title}</h3>}
                    {subtitle && <p className="news-feed-subtitle-overlay">{subtitle}</p>}
                </div>
            </div>
        );
    };

    // Versões das imagens das notícias no Supabase (para carregar imagem nova sem redeploy)
    useEffect(() => {
        let channel = null;

        const loadVersions = async () => {
            try {
                const { data, error } = await supabase
                    .from('news_images')
                    .select('slot, updated_at');

                if (error) throw error;

                const map = {};
                (data || []).forEach((row) => {
                    if (row?.slot != null) map[Number(row.slot)] = row.updated_at || '';
                });
                setNewsImageVersions(map);
            } catch (e) {
                // Se não existir tabela/política, mantém fallback (Drive/local)
                console.warn('ℹ️ news_images não disponível (ok):', e?.message || e);
            }
        };

        loadVersions();

        // Realtime (se habilitado)
        try {
            channel = supabase
                .channel('news_images_changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'news_images' },
                    (payload) => {
                        const row = payload?.new || payload?.old;
                        const slot = row?.slot;
                        const updatedAt = row?.updated_at || new Date().toISOString();
                        if (slot == null) return;
                        setNewsImageVersions((prev) => ({ ...prev, [Number(slot)]: updatedAt }));
                    }
                )
                .subscribe();
        } catch {
            // sem realtime, sem problema
        }

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const getSupabaseNewsImageUrl = (slot) => {
        try {
            const key = `noticia${slot}`; // nome fixo no Storage
            const { data } = supabase.storage.from('noticias').getPublicUrl(key);
            const publicUrl = data?.publicUrl || '';
            if (!publicUrl) return null;
            const v = newsImageVersions?.[Number(slot)];
            if (!v) return publicUrl;
            const sep = publicUrl.includes('?') ? '&' : '?';
            return `${publicUrl}${sep}v=${encodeURIComponent(v)}`;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        if (!loading && seasons.length > 0 && selectedSeason === 0) {
            setSelectedSeason(seasons[0]);
        }
    }, [seasons, loading]);

    // Hub Data
    useEffect(() => {
        if (loading || rawCarreira.length === 0 || rawLight.length === 0) return;
        const today = new Date().getTime();
        let upcoming = null;
        const totals = {};
        const totalsLight = {};
        const targetSeason = 20; // Home: carrosséis fixos da T20

                rawCarreira.forEach(row => {
            const s = parseInt(row[3]);
            if (s === parseInt(targetSeason)) {
                const name = row[9];
                if (name) {
                    if (!totals[name]) totals[name] = { name, team: row[10], points: 0, bestPosition: Infinity };
                    // Para temporada 20+, tentar ler pontos da coluna 15, senão calcular pela posição
                    const racePos = parseInt(row[8]);
                    const sprintPos = parseInt(row[7]);
                    let p = 0;
                    if (row.length > 15 && row[15] !== undefined && row[15] !== '') {
                        p = parseFloat(String(row[15]).replace(',', '.').replace(/\s/g, '')); 
                        if (isNaN(p)) p = 0;
                    }
                    // Fallback: calcular pela posição se não encontrou na coluna 15
                    if (p === 0) {
                        if (racePos >= 1 && racePos <= 10) {
                            p = POINTS_RACE[racePos - 1];
                        }
                        if (sprintPos >= 1 && sprintPos <= 8) {
                            p += POINTS_SPRINT[sprintPos - 1];
                        }
                    }
                    totals[name].points += p;
                    
                    // Rastrear melhor posição (menor número = melhor)
                    if (racePos >= 1 && racePos < totals[name].bestPosition) {
                        totals[name].bestPosition = racePos;
                    }
                    if (sprintPos >= 1 && sprintPos < totals[name].bestPosition) {
                        totals[name].bestPosition = sprintPos;
                    }
                }
                const dateStr = row[0];
                if (dateStr && row[5]) {
                     const [d, m, y] = dateStr.includes('/') ? dateStr.split('/') : [0,0,0];
                     if(y) {
                        const rDate = new Date(`${y}-${m}-${d}`).getTime();
                        if (rDate >= today && (!upcoming || rDate < upcoming.timestamp)) {
                            upcoming = { gp: row[5], date: dateStr, timestamp: rDate, round: row[4] };
                        }
                     }
                }
            }
        });

        rawLight.forEach(row => {
            const s = parseInt(row[3]);
            if (s === parseInt(targetSeason)) {
                const name = row[9];
                if (name) {
                    if (!totalsLight[name]) totalsLight[name] = { name, team: row[10], points: 0, bestPosition: Infinity };
                    // Para temporada 20+, tentar ler pontos da coluna 15, senão calcular pela posição
                    const racePos = parseInt(row[8]);
                    const sprintPos = parseInt(row[7]);
                    let p = 0;
                    if (row.length > 15 && row[15] !== undefined && row[15] !== '') {
                        p = parseFloat(String(row[15]).replace(',', '.').replace(/\s/g, '')); 
                        if (isNaN(p)) p = 0;
                    }
                    // Fallback: calcular pela posição se não encontrou na coluna 15
                    if (p === 0) {
                        if (racePos >= 1 && racePos <= 10) {
                            p = POINTS_RACE[racePos - 1];
                        }
                        if (sprintPos >= 1 && sprintPos <= 8) {
                            p += POINTS_SPRINT[sprintPos - 1];
                        }
                    }
                    totalsLight[name].points += p;
                    
                    // Rastrear melhor posição (menor número = melhor)
                    if (racePos >= 1 && racePos < totalsLight[name].bestPosition) {
                        totalsLight[name].bestPosition = racePos;
                    }
                    if (sprintPos >= 1 && sprintPos < totalsLight[name].bestPosition) {
                        totalsLight[name].bestPosition = sprintPos;
                    }
                }
            }
        });

        setNextRaceData(upcoming);
        
        // Ordenar por: 1) Pontos, 2) Melhor posição, 3) Nome alfabético
        const sortDrivers = (a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (a.bestPosition !== b.bestPosition) {
                if (a.bestPosition === Infinity) return 1;
                if (b.bestPosition === Infinity) return -1;
                return a.bestPosition - b.bestPosition;
            }
            return a.name.localeCompare(b.name, 'pt-BR');
        };
        
        let sorted = Object.values(totals).sort(sortDrivers);
        let sortedLightFull = Object.values(totalsLight).sort(sortDrivers);

        // FALLBACK: Se não houver dados de resultados para S20 (temporada não começou), 
        // usar os dados dos DRAFTS conforme GIDs informados
        if (sorted.length === 0 && draftCarreira && draftCarreira.length > 0) {
            draftCarreira.forEach(row => {
                const name = (row[0] || '').toString().trim();
                // Ignorar cabeçalhos comuns
                if (name && name !== 'Piloto' && name !== 'NOME' && name !== 'Nome' && !name.includes('#')) {
                    // Por enquanto usa logo ML e equipe ML conforme solicitado
                    sorted.push({ name, team: 'Master League', points: 0, isDraft: true });
                }
            });
        }

        if (sortedLightFull.length === 0 && draftLight && draftLight.length > 0) {
            draftLight.forEach(row => {
                const name = (row[0] || '').toString().trim();
                if (name && name !== 'Piloto' && name !== 'NOME' && name !== 'Nome' && !name.includes('#')) {
                    sortedLightFull.push({ name, team: 'Master League', points: 0, isDraft: true });
                }
            });
        }

        setTopDrivers(sorted.slice(0, 3));
        setTopDriversLight(sortedLightFull.slice(0, 3));
        setSeasonDrivers(sorted);
        setSeasonDriversLightFull(sortedLightFull);
    }, [rawCarreira, rawLight, draftCarreira, draftLight, loading, seasons]);

    // Rounds
    useEffect(() => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        const roundSet = new Set();
        let maxRoundPast = 0; // maior etapa com data <= hoje
        let maxRoundAll = 0;  // maior etapa existente (independente de data)
        const today = new Date().getTime();
        const parseDate = (dateStr) => { if (!dateStr) return 0; if (dateStr.includes('/')) { const [d, m, y] = dateStr.split('/'); return new Date(`${y}-${m}-${d}`).getTime(); } return new Date(dateStr).getTime(); };
        const targetSeason = extrairNumero(selectedSeason);

        rawData.forEach(row => {
            const s = extrairNumero(row[3]);
            if (s === targetSeason) {
                const r = extrairNumero(row[4]); 
                const dateStr = row[0];
                if (!isNaN(r) && r > 0) {
                    roundSet.add(r);
                    if (r > maxRoundAll) maxRoundAll = r;
                    const rDate = parseDate(dateStr);
                    if (rDate <= today && r > maxRoundPast) maxRoundPast = r;
                }
            }
        });

        const sortedRounds = Array.from(roundSet).filter(r => r > 0).sort((a, b) => a - b);
        setRounds(sortedRounds);

        if (sortedRounds.length > 0) {
             if (selectedRound === 0 || !sortedRounds.includes(selectedRound)) {
                 const pickLatest = sortedRounds[sortedRounds.length - 1];
                 const chosenRound = viewType === 'results'
                     ? pickLatest                      // always highest available for results
                     : (maxRoundPast > 0 ? maxRoundPast : pickLatest); // fallback to highest if no past round
                 setSelectedRound(chosenRound);
             }
        } else {
             setSelectedRound(0);
        }
    }, [selectedSeason, gridType, rawCarreira, rawLight, viewType]);

    // Histórico
    useEffect(() => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        let currentGPName = "";
        for(let row of rawData) { if (parseInt(row[3]) === parseInt(selectedSeason) && parseInt(row[4]) === parseInt(selectedRound)) { currentGPName = normalizeStr(row[5]); break; } }
        if(currentGPName) {
            let bestTime = "9:59.999"; let bestDriver = "-"; let bestSeason = "-";
            [...rawCarreira, ...rawLight].forEach(row => {
                if(normalizeStr(row[5]) === currentGPName) {
                    const lap = row[11]; 
                    if (lap && lap.length > 4 && lap < bestTime && !lap.includes('DNF')) { bestTime = lap; bestDriver = row[9]; bestSeason = row[3]; }
                }
            });
            setHistoricalRecord({ time: bestTime !== "9:59.999" ? bestTime : "-", driver: bestDriver, season: bestSeason });
        }
    }, [selectedSeason, selectedRound, gridType, rawCarreira, rawLight]);

    // --- HELPERS DE LOGO REFORÇADOS ---
    const getTeamLogoReforcado = (teamName) => {
        if(!teamName) return null;
        const t = teamName.toLowerCase().replace(/\s/g, ''); 
        // Antigas
        if(t.includes("romeo") || (t.includes("alfa") && !t.includes("tauri"))) return "/team-logos/f1-alfaromeo.png";
        if(t.includes("alphatauri") || t.includes("alpha") || t.includes("tauri")) return "/team-logos/f1-alphatauri.png";
        if(t.includes("racingpoint") || t.includes("point") || t.includes("bwt")) return "/team-logos/f1-racingpoint.png";
        if(t.includes("renault")) return "/team-logos/f1-renault.png";
        if(t.includes("tororosso") || t.includes("toro")) return "/team-logos/f1-tororosso.png";
        // Atuais
        if(t.includes("ferrari")) return "/team-logos/f1-ferrari.png"; 
        if(t.includes("mercedes")) return "/team-logos/f1-mercedes.png"; 
        if(t.includes("alpine")) return "/team-logos/f1-alpine.png"; 
        if(t.includes("vcarb") || t.includes("racingbulls") || t.includes("rb")) return "/team-logos/f1-racingbulls.png"; 
        if(t.includes("redbull") || t.includes("oracle")) return "/team-logos/f1-redbull.png"; 
        if(t.includes("mclaren")) return "/team-logos/f1-mclaren.png"; 
        if(t.includes("aston")) return "/team-logos/f1-astonmartin.png"; 
        if(t.includes("haas")) return "/team-logos/f1-haas.png"; 
        if(t.includes("williams")) return "/team-logos/f1-williams.png"; 
        if(t.includes("stake") || t.includes("sauber") || t.includes("kick")) return "/team-logos/f1-sauber.png";
        return null;
    };

    const getTeamColor = (teamName, gridType = null, isDraft = false) => {
        if (isDraft) {
            if (gridType === 'carreira') return "var(--carreira-wine)";
            if (gridType === 'light') return "var(--light-blue)";
            return "#94A3B8";
        }
        if(!teamName) return "#94A3B8";
        const t = teamName.toLowerCase();
        if(t.includes("alfa") && !t.includes("tauri")) return "#900000";
        if(t.includes("alpha") || t.includes("tauri")) return "#FFFFFF";
        if(t.includes("racing point") || t.includes("bwt")) return "#F596C8";
        if(t.includes("renault")) return "#FFF500";
        if(t.includes("toro") || t.includes("rosso")) return "#469BFF";
        if(t.includes("red bull")) return "var(--f1-redbull)"; 
        if(t.includes("ferrari")) return "var(--f1-ferrari)"; 
        if(t.includes("mercedes")) return "var(--f1-mercedes)"; 
        if(t.includes("mclaren")) return "var(--f1-mclaren)"; 
        if(t.includes("aston")) return "var(--f1-aston)"; 
        if(t.includes("alpine")) return "var(--f1-alpine)"; 
        if(t.includes("haas")) return "var(--f1-haas)"; 
        if(t.includes("williams")) return "var(--f1-williams)"; 
        if(t.includes("stake") || t.includes("sauber")) return "var(--f1-sauber)"; 
        if(t.includes("vcarb") || t.includes("racing bulls")) return "var(--f1-vcarb)"; 
        return "#94A3B8";
    };

    const getDriverStats = (driverName, driverGridType = null, driverSeason = null) => { 
        const useGridType = driverGridType || gridType;
        const useSeason = driverSeason !== null ? driverSeason : selectedSeason;
        const rawData = useGridType === 'carreira' ? rawCarreira : rawLight; 
        let stats = { points: 0, wins: 0, podiums: 0, poles: 0, races: 0 }; 
        rawData.forEach(row => { 
            const s = parseInt(row[3]); 
            if (s !== parseInt(useSeason)) return; 
            if (row[9] === driverName) { 
                stats.races++; 
                const qualy = parseInt(row[6]); 
                if (qualy === 1) stats.poles++; 
                const racePos = parseInt(row[8]); 
                if (racePos === 1) stats.wins++; 
                if (racePos >= 1 && racePos <= 3) stats.podiums++; 
                if (s >= 20) { 
                    let p = 0;
                    if (row.length > 15 && row[15] !== undefined && row[15] !== '') {
                        p = parseFloat(String(row[15]).replace(',', '.').replace(/\s/g, '')); 
                        if (isNaN(p)) p = 0;
                    }
                    // Fallback: calcular pela posição se não encontrou na coluna 15
                    if (p === 0) {
                        if (racePos >= 1 && racePos <= 10) {
                            p = POINTS_RACE[racePos - 1];
                        }
                        const sprintPos = parseInt(row[7]);
                        if (sprintPos >= 1 && sprintPos <= 8) {
                            p += POINTS_SPRINT[sprintPos - 1];
                        }
                    }
                    stats.points += p;
                } else { 
                    if (racePos >= 1 && racePos <= 10) stats.points += POINTS_RACE[racePos - 1]; 
                    const sprintPos = parseInt(row[7]); 
                    if (sprintPos >= 1 && sprintPos <= 8) stats.points += POINTS_SPRINT[sprintPos - 1]; 
                } 
            } 
        }); 
        
        // Subtrair pontos perdidos em punições (permite valores negativos)
        const nomePilotoNormalizado = normalizeNomePiloto(driverName);
        const pontosPerdidos = punicoes[nomePilotoNormalizado] || 0;
        stats.points = stats.points - pontosPerdidos;
        
        stats.points = stats.points.toFixed(0); 
        return stats; 
    };
    const handleDriverClick = (driver) => { 
        const driverGridType = driver.gridType || gridType;
        // Carrosséis do hub usam temporada 20 fixa
        const driverSeason = driver.fromCarousel ? 20 : selectedSeason;
        setSelectedDriver({ ...driver, stats: getDriverStats(driver.name, driverGridType, driverSeason) }); 
    };
    
    const abbreviateDriverName = (fullName) => {
        if (!fullName || typeof fullName !== 'string') return fullName;
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return fullName;
        const first = parts[0]?.[0] ? `${parts[0][0].toUpperCase()}.` : '';
        const rest = parts.slice(1).join(' ');
        return [first, rest].filter(Boolean).join(' ');
    };

    const getDrivers = () => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        const totals = {};
        rawData.forEach(row => {
            const s = parseInt(row[3]); if (s !== parseInt(selectedSeason)) return;
            const name = row[9]; const team = row[10]; if (!name) return;
            if (!totals[name]) totals[name] = { name, team, points: 0, bestPosition: Infinity };
            
            // Rastrear melhor posição (menor número = melhor)
            const racePos = parseInt(row[8]);
            const sprintPos = parseInt(row[7]);
            if (racePos >= 1 && racePos < totals[name].bestPosition) {
                totals[name].bestPosition = racePos;
            }
            if (sprintPos >= 1 && sprintPos < totals[name].bestPosition) {
                totals[name].bestPosition = sprintPos;
            }
            
            // Calcular pontos
            if (s >= 20) { 
                // Para temporada 20+, os pontos vêm da coluna 15 (coluna P na planilha)
                // Tentar ler da coluna 15, mas se não existir, tentar calcular baseado na posição
                let p = 0;
                if (row.length > 15 && row[15] !== undefined && row[15] !== '') {
                    // Tentar parsear pontos da coluna 15
                    p = parseFloat(String(row[15]).replace(',', '.').replace(/\s/g, '')); 
                    if (isNaN(p)) p = 0;
                }
                
                // Se não encontrou pontos na coluna 15, calcular baseado na posição (fallback)
                if (p === 0 && racePos >= 1 && racePos <= 10) {
                    p = POINTS_RACE[racePos - 1];
                }
                if (p === 0 && sprintPos >= 1 && sprintPos <= 8) {
                    p += POINTS_SPRINT[sprintPos - 1];
                }
                
                totals[name].points += p;
            } else { if (racePos >= 1 && racePos <= 10) totals[name].points += POINTS_RACE[racePos - 1]; if (sprintPos >= 1 && sprintPos <= 8) totals[name].points += POINTS_SPRINT[sprintPos - 1]; }
        });
        
        // Subtrair pontos perdidos em punições para cada piloto (permite valores negativos)
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
            if (b.points !== a.points) return b.points - a.points;
            if (a.bestPosition !== b.bestPosition) {
                if (a.bestPosition === Infinity) return 1;
                if (b.bestPosition === Infinity) return -1;
                return a.bestPosition - b.bestPosition;
            }
            return a.name.localeCompare(b.name, 'pt-BR');
        });
        
        return sorted.map((d, i) => ({ ...d, pos: i + 1, pontosPerdidos: d.pontosPerdidos || 0 }));
    };

    const getConstructors = () => {
        const drivers = getDrivers();
        const teams = {};
        drivers.forEach(d => {
            // Ignorar equipes "Reserva"
            const teamName = d.team || '';
            if (!teamName || teamName.toLowerCase().trim() === 'reserva') return;
            
            if (!teams[teamName]) {
                teams[teamName] = { team: teamName, points: 0, driversList: [], pontosPerdidos: 0 };
            }
            teams[teamName].points += d.points;
            teams[teamName].pontosPerdidos += (d.pontosPerdidos || 0); // Somar punições dos pilotos
            if (d.name && !teams[teamName].driversList.includes(d.name)) {
                teams[teamName].driversList.push(d.name);
            }
        });
        return Object.values(teams).sort((a, b) => b.points - a.points).map((t, i) => ({ ...t, pos: i + 1, pontosPerdidos: t.pontosPerdidos || 0 }));
    };
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
    
    const getRaceResults = () => { 
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight; 
        const raceResults = []; 
        rawData.forEach(row => { 
            const s = parseInt(row[3]); 
            const r = parseInt(row[4]); 
            if (s === parseInt(selectedSeason) && r === parseInt(selectedRound)) { 
                const pos = parseInt(row[8]); 
                if (!isNaN(pos)) { 
                    let stagePoints = 0; 
                    if (pos >= 1 && pos <= 10) stagePoints += POINTS_RACE[pos - 1]; 
                    const sprintPos = parseInt(row[7]); 
                    if (!isNaN(sprintPos) && sprintPos >= 1 && sprintPos <= 8) stagePoints += POINTS_SPRINT[sprintPos - 1]; 
                    raceResults.push({ 
                        pos: pos, 
                        name: row[9], 
                        team: row[10], 
                        date: row[0], 
                        gp: row[5], 
                        fastestLap: row[11] || '-', 
                        totalPoints: stagePoints 
                    }); 
                } 
            } 
        }); 
        return raceResults.sort((a, b) => a.pos - b.pos); 
    };
    const getCalendar = () => { const rawData = gridType === 'carreira' ? rawCarreira : rawLight; const raceMap = new Map(); rawData.forEach(row => { const s = parseInt(row[3]); if (s !== parseInt(selectedSeason)) return; const r = parseInt(row[4]); if(!isNaN(r) && !raceMap.has(r)) { raceMap.set(r, { round: r, date: row[0], gp: row[5], winner: null, winnerTeam: null }); } if(parseInt(row[8]) === 1) { const race = raceMap.get(r); if(race) { race.winner = row[9]; race.winnerTeam = row[10]; } } }); const races = Array.from(raceMap.values()).sort((a,b) => a.round - b.round); const parseDate = (dateStr) => { if (!dateStr) return 0; if (dateStr.includes('/')) { const [d, m, y] = dateStr.split('/'); return new Date(`${y}-${m}-${d}`).getTime(); } return new Date(dateStr).getTime(); }; const today = new Date().getTime(); let nextRace = null; const processedRaces = races.map(race => { const rDate = parseDate(race.date); let status = 'soon'; if (race.winner) status = 'done'; else if (rDate >= today) { status = 'next'; if (!nextRace) nextRace = { ...race, timestamp: rDate }; } return { ...race, status }; }); return { races: processedRaces, nextRace }; };

    // --- HELPER PARA CLASSE CSS DO BOTÃO ---
    const getTabClass = (tabName) => {
        if (viewType === tabName) {
            return gridType === 'carreira' ? 'active-tab-carreira' : 'active-tab-light';
        }
        return '';
    };

    const renderStandingsContent = () => {
        if (loading) return <div style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>Carregando Dados...</div>;
        if (gridType === 'light' && parseInt(selectedSeason) < 16) {
            return (
                <div style={{textAlign: 'center', padding: '60px 20px', background: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '600px', margin: '40px auto'}}>
                    <div style={{fontSize: '4rem', marginBottom: '20px'}}>🚧</div>
                    <h2 style={{color: 'white', marginBottom: '10px'}}>TEMPORADA NÃO DISPONÍVEL</h2>
                    <p style={{color: '#94A3B8', marginBottom: '30px'}}>O <strong>Grid Light</strong> teve início apenas na <strong>Temporada 16</strong>.</p>
                    <button onClick={() => setSelectedSeason(16)} className="btn-primary" style={{textDecoration:'none', cursor:'pointer'}}>IR PARA TEMPORADA 16</button>
                </div>
            );
        }

        if (viewType === 'drivers') { 
            const data = getDrivers(); 
            const topCount = isMobile ? 3 : 5;
            const topDriversList = data.slice(0, topCount);
            const rest = data.slice(topCount);
            
            return ( 
                <>
                    {/* TOP CARDS */}
                    <div className="top5-container">
                        {topDriversList.map(driver => {
                            const teamColor = getTeamColor(driver.team);
                            const teamLogo = getTeamLogo(driver.team);
                            const maxPoints = topDriversList[0]?.points || driver.points;
                            const progressPercent = maxPoints > 0 ? (driver.points / maxPoints) * 100 : 0;
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
                                                -{driver.pontosPerdidos} pts
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
                                            </div>
                                        </div>
                                    </div>
                                    <div className="classification-right">
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
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', minWidth: '80px' }}>
                                            <div className="classification-points">
                                                <span className="classification-points-value">{driver.points.toFixed(0)}</span>
                                                <span className="classification-points-label">PTS</span>
                                            </div>
                                            {/* Punições - Desktop */}
                                            {driver.pontosPerdidos > 0 && (
                                                <div style={{
                                                    padding: '4px 10px',
                                                    background: 'rgba(239, 68, 68, 0.25)',
                                                    border: '1px solid #EF4444',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    color: '#EF4444',
                                                    fontWeight: 'bold',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    -{driver.pontosPerdidos} pts
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
            let data;
            try {
                data = getConstructors();
            } catch (error) {
                console.error('Erro ao buscar equipes:', error);
                return <div style={{padding:'40px', textAlign:'center', color:'#EF4444'}}>Erro ao carregar equipes: {error.message}</div>;
            }
            
            // Proteção: verificar se há dados
            if (!data || data.length === 0) {
                return <div style={{padding:'40px', textAlign:'center', color:'#94A3B8'}}>Nenhuma equipe encontrada para esta temporada.</div>;
            }
            
            return (
                <>
                    <div className="classification-section-new">
                        {data.map(team => {
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
                                            <div className="classification-team-name-main">{team.team || 'Equipe Desconhecida'}</div>
                                            <div className="classification-team-drivers-list">
                                                {team.driversList && team.driversList.length > 0
                                                    ? (isPhone
                                                        ? team.driversList.filter(Boolean).map(abbreviateDriverName).join(' & ')
                                                        : team.driversList.filter(Boolean).join(' & '))
                                                    : "Sem pilotos"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="classification-right classification-right-teams">
                                        {!isPhone && (
                                            <div className="team-members-photos" aria-label="Pilotos da equipe">
                                                {(team.driversList || []).filter(Boolean).map((driverName) => (
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
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', minWidth: '80px' }}>
                                            <div className="classification-points">
                                                <span className="classification-points-value">{team.points.toFixed(0)}</span>
                                                <span className="classification-points-label">PTS</span>
                                            </div>
                                            {/* Punições - Equipes (só mostra se > 0) */}
                                            {(team.pontosPerdidos !== undefined && team.pontosPerdidos !== null && parseInt(team.pontosPerdidos) > 0) && (
                                                <div style={{
                                                    padding: '4px 10px',
                                                    background: 'rgba(239, 68, 68, 0.25)',
                                                    border: '1px solid #EF4444',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    color: '#EF4444',
                                                    fontWeight: 'bold',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    -{team.pontosPerdidos} pts
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
        
        // CORREÇÃO AQUI: INCLUSÃO DA LOGO NO PÓDIO DA TABELA DE RESULTADOS
        if (viewType === 'results') { 
            const data = getRaceResults(); 
            if(data.length === 0) return <div style={{padding:'40px', textAlign:'center', color:'#94A3B8'}}>Sem resultados para esta etapa.</div>; 
            
            const podium = data.slice(0,3); 
            const rest = data.slice(3); 
            const p1 = podium.find(p=>p.pos===1); 
            const p2 = podium.find(p=>p.pos===2); 
            const p3 = podium.find(p=>p.pos===3); 
            const gpInfo = tracks[normalizeStr(data[0].gp)] || {}; 
            
            // Encontrar a melhor volta (menor tempo)
            const validLaps = data.filter(r => r.fastestLap && r.fastestLap !== '-').map(r => ({...r, timeMs: parseTime(r.fastestLap)}));
            const bestLapData = validLaps.length > 0 ? validLaps.reduce((best, current) => current.timeMs < best.timeMs ? current : best) : null;
            const bestLap = bestLapData ? bestLapData.fastestLap : null;
            
            return ( <> 
                <div className="race-header-card">
                    <div className="rh-left">
                        <div className="rh-flag-container">
                            {gpInfo.flag && <img src={gpInfo.flag} className="rh-flag" alt="" />}
                            {isPhone && gpInfo.circuit && <img src={gpInfo.circuit} className="rh-circuit-mobile" style={{filter:'invert(1)'}} alt="" />}
                        </div>
                        <div className="rh-info">
                            <div className="rh-gp">{data[0].gp}</div>
                            <div className="rh-details-line">{gpInfo.circuitName} {gpInfo.circuit && <span className="hide-mobile" style={{marginLeft:10}}>• Pista</span>}<span className="rh-divider">|</span><span className="rh-date">{data[0].date}</span></div>
                        </div>
                    </div>
                    <div className="rh-right">
                        <div className="rh-record"><RecordIcon/> Recorde: <strong>{historicalRecord.time}</strong> <small style={{marginLeft:5, opacity:0.7}}>({historicalRecord.driver})</small></div>
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
            </> ); 
        }
    };

    const nextGPInfo = nextRaceData && tracks ? (tracks[normalizeStr(nextRaceData.gp)] || {}) : {};

    return (
        <div className="page-wrapper">

            {viewType === 'hub' ? (
                <>
                    <header className="hub-hero">
                        <div className="hero-overlay"></div>
                        <div className="hero-content">
                            <span className="hero-badge">TEMPORADA {selectedSeason}</span>
                            <h1 className="hero-title">SUPERANDO<br/>SEUS LIMITES</h1>
                            <div className="hero-actions">
                                <button className="btn-motorhome hero-btn" onClick={() => navigate('/dashboard/escolher-tipo')} title="Motorhome">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                    </svg>
                                    <span className="hero-btn-label">MOTORHOME</span>
                                </button>

                                <Link to="/regulamento" className="btn-regulamento hero-btn" title="Regulamento">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                    <span className="hero-btn-label">REGULAMENTO</span>
                                </Link>

                                <a href="https://www.youtube.com/@MasterLeague1" target="_blank" rel="noopener noreferrer" className="btn-youtube hero-btn" title="YouTube">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                    <span className="hero-btn-label">YOUTUBE</span>
                                </a>

                                <a href="https://chat.whatsapp.com/K3UKMSXPoZv8BaYSMGRCuK" target="_blank" rel="noopener noreferrer" className="btn-whatsapp hero-btn" title="WhatsApp">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                    <span className="hero-btn-label">WHATSAPP</span>
                                </a>

                                <a href="https://www.instagram.com/masterleaguef1?utm_source=qr&igsh=MTBpYndzNHh6NXlsYQ==" target="_blank" rel="noopener noreferrer" className="btn-instagram hero-btn" title="Instagram">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                    </svg>
                                    <span className="hero-btn-label">INSTAGRAM</span>
                                </a>
                            </div>
                        </div>
                        {nextRaceData && (
                            <div className="next-race-widget">
                                <div className="nr-header"><span className="nr-label">PRÓXIMA ETAPA</span><span className="nr-date"><CalendarIcon/> {nextRaceData.date}</span></div>
                                <div className="nr-body"><div className="nr-flag">{nextGPInfo.flag && <img src={nextGPInfo.flag} alt="Flag" />}</div><div className="nr-info"><div className="nr-round">ROUND {nextRaceData.round}</div><div className="nr-gp">{nextRaceData.gp}</div></div></div>
                                <div className="nr-footer"><Countdown targetDate={nextRaceData.timestamp} /></div>
                            </div>
                        )}
                    </header>

                    <div className="hub-container">
                        {/* FEED DE NOTÍCIAS */}
                        <section className="hub-section news-feed-section">
                            <div className="section-header-hub">
                                <h2>ÚLTIMAS NOTÍCIAS</h2>
                                <Link to="/noticias" className="btn-text">Ver Todas <ArrowRightIcon/></Link>
                            </div>
                            <div className="news-feed-grid">
                                {news.length > 0 ? (() => {
                                    // Mostrar apenas a notícia principal (primeira da lista, maior ID)
                                    const newsItem = news[0];
                                    return (
                                        <article 
                                            key={`${newsItem?.id ?? 'noid'}-${newsItem?.date ?? 'nodate'}`}
                                            className="news-feed-card news-featured"
                                            onClick={async () => {
                                                // Verificar se existe notícia completa no Supabase com esse ID
                                                try {
                                                    const { data: noticiaCompleta } = await supabase
                                                        .from('noticias')
                                                        .select('id')
                                                        .eq('id', newsItem.id)
                                                        .single();
                                                    
                                                    if (noticiaCompleta) {
                                                        // Se existe no Supabase, vai para portal e rola até a notícia
                                                        navigate(`/noticias#noticia-${newsItem.id}`);
                                                        return;
                                                    }
                                                } catch (err) {
                                                    // Sem notícia no Supabase, continua com a lógica normal
                                                }

                                                // Se não tem no Supabase, usa link da planilha
                                                if (newsItem.link) {
                                                    if (newsItem.link.startsWith('http://') || newsItem.link.startsWith('https://')) {
                                                        window.open(newsItem.link, '_blank', 'noopener,noreferrer');
                                                    } else {
                                                        navigate(newsItem.link);
                                                    }
                                                } else {
                                                    // Fallback: vai para o portal de notícias
                                                    navigate('/noticias');
                                                }
                                            }}
                                        >
                                            <div className="news-featured-layout">
                                                <div className="news-featured-left">
                                                    <NewsImage 
                                                        newsItem={newsItem} 
                                                        supaUrl={getSupabaseNewsImageUrl(newsItem.id)} 
                                                    />
                                                </div>
                                                <div className="news-featured-right">
                                                    <div className="news-feed-content">
                                                        <h3 className="news-feed-title-featured">{newsItem.title}</h3>
                                                        {newsItem.subtitle && (
                                                            <p className="news-feed-subtitle">{newsItem.subtitle}</p>
                                                        )}
                                                        <p className="news-feed-excerpt">{newsItem.excerpt}</p>
                                                        <div className="news-feed-link">
                                                            LER MAIS <ArrowRightIcon/>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })() : (
                                    <div style={{gridColumn: 'span 2', textAlign: 'center', padding: '40px', color: '#94A3B8'}}>
                                        <p>Carregando notícias...</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="hub-section">
                            <div className="section-header-hub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '15px', textAlign: 'left' }}>
                                <img
                                    src="/logos/logo-ml-carreira.png"
                                    alt="Grid Carreira"
                                    style={{ height: '40px', borderRadius: '6px' }}
                                    onError={(e) => (e.target.style.display = 'none')}
                                />
                                <h2 style={{ color: 'var(--carreira-wine)' }}>GRID CARREIRA T20</h2>
                                <div className="header-line" style={{ background: 'linear-gradient(90deg, var(--carreira-wine), transparent)' }}></div>
                                <Link to="/standings?grid=carreira" className="btn-text" style={{ marginLeft: 'auto', color: 'var(--carreira-wine)' }}>Ver Classificação <ArrowRightIcon/></Link>
                            </div>
                            <div className="drivers-grid-hub" ref={scrollRef} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
                                {seasonDrivers.map(d => {
                                    const nameParts = d.name.split(' ');
                                    const firstName = nameParts[0];
                                    const lastName = nameParts.slice(1).join(' ');
                                    const teamLogo = getTeamLogo(d.team, 'carreira', d.isDraft);
                                    return (
                                    <div key={d.name} className="driver-card-hub" style={{"--team-color": getTeamColor(d.team, 'carreira', d.isDraft)}} onClick={() => handleDriverClick(d)}>
                                        <div className="dch-bg"></div>
                                        {/* Pontuação no canto superior direito - marca d'água atrás da foto */}
                                        {d.points > 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '12px',
                                                right: '12px',
                                                zIndex: 1.5,
                                                fontSize: '1.8rem',
                                                fontWeight: '900',
                                                color: 'rgba(255, 255, 255, 0.15)',
                                                lineHeight: 1,
                                                pointerEvents: 'none',
                                                fontFamily: 'Montserrat, sans-serif'
                                            }}>
                                                {d.points.toFixed(0)}
                                            </div>
                                        )}
                                        <div className="dch-photo-wrapper"><DriverImage name={d.name} gridType="carreira" season={20} className="dch-photo" forceSML={d.isDraft} /></div>
                                        <div className="dch-info">
                                            <div className="dch-name">
                                                <span className="dch-firstname">{firstName}</span>
                                                <span className="dch-lastname">{lastName}</span>
                                            </div>
                                            <div className="dch-team">{d.team}</div>
                                            <img 
                                                src={teamLogo} 
                                                alt={d.team || 'Master League'} 
                                                style={{ 
                                                    position: 'absolute', 
                                                    bottom: '8px', 
                                                    right: '8px', 
                                                    width: '28px', 
                                                    height: '28px', 
                                                    objectFit: 'contain',
                                                    opacity: 0.9,
                                                    filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.5)) drop-shadow(0 0 6px rgba(255,255,255,0.3))'
                                                }} 
                                            />
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="hub-section">
                            <div className="section-header-hub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '15px', textAlign: 'left' }}>
                                <img
                                    src="/logos/logo-ml-light.png"
                                    alt="Grid Light"
                                    style={{ height: '40px', borderRadius: '6px' }}
                                    onError={(e) => (e.target.style.display = 'none')}
                                />
                                <h2 style={{ color: 'var(--light-blue)' }}>GRID LIGHT T20</h2>
                                <div className="header-line" style={{ background: 'linear-gradient(90deg, var(--light-blue), transparent)' }}></div>
                                <Link to="/standings?grid=light" className="btn-text" style={{ marginLeft: 'auto', color: 'var(--light-blue)' }}>Ver Classificação <ArrowRightIcon/></Link>
                            </div>
                            <div className="drivers-grid-hub" ref={scrollRefLight} onMouseEnter={() => setIsPausedLight(true)} onMouseLeave={() => setIsPausedLight(false)}>
                                {seasonDriversLightFull.map(d => {
                                    const nameParts = d.name.split(' ');
                                    const firstName = nameParts[0];
                                    const lastName = nameParts.slice(1).join(' ');
                                    const teamLogo = getTeamLogo(d.team, 'light', d.isDraft);
                                    return (
                                        <div
                                            key={`${d.name}-light`}
                                            className="driver-card-hub"
                                            style={{ "--team-color": getTeamColor(d.team, 'light', d.isDraft) }}
                                            onClick={() => handleDriverClick({ ...d, gridType: 'light', fromCarousel: true })}
                                        >
                                            <div className="dch-bg"></div>
                                            {/* Pontuação no canto superior direito - marca d'água atrás da foto */}
                                            {d.points > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '12px',
                                                    right: '12px',
                                                    zIndex: 1.5,
                                                    fontSize: '1.8rem',
                                                    fontWeight: '900',
                                                    color: 'rgba(255, 255, 255, 0.15)',
                                                    lineHeight: 1,
                                                    pointerEvents: 'none',
                                                    fontFamily: 'Montserrat, sans-serif'
                                                }}>
                                                    {d.points.toFixed(0)}
                                                </div>
                                            )}
                                            <div className="dch-photo-wrapper"><DriverImage name={d.name} gridType="light" season={20} className="dch-photo" forceSML={d.isDraft} /></div>
                                            <div className="dch-info">
                                                <div className="dch-name">
                                                    <span className="dch-firstname">{firstName}</span>
                                                    <span className="dch-lastname">{lastName}</span>
                                                </div>
                                                <div className="dch-team">{d.team}</div>
                                                <img
                                                    src={teamLogo}
                                                    alt={d.team || 'Master League'}
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: '8px',
                                                        right: '8px',
                                                        width: '28px',
                                                        height: '28px',
                                                        objectFit: 'contain',
                                                        opacity: 0.9,
                                                        filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.5)) drop-shadow(0 0 6px rgba(255,255,255,0.3))'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="hub-split-section">
                            <div className="hub-col-left">
                                <div className="section-header-hub"><h2>TOP 3 - CARREIRA</h2><button className="btn-text" onClick={() => navigate('/?view=drivers&grid=carreira')}>Ver Todos <ArrowRightIcon/></button></div>
                                <div className="mini-standings">
                                    {topDrivers.map((d, i) => (
                                        <div key={d.name} className={`ms-row rank-${i+1}`} onClick={() => handleDriverClick(d)} style={{cursor:'pointer'}}>
                                            <div className="ms-pos">{i+1}</div>
                                            <div className="ms-driver"><DriverImage name={d.name} gridType="carreira" season={selectedSeason} className="ms-photo" forceSML={d.isDraft} /><div className="ms-info"><span className="ms-name">{d.name}</span><span className="ms-team">{d.team}</span></div></div>
                                            <div className="ms-pts">{d.points.toFixed(0)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="hub-col-right">
                                <div className="section-header-hub"><h2>TOP 3 - LIGHT</h2><button className="btn-text" onClick={() => { setGridType('light'); navigate('/?view=drivers&grid=light'); }}>Ver Todos <ArrowRightIcon/></button></div>
                                <div className="mini-standings">
                                    {topDriversLight.map((d, i) => (
                                        <div key={d.name} className={`ms-row rank-${i+1}`} onClick={() => handleDriverClick({ ...d, gridType: 'light' })} style={{cursor:'pointer'}}>
                                            <div className="ms-pos">{i+1}</div>
                                            <div className="ms-driver"><DriverImage name={d.name} gridType="light" season={selectedSeason} className="ms-photo" forceSML={d.isDraft} /><div className="ms-info"><span className="ms-name">{d.name}</span><span className="ms-team">{d.team}</span></div></div>
                                            <div className="ms-pts">{d.points.toFixed(0)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                        
                        <section className="hub-section">
                            <div className="section-header-hub"><h2>ACESSO RÁPIDO</h2></div>
                            <div className="quick-links-grid">
                                <Link to="/mercado" className="ql-card style-mercado"><div className="ql-icon">💰</div><div className="ql-info"><h3>MERCADO</h3><span>Negocie pilotos</span></div></Link>
                                <Link to="/telemetria" className="ql-card style-analises"><div className="ql-icon">📊</div><div className="ql-info"><h3>TELEMETRIA</h3><span>Dados avançados</span></div></Link>
                                <Link to="/halloffame" className="ql-card style-hof"><div className="ql-icon">🏆</div><div className="ql-info"><h3>HALL DA FAMA</h3><span>Lendas</span></div></Link>
                            </div>
                        </section>
                    </div>
                </>
            ) : (
                <div className="hub-container">
                    <section className="standings-section">
                        <div className="tabs-container">
                            <button className={`tab-btn ${getTabClass('drivers')}`} onClick={() => navigate('/?view=drivers')}>PILOTOS</button>
                            <button className={`tab-btn ${getTabClass('teams')}`} onClick={() => navigate('/?view=teams')}>EQUIPES</button>
                            <button className={`tab-btn ${getTabClass('results')}`} onClick={() => navigate('/?view=results')}>RESULTADOS</button>
                            <Link to="/minicup" className={`tab-btn ${location.pathname === '/minicup' ? (gridType === 'carreira' ? 'active-tab-carreira' : 'active-tab-light') : ''}`} style={{color: '#FF8C00'}}>🏆 MINICUP</Link>
                        </div>
                        <div className="section-header">
                            <div className="title-container">
                                <h2 className="section-title" style={{marginBottom: '0', lineHeight: '1'}}>
                                    {viewType === 'drivers' && "CLASSIFICAÇÃO DE PILOTOS"}
                                    {viewType === 'teams' && "CLASSIFICAÇÃO DE EQUIPES"}
                                    {viewType === 'results' && "RESULTADOS POR ETAPA"}
                                </h2>
                                <div style={{fontSize: '2rem', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', marginTop: '5px', color: gridType === 'carreira' ? 'var(--carreira-wine)' : 'var(--light-blue)'}}>{gridType === 'carreira' ? 'GRID CARREIRA' : 'GRID LIGHT'}</div>
                            </div>
                            <div className="controls-wrapper">
                                <div className="grid-toggle">
                                    <button onClick={() => setGridType('carreira')} className={`grid-btn ${gridType === 'carreira' ? 'active-carreira' : ''}`}>GRID CARREIRA</button>
                                    <button onClick={() => setGridType('light')} className={`grid-btn ${gridType === 'light' ? 'active-light' : ''}`}>GRID LIGHT</button>
                                </div>
                                <div className="dropdown-group">
                                    <select className="season-select" value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>{seasons.map(s => <option key={s} value={s}>{`Temporada ${s}`}</option>)}</select>
                                    {viewType === 'results' && <select className="season-select" value={selectedRound} onChange={(e) => setSelectedRound(parseInt(e.target.value))} style={{borderColor:'var(--highlight-cyan)'}}>{rounds.map(r => <option key={r} value={r}>{`Etapa ${r}`}</option>)}</select>}
                                </div>
                            </div>
                        </div>
                        <div className={`table-container ${gridType === 'carreira' ? 'glow-carreira' : 'glow-light'}`}>{renderStandingsContent()}</div>
                    </section>
                </div>
            )}

            {selectedDriver && <DriverModal driver={selectedDriver} gridType={selectedDriver.gridType || gridType} season={selectedSeason} onClose={() => setSelectedDriver(null)} teamColor={getTeamColor(selectedDriver.team, selectedDriver.gridType || gridType, selectedDriver.isDraft)} teamLogo={getTeamLogo(selectedDriver.team, selectedDriver.gridType || gridType, selectedDriver.isDraft)} />}
            <Footer />
        </div>
    );
}

export default Home;
