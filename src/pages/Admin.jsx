import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import VideoEmbed from '../components/VideoEmbed';
import { clearLeagueDataCache } from '../hooks/useLeagueData';
import { isMobileDevice } from '../utils/deviceDetection';
import { notifyJuradosAguardandoAnalise, flushPendingJuradoNotifications } from '../utils/emailService';
import { atualizarLancesComDefesaExpirada } from '../hooks/useAnalises';
import AdminPowerRanking from './AdminPowerRanking';
import AdminInscricoesPanel from '../components/AdminInscricoesPanel';
import AdminSeasonLifecyclePanel from '../components/AdminSeasonLifecyclePanel';
import { PRODUCTION_SITE_URL } from '../utils/urlHelpers';
import '../index.css';

function Admin() {
    // Removido scroll automático - deixar usuário controlar a posição da tela
    // O scroll só será resetado se o usuário recarregar a página manualmente
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [usersList, setUsersList] = useState([]);
    const [activeTab, setActiveTab] = useState('drivers');
    
    // Detectar dispositivo para responsividade
    const [isMobile, setIsMobile] = useState(isMobileDevice());
    useEffect(() => {
        const handleResize = () => setIsMobile(isMobileDevice());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Autenticação
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [realPassword, setRealPassword] = useState('1234'); 
    
    // NOVO: Estado do Checkbox
    const [keepConnected, setKeepConnected] = useState(false);

    const [showChangePass, setShowChangePass] = useState(false);
    const [newPass, setNewPass] = useState('');

    // Estados para Stewards/Notificações
    const [notificacoes, setNotificacoes] = useState([]);
    const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
    const [filtroNotificacao, setFiltroNotificacao] = useState('todas'); // 'todas', 'nao_lidas', 'lidas'
    const [filtroStatus, setFiltroStatus] = useState('todos'); // 'todos', 'aguardando_defesa', 'aguardando_analise', 'analise_realizada', 'solicitacao_anulada'
    const [expandedLances, setExpandedLances] = useState({}); // { notifId: true/false }
    const [selectedNotificacoes, setSelectedNotificacoes] = useState(new Set()); // IDs das notificações selecionadas
    const [lanceVotosModal, setLanceVotosModal] = useState(null); // { lanceId, codigoLance, dados } ou null
    const [anulacaoModal, setAnulacaoModal] = useState(null); // { notifId, dados } para anular solicitação (link com problema)
    const [motivoAnulacaoInput, setMotivoAnulacaoInput] = useState('');
    const [loadingVotos, setLoadingVotos] = useState(false);

    // Estados para Jurados
    const [jurados, setJurados] = useState([]);
    const [loadingJurados, setLoadingJurados] = useState(false);
    const [editingJurado, setEditingJurado] = useState(null); // { id, nome, email_google, whatsapp }
    const [savingJurado, setSavingJurado] = useState(false);

    // Estados para Narradores
    const [narradores, setNarradores] = useState([]);
    const [loadingNarradores, setLoadingNarradores] = useState(false);
    const [editingNarrador, setEditingNarrador] = useState(null); // { id, nome, email, whatsapp, senha }
    const [savingNarrador, setSavingNarrador] = useState(false);

    const normalizeNarradorRole = (role) => {
        const normalized = String(role || '').trim().toLowerCase();
        return normalized === 'admin' ? 'admin' : 'narrador';
    };

    const isMissingNarradorColumnError = (message = '') =>
        /schema cache/i.test(message) && /narradores/i.test(message) && /(papel|usuario)/i.test(message);
    const isDuplicateNarradorEmailError = (message = '') =>
        /duplicate key value/i.test(message) && /narradores_email_key|email/i.test(message);

    const hashPasswordSha256 = async (password) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password || '');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    };

    // Estados para Notícias (Upload de Imagens)
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedNewsId, setSelectedNewsId] = useState(1);
    const [newsImageRefreshKey, setNewsImageRefreshKey] = useState(Date.now());
    const [newsImagesData, setNewsImagesData] = useState([]); // Dados das imagens com is_featured
    const [loadingNewsImages, setLoadingNewsImages] = useState(false);
    
    // Estados para CMS de Notícias
    const [noticias, setNoticias] = useState([]);
    const [loadingNoticias, setLoadingNoticias] = useState(false);
    const [editingNoticia, setEditingNoticia] = useState(null);
    const [savingNoticia, setSavingNoticia] = useState(false);
    const [showNovaNoticia, setShowNovaNoticia] = useState(false);

    // Estados para Revisão de Vereditos
    const [lancesRevisao, setLancesRevisao] = useState([]);
    const [loadingRevisao, setLoadingRevisao] = useState(false);
    const [revisandoLance, setRevisandoLance] = useState(null);
    const [editandoVeredito, setEditandoVeredito] = useState(null); // Lance sendo editado manualmente

    const getSupabaseNewsImageUrl = (slot) => {
        try {
            const key = `noticia${slot}`; // nome fixo no Storage
            const { data } = supabase.storage.from('noticias').getPublicUrl(key);
            const publicUrl = data?.publicUrl || '';
            if (!publicUrl) return '';
            const sep = publicUrl.includes('?') ? '&' : '?';
            return `${publicUrl}${sep}v=${newsImageRefreshKey}`;
        } catch {
            return '';
        }
    };

    // Componente auxiliar para o preview de imagens com fallback no Admin
    const AdminNewsImagePreview = ({ id, getSupaUrl }) => {
        const [imgSrc, setImgSrc] = useState(getSupaUrl(id));
        const [extensionIndex, setExtensionIndex] = useState(-1);
        const extensions = ['png', 'jpg', 'jpeg', 'webp'];
        const [triedSupa, setTriedSupa] = useState(true);

        useEffect(() => {
            setImgSrc(getSupaUrl(id));
            setExtensionIndex(-1);
            setTriedSupa(true);
        }, [id, newsImageRefreshKey, getSupaUrl]);

        const handleError = () => {
            if (triedSupa) {
                setTriedSupa(false);
                setExtensionIndex(0);
                setImgSrc(`/noticias/Noticia${id}.${extensions[0]}`);
                return;
            }

            if (extensionIndex !== -1 && extensionIndex < extensions.length - 1) {
                const nextIndex = extensionIndex + 1;
                setExtensionIndex(nextIndex);
                setImgSrc(`/noticias/Noticia${id}.${extensions[nextIndex]}`);
                return;
            }

            // Se tudo falhar
            setImgSrc(null);
        };

        return (
            <div style={{
                background: '#0F172A',
                borderRadius: '8px',
                padding: '10px',
                border: '1px solid #475569'
            }}>
                <div style={{ 
                    width: '100%', 
                    aspectRatio: '16/9', 
                    background: '#1E293B',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    {imgSrc ? (
                        <img 
                            src={imgSrc}
                            alt={`Notícia ${id}`}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                            onError={handleError}
                        />
                    ) : (
                        <span style={{ color: '#64748B', fontSize: '10px' }}>Sem imagem</span>
                    )}
                </div>
                <p style={{ color: '#94A3B8', fontSize: '11px', margin: 0, textAlign: 'center' }}>
                    noticia{id}
                </p>
            </div>
        );
    };

    // Carregar dados de news_images (para gerenciar is_featured)
    const carregarNewsImages = async () => {
        setLoadingNewsImages(true);
        try {
            const { data, error } = await supabase
                .from('news_images')
                .select('slot, is_featured, updated_at')
                .order('slot', { ascending: true });
            
            if (error) {
                // Se a tabela não existe ou não tem o campo, não é erro crítico
                if (error.message?.includes('does not exist') || error.message?.includes('column') || error.code === 'PGRST116') {
                    console.warn('⚠️ Tabela news_images ou campo is_featured não existe ainda. Execute o script SQL: scripts/add_featured_to_news_images.sql');
                    setNewsImagesData([]);
                    return;
                }
                throw error;
            }
            setNewsImagesData(data || []);
        } catch (err) {
            console.error('Erro ao carregar news_images:', err);
            setNewsImagesData([]);
        } finally {
            setLoadingNewsImages(false);
        }
    };

    // Função para marcar/desmarcar notícia como principal
    const toggleFeaturedNews = async (slot) => {
        try {
            // Buscar se já está marcada como principal
            const currentImage = newsImagesData.find(img => img.slot === slot);
            const isCurrentlyFeatured = currentImage?.is_featured || false;
            
            if (isCurrentlyFeatured) {
                // Se já está marcada, desmarcar
                const { error } = await supabase
                    .from('news_images')
                    .update({ is_featured: false })
                    .eq('slot', slot);
                
                if (error) throw error;
                alert(`✅ Notícia ${slot} removida como principal`);
            } else {
                // Desmarcar todas as outras primeiro
                const { error: clearError } = await supabase
                    .from('news_images')
                    .update({ is_featured: false })
                    .neq('slot', slot);
                
                if (clearError) throw clearError;
                
                // Marcar esta como principal
                // Se não existe registro, criar; se existe, atualizar
                const { error: upsertError } = await supabase
                    .from('news_images')
                    .upsert({ 
                        slot, 
                        is_featured: true,
                        updated_at: new Date().toISOString()
                    }, { 
                        onConflict: 'slot' 
                    });
                
                if (upsertError) throw upsertError;
                alert(`✅ Notícia ${slot} definida como principal!`);
            }
            
            // Recarregar dados
            await carregarNewsImages();
            setNewsImageRefreshKey(Date.now());
        } catch (err) {
            console.error('Erro ao atualizar notícia principal:', err);
            alert('❌ Erro ao atualizar notícia principal: ' + (err.message || 'Erro desconhecido'));
        }
    };

    // Funções do CMS de Notícias
    const carregarNoticias = async () => {
        setLoadingNoticias(true);
        try {
            const { data, error } = await supabase
                .from('noticias')
                .select('*')
                .order('id', { ascending: false });
            
            if (error) throw error;
            setNoticias(data || []);
        } catch (err) {
            console.error('Erro ao carregar notícias:', err);
            alert('❌ Erro ao carregar notícias: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setLoadingNoticias(false);
        }
    };

    const handleSaveNoticia = async () => {
        if (!editingNoticia) return;
        
        if (!editingNoticia.title || !editingNoticia.id) {
            alert('❌ Preencha pelo menos o ID e o Título da notícia');
            return;
        }

        setSavingNoticia(true);
        try {
            // Se está marcando como principal, desmarcar outras
            if (editingNoticia.principal) {
                await supabase
                    .from('noticias')
                    .update({ principal: false })
                    .neq('id', parseInt(editingNoticia.id));
            }

            const { error } = await supabase
                .from('noticias')
                .upsert({
                    id: parseInt(editingNoticia.id),
                    title: editingNoticia.title,
                    subtitle: editingNoticia.subtitle || null,
                    content: editingNoticia.content || null,
                    date: editingNoticia.date || new Date().toLocaleDateString('pt-BR'),
                    category: editingNoticia.category || 'Notícia',
                    featured: editingNoticia.featured || false,
                    principal: editingNoticia.principal || false,
                    link: editingNoticia.link || null
                }, { onConflict: 'id' });

            if (error) throw error;

            alert('✅ Notícia salva com sucesso!');
            setEditingNoticia(null);
            setShowNovaNoticia(false);
            await carregarNoticias();
        } catch (err) {
            console.error('Erro ao salvar notícia:', err);
            alert('❌ Erro ao salvar notícia: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setSavingNoticia(false);
        }
    };

    const handleDeleteNoticia = async (id) => {
        if (!window.confirm('❌ Tem certeza que deseja excluir esta notícia? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('noticias')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('✅ Notícia excluída com sucesso!');
            await carregarNoticias();
        } catch (err) {
            console.error('Erro ao excluir notícia:', err);
            alert('❌ Erro ao excluir notícia: ' + (err.message || 'Erro desconhecido'));
        }
    };

    // useEffect para carregar notícias e news_images quando a aba for aberta
    useEffect(() => {
        if (activeTab === 'noticias') {
            carregarNoticias();
            carregarNewsImages();
        }
    }, [activeTab]);

    // Estados para Edição de Usuários/Pilotos
    const [editingUser, setEditingUser] = useState(null); // { id, nome, email, grid, equipe, whatsapp, is_steward }
    const [savingUser, setSavingUser] = useState(false);
    
    // Estados para Cadastro de Novo Piloto
    const [showCadastroPiloto, setShowCadastroPiloto] = useState(false);
    const [novoPiloto, setNovoPiloto] = useState({
        tipo_piloto: 'ativo', // 'ativo' ou 'ex-piloto'
        nome: '',
        email: '',
        whatsapp: '',
        grid: 'light', // 'carreira' ou 'light'
        equipe: '',
        gamertag: ''
    });
    const [salvandoPiloto, setSalvandoPiloto] = useState(false);

    // Toggle para expandir/colapsar gaveta + marcar como lida automaticamente
    // Ao abrir uma gaveta, fecha todas as outras
    const toggleLance = async (notifId, isLido, event) => {
        // Prevenir comportamento padrão
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // O DisableAutoScroll cuida de preservar o scroll
        const isOpening = !expandedLances[notifId];
        // Se está abrindo, fecha todas as outras e abre apenas esta
        // Se está fechando, apenas fecha esta
        setExpandedLances(isOpening ? { [notifId]: true } : {});
        
        // Se está abrindo e não está lida, marca como lida
        if (isOpening && !isLido) {
            await marcarComoLida(notifId);
        }
        };
    
    // Salvar posição do scroll (o DisableAutoScroll cuida do bloqueio)
    const scrollPositionRef = useRef(null);
    
    useEffect(() => {
        // Apenas salvar posição do scroll - o DisableAutoScroll bloqueia scroll automático
        let scrollTimeout = null;
        const handleScroll = () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            scrollPositionRef.current = scrollY;
            
            // Throttle: salvar apenas a cada 200ms
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (scrollY > 0) {
                    sessionStorage.setItem('admin_scroll_position', scrollY.toString());
                }
            }, 200);
        };
        
        // Salvar posição antes de sair
        const handleBeforeUnload = () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            if (scrollY > 0) {
                sessionStorage.setItem('admin_scroll_position', scrollY.toString());
            }
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []); // Executar apenas uma vez ao montar o componente

    // Resetar gavetas ao mudar de aba
    useEffect(() => {
        setExpandedLances({});
    }, [activeTab]);

    // Manter posição do scroll ao trocar de aba: salvar no clique e restaurar após render (evita tela subir ao abrir Stewards).
    const savedScrollRef = useRef(0);
    const setActiveTabAndKeepScroll = (tab) => {
        savedScrollRef.current = window.scrollY || document.documentElement.scrollTop;
        setActiveTab(tab);
    };
    useLayoutEffect(() => {
        const saved = savedScrollRef.current;
        if (saved <= 0) return;
        const restore = () => {
            const cur = window.scrollY || document.documentElement.scrollTop;
            if (cur === 0 && saved > 0) window.scrollTo(0, saved);
        };
        restore();
        requestAnimationFrame(() => requestAnimationFrame(restore));
        const t = setTimeout(restore, 100);
        return () => clearTimeout(t);
    }, [activeTab]);

    // Scroll a restaurar após o auto-refresh das notificações (a cada 10s) – evita tela subir quando setNotificacoes re-renderiza.
    const scrollAfterNotifRefreshRef = useRef(null);
    useLayoutEffect(() => {
        const toRestore = scrollAfterNotifRefreshRef.current;
        if (toRestore == null || activeTab !== 'stewards') return;
        scrollAfterNotifRefreshRef.current = null;
        const y = window.scrollY || document.documentElement.scrollTop;
        if (y !== toRestore) {
            window.scrollTo(0, toRestore);
            requestAnimationFrame(() => window.scrollTo(0, toRestore));
        }
    }, [notificacoes, activeTab]);

    // 1. INICIALIZAÇÃO E VERIFICAÇÃO DE LOGIN SALVO
    useEffect(() => {
        const init = async () => {
            // PRIMEIRO: Verificar localStorage (Manter conectado)
            // Isso garante que se o usuário marcou "Manter conectado", ele permanece logado mesmo após fechar o navegador
            const savedAuth = localStorage.getItem('ml_admin_auth');
            if (savedAuth === 'true') {
                setIsAuthenticated(true);
                setLoading(false);
                console.log('✅ Autenticação restaurada do localStorage (Manter conectado)');
                return; // Se está autenticado via localStorage, não precisa verificar mais nada
            }

            // SEGUNDO: Verificar sessionStorage (sessão atual apenas)
            // Se não marcou "Manter conectado", verifica se ainda está na mesma sessão
            const sessionAuth = sessionStorage.getItem('ml_admin_auth_session');
            if (sessionAuth === 'true') {
                setIsAuthenticated(true);
                setLoading(false);
                console.log('✅ Autenticação restaurada do sessionStorage (sessão atual)');
                return;
            }

            // Busca senha real (apenas se não estiver autenticado)
            const { data } = await supabase.from('app_config').select('value').eq('key', 'admin_password').single();
            if (data) setRealPassword(data.value);
            
            setLoading(false);
        };
        init();
    }, [navigate]);

    // 2. CARREGA DADOS QUANDO AUTENTICADO
    useEffect(() => {
        if (isAuthenticated) {
            fetchAllUsers();
            fetchNotificacoes();
        }
    }, [isAuthenticated]);

    // Carregar notificações quando mudar para aba stewards + auto-refresh a cada 10 segundos
    useEffect(() => {
        let intervalId;
        if (isAuthenticated && activeTab === 'stewards') {
            // Primeira carga: Mostra loading normal
            fetchNotificacoes(false);
            
            // Auto-refresh a cada 10 segundos para capturar mudanças de status
            intervalId = setInterval(() => {
                fetchNotificacoes(false);
            }, 10000);

            return () => {
                if (intervalId) clearInterval(intervalId);
            };
        }
        }, [activeTab, isAuthenticated]);

    // Carregar jurados quando mudar para aba jurados
    useEffect(() => {
        if (isAuthenticated && activeTab === 'jurados') {
            fetchJurados();
        }
    }, [activeTab, isAuthenticated]);

    // Carregar narradores quando mudar para aba narradores
    useEffect(() => {
        if (isAuthenticated && activeTab === 'narradores') {
            fetchNarradores();
        }
    }, [activeTab, isAuthenticated]);

    // Carregar lances para revisão quando mudar para aba revisao-vereditos
    useEffect(() => {
        if (isAuthenticated && activeTab === 'revisao-vereditos') {
            fetchLancesRevisao();
        }
    }, [activeTab, isAuthenticated]);

    // Função para carregar lances que precisam de revisão
    const fetchLancesRevisao = async () => {
        setLoadingRevisao(true);
        try {
            // Buscar todos os registros da tabela (sem filtro de tipo)
            const { data, error } = await supabase
                .from('notificacoes_admin')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log('📊 [REVISÃO] Total de registros:', data?.length);

            // Filtrar lances que têm veredito (culpado, inocente com semVideo, ou qualquer veredito)
            const lancesComVeredito = (data || []).filter(lance => {
                const veredito = lance.dados?.veredito;
                // Incluir qualquer lance que tenha um veredito definido
                return veredito && (veredito.decisao || veredito.culpado !== undefined);
            });

            console.log('📊 [REVISÃO] Lances com veredito:', lancesComVeredito.length);
            
            // Debug: mostrar estrutura do primeiro lance para entender os campos
            if (lancesComVeredito.length > 0) {
                console.log('📊 [REVISÃO] Exemplo de estrutura de lance:', {
                    dados: lancesComVeredito[0].dados,
                    keys: Object.keys(lancesComVeredito[0].dados || {})
                });
            }

            // Tabela de punições para recálculo
            const punicoesTabela = {
                'advertencia': { pontos: 0, label: '⚠️ Advertência (Alerta Disciplinar!)' },
                'leve': { pontos: 5, label: '🟡 Leve - 5 pontos' },
                'media': { pontos: 10, label: '🟠 Média - 10 pontos' },
                'grave': { pontos: 15, label: '🔴 Grave - 15 pontos' },
                'gravissima': { pontos: 20, label: '⛔ Gravíssima - 20 pontos' }
            };

            // Analisar cada lance
            const lancesAnalisados = lancesComVeredito.map(lance => {
                const veredito = lance.dados.veredito;
                const punicaoInfo = punicoesTabela[veredito.punicao] || { pontos: 0, label: 'Desconhecida' };
                
                // Calcular pontos corretos
                const pontosBase = punicaoInfo.pontos;
                const pontosAgravante = veredito.agravante ? 5 : 0;
                const pontosSemVideo = veredito.semVideo ? 5 : 0;
                const pontosCorretos = pontosBase + pontosAgravante + pontosSemVideo;
                const pontosAtuais = veredito.pontosPerdidos || 0;
                
                // Verificar se há discrepância
                const temProblema = pontosCorretos !== pontosAtuais;

                // Extrair nome do acusado (pode ser string ou objeto)
                const acusadoNome = typeof lance.dados.acusado === 'object' 
                    ? lance.dados.acusado?.nome || 'Desconhecido'
                    : lance.dados.acusado || 'Desconhecido';
                
                const acusadorNome = typeof lance.dados.acusador === 'object'
                    ? lance.dados.acusador?.nome || 'Desconhecido'
                    : lance.dados.acusador || 'Desconhecido';

                // Verificar se enviou vídeo de defesa
                const defesa = lance.dados.defesa;
                const enviouVideoDefesa = defesa && (defesa.videoLinkDefesa || defesa.descricaoDefesa);

                // Função auxiliar para normalizar objeto (pode ser objeto ou string JSON)
                const normalizeObject = (value) => {
                    if (value === null || value === undefined) return null;
                    if (typeof value === 'object') return value;
                    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                        try {
                            return JSON.parse(value);
                        } catch (e) {
                            return null;
                        }
                    }
                    return null;
                };

                // Extrair valores que podem ser objetos, strings ou strings JSON
                let roundValue = 'N/A';
                let circuitValue = 'N/A';
                let dateValue = lance.created_at;

                // Tentar várias fontes de dados para round
                const roundSources = [lance.dados.round, lance.dados.etapa, lance.dados.selectedRound];
                let roundObj = null;
                
                for (const source of roundSources) {
                    if (source) {
                        roundObj = normalizeObject(source);
                        if (roundObj) break;
                        // Se não é objeto, pode ser valor direto
                        if (typeof source === 'string' || typeof source === 'number') {
                            roundValue = String(source);
                        }
                    }
                }

                if (roundObj) {
                    // Extrair do objeto {date, round, circuit}
                    roundValue = roundObj.round || roundObj.etapa || roundObj.name || 'N/A';
                    circuitValue = roundObj.circuit || roundObj.circuito || roundObj.pista || 'N/A';
                    dateValue = roundObj.date || roundObj.data || lance.dados.date || lance.created_at;
                    
                    // Garantir que são primitivos
                    if (typeof roundValue === 'object') roundValue = 'N/A';
                    if (typeof circuitValue === 'object') circuitValue = 'N/A';
                } else {
                    // Fallbacks diretos
                    if (roundValue === 'N/A') {
                        roundValue = lance.dados.etapa || lance.dados.round || 'N/A';
                    }
                    circuitValue = lance.dados.circuit || lance.dados.circuito || lance.dados.pista || 'N/A';
                    dateValue = lance.dados.date || lance.dados.data || lance.created_at;
                }
                
                // Conversão final para string primitiva
                roundValue = String(roundValue);
                circuitValue = String(circuitValue);

                // Extrair código do lance de várias fontes possíveis
                const codigoLance = lance.dados.codigo || 
                                   lance.dados.codigoLance || 
                                   lance.dados.codigo_lance ||
                                   lance.codigo_lance || 
                                   lance.codigo ||
                                   lance.dados.lanceId ||
                                   'N/A';
                
                console.log('🔍 [DEBUG] Código lance:', codigoLance, 'Dados keys:', Object.keys(lance.dados || {}));

                return {
                    id: lance.id,
                    codigo: codigoLance,
                    acusado: acusadoNome,
                    acusador: acusadorNome,
                    temporada: lance.dados.season || lance.dados.temporada || 'N/A',
                    round: roundValue,
                    circuit: circuitValue,
                    grid: lance.dados.grid || 'N/A',
                    date: dateValue,
                    placar: veredito.placar || 'N/A',
                    veredito: veredito,
                    punicaoLabel: punicaoInfo.label,
                    pontosBase,
                    pontosAgravante,
                    pontosSemVideo,
                    pontosCorretos,
                    pontosAtuais,
                    temProblema,
                    enviouVideoDefesa,
                    dadosCompletos: lance.dados
                };
            });

            // Ordenar: primeiro os com problema, depois por data
            lancesAnalisados.sort((a, b) => {
                if (a.temProblema && !b.temProblema) return -1;
                if (!a.temProblema && b.temProblema) return 1;
                return 0;
            });

            setLancesRevisao(lancesAnalisados);
        } catch (error) {
            console.error('Erro ao carregar lances para revisão:', error);
            alert('Erro ao carregar lances: ' + error.message);
        } finally {
            setLoadingRevisao(false);
        }
    };

    // Função para recalcular e salvar os pontos de um lance
    const recalcularPontosLance = async (lance) => {
        if (!window.confirm(`Recalcular pontos do lance ${lance.codigo}?\n\nPontos atuais: ${lance.pontosAtuais}\nPontos corretos: ${lance.pontosCorretos}`)) {
            return;
        }

        setRevisandoLance(lance.id);
        try {
            const novoVeredito = {
                ...lance.veredito,
                pontosPerdidos: lance.pontosCorretos
            };

            const { error } = await supabase
                .from('notificacoes_admin')
                .update({
                    dados: {
                        ...lance.dadosCompletos,
                        veredito: novoVeredito
                    }
                })
                .eq('id', lance.id);

            if (error) throw error;

            alert(`✅ Lance ${lance.codigo} atualizado!\n\nPontos: ${lance.pontosAtuais} → ${lance.pontosCorretos}`);
            
            // Recarregar lista
            fetchLancesRevisao();
        } catch (error) {
            console.error('Erro ao recalcular pontos:', error);
            alert('Erro ao recalcular: ' + error.message);
        } finally {
            setRevisandoLance(null);
        }
    };

    // Função para recalcular TODOS os lances com problema
    const recalcularTodosProblemas = async () => {
        const lancesComProblema = lancesRevisao.filter(l => l.temProblema);
        
        if (lancesComProblema.length === 0) {
            alert('Nenhum lance com discrepância encontrado!');
            return;
        }

        if (!window.confirm(`Recalcular ${lancesComProblema.length} lance(s) com discrepância?`)) {
            return;
        }

        setLoadingRevisao(true);
        let corrigidos = 0;
        let erros = 0;

        for (const lance of lancesComProblema) {
            try {
                const novoVeredito = {
                    ...lance.veredito,
                    pontosPerdidos: lance.pontosCorretos
                };

                const { error } = await supabase
                    .from('notificacoes_admin')
                    .update({
                        dados: {
                            ...lance.dadosCompletos,
                            veredito: novoVeredito
                        }
                    })
                    .eq('id', lance.id);

                if (error) throw error;
                corrigidos++;
            } catch (error) {
                console.error(`Erro ao corrigir lance ${lance.codigo}:`, error);
                erros++;
            }
        }

        alert(`✅ Correção concluída!\n\nCorrigidos: ${corrigidos}\nErros: ${erros}`);
        fetchLancesRevisao();
    };

    const fetchAllUsers = async () => {
        // setLoading(true); // Comentado para não piscar a tela no refresh
        // Buscar pilotos da tabela 'pilotos' incluindo todos os campos necessários
        const { data, error } = await supabase
            .from('pilotos')
            .select('id, nome, email, whatsapp, grid, equipe, is_steward, tipo_piloto, status, nome_piloto_historico, senha_hash, gamertag, cod_idml, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar pilotos:', error);
            // Tentar fallback para 'profiles' se 'pilotos' não existir
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            if (!fallbackError) setUsersList(fallbackData || []);
        } else {
            setUsersList(data || []);
        }
        // setLoading(false);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (passwordInput === realPassword) {
            setIsAuthenticated(true);
            // SEMPRE salva no localStorage se o checkbox estiver marcado
            // Isso garante persistência entre recarregamentos e fechamento do navegador
            if (keepConnected) {
                localStorage.setItem('ml_admin_auth', 'true');
                console.log('✅ Autenticação salva no localStorage (Manter conectado ativado)');
                console.log('💾 Usuário permanecerá logado mesmo após fechar o navegador');
            } else {
                // Se não marcou "Manter conectado", usa sessionStorage (dura apenas enquanto a aba está aberta)
                sessionStorage.setItem('ml_admin_auth_session', 'true');
                localStorage.removeItem('ml_admin_auth');
                console.log('ℹ️ Autenticação salva apenas na sessão atual (Manter conectado desativado)');
            }
            // Limpar campo de senha após login bem-sucedido
            setPasswordInput('');
        } else {
            alert('Senha incorreta.');
            setPasswordInput('');
        }
    };

    // NOVO: Função de Logout para limpar a memória
    const handleLogoutAdmin = () => {
        // Limpar tanto localStorage quanto sessionStorage
        localStorage.removeItem('ml_admin_auth');
        sessionStorage.removeItem('ml_admin_auth_session');
        setIsAuthenticated(false);
        setPasswordInput('');
        setKeepConnected(false); // Resetar checkbox também
        console.log('🚪 Logout realizado - todas as autenticações foram limpas');
    };

    const handleChangePassword = async () => {
        if (!newPass || newPass.length < 4) return alert("Mínimo 4 caracteres.");
        const { error } = await supabase.from('app_config').upsert({ key: 'admin_password', value: newPass });
        if (error) alert("Erro: " + error.message);
        else {
            setRealPassword(newPass);
            alert("Senha atualizada!");
            setShowChangePass(false);
            setNewPass('');
        }
    };

    // ===== FUNÇÕES DE JURADOS =====
    // Gerar caminho da foto do jurado baseado no nome
    // Formato: /jurados/nomesobrenome.png (lowercase, sem espaços)
    const getFotoJurado = (nome) => {
        if (!nome) return '/pilotos/pilotoshadow.png';
        const nomeFormatado = nome.toLowerCase().replace(/\s+/g, '');
        return `/jurados/${nomeFormatado}.png`;
    };

    const fetchJurados = async () => {
        setLoadingJurados(true);
        try {
            const { data, error } = await supabase
                .from('jurados')
                .select('*')
                .order('id', { ascending: true });

            if (error) {
                console.error('Erro ao buscar jurados:', error);
            } else {
                setJurados(data || []);
            }
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setLoadingJurados(false);
        }
    };

    const formatWhatsApp = (value) => {
        // Remove tudo que não é número
        const numbers = value.replace(/\D/g, '');
        
        // Aplica máscara (00) 00000-0000
        if (numbers.length <= 2) {
            return `(${numbers}`;
        } else if (numbers.length <= 7) {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        } else {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
        }
    };

    const handleEditJurado = (jurado) => {
        setEditingJurado({
            id: jurado.id,
            usuario: jurado.usuario,
            nome: jurado.nome || '',
            email_google: jurado.email_google || '',
            whatsapp: jurado.whatsapp || '',
            ativo: jurado.ativo || false
        });
    };

    const handleSaveJurado = async () => {
        if (!editingJurado) return;

        // Validações
        if (!editingJurado.nome.trim()) {
            alert('⚠️ Informe o nome do jurado!');
            return;
        }
        if (!editingJurado.email_google.trim()) {
            alert('⚠️ Informe o e-mail Google!');
            return;
        }
        if (!editingJurado.email_google.includes('@')) {
            alert('⚠️ E-mail inválido!');
            return;
        }
        if (!editingJurado.whatsapp || editingJurado.whatsapp.replace(/\D/g, '').length !== 11) {
            alert('⚠️ WhatsApp deve ter 11 dígitos! Ex: (11) 99999-9999');
            return;
        }

        setSavingJurado(true);
        try {
            const { error } = await supabase
                .from('jurados')
                .update({
                    nome: editingJurado.nome.trim(),
                    email_google: editingJurado.email_google.trim().toLowerCase(),
                    whatsapp: editingJurado.whatsapp,
                    ativo: editingJurado.ativo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingJurado.id);

            if (error) throw error;

            alert('✅ Jurado atualizado com sucesso!');
            setEditingJurado(null);
            fetchJurados();
        } catch (err) {
            console.error('Erro ao salvar jurado:', err);
            alert('❌ Erro ao salvar: ' + err.message);
        } finally {
            setSavingJurado(false);
        }
    };

    const toggleJuradoAtivo = async (jurado) => {
        try {
            const { error } = await supabase
                .from('jurados')
                .update({ 
                    ativo: !jurado.ativo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', jurado.id);

            if (error) throw error;
            fetchJurados();
        } catch (err) {
            console.error('Erro ao alterar status:', err);
            alert('❌ Erro: ' + err.message);
        }
    };

    // ===== FUNÇÕES DE NARRADORES =====
    const fetchNarradores = async () => {
        setLoadingNarradores(true);
        try {
            const { data, error } = await supabase
                .from('narradores')
                .select('*')
                .order('nome', { ascending: true });

            if (error) {
                console.error('Erro ao buscar narradores:', error);
            } else {
                setNarradores(data || []);
            }
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setLoadingNarradores(false);
        }
    };

    const handleEditNarrador = (narrador) => {
        setEditingNarrador({
            id: narrador.id,
            usuario: narrador.usuario || (narrador.email ? narrador.email.split('@')[0] : ''),
            nome: narrador.nome || '',
            email: narrador.email || '',
            whatsapp: narrador.whatsapp || '',
            senha: '', // Não mostrar senha atual
            papel: normalizeNarradorRole(narrador.papel),
            ativo: narrador.ativo !== false
        });
    };

    const handleSaveNarrador = async () => {
        if (!editingNarrador) return;

        // Validações
        if (!editingNarrador.nome.trim()) {
            alert('⚠️ Informe o nome do narrador!');
            return;
        }
        if (!editingNarrador.email.trim()) {
            alert('⚠️ Informe o e-mail!');
            return;
        }
        if (!editingNarrador.email.includes('@')) {
            alert('⚠️ E-mail inválido!');
            return;
        }
        if (!editingNarrador.usuario || !editingNarrador.usuario.trim()) {
            alert('⚠️ Informe o usuário de acesso!');
            return;
        }
        if (!editingNarrador.whatsapp || editingNarrador.whatsapp.trim().length < 10) {
            alert('⚠️ Informe um WhatsApp válido!');
            return;
        }

        setSavingNarrador(true);
        try {
            const updateData = {
                usuario: editingNarrador.usuario.trim().toLowerCase(),
                nome: editingNarrador.nome.trim(),
                email: editingNarrador.email.trim().toLowerCase(),
                whatsapp: editingNarrador.whatsapp.trim(),
                papel: normalizeNarradorRole(editingNarrador.papel),
                ativo: editingNarrador.ativo,
                updated_at: new Date().toISOString()
            };

            // Se foi informada uma nova senha, fazer hash SHA-256
            if (editingNarrador.senha && editingNarrador.senha.length > 0) {
                const hashHex = await hashPasswordSha256(editingNarrador.senha);
                updateData.senha_hash = hashHex;
                updateData.senha_definida = true;
            }

            const { error } = await supabase
                .from('narradores')
                .update(updateData)
                .eq('id', editingNarrador.id);

            if (error) {
                const msg = error?.message || '';
                if (isMissingNarradorColumnError(msg)) {
                    const fallbackData = { ...updateData };
                    delete fallbackData.usuario;
                    delete fallbackData.papel;
                    const { error: fallbackError } = await supabase
                        .from('narradores')
                        .update(fallbackData)
                        .eq('id', editingNarrador.id);
                    if (fallbackError) throw fallbackError;
                    alert('⚠️ Narrador salvo sem os novos campos (usuário/papel). Rode o SQL scripts/add_narradores_login_fields.sql para habilitar totalmente.');
                } else {
                    throw error;
                }
            }

            alert('✅ Narrador atualizado com sucesso!');
            setEditingNarrador(null);
            fetchNarradores();
        } catch (err) {
            console.error('Erro ao salvar narrador:', err);
            const msg = err?.message || '';
            if (isMissingNarradorColumnError(msg) || /column .*usuario|column .*papel|'.*papel'.*column|'.*usuario'.*column/i.test(msg)) {
                alert('❌ O banco ainda não possui os campos de login de narrador.\n\nExecute no Supabase: scripts/add_narradores_login_fields.sql');
            } else {
                alert('❌ Erro ao salvar: ' + msg);
            }
        } finally {
            setSavingNarrador(false);
        }
    };

    const handleCreateNarrador = async () => {
        const novoNarrador = {
            usuario: '',
            nome: '',
            email: '',
            whatsapp: '',
            senha: '',
            papel: 'narrador',
            ativo: true
        };
        setEditingNarrador(novoNarrador);
    };

    const handleSaveNewNarrador = async () => {
        if (!editingNarrador) return;

        // Validações
        if (!editingNarrador.nome.trim()) {
            alert('⚠️ Informe o nome do narrador!');
            return;
        }
        if (!editingNarrador.email.trim()) {
            alert('⚠️ Informe o e-mail!');
            return;
        }
        if (!editingNarrador.email.includes('@')) {
            alert('⚠️ E-mail inválido!');
            return;
        }
        if (!editingNarrador.usuario || !editingNarrador.usuario.trim()) {
            alert('⚠️ Informe o usuário de acesso!');
            return;
        }
        if (!editingNarrador.whatsapp || editingNarrador.whatsapp.trim().length < 10) {
            alert('⚠️ Informe um WhatsApp válido!');
            return;
        }
        if (!editingNarrador.senha || editingNarrador.senha.trim().length < 4) {
            alert('⚠️ Defina uma senha com pelo menos 4 caracteres!');
            return;
        }

        setSavingNarrador(true);
        try {
            const hashHex = await hashPasswordSha256(editingNarrador.senha.trim());
            const payload = {
                usuario: editingNarrador.usuario.trim().toLowerCase(),
                nome: editingNarrador.nome.trim(),
                email: editingNarrador.email.trim().toLowerCase(),
                whatsapp: editingNarrador.whatsapp.trim(),
                senha_hash: hashHex,
                senha_definida: true,
                papel: normalizeNarradorRole(editingNarrador.papel),
                ativo: editingNarrador.ativo !== false
            };

            // Se já existe por e-mail, atualizar em vez de duplicar
            const { data: existingByEmail, error: existingErr } = await supabase
                .from('narradores')
                .select('id')
                .eq('email', payload.email)
                .maybeSingle();

            if (existingErr) throw existingErr;

            if (existingByEmail?.id) {
                const updatePayload = { ...payload, updated_at: new Date().toISOString() };
                const { error: updateErr } = await supabase
                    .from('narradores')
                    .update(updatePayload)
                    .eq('id', existingByEmail.id);

                if (updateErr) {
                    const msg = updateErr?.message || '';
                    if (isMissingNarradorColumnError(msg)) {
                        const fallbackUpdatePayload = { ...updatePayload };
                        delete fallbackUpdatePayload.usuario;
                        delete fallbackUpdatePayload.papel;
                        const { error: updateFallbackErr } = await supabase
                            .from('narradores')
                            .update(fallbackUpdatePayload)
                            .eq('id', existingByEmail.id);
                        if (updateFallbackErr) throw updateFallbackErr;
                        alert('⚠️ Cadastro já existia e foi atualizado sem usuário/papel. Rode o SQL scripts/add_narradores_login_fields.sql.');
                    } else {
                        throw updateErr;
                    }
                } else {
                    alert('✅ E-mail já cadastrado. Atualizamos o acesso existente com os novos dados.');
                }

                setEditingNarrador(null);
                fetchNarradores();
                return;
            }

            const { error } = await supabase
                .from('narradores')
                .insert(payload);

            if (error) {
                const msg = error?.message || '';
                if (isDuplicateNarradorEmailError(msg)) {
                    alert('⚠️ Já existe um narrador com este e-mail. Use "Editar" no cadastro existente.');
                    fetchNarradores();
                    return;
                }
                if (isMissingNarradorColumnError(msg)) {
                    const fallbackPayload = { ...payload };
                    delete fallbackPayload.usuario;
                    delete fallbackPayload.papel;
                    const { error: fallbackError } = await supabase
                        .from('narradores')
                        .insert(fallbackPayload);
                    if (fallbackError) throw fallbackError;
                    alert('⚠️ Acesso criado sem os novos campos (usuário/papel). Rode o SQL scripts/add_narradores_login_fields.sql para habilitar totalmente.');
                } else {
                    throw error;
                }
            }

            alert('✅ Acesso criado com sucesso!');
            setEditingNarrador(null);
            fetchNarradores();
        } catch (err) {
            console.error('Erro ao criar narrador:', err);
            const msg = err?.message || '';
            if (isDuplicateNarradorEmailError(msg)) {
                alert('⚠️ Já existe um narrador com este e-mail. Use "Editar" no registro existente.');
                fetchNarradores();
                return;
            }
            if (isMissingNarradorColumnError(msg) || /column .*usuario|column .*papel|'.*papel'.*column|'.*usuario'.*column/i.test(msg)) {
                alert('❌ O banco ainda não possui os campos de login de narrador.\n\nExecute no Supabase: scripts/add_narradores_login_fields.sql');
            } else {
                alert('❌ Erro ao criar: ' + msg);
            }
        } finally {
            setSavingNarrador(false);
        }
    };

    const toggleNarradorAtivo = async (narrador) => {
        try {
            const { error } = await supabase
                .from('narradores')
                .update({ 
                    ativo: !narrador.ativo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', narrador.id);

            if (error) throw error;
            fetchNarradores();
        } catch (err) {
            console.error('Erro ao alterar status:', err);
            alert('❌ Erro: ' + err.message);
        }
    };

    const handleDeleteNarrador = async (narrador) => {
        if (!confirm(`Tem certeza que deseja excluir o narrador "${narrador.nome}"?`)) return;
        
        try {
            const { error } = await supabase
                .from('narradores')
                .delete()
                .eq('id', narrador.id);

            if (error) throw error;
            alert('✅ Narrador excluído com sucesso!');
            fetchNarradores();
        } catch (err) {
            console.error('Erro ao excluir narrador:', err);
            alert('❌ Erro: ' + err.message);
        }
    };

    // ===== FUNÇÕES DE NOTIFICAÇÕES/STEWARDS =====
    const fetchNotificacoes = async (isBackgroundUpdate = false) => {
        // SÓ mostre o loading se NÃO for uma atualização automática de fundo
        if (!isBackgroundUpdate) {
            setLoadingNotificacoes(true);
        }
        
        try {
            // Atualizar lances com deadline de defesa expirado antes de buscar
            await atualizarLancesComDefesaExpirada(supabase);
            
            // Buscar apenas acusações (defesas são incorporadas dentro delas)
            const { data, error } = await supabase
                .from('notificacoes_admin')
                .select('*')
                .eq('tipo', 'nova_acusacao')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar notificações:', error);
            } else {
                // Qualquer atualização da lista na aba Stewards (manual ou auto 10s) pode re-renderizar e fazer a tela subir: guardar scroll para restaurar
                if (activeTab === 'stewards') {
                    scrollAfterNotifRefreshRef.current = window.scrollY || document.documentElement.scrollTop;
                }
                setNotificacoes(data || []);
            }
        } catch (err) {
            console.error('Erro:', err);
            } finally {
            // Sempre desative o loading no final, caso tenha sido ativado
            if (!isBackgroundUpdate) {
                setLoadingNotificacoes(false);
            }
            }
    };

    const marcarComoLida = async (id) => {
        const { error } = await supabase
            .from('notificacoes_admin')
            .update({ lido: true })
            .eq('id', id);

        if (!error) {
            setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lido: true } : n));
        }
    };

    const marcarTodasComoLidas = async () => {
        const { error } = await supabase
            .from('notificacoes_admin')
            .update({ lido: true })
            .eq('lido', false);

        if (!error) {
            setNotificacoes(prev => prev.map(n => ({ ...n, lido: true })));
        }
    };

    // Abrir modal com votos do lance
    const abrirModalVotos = async (notif) => {
        setLoadingVotos(true);
        try {
            // Buscar versão mais recente do lance
            const { data: lanceAtualizado, error } = await supabase
                .from('notificacoes_admin')
                .select('id, dados')
                .eq('id', notif.id)
                .single();
            
            if (error) {
                console.error('Erro ao buscar lance:', error);
                alert('Erro ao carregar informações do lance');
                return;
            }
            
            const dados = lanceAtualizado?.dados || {};
            setLanceVotosModal({
                lanceId: notif.id,
                codigoLance: dados.codigoLance || 'N/A',
                dados: dados,
                votos: dados.votos || [],
                veredito: dados.veredito || null,
                status: dados.status || 'aguardando_analise'
            });
        } catch (err) {
            console.error('Erro:', err);
            alert('Erro ao carregar informações do lance');
        } finally {
            setLoadingVotos(false);
        }
    };

    // Fechar modal de votos
    const fecharModalVotos = () => {
        setLanceVotosModal(null);
    };

    const excluirNotificacao = async (id, codigoLance) => {
        // Solicita senha para excluir
        const senhaDigitada = prompt(`⚠️ ATENÇÃO: Você está prestes a EXCLUIR o lance ${codigoLance || ''}.\n\nEsta ação é IRREVERSÍVEL!\n\nDigite a senha de administrador para confirmar:`);
        
        if (!senhaDigitada) return; // Cancelou
        
        if (senhaDigitada !== realPassword) {
            alert('❌ Senha incorreta! Exclusão cancelada.');
            return;
        }
        
        const { error } = await supabase
            .from('notificacoes_admin')
            .delete()
            .eq('id', id);

        if (!error) {
            setNotificacoes(prev => prev.filter(n => n.id !== id));
            alert('✅ Lance excluído com sucesso!');
        } else {
            alert('❌ Erro ao excluir o lance.');
        }
    };

    // ===== SELECIONAR/DESSELECIONAR NOTIFICAÇÕES =====
    const toggleSelectNotificacao = (notifId) => {
        setSelectedNotificacoes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(notifId)) {
                newSet.delete(notifId);
            } else {
                newSet.add(notifId);
            }
            return newSet;
        });
    };

    const selectAllNotificacoes = () => {
        setSelectedNotificacoes(new Set(notificacoesFiltradas.map(n => n.id)));
    };

    const deselectAllNotificacoes = () => {
        setSelectedNotificacoes(new Set());
    };

    // ===== APAGAR NOTIFICAÇÕES SELECIONADAS =====
    const apagarNotificacoesSelecionadas = async () => {
        if (selectedNotificacoes.size === 0) {
            alert('⚠️ Nenhuma notificação selecionada para apagar.');
            return;
        }

        const confirmMessage = `⚠️ ATENÇÃO: APAGAR NOTIFICAÇÕES\n\nVocê está prestes a apagar ${selectedNotificacoes.size} notificação(ões).\n\nEsta ação não pode ser desfeita!\n\nDeseja continuar?`;
        if (!window.confirm(confirmMessage)) return;

        try {
            const idsArray = Array.from(selectedNotificacoes);
            const { error } = await supabase
                .from('notificacoes_admin')
                .delete()
                .in('id', idsArray);

            if (error) throw error;

            // Remover das notificações locais
            setNotificacoes(prev => prev.filter(n => !selectedNotificacoes.has(n.id)));
            
            // Limpar seleção
            setSelectedNotificacoes(new Set());

            alert(`✅ ${idsArray.length} notificação(ões) apagada(s) com sucesso!`);
        } catch (err) {
            console.error('Erro ao apagar notificações:', err);
            alert('❌ Erro ao apagar notificações: ' + err.message);
        }
    };

    // ===== ENVIAR PARA JÚRI =====
    const enviarParaJuri = async (notifId, dados) => {
        if (!window.confirm(`Confirmar envio do lance ${dados.codigoLance} para análise do Júri?`)) return;
        
        try {
            const dadosAtualizados = {
                ...dados,
                status: 'aguardando_analise',
                enviadoParaJuri: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('notificacoes_admin')
                .update({ dados: dadosAtualizados })
                .eq('id', notifId);
            
            if (error) throw error;
            
            // Atualiza localmente
            setNotificacoes(prev => prev.map(n => 
                n.id === notifId ? { ...n, dados: dadosAtualizados } : n
            ));
            
            try {
                // Notificações para jurados foram removidas - apenas ADM recebe notificações
                alert(`✅ Lance ${dados.codigoLance} enviado para o Júri!`);
            } catch (err) {
                console.error('⚠️ Erro ao enviar para júri:', err);
                alert(`⚠️ Lance ${dados.codigoLance} enviado para o Júri, mas houve erro.`);
            }
            
        } catch (err) {
            console.error('Erro ao enviar para júri:', err);
            alert('❌ Erro ao enviar para o Júri: ' + err.message);
        }
    };

    // ===== ANULAR SOLICITAÇÃO (link incorreto, sem visibilidade ou outro problema) =====
    const anularSolicitacao = async (notifId, dados, motivoAnulacao) => {
        if (!motivoAnulacao || !motivoAnulacao.trim()) {
            alert('⚠️ Informe o motivo da anulação.');
            return;
        }
        try {
            const dadosAtualizados = {
                ...dados,
                status: 'solicitacao_anulada',
                motivoAnulacao: motivoAnulacao.trim(),
                dataAnulacao: new Date().toISOString()
            };
            const { error } = await supabase
                .from('notificacoes_admin')
                .update({ dados: dadosAtualizados })
                .eq('id', notifId);
            if (error) throw error;
            setNotificacoes(prev => prev.map(n =>
                n.id === notifId ? { ...n, dados: dadosAtualizados } : n
            ));
            setAnulacaoModal(null);
            setMotivoAnulacaoInput('');
            alert(`✅ Solicitação ${dados.codigoLance || ''} anulada.`);
        } catch (err) {
            console.error('Erro ao anular solicitação:', err);
            alert('❌ Erro ao anular: ' + err.message);
        }
    };

    // Filtra notificações baseado nos filtros selecionados
    const notificacoesFiltradas = notificacoes.filter(n => {
        // Filtro de leitura
        if (filtroNotificacao === 'nao_lidas' && n.lido) return false;
        if (filtroNotificacao === 'lidas' && !n.lido) return false;
        
        // Filtro de status
        if (filtroStatus !== 'todos') {
            const status = n.dados?.status || 'aguardando_defesa';
            if (status !== filtroStatus) return false;
        }
        
        return true;
    });

    // Limpar seleção quando as notificações filtradas mudarem (remover IDs que não estão mais visíveis)
    useEffect(() => {
        const filtered = notificacoes.filter(n => {
            if (filtroNotificacao === 'nao_lidas' && n.lido) return false;
            if (filtroNotificacao === 'lidas' && !n.lido) return false;
            if (filtroStatus !== 'todos') {
                const status = n.dados?.status || 'aguardando_defesa';
                if (status !== filtroStatus) return false;
            }
            return true;
        });
        const filteredIds = new Set(filtered.map(n => n.id));
        setSelectedNotificacoes(prev => {
            const newSet = new Set();
            prev.forEach(id => {
                if (filteredIds.has(id)) {
                    newSet.add(id);
                }
            });
            return newSet;
        });
    }, [notificacoes, filtroNotificacao, filtroStatus]);

    useEffect(() => {
        flushPendingJuradoNotifications();
        const intervalId = setInterval(() => {
            flushPendingJuradoNotifications();
        }, 10 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, []);

    // Conta não lidas para badge
    const countNaoLidas = notificacoes.filter(n => !n.lido).length;
    
    // Conta por status para badges
    const countPorStatus = {
        aguardando_defesa: notificacoes.filter(n => (n.dados?.status || 'aguardando_defesa') === 'aguardando_defesa').length,
        aguardando_analise: notificacoes.filter(n => n.dados?.status === 'aguardando_analise').length,
        analise_realizada: notificacoes.filter(n => n.dados?.status === 'analise_realizada').length,
        solicitacao_anulada: notificacoes.filter(n => n.dados?.status === 'solicitacao_anulada').length,
    };

    const handleApprove = async (userId, nome) => {
        // Buscar dados completos do usuário - tentar primeiro 'pilotos', depois 'profiles'
        let userData = null;
        let tableName = 'pilotos';
        
        const { data: pilotosData, error: pilotosError } = await supabase
            .from('pilotos')
            .select('email, whatsapp, nome, status')
            .eq('id', userId)
            .single();
        
        if (!pilotosError && pilotosData) {
            userData = pilotosData;
            tableName = 'pilotos';
        } else {
            // Fallback para 'profiles'
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('email, whatsapp, nome_piloto, status')
                .eq('id', userId)
                .single();
            
            if (!profilesError && profilesData) {
                userData = profilesData;
                tableName = 'profiles';
            }
        }
        
        if (!userData) {
            alert('❌ Erro ao buscar dados do usuário. Tente novamente.');
            return;
        }
        
        const email = userData.email;
        const whatsapp = userData.whatsapp;
        const nomePiloto = userData.nome || userData.nome_piloto || nome;
        
        if (!window.confirm(`Aprovar acesso de ${nomePiloto}?\n\nUma notificação será enviada no WhatsApp com as instruções de login.`)) return;
        
        try {
            // Atualizar status para 'ativo' (pilotos) ou 'active' (profiles)
            const statusValue = tableName === 'pilotos' ? 'ativo' : 'active';
            const { error } = await supabase
                .from(tableName)
                .update({ status: statusValue })
                .eq('id', userId);
            
            if (error) {
                throw new Error(error.message);
            }
            
            // Enviar notificação WhatsApp se tiver WhatsApp cadastrado
            if (whatsapp && whatsapp !== '-') {
                try {
                    await enviarNotificacaoAprovacao(email, nomePiloto, whatsapp, false);
                    alert('✅ Piloto aprovado! Notificação WhatsApp enviada com sucesso.');
                } catch (notifError) {
                    console.error('Erro ao enviar WhatsApp:', notifError);
                    alert('⚠️ Piloto aprovado, mas houve erro ao enviar notificação WhatsApp: ' + notifError.message);
                }
            } else {
                alert('✅ Piloto aprovado! (WhatsApp não cadastrado, notificação não enviada)');
            }
            
            await fetchAllUsers();
        } catch (err) {
            console.error('Erro ao aprovar piloto:', err);
            alert('❌ Erro ao aprovar: ' + err.message);
        }
    };

    const handleReset = async (userId, nome) => {
        if (!window.confirm(`ATENÇÃO: Resetar cadastro de ${nome}?`)) return;
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (!error) { alert('Resetado!'); fetchAllUsers(); }
    };

    // Remover piloto completamente do cadastro
    const handleDeletePiloto = async (userId, nome, tableName) => {
        if (!window.confirm(`⚠️ ATENÇÃO: Remover piloto ${nome} permanentemente?\n\nEsta ação não pode ser desfeita. O piloto será removido do sistema.`)) return;
        
        try {
            // Verificar se há sessão do Supabase (necessário para RLS)
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                alert('⚠️ Você precisa estar autenticado no Supabase para deletar pilotos.\n\nPor favor, faça login no site primeiro e depois tente novamente.');
                return;
            }
            // Verificar se há relacionamentos (acusações, defesas, etc.)
            if (tableName === 'pilotos') {
                const { data: acusacoes, error: acusacoesError } = await supabase
                    .from('acusacoes')
                    .select('id')
                    .or(`piloto_acusador_id.eq.${userId},piloto_acusado_id.eq.${userId}`)
                    .limit(1);
                
                const { data: defesas, error: defesasError } = await supabase
                    .from('defesas')
                    .select('id')
                    .eq('piloto_acusado_id', userId)
                    .limit(1);
                
                const { data: verdicts, error: verdictsError } = await supabase
                    .from('verdicts')
                    .select('id')
                    .eq('steward_id', userId)
                    .limit(1);
                
                if ((acusacoes && acusacoes.length > 0) || (defesas && defesas.length > 0) || (verdicts && verdicts.length > 0)) {
                    const relacionamentos = [];
                    if (acusacoes && acusacoes.length > 0) relacionamentos.push('acusações');
                    if (defesas && defesas.length > 0) relacionamentos.push('defesas');
                    if (verdicts && verdicts.length > 0) relacionamentos.push('vereditos');
                    
                    if (!window.confirm(`⚠️ Este piloto possui ${relacionamentos.join(', ')} relacionadas.\n\nPara deletar, é necessário primeiro remover ou atualizar esses registros.\n\nDeseja continuar mesmo assim? (A operação pode falhar se houver foreign keys sem CASCADE)`)) {
                        return;
                    }
                }
            }
            
            // Remover da tabela principal (pilotos ou profiles)
            // A sessão já foi verificada no início da função
            const { error: mainError, data: deleteData } = await supabase
                .from(tableName)
                .delete()
                .eq('id', userId)
                .select();
            
            if (mainError) {
                // Verificar se é erro de RLS
                if (mainError.message.includes('RLS') || mainError.message.includes('policy') || mainError.message.includes('permission')) {
                    throw new Error(`Erro de permissão (RLS): Você não tem permissão para deletar este registro. Verifique as políticas de Row Level Security no Supabase. É necessário criar uma política DELETE para a tabela ${tableName}.`);
                }
                // Verificar se é erro de foreign key
                if (mainError.message.includes('foreign key') || mainError.message.includes('constraint') || mainError.message.includes('violates')) {
                    throw new Error(`Não é possível deletar este piloto porque ele possui relacionamentos em outras tabelas (acusações, defesas, vereditos, etc.). É necessário primeiro remover ou atualizar esses registros, ou configurar ON DELETE CASCADE nas foreign keys.`);
                }
                throw new Error(mainError.message);
            }
            
            // Verificar se realmente deletou
            if (!deleteData || deleteData.length === 0) {
                throw new Error('Nenhum registro foi deletado. Verifique se o ID está correto ou se há problemas de permissão (RLS).');
            }

            // Se removeu de 'pilotos', também tentar remover de 'profiles' se existir
            if (tableName === 'pilotos') {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', userId);
                
                // Não tratar erro de profiles como crítico (pode não existir)
                if (profileError) {
                    console.warn('Aviso: Não foi possível remover de profiles:', profileError);
                }
            }

            alert(`✅ Piloto ${nome} removido com sucesso!`);
            await fetchAllUsers();
        } catch (err) {
            console.error('Erro ao remover piloto:', err);
            alert('❌ Erro ao remover piloto:\n\n' + err.message + '\n\nVerifique o console para mais detalhes.');
        }
    };

    // ===== FUNÇÕES PARA EX-PILOTOS E APROVAÇÕES =====
    // Função auxiliar para enviar notificação WhatsApp
    const enviarNotificacaoAprovacao = async (email, nome, whatsapp, isExPiloto = false) => {
        // URL do site
        const siteUrl = PRODUCTION_SITE_URL;
        const loginUrl = isExPiloto ? `${siteUrl}/ex-piloto/login` : `${siteUrl}/login`;

        // Mensagem diferente para pilotos ativos vs ex-pilotos
        const mensagem = isExPiloto 
            ? `✅ *ACESSO LIBERADO - MASTER LEAGUE F1*\n\nOlá ${nome},\n\nSeu acesso ao Painel do Piloto foi *APROVADO*!\n\n📋 *CADASTRE SUA SENHA E ACESSE:*\n\n🔗 Link direto: ${loginUrl}\n\n📝 *Passos:*\n\n1️⃣ Clique no link acima\n\n2️⃣ Digite seu e-mail:\n   ${email}\n\n3️⃣ Valide seu WhatsApp com o código que será enviado\n\n4️⃣ Crie sua senha de acesso\n\n5️⃣ Pronto! Você terá acesso ao seu painel histórico\n\n🏎️ Reveja a sua história na Master League F1`
            : `✅ *ACESSO APROVADO - MASTER LEAGUE F1*\n\nOlá ${nome},\n\nSeu cadastro foi *APROVADO* pela administração!\n\n🎉 *AGORA VOCÊ PODE ACESSAR SEU PAINEL:*\n\n🔗 Link direto: ${loginUrl}\n\n📝 *Como fazer login:*\n\n1️⃣ Clique no link acima\n\n2️⃣ Escolha:\n   • Entrar com Google\n   • Entrar com Microsoft (Hotmail/Outlook)\n\n3️⃣ Use seu e-mail:\n   ${email}\n\n4️⃣ Valide seu WhatsApp com o código que será enviado\n\n5️⃣ Pronto! Você terá acesso ao seu painel\n\n🏎️ Bem-vindo à Master League F1!`;
        
        // Usar a Edge Function para enviar WhatsApp
        const whatsappLimpo = whatsapp.replace(/\D/g, '');
        if (whatsappLimpo.length < 10) {
            throw new Error('WhatsApp inválido');
        }

        const { data, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-code', {
            body: {
                email: email,
                whatsapp: whatsappLimpo,
                nomePiloto: nome,
                tipo: 'notificacao_aprovacao',
                mensagemCustomizada: mensagem
            }
        });
        
        if (whatsappError) {
            throw new Error(whatsappError.message || 'Erro ao enviar WhatsApp');
        }
        
        return data;
    };

    // Aprovar ex-piloto e enviar notificação WhatsApp
    const handleAprovarExPiloto = async (pilotoId, email, nome, whatsapp) => {
        if (!window.confirm(`Aprovar acesso do ex-piloto ${nome}?\n\nUma notificação será enviada no WhatsApp com as instruções de login.`)) return;
        
        try {
            // Atualizar status para 'ativo' (mantém tipo_piloto como 'ex-piloto')
            const { error: updateError } = await supabase
                .from('pilotos')
                .update({ status: 'ativo' })
                .eq('id', pilotoId);
            
            if (updateError) {
                throw new Error(updateError.message);
            }

            // Enviar notificação
            try {
                await enviarNotificacaoAprovacao(email, nome, whatsapp, true);
                alert('✅ Ex-piloto aprovado! Notificação WhatsApp enviada com sucesso.');
            } catch (notifError) {
                console.error('Erro ao enviar WhatsApp:', notifError);
                alert('⚠️ Ex-piloto aprovado, mas houve erro ao enviar notificação WhatsApp: ' + notifError.message);
            }

            await fetchAllUsers();
        } catch (err) {
            console.error('Erro ao aprovar ex-piloto:', err);
            alert('❌ Erro ao aprovar: ' + err.message);
        }
    };

    // Reenviar notificação de aprovação (para ex-pilotos já aprovados)
    const handleReenviarNotificacao = async (email, nome, whatsapp, isExPiloto = true) => {
        if (!window.confirm(`Reenviar notificação de aprovação para ${nome}?\n\nUma nova mensagem será enviada no WhatsApp.`)) return;
        
        try {
            await enviarNotificacaoAprovacao(email, nome, whatsapp, isExPiloto);
            alert('✅ Notificação reenviada com sucesso!');
        } catch (err) {
            console.error('Erro ao reenviar notificação:', err);
            alert('❌ Erro ao reenviar notificação: ' + err.message);
        }
    };

    // Cadastrar novo piloto
    const handleCadastrarPiloto = async () => {
        // Validações
        if (!novoPiloto.nome.trim()) {
            alert('❌ Por favor, preencha o nome do piloto.');
            return;
        }
        if (!novoPiloto.email.trim()) {
            alert('❌ Por favor, preencha o email do piloto.');
            return;
        }
        if (!novoPiloto.email.includes('@')) {
            alert('❌ Por favor, insira um email válido.');
            return;
        }

        setSalvandoPiloto(true);
        try {
            // Formatar nome: primeira letra de cada palavra maiúscula, demais minúsculas
            const nomeFormatado = capitalizeWords(novoPiloto.nome.trim());
            
            const dadosPiloto = {
                nome: nomeFormatado,
                email: novoPiloto.email.trim().toLowerCase(),
                whatsapp: novoPiloto.whatsapp.trim() || null,
                grid: novoPiloto.grid,
                equipe: novoPiloto.equipe.trim() || null,
                gamertag: novoPiloto.gamertag.trim() || null,
                tipo_piloto: novoPiloto.tipo_piloto === 'ex-piloto' ? 'ex-piloto' : null,
                status: novoPiloto.tipo_piloto === 'ex-piloto' ? 'pendente' : 'ativo',
                is_steward: false
            };

            const { data, error } = await supabase
                .from('pilotos')
                .insert(dadosPiloto)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // Violação de constraint única
                    alert('❌ Este email já está cadastrado no sistema.');
                } else {
                    throw error;
                }
                return;
            }

            alert(`✅ Piloto cadastrado com sucesso!\n\n${novoPiloto.tipo_piloto === 'ex-piloto' ? 'Status: PENDENTE (aguardando aprovação)' : 'Status: ATIVO'}`);
            
            // Limpar formulário e fechar modal
            setNovoPiloto({
                tipo_piloto: 'ativo',
                nome: '',
                email: '',
                whatsapp: '',
                grid: 'light',
                equipe: '',
                gamertag: ''
            });
            setShowCadastroPiloto(false);
            
            // Atualizar lista
            await fetchAllUsers();
        } catch (err) {
            console.error('Erro ao cadastrar piloto:', err);
            alert('❌ Erro ao cadastrar: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setSalvandoPiloto(false);
        }
    };

    // Resetar senha de ex-piloto
    const handleResetarSenhaExPiloto = async (pilotoId, email, nome) => {
        if (!window.confirm(`ATENÇÃO: Resetar senha do ex-piloto ${nome}?\n\nO piloto precisará criar uma nova senha no próximo login.`)) return;
        
        try {
            const { error } = await supabase
                .from('pilotos')
                .update({ senha_hash: null })
                .eq('id', pilotoId);
            
            if (error) {
                throw new Error(error.message);
            }

            alert('✅ Senha resetada! O piloto precisará criar uma nova senha no próximo login.');
            await fetchAllUsers();
        } catch (err) {
            console.error('Erro ao resetar senha:', err);
            alert('❌ Erro ao resetar senha: ' + err.message);
        }
    };

    // ===== FUNÇÕES DE EDIÇÃO DE USUÁRIOS =====
    // Função para capitalizar apenas a primeira letra de cada palavra
    const capitalizeWords = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const handleEditUser = (user) => {
        setEditingUser({
            id: user.id,
            email_original: user.email || '', // Guardar email original para busca
            nome: user.nome_piloto || user.nome || '',
            email: user.email || '',
            cod_idml: (user.cod_idml || '').toString().trim().toUpperCase(),
            grid: user.grid_preferencia || user.grid || 'carreira',
            equipe: user.equipe || '',
            whatsapp: user.whatsapp || '',
            is_steward: user.is_steward || false,
            nome_completo: user.nome_completo || '',
            gamertag: user.gamertag || ''
        });
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        // Validações
        if (!editingUser.nome.trim()) {
            alert('⚠️ Informe o nome do piloto!');
            return;
        }
        if (!editingUser.email.trim()) {
            alert('⚠️ Informe o e-mail!');
            return;
        }
        if (!editingUser.email.includes('@')) {
            alert('⚠️ E-mail inválido!');
            return;
        }
        if (editingUser.whatsapp && editingUser.whatsapp.replace(/\D/g, '').length < 10) {
            alert('⚠️ WhatsApp inválido! Deve ter pelo menos 10 dígitos.');
            return;
        }
        const codIdmlInput = String(editingUser.cod_idml || '').trim().toUpperCase();
        const codIdmlPattern = /^MLF1-\d{4}$/;
        if (codIdmlInput && !codIdmlPattern.test(codIdmlInput)) {
            alert('⚠️ COD IDML inválido! Use o padrão MLF1-XXXX (4 dígitos), ex.: MLF1-0320.');
            return;
        }

        setSavingUser(true);
        try {
            console.log('💾 Salvando usuário:', editingUser);
            
            // Preparar dados para atualização na tabela 'pilotos'
            const dadosAtualizacao = {
                nome: capitalizeWords(editingUser.nome.trim()),
                email: editingUser.email.trim().toLowerCase(),
                cod_idml: codIdmlInput || null,
                grid: editingUser.grid,
                equipe: editingUser.equipe || null,
                whatsapp: editingUser.whatsapp || null,
                is_steward: editingUser.is_steward || false,
                updated_at: new Date().toISOString()
            };

            console.log('📝 Dados para atualização:', dadosAtualizacao);

            // Verificar se o registro existe antes de atualizar
            let registroExiste = false;
            let registroAtual = null;
            
            if (editingUser.id) {
                console.log('🔍 Verificando se registro existe por ID:', editingUser.id);
                const { data: checkData, error: checkError } = await supabase
                    .from('pilotos')
                    .select('*')
                    .eq('id', editingUser.id)
                    .single();
                
                if (!checkError && checkData) {
                    registroExiste = true;
                    registroAtual = checkData;
                    console.log('✅ Registro encontrado por ID:', registroAtual);
                } else {
                    console.warn('⚠️ Registro não encontrado por ID:', checkError);
                }
            }
            
            // Se não encontrou por ID, tentar por email
            if (!registroExiste) {
                const emailParaBusca = editingUser.email_original || editingUser.email;
                if (emailParaBusca) {
                    console.log('🔍 Verificando se registro existe por email:', emailParaBusca);
                    const { data: checkData, error: checkError } = await supabase
                        .from('pilotos')
                        .select('*')
                        .eq('email', emailParaBusca.toLowerCase().trim())
                        .single();
                    
                    if (!checkError && checkData) {
                        registroExiste = true;
                        registroAtual = checkData;
                        console.log('✅ Registro encontrado por email:', registroAtual);
                    } else {
                        console.warn('⚠️ Registro não encontrado por email:', checkError);
                    }
                }
            }
            
            // Se o registro não existe, criar um novo
            if (!registroExiste) {
                console.log('📝 Registro não encontrado. Criando novo registro na tabela pilotos...');
                const { data: newData, error: insertError } = await supabase
                    .from('pilotos')
                    .insert(dadosAtualizacao)
                    .select()
                    .single();
                
                if (insertError) {
                    console.error('❌ Erro ao criar novo registro:', insertError);
                    throw new Error(`Erro ao criar novo registro: ${insertError.message}`);
                } else {
                    console.log('✅ Novo registro criado com sucesso:', newData);
                    alert('✅ Novo piloto criado com sucesso no Supabase!');
                    setEditingUser(null);
                    await fetchAllUsers();
                    return;
                }
            }
            
            // Atualizar na tabela 'pilotos' usando ID (se disponível) ou email
            let pilotosError = null;
            let pilotosSuccess = false;
            
            if (registroAtual?.id) {
                console.log('🔍 Tentando atualizar pilotos por ID:', registroAtual.id);
                const { data, error } = await supabase
                    .from('pilotos')
                    .update(dadosAtualizacao)
                    .eq('id', registroAtual.id)
                    .select();
                
                pilotosError = error;
                pilotosSuccess = !error && data && data.length > 0;
                
                if (pilotosError) {
                    console.error('❌ Erro ao atualizar pilotos por ID:', pilotosError);
                    // Se erro de RLS, mostrar mensagem mais clara
                    if (pilotosError.code === 'PGRST301' || pilotosError.message?.includes('permission') || pilotosError.message?.includes('policy')) {
                        throw new Error(`Erro de permissão (RLS): Você não tem permissão para atualizar este registro. Verifique as políticas de Row Level Security no Supabase.`);
                    }
                } else if (pilotosSuccess) {
                    console.log('✅ Piloto atualizado na tabela pilotos por ID:', data);
                } else {
                    console.warn('⚠️ Nenhuma linha atualizada na tabela pilotos por ID');
                }
            }
            
            // Se não tem ID ou falhou, tentar por email
            if (!pilotosSuccess && registroAtual?.email) {
                console.log('🔍 Tentando atualizar pilotos por email:', registroAtual.email);
                const { data, error } = await supabase
                    .from('pilotos')
                    .update(dadosAtualizacao)
                    .eq('email', registroAtual.email.toLowerCase().trim())
                    .select();
                
                pilotosError = error;
                pilotosSuccess = !error && data && data.length > 0;
                
                if (pilotosError) {
                    console.error('❌ Erro ao atualizar pilotos por email:', pilotosError);
                    // Se erro de RLS, mostrar mensagem mais clara
                    if (pilotosError.code === 'PGRST301' || pilotosError.message?.includes('permission') || pilotosError.message?.includes('policy')) {
                        throw new Error(`Erro de permissão (RLS): Você não tem permissão para atualizar este registro. Verifique as políticas de Row Level Security no Supabase.`);
                    }
                } else if (pilotosSuccess) {
                    console.log('✅ Piloto atualizado na tabela pilotos por email:', data);
                } else {
                    console.warn('⚠️ Nenhuma linha atualizada na tabela pilotos por email');
                }
            }

            // Verificar se a atualização na tabela pilotos funcionou
            if (!pilotosSuccess) {
                const errorMsg = pilotosError?.message || 'Nenhuma linha foi atualizada na tabela pilotos. Verifique se o usuário existe no banco de dados ou se há problemas de permissão (RLS).';
                console.error('❌ Falha ao salvar na tabela pilotos:', { 
                    pilotosError, 
                    pilotosSuccess, 
                    editingUser,
                    dadosAtualizacao 
                });
                
                // Tentar verificar se o registro existe
                if (editingUser.id) {
                    const { data: checkData, error: checkError } = await supabase
                        .from('pilotos')
                        .select('id, email, nome')
                        .eq('id', editingUser.id)
                        .single();
                    
                    if (checkError || !checkData) {
                        console.error('❌ Registro não encontrado na tabela pilotos com ID:', editingUser.id);
                        throw new Error(`Registro não encontrado na tabela pilotos. O piloto pode não existir ou ter sido removido.`);
                    } else {
                        console.log('✅ Registro encontrado:', checkData);
                        throw new Error(`Não foi possível atualizar o registro. Verifique as permissões (RLS) ou se os dados estão corretos. Erro: ${errorMsg}`);
                    }
                } else {
                    throw new Error(errorMsg);
                }
            }

            // Se a atualização funcionou, mostrar sucesso
            console.log('✅ Piloto atualizado na tabela pilotos com sucesso!');
            
            // NOTA: Sincronização com Google Sheets
            // Para atualizar a planilha Google Sheets, seria necessário:
            // 1. Autenticação OAuth com Google Sheets API
            // 2. Encontrar a linha correspondente na planilha pelo email
            // 3. Atualizar os campos correspondentes
            // Por enquanto, a atualização é feita apenas no Supabase
            // A planilha pode ser sincronizada manualmente ou via script separado

            alert('✅ Usuário atualizado com sucesso no Supabase!');
            setEditingUser(null);
            await fetchAllUsers();
        } catch (err) {
            console.error('❌ Erro ao salvar usuário:', err);
            alert('❌ Erro ao salvar: ' + err.message);
        } finally {
            setSavingUser(false);
        }
    };

    if (loading) return <div style={{padding:'100px', textAlign:'center', color:'white'}}>Carregando...</div>;

    // TELA DE BLOQUEIO
    if (!isAuthenticated) {
        return (
            <div className="page-wrapper">
                <div style={{
                    maxWidth: isMobile ? '90%' : '400px', 
                    margin: isMobile ? '50px auto' : '100px auto', 
                    background:'#1E293B', 
                    padding: isMobile ? '30px 20px' : '40px', 
                    borderRadius:'16px', 
                    textAlign:'center', 
                    border:'1px solid #FFD700'
                }}>
                    <h1 style={{color:'#FFD700', marginBottom:'20px', fontSize: isMobile ? '1.5rem' : '2rem'}}>ÁREA RESTRITA</h1>
                    <form onSubmit={handleLogin}>
                        <input 
                            type="password" 
                            placeholder="Senha de Administrador" 
                            value={passwordInput} 
                            onChange={e => setPasswordInput(e.target.value)}
                            style={{
                                width:'100%', 
                                padding: isMobile ? '14px' : '12px', 
                                marginBottom:'20px', 
                                borderRadius:'8px', 
                                border:'none', 
                                background:'#0F172A', 
                                color:'white',
                                fontSize: isMobile ? '16px' : 'inherit' // Evita zoom no iOS
                            }}
                        />
                        
                        {/* CHECKBOX MANTER CONECTADO */}
                        <div style={{
                            display:'flex', 
                            alignItems:'center', 
                            gap:'10px', 
                            marginBottom:'20px', 
                            justifyContent:'flex-start'
                        }}>
                            <input 
                                type="checkbox" 
                                id="keepLogged" 
                                checked={keepConnected} 
                                onChange={e => setKeepConnected(e.target.checked)}
                                style={{
                                    width:'auto', 
                                    cursor:'pointer',
                                    width: isMobile ? '20px' : 'auto',
                                    height: isMobile ? '20px' : 'auto'
                                }}
                            />
                            <label htmlFor="keepLogged" style={{
                                color:'#CBD5E1', 
                                fontSize: isMobile ? '0.95rem' : '0.9rem', 
                                cursor:'pointer', 
                                userSelect:'none'
                            }}>Manter conectado</label>
                        </div>

                        <button className="btn-primary" style={{
                            width:'100%', 
                            background:'#FFD700', 
                            color:'#020617',
                            padding: isMobile ? '14px' : '12px',
                            fontSize: isMobile ? '1rem' : 'inherit'
                        }}>ENTRAR</button>
                    </form>
                </div>
            </div>
        );
    }

    // PAINEL LOGADO
    return (
        <>
        <div className="page-wrapper">
            <div style={{
                maxWidth:'1200px', 
                margin: isMobile ? '20px auto' : '40px auto', 
                padding: isMobile ? '0 10px' : '0 20px'
            }}>
                
                <div style={{
                    display:'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent:'space-between', 
                    alignItems: isMobile ? 'flex-start' : 'center', 
                    marginBottom: isMobile ? '20px' : '30px', 
                    borderBottom:'1px solid rgba(255,255,255,0.1)', 
                    paddingBottom: isMobile ? '15px' : '20px',
                    gap: isMobile ? '15px' : '0'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: isMobile ? '1.5rem' : '2rem', 
                            fontWeight:'900', 
                            color:'#FFD700', 
                            fontStyle:'italic', 
                            margin:0
                        }}>PAINEL <span style={{color:'white'}}>ADM</span></h1>
                    </div>
                    <div style={{
                        display:'flex', 
                        gap: isMobile ? '8px' : '10px', 
                        flexWrap:'wrap',
                        width: isMobile ? '100%' : 'auto'
                    }}>
                        <button 
                            onClick={async () => {
                                if (window.confirm('Forçar sincronização de dados da planilha?\n\nIsso atualizará:\n- Classificação (Carreira e Light)\n- Nomes dos pilotos\n- Voltas rápidas\n\nA página será recarregada após a sincronização.')) {
                                    try {
                                        // Limpar cache local completamente
                                        clearLeagueDataCache();
                                        
                                        // Limpar cache do Supabase também (forçar atualização)
                                        try {
                                            // Invalidar cache do Supabase deletando e recriando
                                            const { error: deleteError } = await supabase
                                                .from('classificacao_cache')
                                                .delete()
                                                .in('grid', ['carreira', 'light']);
                                            
                                            if (deleteError) {
                                                console.warn('Aviso ao limpar cache do Supabase:', deleteError);
                                            }
                                        } catch (e) {
                                            console.warn('Erro ao limpar cache do Supabase:', e);
                                        }
                                        
                                        // Limpar localStorage completamente
                                        Object.keys(localStorage).forEach(key => {
                                            if (key.includes('cache') || key.includes('league') || key.includes('carreira') || key.includes('light')) {
                                                localStorage.removeItem(key);
                                            }
                                        });
                                        
                                        // Forçar sincronização do Supabase.
                                        // A Edge Function `sync-google-sheets` usa internamente a
                                        // service_role pra escrever no banco, então o caller só
                                        // precisa de UM JWT válido no Authorization. Se houver sessão
                                        // Supabase Auth ativa usamos o access_token; senão caímos
                                        // pra anon key (que também é JWT válido). Assim o login
                                        // local do Admin (senha 1234) basta pra acionar a sync.
                                        const supabaseUrl = 'https://ueqfmjwdijaeawvxhdtp.supabase.co';
                                        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEzOTEsImV4cCI6MjA4MDA5NzM5MX0.b-y_prO5ffMuSOs7rUvrMru4SDN06BHqyMsbUIDDdJI';
                                        let authToken = supabaseAnonKey;
                                        try {
                                            const { data: { session } } = await supabase.auth.getSession();
                                            if (session?.access_token) authToken = session.access_token;
                                        } catch (e) {
                                            console.warn('getSession falhou, seguindo com anon key:', e);
                                        }

                                        const response = await fetch(`${supabaseUrl}/functions/v1/sync-google-sheets`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${authToken}`,
                                                'apikey': supabaseAnonKey,
                                            },
                                            body: JSON.stringify({
                                                sheetType: 'classificacao',
                                                force: true,
                                                season: 20
                                            })
                                        });

                                        if (response.ok) {
                                            alert('✅ Sincronização iniciada! Limpando cache e recarregando página em 3 segundos...\n\n⚠️ Se o nome ainda não atualizar, pressione Ctrl+Shift+R (ou Cmd+Shift+R no Mac) para limpar o cache do navegador.');
                                            setTimeout(() => {
                                                // Forçar reload sem cache
                                                window.location.reload(true);
                                            }, 3000);
                                        } else {
                                            const errorText = await response.text();
                                            console.error('Erro na sincronização:', errorText);
                                            alert(`⚠️ Erro ao sincronizar (HTTP ${response.status}). Recarregando página mesmo assim...\n\nPressione Ctrl+Shift+R para forçar atualização.`);
                                            setTimeout(() => window.location.reload(true), 1000);
                                        }
                                    } catch (error) {
                                        console.error('Erro ao sincronizar:', error);
                                        alert('⚠️ Erro ao sincronizar. Recarregando página...');
                                        setTimeout(() => window.location.reload(), 1000);
                                    }
                                }
                            }}
                            className="btn-outline" 
                            style={{
                                fontSize: isMobile ? '0.75rem' : '0.8rem', 
                                padding: isMobile ? '10px 12px' : '8px 20px',
                                borderColor:'#FF9900',
                                color:'#FF9900',
                                background:'rgba(255, 153, 0, 0.1)',
                                flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                minWidth: isMobile ? 'calc(50% - 4px)' : 'auto'
                            }}
                            title="Forçar atualização dos dados da planilha Google Sheets"
                        >
                            {isMobile ? '🔄' : '🔄 SINCRONIZAR'}
                        </button>
                        <button 
                            onClick={() => setShowChangePass(!showChangePass)} 
                            className="btn-outline" 
                            style={{
                                fontSize: isMobile ? '0.75rem' : '0.8rem', 
                                padding: isMobile ? '10px 12px' : '8px 20px',
                                flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                minWidth: isMobile ? 'calc(50% - 4px)' : 'auto'
                            }}
                        >
                            {isMobile ? '🔑' : 'SENHA'}
                        </button>
                        {/* Botão de Logout do ADMIN */}
                        <button 
                            onClick={handleLogoutAdmin} 
                            className="btn-outline" 
                            style={{
                                fontSize: isMobile ? '0.75rem' : '0.8rem', 
                                padding: isMobile ? '10px 12px' : '8px 20px', 
                                borderColor:'#EF4444', 
                                color:'#EF4444',
                                flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                minWidth: isMobile ? 'calc(50% - 4px)' : 'auto'
                            }}
                        >
                            {isMobile ? '🚪' : 'LOGOUT'}
                        </button>
                        <button 
                            onClick={() => navigate('/')} 
                            className="btn-outline" 
                            style={{
                                fontSize: isMobile ? '0.75rem' : '0.8rem', 
                                padding: isMobile ? '10px 12px' : '8px 20px',
                                flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                minWidth: isMobile ? 'calc(50% - 4px)' : 'auto'
                            }}
                        >
                            {isMobile ? '🏠' : 'VOLTAR SITE'}
                        </button>
                    </div>
                </div>

                {showChangePass && (
                    <div style={{
                        background:'rgba(255, 215, 0, 0.1)', 
                        padding: isMobile ? '15px' : '20px', 
                        borderRadius:'12px', 
                        marginBottom: isMobile ? '20px' : '30px', 
                        border:'1px solid #FFD700', 
                        display:'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems:'center', 
                        gap: isMobile ? '10px' : '15px'
                    }}>
                        <input 
                            type="text" 
                            placeholder="Nova senha..." 
                            value={newPass} 
                            onChange={e => setNewPass(e.target.value)} 
                            style={{
                                flex:1, 
                                width: isMobile ? '100%' : 'auto',
                                padding: isMobile ? '12px' : '10px', 
                                borderRadius:'6px', 
                                border:'1px solid rgba(255,255,255,0.2)', 
                                background:'#020617', 
                                color:'white',
                                fontSize: isMobile ? '16px' : 'inherit'
                            }} 
                        />
                        <button 
                            onClick={handleChangePassword} 
                            className="btn-primary" 
                            style={{
                                background:'#FFD700', 
                                color:'#020617',
                                width: isMobile ? '100%' : 'auto',
                                padding: isMobile ? '12px' : '10px 20px'
                            }}
                        >
                            SALVAR
                        </button>
                    </div>
                )}

                <div className="adm-tabs" style={{
                    display: isMobile ? 'grid' : 'flex',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'none',
                    gap: isMobile ? '8px' : '0',
                    overflowX: isMobile ? 'visible' : 'auto',
                    flexWrap: isMobile ? 'wrap' : 'nowrap'
                }}>
                    <button className={`adm-tab-btn ${activeTab === 'drivers' ? 'active' : ''}`} onClick={() => setActiveTabAndKeepScroll('drivers')}>DRIVERS</button>
                    <button className={`adm-tab-btn ${activeTab === 'stewards' ? 'active' : ''}`} onClick={() => setActiveTabAndKeepScroll('stewards')}>
                        STEWARDS
                        {countNaoLidas > 0 && (
                            <span style={{
                                marginLeft: '8px',
                                background: '#EF4444',
                                color: 'white',
                                borderRadius: '50%',
                                padding: '2px 8px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                            }}>
                                {countNaoLidas}
                            </span>
                        )}
                    </button>
                    <button className={`adm-tab-btn ${activeTab === 'jurados' ? 'active' : ''}`} onClick={() => setActiveTabAndKeepScroll('jurados')}>
                        👨‍⚖️ JÚRI
                    </button>
                    <button className={`adm-tab-btn ${activeTab === 'narradores' ? 'active' : ''}`} onClick={() => setActiveTabAndKeepScroll('narradores')}>
                        🎙️ NARRADORES
                    </button>
                    <button className={`adm-tab-btn ${activeTab === 'noticias' ? 'active' : ''}`} onClick={() => setActiveTabAndKeepScroll('noticias')}>
                        📰 NOTÍCIAS
                    </button>
                    <button className={`adm-tab-btn ${activeTab === 'power-ranking' ? 'active' : ''}`} onClick={() => setActiveTabAndKeepScroll('power-ranking')}>
                        📊 POWER RANKING
                    </button>
                    <button className={`adm-tab-btn ${activeTab === 'temporada' ? 'active' : ''}`} onClick={() => setActiveTabAndKeepScroll('temporada')}>
                        📅 TEMPORADA
                    </button>
                    <button className={`adm-tab-btn ${activeTab === 'inscricoes' ? 'active' : ''}`} onClick={() => setActiveTabAndKeepScroll('inscricoes')}>
                        🧾 INSCRIÇÕES
                    </button>
                    <button className={`adm-tab-btn ${activeTab === 'revisao-vereditos' ? 'active' : ''}`} onClick={() => setActiveTabAndKeepScroll('revisao-vereditos')}>
                        🔧 REVISÃO
                    </button>
                    <button 
                        className="adm-tab-btn"
                        onClick={() => navigate('/resultados-corrida')}
                        style={{
                            background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                            color: 'white',
                            border: 'none'
                        }}
                    >
                        🏁 RESULTADOS
                    </button>
                    <button 
                        className="adm-tab-btn"
                        onClick={() => navigate('/admin/draft-import')}
                        style={{
                            background: 'linear-gradient(135deg, #FFD700 0%, #FF6B35 100%)',
                            color: 'white',
                            border: 'none'
                        }}
                    >
                        📥 DRAFT
                    </button>
                    <button
                        className="adm-tab-btn"
                        onClick={() => navigate('/admin/top10-artes')}
                        style={{
                            background: 'linear-gradient(135deg, #7C2D12 0%, #F97316 100%)',
                            color: 'white',
                            border: 'none'
                        }}
                    >
                        🖼️ TOP 10
                    </button>
                    <button
                        className="adm-tab-btn"
                        onClick={() => navigate('/admin/vencedor-artes')}
                        style={{
                            background: 'linear-gradient(135deg, #991B1B 0%, #F59E0B 100%)',
                            color: 'white',
                            border: 'none'
                        }}
                    >
                        🏆 VENCEDOR
                    </button>
                    <button 
                        className="adm-tab-btn"
                        onClick={() => navigate('/admin/sync')}
                        style={{
                            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                            color: 'white',
                            border: 'none'
                        }}
                    >
                        🔄 SYNC
                    </button>
                </div>

                {activeTab === 'drivers' && (
                    <div className="adm-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#F8FAFC' }}>👥 Pilotos Cadastrados</h3>
                            <button 
                                onClick={() => {
                                    setNovoPiloto({
                                        tipo_piloto: 'ativo',
                                        nome: '',
                                        email: '',
                                        whatsapp: '',
                                        grid: 'light',
                                        equipe: '',
                                        gamertag: ''
                                    });
                                    setShowCadastroPiloto(true);
                                }}
                                style={{
                                    padding: '10px 20px',
                                    background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                                }}
                            >
                                ➕ Cadastrar Piloto
                            </button>
                        </div>
                        <div className="adm-list-header">
                            <div style={{flex:2}}>PILOTO / NOME</div>
                            <div style={{flex:1}}>EQUIPE</div>
                            <div style={{flex:1}}>GRID</div>
                            <div style={{width:'100px', textAlign:'center'}}>STATUS</div>
                            <div style={{width:'180px', textAlign:'right'}}>AÇÕES</div>
                        </div>

                        {usersList.length === 0 ? (
                            <div style={{padding:'40px', textAlign:'center', color:'#94A3B8'}}>Nenhum usuário.</div>
                        ) : (
                            <div className="adm-list-body">
                                {usersList.map(user => {
                                    // Adaptar para campos da tabela 'pilotos' ou 'profiles'
                                    const nome = user.nome || user.nome_piloto || 'Sem Nome';
                                    const email = user.email || '';
                                    const codIdml = (user.cod_idml || '').toString().trim().toUpperCase();
                                    const grid = user.grid || user.grid_preferencia || '-';
                                    const equipe = user.equipe || '-';
                                    const whatsapp = user.whatsapp || '-';
                                    const isSteward = user.is_steward || false;
                                    const isExPiloto = user.tipo_piloto === 'ex-piloto';
                                    const isInativoByStatus = String(user.status || '').toLowerCase() === 'inativo';
                                    const isInativo = isExPiloto || isInativoByStatus;
                                    // Para ex-pilotos, verificar se status é 'pendente'
                                    // Para 'profiles', verificar status 'pending'; para 'pilotos', verificar status 'pendente'
                                    const isPending = isExPiloto
                                        ? (user.status === 'pendente' || user.status === 'pending')
                                        : (user.status === 'pending' || (!user.status && user.nome_piloto));
                                    
                                    return (
                                        <div key={user.id} className="adm-row" style={{
                                            flexDirection: isMobile ? 'column' : 'row',
                                            alignItems: isMobile ? 'flex-start' : 'center',
                                            gap: isMobile ? '12px' : '0',
                                            padding: isMobile ? '15px' : undefined
                                        }}>
                                            <div style={{
                                                flex: isMobile ? 'none' : 2,
                                                width: isMobile ? '100%' : 'auto'
                                            }}>
                                                <div style={{
                                                    fontWeight:'800', 
                                                    color:'white', 
                                                    fontSize: isMobile ? '0.95rem' : '1rem'
                                                }}>{nome}</div>
                                                <div style={{
                                                    fontSize: isMobile ? '0.8rem' : '0.75rem', 
                                                    color:'#94A3B8',
                                                    wordBreak: 'break-word'
                                                }}>{email}</div>
                                                <div style={{
                                                    fontSize: isMobile ? '0.78rem' : '0.72rem',
                                                    color: codIdml ? '#67E8F9' : '#64748B',
                                                    fontFamily: 'monospace',
                                                    marginTop: '2px'
                                                }}>
                                                    COD IDML: {codIdml || 'NÃO CADASTRADO'}
                                                </div>
                                                {isSteward && <div style={{fontSize:'0.7rem', color:'#FFD700', marginTop:'2px'}}>👨‍⚖️ STEWARD</div>}
                                                {isInativo && <div style={{fontSize:'0.7rem', color:'#94A3B8', marginTop:'2px'}}>📜 EX-PILOTO</div>}
                                            </div>
                                            <div style={{
                                                flex: isMobile ? 'none' : 1, 
                                                fontSize: isMobile ? '0.85rem' : '0.9rem', 
                                                color:'#CBD5E1',
                                                width: isMobile ? '100%' : 'auto',
                                                display: isMobile ? 'flex' : 'block',
                                                justifyContent: isMobile ? 'space-between' : 'normal',
                                                alignItems: isMobile ? 'center' : 'normal'
                                            }}>
                                                {isMobile && <span style={{color:'#64748B', fontSize:'0.75rem'}}>Equipe:</span>}
                                                {equipe}
                                            </div>
                                            <div style={{
                                                flex: isMobile ? 'none' : 1, 
                                                fontSize: isMobile ? '0.8rem' : '0.8rem', 
                                                textTransform:'uppercase', 
                                                fontWeight:'700', 
                                                color:'var(--highlight-cyan)',
                                                width: isMobile ? '100%' : 'auto',
                                                display: isMobile ? 'flex' : 'block',
                                                justifyContent: isMobile ? 'space-between' : 'normal',
                                                alignItems: isMobile ? 'center' : 'normal'
                                            }}>
                                                {isMobile && <span style={{color:'#64748B', fontSize:'0.75rem'}}>Grid:</span>}
                                                {grid}
                                            </div>
                                            
                                            <div style={{
                                                width: isMobile ? '100%' : '100px', 
                                                textAlign: isMobile ? 'left' : 'center',
                                                display: isMobile ? 'flex' : 'block',
                                                justifyContent: isMobile ? 'space-between' : 'normal',
                                                alignItems: isMobile ? 'center' : 'normal'
                                            }}>
                                                {isMobile && <span style={{color:'#64748B', fontSize:'0.75rem'}}>Status:</span>}
                                                <span className={`status-badge ${
                                                    isPending ? 'pending' : 
                                                    (isInativo ? 'inactive' : 'active')
                                                }`}>
                                                    {isPending ? 'PENDENTE' : (isInativo ? 'INATIVO' : 'ATIVO')}
                                                </span>
                                            </div>

                                            <div className="adm-row-actions" style={{
                                                width: isMobile ? '100%' : 'auto',
                                                justifyContent: isMobile ? 'flex-start' : 'flex-end',
                                                gap: isMobile ? '8px' : '5px',
                                                flexWrap: isMobile ? 'wrap' : 'nowrap'
                                            }}>
                                                <button onClick={() => handleEditUser(user)} className="btn-icon-edit" title="Editar" style={{background:'rgba(59, 130, 246, 0.2)', border:'1px solid #3B82F6', color:'#3B82F6'}}>✏️</button>
                                                {isPending && isExPiloto && (
                                                    <button 
                                                        onClick={() => handleAprovarExPiloto(user.id, email, nome, whatsapp)} 
                                                        className="btn-icon-approve" 
                                                        title="Aprovar Ex-Piloto"
                                                        style={{background:'rgba(34, 197, 94, 0.2)', border:'1px solid #22C55E', color:'#22C55E'}}
                                                    >
                                                        ✅
                                                    </button>
                                                )}
                                                {isInativo && !isPending && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleReenviarNotificacao(email, nome, whatsapp)} 
                                                            className="btn-icon-approve" 
                                                            title="Reenviar Notificação"
                                                            style={{background:'rgba(59, 130, 246, 0.2)', border:'1px solid #3B82F6', color:'#3B82F6', marginRight:'5px'}}
                                                        >
                                                            📨
                                                        </button>
                                                        <button 
                                                            onClick={() => handleResetarSenhaExPiloto(user.id, email, nome)} 
                                                            className="btn-icon-reset" 
                                                            title="Resetar Senha"
                                                            style={{background:'rgba(245, 158, 11, 0.2)', border:'1px solid #F59E0B', color:'#F59E0B'}}
                                                        >
                                                            🔑
                                                        </button>
                                                    </>
                                                )}
                                                {!isExPiloto && isPending && (
                                                    <button onClick={() => handleApprove(user.id, nome)} className="btn-icon-approve" title="Aprovar">✅</button>
                                                )}
                                                {!isExPiloto && (
                                                    <button onClick={() => handleReset(user.id, nome)} className="btn-icon-reset" title="Resetar">🔄</button>
                                                )}
                                                {/* Botão de remover - disponível para todos */}
                                                <button 
                                                    onClick={() => {
                                                        // Determinar tabela: se tem tipo_piloto ou grid, é da tabela 'pilotos'
                                                        const tableName = (user.tipo_piloto !== undefined || user.grid) ? 'pilotos' : 'profiles';
                                                        handleDeletePiloto(user.id, nome, tableName);
                                                    }} 
                                                    className="btn-icon-delete" 
                                                    title="Remover Piloto"
                                                    style={{
                                                        background:'rgba(239, 68, 68, 0.2)', 
                                                        border:'1px solid #EF4444', 
                                                        color:'#EF4444',
                                                        marginLeft: '5px'
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'stewards' && (
                    <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                            <h3 style={{ margin: 0, color: '#F8FAFC' }}>
                                🚨 Notificações de Acusações
                                {countNaoLidas > 0 && (
                                    <span style={{ fontSize: '14px', color: '#94A3B8', marginLeft: '10px' }}>
                                        ({countNaoLidas} não lida{countNaoLidas > 1 ? 's' : ''})
                                    </span>
                                )}
                            </h3>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {/* Filtro de Status */}
                                <select
                                    value={filtroStatus}
                                    onChange={(e) => setFiltroStatus(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #475569',
                                        background: '#0F172A',
                                        color: '#F8FAFC',
                                        cursor: 'pointer',
                                        minWidth: '180px',
                                    }}
                                >
                                    <option value="todos">📊 Todos os Status</option>
                                    <option value="aguardando_defesa">⏳ Aguardando Defesa ({countPorStatus.aguardando_defesa})</option>
                                    <option value="aguardando_analise">🔍 Aguardando Análise ({countPorStatus.aguardando_analise})</option>
                                    <option value="analise_realizada">✅ Análise Realizada ({countPorStatus.analise_realizada})</option>
                                    <option value="solicitacao_anulada">🚫 Solicitação Anulada ({countPorStatus.solicitacao_anulada})</option>
                                </select>
                                
                                {/* Filtro de Leitura */}
                                <select
                                    value={filtroNotificacao}
                                    onChange={(e) => setFiltroNotificacao(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #475569',
                                        background: '#0F172A',
                                        color: '#F8FAFC',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <option value="todas">📬 Todas</option>
                                    <option value="nao_lidas">🔴 Não Lidas</option>
                                    <option value="lidas">✓ Lidas</option>
                                </select>
                                
                                <button
                                    type="button"
                                    onClick={() => fetchNotificacoes(false)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: '#3B82F6',
                                        color: 'white',
                                        cursor: 'pointer',
                                    }}
                                >
                                    🔄 Atualizar
                                </button>
                                
                                {countNaoLidas > 0 && (
                                    <button
                                        type="button"
                                        onClick={marcarTodasComoLidas}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: '#22C55E',
                                            color: 'white',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        ✓ Marcar todas como lidas
                                    </button>
                                )}

                                {/* Botões de Seleção Múltipla */}
                                {notificacoesFiltradas.length > 0 && (
                                    <>
                                        {selectedNotificacoes.size === 0 ? (
                                            <button
                                                type="button"
                                                onClick={selectAllNotificacoes}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    background: '#6366F1',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                ☑️ Selecionar Todas
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={deselectAllNotificacoes}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    background: '#64748B',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                ☐ Desselecionar Todas
                                            </button>
                                        )}
                                        
                                        {selectedNotificacoes.size > 0 && (
                                            <button
                                                type="button"
                                                onClick={apagarNotificacoesSelecionadas}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    background: '#EF4444',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                }}
                                            >
                                                🗑️ Apagar Selecionadas ({selectedNotificacoes.size})
                                            </button>
                                        )}
                                    </>
                                )}
                                
                                {/* Botão Tribunal do Júri */}
                                <button
                                    onClick={() => navigate('/veredito')}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)',
                                    }}
                                >
                                    👨‍⚖️ Tribunal do Júri
                                </button>

                                {/* Botão Login Jurado Teste */}
                                <button
                                    onClick={() => navigate('/login-jurado-teste')}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: '1px solid #F59E0B',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        color: '#F59E0B',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    🧪 Login Teste
                                </button>
                            </div>
                        </div>

                        {/* Lista de Notificações */}
                        {loadingNotificacoes ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                                ⏳ Carregando notificações...
                            </div>
                        ) : notificacoesFiltradas.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#64748B', border: '1px dashed #475569', borderRadius: '8px' }}>
                                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📭</div>
                                <p>Nenhuma notificação {filtroNotificacao !== 'todas' ? `(${filtroNotificacao === 'nao_lidas' ? 'não lida' : 'lida'})` : ''}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {notificacoesFiltradas.map((notif) => {
                                    const dados = notif.dados || {};
                                    
                                    // Apenas acusações (defesas são incorporadas na acusação)
                                    const acusador = dados.acusador || {};
                                    const acusado = dados.acusado || {};
                                    const etapa = dados.etapa || {};
                                    const codigoLance = dados.codigoLance || 'N/A';
                                    const defesa = dados.defesa || null; // Defesa incorporada
                                    const status = dados.status || 'aguardando_defesa';
                                    const isExpanded = expandedLances[notif.id];
                                    
                                    // Determinar cor e texto baseado no status
                                    const getStatusInfo = () => {
                                        if (status === 'solicitacao_anulada') return { color: '#6B7280', text: 'SOLICITAÇÃO ANULADA', icon: '🚫' };
                                        if (status === 'aguardando_analise') return { color: '#8B5CF6', text: 'AGUARDANDO ANÁLISE', icon: '⏳' };
                                        if (status === 'analise_realizada') return { color: '#22C55E', text: 'ANÁLISE REALIZADA', icon: '✅' };
                                        return { color: '#F59E0B', text: 'AGUARDANDO DEFESA', icon: '⚖️' };
                                    };
                                    
                                    const statusInfo = getStatusInfo();
                                    
                                    return (
                                        <div
                                            key={notif.id}
                                            style={{
                                                background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)',
                                                border: `1px solid ${statusInfo.color}40`,
                                                borderRadius: '10px',
                                                overflow: 'hidden',
                                                position: 'relative',
                                            }}
                                        >
                                            {/* ===== PRÉVIA (GAVETA FECHADA) - Layout Compacto ===== */}
                                            <div 
                                                onClick={(e) => {
                                                    // Não expandir se clicou no checkbox
                                                    if (e.target.type === 'checkbox') return;
                                                    toggleLance(notif.id, notif.lido, e);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '12px 15px',
                                                    cursor: 'pointer',
                                                    gap: '12px',
                                                    transition: 'background 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {/* Checkbox para seleção */}
                                                <input
                                                    type="checkbox"
                                                    checked={selectedNotificacoes.has(notif.id)}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        toggleSelectNotificacao(notif.id);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        cursor: 'pointer',
                                                        accentColor: '#6366F1',
                                                    }}
                                                />

                                                {/* Código do Lance - Clicável para ver votos */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        abrirModalVotos(notif);
                                                    }}
                                                    style={{ 
                                                        background: '#E5E7EB',
                                                        color: '#1F2937',
                                                        padding: '5px 10px',
                                                        borderRadius: '5px',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold',
                                                        fontFamily: 'monospace',
                                                        whiteSpace: 'nowrap',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = '#D1D5DB';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = '#E5E7EB';
                                                    }}
                                                    title="Clique para ver os votos dos jurados"
                                                >
                                                    🔖 {codigoLance} 👁️
                                                </button>

                                                {/* Badge de Status */}
                                                <span style={{ 
                                                    background: statusInfo.color,
                                                    color: 'white',
                                                    padding: '4px 10px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {statusInfo.icon} {statusInfo.text}
                                                </span>

                                                {/* Separador */}
                                                <span style={{ color: '#475569' }}>|</span>

                                                {/* Data/Hora - Texto simples */}
                                                <span style={{ color: '#94A3B8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                    📅 {new Date(notif.created_at).toLocaleDateString('pt-BR')} às {new Date(notif.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>

                                                {/* Separador */}
                                                <span style={{ color: '#475569' }}>|</span>

                                                {/* Etapa e Circuito - Texto simples */}
                                                <span style={{ color: '#94A3B8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                    🏁 Etapa {etapa.round} - {etapa.circuit || '-'}
                                                </span>

                                                {/* Separador */}
                                                <span style={{ color: '#475569' }}>|</span>

                                                {/* Grid */}
                                                <span style={{ color: '#94A3B8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                    🎮 {dados.grid?.toUpperCase() || acusador.grid?.toUpperCase() || '-'} T{dados.temporada || '20'}
                                                </span>

                                                {/* Separador */}
                                                <span style={{ color: '#475569' }}>|</span>

                                                {/* Acusador vs Acusado - Texto simples */}
                                                <span style={{ color: '#E2E8F0', fontSize: '12px', flex: 1 }}>
                                                    <span style={{ color: '#EF4444' }}>👤 {acusador.nome || '-'}</span>
                                                    <span style={{ color: '#64748B', margin: '0 6px' }}>vs</span>
                                                    <span style={{ color: '#F59E0B' }}>⚖️ {acusado.nome || '-'}</span>
                                                </span>

                                                {/* Botões de ação e Seta */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                                    {!notif.lido && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); marcarComoLida(notif.id); }}
                                                            style={{
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                border: 'none',
                                                                background: '#22C55E',
                                                                color: 'white',
                                                                fontSize: '10px',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            ✓
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); excluirNotificacao(notif.id, codigoLance); }}
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            border: 'none',
                                                            background: '#EF4444',
                                                            color: 'white',
                                                            fontSize: '10px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        🗑️
                                                    </button>
                                                    {/* Seta de expandir/colapsar */}
                                                    <div style={{
                                                        color: '#94A3B8',
                                                        fontSize: '14px',
                                                        transition: 'transform 0.3s ease',
                                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                        marginLeft: '4px',
                                                    }}>
                                                        ▼
                                                    </div>
                                                </div>

                                                {/* Badge NOVA */}
                                                {!notif.lido && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '0px',
                                                        right: '10px',
                                                        background: '#EF4444',
                                                        color: 'white',
                                                        padding: '2px 8px',
                                                        borderRadius: '0 0 6px 6px',
                                                        fontSize: '9px',
                                                        fontWeight: 'bold',
                                                    }}>
                                                        NOVA
                                                    </div>
                                                )}
                                            </div>

                                            {/* ===== CONTEÚDO EXPANDIDO (GAVETA ABERTA) ===== */}
                                            {isExpanded && (
                                                <div 
                                                    id={`lance-expanded-${notif.id}`}
                                                    style={{
                                                        padding: '0 20px 20px 20px',
                                                        borderTop: '1px solid #334155',
                                                        animation: 'slideDown 0.3s ease',
                                                        scrollMarginTop: '0 !important',
                                                        scrollMargin: '0 !important'
                                                    }}
                                                    onFocus={(e) => {
                                                        // Prevenir scroll automático ao focar em elementos dentro
                                                        e.stopPropagation();
                                                    }}
                                                    onClick={(e) => {
                                                        // Prevenir qualquer scroll ao clicar dentro
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    {/* Cards de Acusador, Acusado e Detalhes */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
                                                        {/* Acusador */}
                                                        <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #EF4444', display: 'flex', flexDirection: 'column' }}>
                                                            <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '5px' }}>
                                                                👤 ACUSAÇÃO DE {acusador.nome?.toUpperCase() || '-'}
                                                            </div>
                                                            <div style={{ color: '#94A3B8', fontSize: '13px' }}>
                                                                GT: {acusador.gamertag || '-'}
                                                            </div>
                                                            {acusador.whatsapp && (
                                                                <a 
                                                                    href={`https://wa.me/55${acusador.whatsapp?.replace(/\D/g, '')}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: '#22C55E', fontSize: '12px', textDecoration: 'none' }}
                                                                >
                                                                    📱 {acusador.whatsapp}
                                                                </a>
                                                            )}
                                                            <div style={{ color: '#64748B', fontSize: '11px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #334155' }}>
                                                                📅 {new Date(new Date(notif.created_at).getTime() - 3 * 60 * 60 * 1000).toLocaleDateString('pt-BR')} às {new Date(new Date(notif.created_at).getTime() - 3 * 60 * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (Brasília)
                                                            </div>
                                                        </div>

                                                        {/* Acusado / Defesa */}
                                                        <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', borderLeft: defesa ? '3px solid #22C55E' : '3px solid #F59E0B', display: 'flex', flexDirection: 'column' }}>
                                                            <div style={{ color: defesa ? '#6EE7B7' : '#94A3B8', fontSize: '11px', marginBottom: '5px' }}>
                                                                {defesa ? `🛡️ DEFESA DE ${acusado.nome?.toUpperCase() || '-'}` : `⚖️ ACUSADO: ${acusado.nome?.toUpperCase() || '-'}`}
                                                            </div>
                                                            <div style={{ color: '#94A3B8', fontSize: '13px' }}>
                                                                GT: {acusado.gamertag || '-'}
                                                            </div>
                                                            {acusado.whatsapp && acusado.whatsapp !== '-' && (
                                                                <a 
                                                                    href={`https://wa.me/55${acusado.whatsapp?.replace(/\D/g, '')}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: '#22C55E', fontSize: '12px', textDecoration: 'none' }}
                                                                >
                                                                    📱 {acusado.whatsapp}
                                                                </a>
                                                            )}
                                                            {defesa?.dataEnvioDefesa && (
                                                                <div style={{ color: '#64748B', fontSize: '11px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #334155' }}>
                                                                    📅 {new Date(new Date(defesa.dataEnvioDefesa).getTime() - 3 * 60 * 60 * 1000).toLocaleDateString('pt-BR')} às {new Date(new Date(defesa.dataEnvioDefesa).getTime() - 3 * 60 * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (Brasília)
                                                                </div>
                                                            )}
                                                            {!defesa && (
                                                                <div style={{ color: '#F59E0B', fontSize: '11px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #334155' }}>
                                                                    ⏳ Aguardando defesa...
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Detalhes */}
                                                        <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #3B82F6', display: 'flex', flexDirection: 'column' }}>
                                                            <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '5px' }}>📍 DETALHES DA CORRIDA</div>
                                                            <div style={{ color: '#F8FAFC', fontWeight: 'bold' }}>
                                                                Etapa {etapa.round} - {etapa.circuit || '-'}
                                                            </div>
                                                            <div style={{ color: '#94A3B8', fontSize: '13px' }}>
                                                                Grid: {dados.grid?.toUpperCase() || acusador.grid?.toUpperCase() || '-'} | T{dados.temporada || '20'}
                                                            </div>
                                                            <div style={{ color: '#64748B', fontSize: '11px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #334155' }}>
                                                                🏁 Data da corrida: {etapa.date || '-'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Descrição da Acusação */}
                                                    <div style={{ marginTop: '15px', background: '#0F172A', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #FF6B35' }}>
                                                        <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '8px' }}>
                                                            📝 DESCRIÇÃO DA ACUSAÇÃO
                                                        </div>
                                                        <div style={{ color: '#E2E8F0', lineHeight: '1.5' }}>
                                                            {dados.descricao || 'Sem descrição'}
                                                        </div>
                                                    </div>

                                                    {/* Descrição da Defesa (se existir) */}
                                                    {defesa && (
                                                        <div style={{ marginTop: '15px', background: '#0F172A', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #22C55E' }}>
                                                            <div style={{ color: '#6EE7B7', fontSize: '11px', marginBottom: '8px' }}>
                                                                🛡️ DESCRIÇÃO DA DEFESA
                                                            </div>
                                                            <div style={{ color: '#E2E8F0', lineHeight: '1.5' }}>
                                                                {defesa.descricaoDefesa || 'Sem descrição'}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* VÍDEOS LADO A LADO (Comparativo) */}
                                                    {(dados.videoLink || defesa?.videoLinkDefesa) && (
                                                        <div style={{ marginTop: isMobile ? '15px' : '20px' }}>
                                                            <div style={{ 
                                                                color: '#94A3B8', 
                                                                fontSize: isMobile ? '0.85rem' : '12px', 
                                                                marginBottom: isMobile ? '10px' : '12px',
                                                                textAlign: 'center',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                🎥 COMPARATIVO DE VÍDEOS
                                                            </div>
                                                            <div style={{ 
                                                                display: 'grid', 
                                                                gridTemplateColumns: isMobile ? '1fr' : (defesa?.videoLinkDefesa ? '1fr 1fr' : '1fr'),
                                                                gap: isMobile ? '15px' : '15px'
                                                            }}>
                                                                {/* Vídeo da Acusação */}
                                                                {dados.videoLink && (
                                                                    <div>
                                                                        <div style={{ 
                                                                            color: '#EF4444', 
                                                                            fontSize: isMobile ? '0.9rem' : '11px', 
                                                                            marginBottom: isMobile ? '10px' : '8px',
                                                                            fontWeight: 'bold',
                                                                            textAlign: 'center',
                                                                            textTransform: 'uppercase',
                                                                            letterSpacing: isMobile ? '0.5px' : '1px',
                                                                            textShadow: '0 2px 10px rgba(239, 68, 68, 0.3)'
                                                                        }}>
                                                                            👤 VISÃO DO ACUSADOR
                                                                        </div>
                                                                        <VideoEmbed 
                                                                            videoLink={dados.videoLink} 
                                                                            title="Vídeo da acusação"
                                                                            borderColor="#EF4444"
                                                                            isMobile={isMobile}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Vídeo da Defesa */}
                                                                {defesa?.videoLinkDefesa && (
                                                                    <div>
                                                                        <div style={{ 
                                                                            color: '#22C55E', 
                                                                            fontSize: isMobile ? '0.9rem' : '11px', 
                                                                            marginBottom: isMobile ? '10px' : '8px',
                                                                            fontWeight: 'bold',
                                                                            textAlign: 'center',
                                                                            textTransform: 'uppercase',
                                                                            letterSpacing: isMobile ? '0.5px' : '1px',
                                                                            textShadow: '0 2px 10px rgba(34, 197, 94, 0.3)'
                                                                        }}>
                                                                            🛡️ VISÃO DO DEFENSOR
                                                                        </div>
                                                                        <VideoEmbed 
                                                                            videoLink={defesa.videoLinkDefesa} 
                                                                            title="Vídeo da defesa"
                                                                            borderColor="#22C55E"
                                                                            isMobile={isMobile}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Botão para enviar ao Júri (se tem defesa e ainda não foi enviado) */}
                                                    {defesa && status === 'aguardando_defesa' && (
                                                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                                            <button
                                                                style={{
                                                                    padding: '12px 25px',
                                                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    fontWeight: 'bold',
                                                                    fontSize: '13px',
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                                                                }}
                                                                onClick={() => enviarParaJuri(notif.id, dados)}
                                                            >
                                                                👨‍⚖️ Enviar para Júri Analisar
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Badge quando já foi enviado */}
                                                    {status === 'aguardando_analise' && (
                                                        <div style={{ 
                                                            marginTop: '20px', 
                                                            textAlign: 'right',
                                                            color: '#8B5CF6',
                                                            fontSize: '13px',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            ⏳ Aguardando análise do Júri...
                                                        </div>
                                                    )}

                                                    {/* Anular solicitação (link incorreto, sem visibilidade, etc.) */}
                                                    {(status === 'aguardando_defesa' || status === 'aguardando_analise') && (
                                                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                                            <button
                                                                type="button"
                                                                style={{
                                                                    padding: '10px 18px',
                                                                    background: '#374151',
                                                                    color: '#E5E7EB',
                                                                    border: '1px solid #4B5563',
                                                                    borderRadius: '8px',
                                                                    fontWeight: '600',
                                                                    fontSize: '12px',
                                                                    cursor: 'pointer',
                                                                }}
                                                                onClick={() => {
                                                                    setAnulacaoModal({ notifId: notif.id, dados });
                                                                    setMotivoAnulacaoInput('');
                                                                }}
                                                            >
                                                                🚫 Anular solicitação
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Exibir motivo quando solicitação foi anulada */}
                                                    {status === 'solicitacao_anulada' && dados.motivoAnulacao && (
                                                        <div style={{
                                                            marginTop: '20px',
                                                            padding: '14px',
                                                            background: 'rgba(107, 114, 128, 0.2)',
                                                            border: '1px solid #6B7280',
                                                            borderRadius: '8px',
                                                            borderLeft: '4px solid #6B7280',
                                                        }}>
                                                            <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '6px', fontWeight: 'bold' }}>
                                                                🚫 SOLICITAÇÃO ANULADA – Motivo
                                                            </div>
                                                            <div style={{ color: '#E5E7EB', fontSize: '13px', lineHeight: '1.5' }}>
                                                                {dados.motivoAnulacao}
                                                            </div>
                                                            {dados.dataAnulacao && (
                                                                <div style={{ color: '#6B7280', fontSize: '11px', marginTop: '8px' }}>
                                                                    Em {new Date(dados.dataAnulacao).toLocaleString('pt-BR')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== ABA JURADOS ===== */}
                {activeTab === 'jurados' && (
                    <div className="adm-content">
                        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ color: '#8B5CF6', margin: 0 }}>👨‍⚖️ Cadastro de Jurados</h3>
                            <button 
                                onClick={fetchJurados} 
                                style={{ padding: '8px 16px', background: '#1E293B', color: '#94A3B8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                🔄 Atualizar
                            </button>
                        </div>

                        <p style={{ color: '#94A3B8', marginBottom: '25px', fontSize: '14px' }}>
                            Configure os jurados vinculando e-mail Google e WhatsApp. Após configurado e ativo, o jurado poderá acessar o Tribunal do Júri.
                        </p>

                        {loadingJurados ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Carregando jurados...</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {jurados.map((jurado) => (
                                    <div 
                                        key={jurado.id}
                                        style={{
                                            background: '#1E293B',
                                            borderRadius: '10px',
                                            border: `1px solid ${jurado.ativo ? '#22C55E' : '#475569'}`,
                                            overflow: 'hidden',
                                            display: 'flex',
                                            minHeight: '150px'
                                        }}
                                    >
                                        {/* Parte Esquerda - Foto Grande */}
                                        <div style={{
                                            width: '200px',
                                            minWidth: '200px',
                                            background: '#0F172A',
                                            borderRight: `2px solid ${jurado.ativo ? '#22C55E' : '#64748B'}`,
                                            display: 'flex',
                                            alignItems: 'stretch',
                                            padding: 0,
                                            overflow: 'hidden'
                                        }}>
                                            <img
                                                src={getFotoJurado(jurado.nome)}
                                                alt={jurado.nome || jurado.usuario}
                                                onError={(e) => {
                                                    e.target.src = '/pilotos/pilotoshadow.png';
                                                }}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    display: 'block'
                                                }}
                                            />
                                        </div>

                                        {/* Parte Direita - Informações */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            {/* Header do Card */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '15px 20px',
                                                background: jurado.ativo ? 'rgba(34, 197, 94, 0.1)' : 'rgba(71, 85, 105, 0.2)',
                                                borderBottom: '1px solid rgba(255,255,255,0.1)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        background: '#E5E7EB',
                                                        color: '#1F2937',
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        fontWeight: 'bold',
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        {jurado.usuario}
                                                    </span>
                                                    <span style={{ color: '#F8FAFC', fontWeight: 'bold' }}>
                                                        {jurado.nome || '(Nome não definido)'}
                                                    </span>
                                                    <span style={{
                                                        background: jurado.ativo ? '#22C55E' : '#64748B',
                                                        color: 'white',
                                                        padding: '3px 10px',
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {jurado.ativo ? '✅ ATIVO' : '⏸️ INATIVO'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button
                                                        onClick={() => handleEditJurado(jurado)}
                                                        style={{
                                                            padding: '6px 14px',
                                                            background: '#8B5CF6',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '5px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={() => toggleJuradoAtivo(jurado)}
                                                        style={{
                                                            padding: '6px 14px',
                                                            background: jurado.ativo ? '#EF4444' : '#22C55E',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '5px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        {jurado.ativo ? '⏸️ Desativar' : '▶️ Ativar'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Info do jurado */}
                                            <div style={{ padding: '15px 20px', display: 'flex', gap: '30px', flexWrap: 'wrap', flex: 1 }}>
                                                <div>
                                                    <span style={{ color: '#64748B', fontSize: '12px' }}>📧 E-mail Google:</span>
                                                    <div style={{ color: jurado.email_google ? '#F8FAFC' : '#64748B', marginTop: '3px' }}>
                                                        {jurado.email_google || '(não configurado)'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748B', fontSize: '12px' }}>📱 WhatsApp:</span>
                                                    <div style={{ color: jurado.whatsapp ? '#F8FAFC' : '#64748B', marginTop: '3px' }}>
                                                        {jurado.whatsapp || '(não configurado)'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Formulário de edição (se estiver editando este jurado) */}
                                        {editingJurado && editingJurado.id === jurado.id && (
                                            <div style={{
                                                padding: '20px',
                                                background: '#0F172A',
                                                borderTop: '1px solid #8B5CF6'
                                            }}>
                                                <h4 style={{ color: '#8B5CF6', margin: '0 0 15px 0', fontSize: '14px' }}>
                                                    ✏️ Editando {editingJurado.usuario}
                                                </h4>
                                                
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                                                    <div>
                                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                                            Nome do Jurado *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editingJurado.nome}
                                                            onChange={(e) => setEditingJurado({ ...editingJurado, nome: e.target.value })}
                                                            placeholder="Ex: Comissário Silva"
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #475569',
                                                                background: '#1E293B',
                                                                color: '#F8FAFC',
                                                                fontSize: '14px'
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                                            E-mail Google *
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={editingJurado.email_google}
                                                            onChange={(e) => setEditingJurado({ ...editingJurado, email_google: e.target.value })}
                                                            placeholder="Ex: jurado@gmail.com"
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #475569',
                                                                background: '#1E293B',
                                                                color: '#F8FAFC',
                                                                fontSize: '14px'
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                                            WhatsApp * (11 dígitos)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editingJurado.whatsapp}
                                                            onChange={(e) => setEditingJurado({ ...editingJurado, whatsapp: formatWhatsApp(e.target.value) })}
                                                            placeholder="(00) 00000-0000"
                                                            maxLength={15}
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #475569',
                                                                background: '#1E293B',
                                                                color: '#F8FAFC',
                                                                fontSize: '14px'
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => setEditingJurado(null)}
                                                        style={{
                                                            padding: '10px 20px',
                                                            background: 'transparent',
                                                            color: '#94A3B8',
                                                            border: '1px solid #475569',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={handleSaveJurado}
                                                        disabled={savingJurado}
                                                        style={{
                                                            padding: '10px 20px',
                                                            background: savingJurado ? '#475569' : '#22C55E',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: savingJurado ? 'not-allowed' : 'pointer',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        {savingJurado ? '⏳ Salvando...' : '💾 Salvar'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== ABA NARRADORES ===== */}
                {activeTab === 'narradores' && (
                    <div className="adm-content">
                        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ color: '#06B6D4', margin: 0 }}>🎙️ Cadastro de Narradores</h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => window.open('/narrador', '_blank')}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#0F172A',
                                        color: '#06B6D4',
                                        border: '1px solid #06B6D4',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    🎙️ Abrir Página Narrador
                                </button>
                                <button 
                                    onClick={handleCreateNarrador}
                                    style={{ 
                                        padding: '8px 16px', 
                                        background: '#06B6D4', 
                                        color: '#0F172A', 
                                        border: 'none', 
                                        borderRadius: '6px', 
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    ➕ Novo Narrador
                                </button>
                                <button 
                                    onClick={fetchNarradores} 
                                    style={{ padding: '8px 16px', background: '#1E293B', color: '#94A3B8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    🔄 Atualizar
                                </button>
                            </div>
                        </div>

                        <p style={{ color: '#94A3B8', marginBottom: '25px', fontSize: '14px' }}>
                            Configure os narradores que terão acesso somente leitura aos painéis dos pilotos durante as transmissões.
                        </p>

                        {/* Formulário de criação/edição */}
                        {editingNarrador && !editingNarrador.id && (
                            <div style={{
                                background: '#1E293B',
                                borderRadius: '10px',
                                padding: '20px',
                                marginBottom: '20px',
                                border: '2px solid #06B6D4'
                            }}>
                                <h4 style={{ color: '#06B6D4', margin: '0 0 15px 0' }}>➕ Novo Narrador</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                                    <div>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Usuário de acesso *</label>
                                        <input
                                            type="text"
                                            value={editingNarrador.usuario || ''}
                                            onChange={(e) => setEditingNarrador({ ...editingNarrador, usuario: e.target.value })}
                                            placeholder="Ex: narrador1"
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Nome *</label>
                                        <input
                                            type="text"
                                            value={editingNarrador.nome}
                                            onChange={(e) => setEditingNarrador({ ...editingNarrador, nome: e.target.value })}
                                            placeholder="Ex: João Silva"
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>E-mail *</label>
                                        <input
                                            type="email"
                                            value={editingNarrador.email}
                                            onChange={(e) => setEditingNarrador({ ...editingNarrador, email: e.target.value })}
                                            placeholder="Ex: narrador@email.com"
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Perfil de acesso *</label>
                                        <select
                                            value={editingNarrador.papel || 'narrador'}
                                            onChange={(e) => setEditingNarrador({ ...editingNarrador, papel: e.target.value })}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC' }}
                                        >
                                            <option value="narrador">Narrador</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>WhatsApp *</label>
                                        <input
                                            type="text"
                                            value={editingNarrador.whatsapp || ''}
                                            onChange={(e) => setEditingNarrador({ ...editingNarrador, whatsapp: e.target.value })}
                                            placeholder="Ex: (11) 99999-9999"
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Senha inicial *</label>
                                        <input
                                            type="password"
                                            value={editingNarrador.senha || ''}
                                            onChange={(e) => setEditingNarrador({ ...editingNarrador, senha: e.target.value })}
                                            placeholder="Mínimo 4 caracteres"
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setEditingNarrador(null)}
                                        style={{ padding: '10px 20px', background: 'transparent', color: '#94A3B8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveNewNarrador}
                                        disabled={savingNarrador}
                                        style={{ padding: '10px 20px', background: savingNarrador ? '#475569' : '#06B6D4', color: savingNarrador ? '#94A3B8' : '#0F172A', border: 'none', borderRadius: '6px', cursor: savingNarrador ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                    >
                                        {savingNarrador ? '⏳ Salvando...' : '💾 Criar'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {loadingNarradores ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Carregando narradores...</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {narradores.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Nenhum narrador cadastrado.</div>
                                ) : (
                                    narradores.map((narrador) => (
                                        <div 
                                            key={narrador.id}
                                            style={{
                                                background: '#1E293B',
                                                borderRadius: '10px',
                                                border: `1px solid ${narrador.ativo ? '#06B6D4' : '#475569'}`,
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '15px 20px',
                                                background: narrador.ativo ? 'rgba(6, 182, 212, 0.1)' : 'rgba(71, 85, 105, 0.2)',
                                                borderBottom: '1px solid rgba(255,255,255,0.1)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <span style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: '16px' }}>
                                                        {narrador.nome || '(Nome não definido)'}
                                                    </span>
                                                    <span style={{
                                                        background: normalizeNarradorRole(narrador.papel) === 'admin' ? '#F59E0B' : '#334155',
                                                        color: '#fff',
                                                        padding: '3px 10px',
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {normalizeNarradorRole(narrador.papel)}
                                                    </span>
                                                    <span style={{
                                                        background: narrador.ativo ? '#06B6D4' : '#64748B',
                                                        color: 'white',
                                                        padding: '3px 10px',
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {narrador.ativo ? '✅ ATIVO' : '⏸️ INATIVO'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button
                                                        onClick={() => handleEditNarrador(narrador)}
                                                        style={{ padding: '6px 14px', background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={() => toggleNarradorAtivo(narrador)}
                                                        style={{ padding: '6px 14px', background: narrador.ativo ? '#EF4444' : '#22C55E', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                                                    >
                                                        {narrador.ativo ? '⏸️ Desativar' : '▶️ Ativar'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNarrador(narrador)}
                                                        style={{ padding: '6px 14px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                                                    >
                                                        🗑️ Excluir
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{ padding: '15px 20px', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                                                <div>
                                                    <span style={{ color: '#64748B', fontSize: '12px' }}>👤 Usuário:</span>
                                                    <div style={{ color: '#F8FAFC', marginTop: '3px' }}>{narrador.usuario || '(não configurado)'}</div>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748B', fontSize: '12px' }}>📧 E-mail:</span>
                                                    <div style={{ color: '#F8FAFC', marginTop: '3px' }}>{narrador.email || '(não configurado)'}</div>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748B', fontSize: '12px' }}>📱 WhatsApp:</span>
                                                    <div style={{ color: '#F8FAFC', marginTop: '3px' }}>{narrador.whatsapp || '(não configurado)'}</div>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748B', fontSize: '12px' }}>🔐 Senha:</span>
                                                    <div style={{ color: narrador.senha_definida ? '#10B981' : '#EF4444', marginTop: '3px', fontWeight: 'bold' }}>
                                                        {narrador.senha_definida ? '✅ Definida' : '❌ Não definida'}
                                                    </div>
                                                </div>
                                            </div>
                                            {editingNarrador && editingNarrador.id === narrador.id && (
                                                <div style={{ padding: '20px', background: '#0F172A', borderTop: '1px solid #06B6D4' }}>
                                                    <h4 style={{ color: '#06B6D4', margin: '0 0 15px 0', fontSize: '14px' }}>✏️ Editando {narrador.nome}</h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                                                        <div>
                                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Usuário de acesso *</label>
                                                            <input
                                                                type="text"
                                                                value={editingNarrador.usuario || ''}
                                                                onChange={(e) => setEditingNarrador({ ...editingNarrador, usuario: e.target.value })}
                                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Nome *</label>
                                                            <input
                                                                type="text"
                                                                value={editingNarrador.nome}
                                                                onChange={(e) => setEditingNarrador({ ...editingNarrador, nome: e.target.value })}
                                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>E-mail *</label>
                                                            <input
                                                                type="email"
                                                                value={editingNarrador.email}
                                                                onChange={(e) => setEditingNarrador({ ...editingNarrador, email: e.target.value })}
                                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Perfil de acesso *</label>
                                                            <select
                                                                value={editingNarrador.papel || 'narrador'}
                                                                onChange={(e) => setEditingNarrador({ ...editingNarrador, papel: e.target.value })}
                                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC' }}
                                                            >
                                                                <option value="narrador">Narrador</option>
                                                                <option value="admin">Admin</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>WhatsApp *</label>
                                                            <input
                                                                type="text"
                                                                value={editingNarrador.whatsapp || ''}
                                                                onChange={(e) => setEditingNarrador({ ...editingNarrador, whatsapp: e.target.value })}
                                                                placeholder="Ex: (11) 99999-9999"
                                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Nova Senha (deixe vazio para manter)</label>
                                                            <input
                                                                type="password"
                                                                value={editingNarrador.senha}
                                                                onChange={(e) => setEditingNarrador({ ...editingNarrador, senha: e.target.value })}
                                                                placeholder="Deixe vazio para manter a senha atual"
                                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => setEditingNarrador(null)}
                                                            style={{ padding: '10px 20px', background: 'transparent', color: '#94A3B8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            onClick={handleSaveNarrador}
                                                            disabled={savingNarrador}
                                                            style={{ padding: '10px 20px', background: savingNarrador ? '#475569' : '#06B6D4', color: savingNarrador ? '#94A3B8' : '#0F172A', border: 'none', borderRadius: '6px', cursor: savingNarrador ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            {savingNarrador ? '⏳ Salvando...' : '💾 Salvar'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'power-ranking' && (
                    <AdminPowerRanking />
                )}

                {activeTab === 'temporada' && (
                    <div className="adm-content" style={{ padding: '20px' }}>
                        <AdminSeasonLifecyclePanel />
                    </div>
                )}

                {activeTab === 'inscricoes' && (
                    <AdminInscricoesPanel />
                )}

                {activeTab === 'noticias' && (
                    <div className="adm-content">
                        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ color: '#F59E0B', margin: 0 }}>📰 Upload de Imagens das Notícias</h3>
                        </div>

                        <p style={{ color: '#94A3B8', marginBottom: '25px', fontSize: '14px', lineHeight: '1.6' }}>
                            Faça upload das imagens das notícias direto aqui no site. A imagem é salva no <strong>Supabase Storage</strong> com nome fixo
                            (<strong>noticia1</strong>, <strong>noticia2</strong>, etc.) baseado no ID da notícia na planilha.
                            <br/><br/>
                            ✅ <strong>Vantagem:</strong> não precisa mover arquivo pra <code>public/</code> e nem fazer deploy no Netlify — a imagem atualiza no site automaticamente.
                            <br/>
                            ⚠️ <strong>Pré-requisito:</strong> bucket <code>noticias</code> no Supabase + tabela <code>news_images</code> (ver docs do projeto).
                        </p>

                        <div style={{
                            background: '#1E293B',
                            borderRadius: '10px',
                            padding: '25px',
                            marginBottom: '20px',
                            border: '2px solid #F59E0B'
                        }}>
                            <h4 style={{ color: '#F59E0B', margin: '0 0 15px 0' }}>📤 Upload de Imagem</h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        ID da Notícia *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={selectedNewsId}
                                        onChange={(e) => setSelectedNewsId(parseInt(e.target.value) || 1)}
                                        placeholder="Ex: 1"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                    <p style={{ color: '#64748B', fontSize: '11px', marginTop: '5px' }}>
                                        A imagem será salva no Supabase como: <strong>noticia{selectedNewsId}</strong> (substitui a anterior)
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                    Selecione a Imagem *
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="news-image-upload"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        setUploadingImage(true);
                                        try {
                                            const slot = Number(selectedNewsId) || 1;
                                            const key = `noticia${slot}`;

                                            // Upload (substitui sempre)
                                            const { error: uploadError } = await supabase
                                                .storage
                                                .from('noticias')
                                                .upload(key, file, {
                                                    upsert: true,
                                                    cacheControl: 'max-age=0, must-revalidate',
                                                    contentType: file.type || 'image/jpeg'
                                                });

                                            if (uploadError) throw uploadError;

                                            // Atualiza a versão (para quebrar cache no front)
                                            // Preserva o is_featured se já existir
                                            const now = new Date().toISOString();
                                            const { data: existing } = await supabase
                                                .from('news_images')
                                                .select('is_featured')
                                                .eq('slot', slot)
                                                .single();
                                            
                                            const { error: dbError } = await supabase
                                                .from('news_images')
                                                .upsert({ 
                                                    slot, 
                                                    updated_at: now,
                                                    is_featured: existing?.is_featured || false
                                                }, { onConflict: 'slot' });

                                            if (dbError) throw dbError;

                                            setNewsImageRefreshKey(Date.now());
                                            alert(`✅ Imagem da Notícia ${slot} atualizada com sucesso!`);
                                        } catch (err) {
                                            console.error('Erro ao processar imagem:', err);
                                            let errorMessage = err.message || 'Erro desconhecido';
                                            
                                            // Mensagem mais clara para erro de bucket não encontrado
                                            if (errorMessage.includes('Bucket not found') || (errorMessage.includes('not found') && errorMessage.includes('bucket'))) {
                                                errorMessage = 'Bucket "noticias" não encontrado no Supabase Storage.\n\n' +
                                                    '📋 Para resolver:\n' +
                                                    '1. Acesse https://app.supabase.com\n' +
                                                    '2. Vá em Storage → "+ New bucket"\n' +
                                                    '3. Crie o bucket com nome: "noticias" (minúsculo)\n' +
                                                    '4. Marque como "Public bucket"\n' +
                                                    '5. Configure as policies de leitura e escrita\n\n' +
                                                    '📖 Veja o guia completo: GUIA_NOTICIAS_SUPABASE_STORAGE.md';
                                            }
                                            // Mensagem para erro de RLS (Row Level Security)
                                            else if (errorMessage.includes('row-level security') || errorMessage.includes('violates row-level security')) {
                                                errorMessage = 'Erro de permissão: Política RLS bloqueando inserção.\n\n' +
                                                    '📋 Para resolver:\n' +
                                                    '1. Acesse https://app.supabase.com\n' +
                                                    '2. Vá em SQL Editor\n' +
                                                    '3. Execute o script: setup-noticias-supabase.sql\n' +
                                                    '   (ou copie o conteúdo do arquivo)\n' +
                                                    '4. Verifique se as políticas foram criadas:\n' +
                                                    '   - "public can read news_images" (SELECT)\n' +
                                                    '   - "public can insert news_images" (INSERT)\n' +
                                                    '   - "public can update news_images" (UPDATE)\n\n' +
                                                    '📖 Veja o guia completo: GUIA_NOTICIAS_SUPABASE_STORAGE.md';
                                            }
                                            
                                            alert('❌ Erro ao processar imagem: ' + errorMessage);
                                        } finally {
                                            setUploadingImage(false);
                                            // Limpar input
                                            e.target.value = '';
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #475569',
                                        background: '#0F172A',
                                        color: '#F8FAFC',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                    disabled={uploadingImage}
                                />
                                {uploadingImage && (
                                    <p style={{ color: '#F59E0B', fontSize: '12px', marginTop: '5px' }}>
                                        ⏳ Processando...
                                    </p>
                                )}
                            </div>

                            <div style={{ 
                                marginTop: '20px', 
                                padding: '15px', 
                                background: 'rgba(245, 158, 11, 0.1)', 
                                borderRadius: '6px',
                                border: '1px solid rgba(245, 158, 11, 0.3)'
                            }}>
                                <h5 style={{ color: '#F59E0B', margin: '0 0 10px 0', fontSize: '14px' }}>📋 Instruções:</h5>
                                <ol style={{ color: '#CBD5E1', fontSize: '12px', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                                    <li>Selecione o ID da notícia (1, 2, 3, etc.)</li>
                                    <li>Escolha a imagem que deseja fazer upload</li>
                                    <li>O site faz upload no Supabase e substitui a imagem anterior</li>
                                    <li>Pronto — a imagem aparece no feed sem precisar publicar no Netlify</li>
                                </ol>
                            </div>
                        </div>

                        {/* Preview das imagens existentes */}
                        <div style={{
                            background: '#1E293B',
                            borderRadius: '10px',
                            padding: '25px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <h4 style={{ color: '#F59E0B', margin: '0 0 15px 0' }}>🖼️ Imagens Existentes</h4>
                            <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '15px' }}>
                                Preview das imagens no Supabase Storage (bucket <code>noticias</code>). 
                                <strong style={{ color: '#F59E0B', marginLeft: '8px' }}>⭐ Marque uma como principal</strong> para aparecer na tela inicial.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((id) => {
                                    const imageData = newsImagesData.find(img => img.slot === id);
                                    const isFeatured = imageData?.is_featured || false;
                                    
                                    return (
                                        <div key={id} style={{ position: 'relative' }}>
                                            <AdminNewsImagePreview id={id} getSupaUrl={getSupabaseNewsImageUrl} />
                                            <button
                                                onClick={() => toggleFeaturedNews(id)}
                                                style={{
                                                    width: '100%',
                                                    marginTop: '8px',
                                                    padding: '8px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    background: isFeatured 
                                                        ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                                                        : 'rgba(245, 158, 11, 0.2)',
                                                    color: isFeatured ? '#FFFFFF' : '#F59E0B',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    border: isFeatured ? '2px solid #F59E0B' : '1px solid rgba(245, 158, 11, 0.3)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isFeatured) {
                                                        e.target.style.background = 'rgba(245, 158, 11, 0.3)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isFeatured) {
                                                        e.target.style.background = 'rgba(245, 158, 11, 0.2)';
                                                    }
                                                }}
                                                disabled={loadingNewsImages}
                                            >
                                                {isFeatured ? '⭐ PRINCIPAL' : 'Marcar como Principal'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ===== CMS DE NOTÍCIAS ===== */}
                        <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: '2px solid rgba(245, 158, 11, 0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div>
                                    <h3 style={{ color: '#F59E0B', margin: 0 }}>📝 Gerenciar Notícias (CMS)</h3>
                                    <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '5px' }}>
                                        Crie e edite notícias diretamente aqui. As notícias do Supabase têm prioridade sobre a planilha do Google Sheets.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowNovaNoticia(true);
                                        setEditingNoticia({
                                            id: (noticias.length > 0 ? Math.max(...noticias.map(n => n.id)) + 1 : 1),
                                            title: '',
                                            subtitle: '',
                                            content: '',
                                            date: new Date().toLocaleDateString('pt-BR'),
                                            category: 'Notícia',
                                            featured: false,
                                            principal: false,
                                            link: ''
                                        });
                                    }}
                                    style={{
                                        padding: '12px 24px',
                                        background: '#F59E0B',
                                        color: '#0F172A',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '14px'
                                    }}
                                >
                                    ➕ Nova Notícia
                                </button>
                            </div>

                            {/* Formulário de Nova/Editar Notícia */}
                            {(showNovaNoticia || editingNoticia) && editingNoticia && (
                                <div style={{
                                    background: '#1E293B',
                                    borderRadius: '10px',
                                    padding: '25px',
                                    marginBottom: '20px',
                                    border: '2px solid #F59E0B'
                                }}>
                                    <h4 style={{ color: '#F59E0B', margin: '0 0 20px 0' }}>
                                        {showNovaNoticia ? '✨ Nova Notícia' : `✏️ Editando Notícia #${editingNoticia.id}`}
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                                        <div>
                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                                ID * (usado para referência da imagem)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={editingNoticia.id}
                                                onChange={(e) => setEditingNoticia({ ...editingNoticia, id: parseInt(e.target.value) || 1 })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #475569',
                                                    background: '#0F172A',
                                                    color: '#F8FAFC',
                                                    fontSize: '14px'
                                                }}
                                                disabled={!showNovaNoticia}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                                Data *
                                            </label>
                                            <input
                                                type="text"
                                                value={editingNoticia.date}
                                                onChange={(e) => setEditingNoticia({ ...editingNoticia, date: e.target.value })}
                                                placeholder="Ex: 23/12/2025"
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #475569',
                                                    background: '#0F172A',
                                                    color: '#F8FAFC',
                                                    fontSize: '14px'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                                Categoria * (selecione ou crie uma nova)
                                            </label>
                                            <input
                                                list="categorias-sugestoes"
                                                value={editingNoticia.category}
                                                onChange={(e) => setEditingNoticia({ ...editingNoticia, category: e.target.value })}
                                                placeholder="Digite ou selecione uma categoria"
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #475569',
                                                    background: '#0F172A',
                                                    color: '#F8FAFC',
                                                    fontSize: '14px'
                                                }}
                                            />
                                            <datalist id="categorias-sugestoes">
                                                <option value="Notícia" />
                                                <option value="Corrida" />
                                                <option value="Análise" />
                                                <option value="Grid Light" />
                                                <option value="Minicup" />
                                                <option value="Regulamento" />
                                                <option value="Power Ranking" />
                                            </datalist>
                                            <p style={{ color: '#64748B', fontSize: '11px', marginTop: '5px' }}>
                                                💡 Você pode digitar uma categoria personalizada
                                            </p>
                                        </div>

                                        <div>
                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                                Opções de Destaque
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editingNoticia.featured}
                                                    onChange={(e) => setEditingNoticia({ ...editingNoticia, featured: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                                <span style={{ color: '#CBD5E1', fontSize: '13px' }}>
                                                    {editingNoticia.featured ? '⭐ Notícia em destaque' : 'Notícia normal'}
                                                </span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editingNoticia.principal}
                                                    onChange={(e) => setEditingNoticia({ ...editingNoticia, principal: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                                <span style={{ color: '#F59E0B', fontSize: '13px', fontWeight: 'bold' }}>
                                                    {editingNoticia.principal ? '📌 PRINCIPAL (fixada no topo)' : 'Fixar como principal'}
                                                </span>
                                            </label>
                                            <p style={{ color: '#64748B', fontSize: '11px', marginTop: '8px' }}>
                                                💡 Apenas 1 notícia deve ser marcada como principal
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                            Título *
                                        </label>
                                        <input
                                            type="text"
                                            value={editingNoticia.title}
                                            onChange={(e) => setEditingNoticia({ ...editingNoticia, title: e.target.value })}
                                            placeholder="Ex: Yuri Rodrigues conquista o título da Minicup ML1"
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: '1px solid #475569',
                                                background: '#0F172A',
                                                color: '#F8FAFC',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                            Subtítulo / Linha Fina
                                        </label>
                                        <input
                                            type="text"
                                            value={editingNoticia.subtitle || ''}
                                            onChange={(e) => setEditingNoticia({ ...editingNoticia, subtitle: e.target.value })}
                                            placeholder="Ex: Piloto vence por apenas 2 pontos após disputa eletrizante"
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: '1px solid #475569',
                                                background: '#0F172A',
                                                color: '#F8FAFC',
                                                fontSize: '14px'
                                            }}
                                        />
                                        <p style={{ color: '#64748B', fontSize: '11px', marginTop: '5px' }}>
                                            Linha secundária que aparece abaixo do título principal
                                        </p>
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                            Matéria Completa
                                        </label>
                                        <p style={{ color: '#64748B', fontSize: '11px', marginBottom: '8px' }}>
                                            💡 <strong>Resumo virá da planilha do Google Sheets.</strong> Aqui você escreve apenas o conteúdo completo da matéria.
                                        </p>
                                        
                                        {/* Ferramentas de Formatação */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '8px',
                                            marginBottom: '10px',
                                            padding: '10px',
                                            background: '#0F172A',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            flexWrap: 'wrap'
                                        }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const textarea = document.getElementById('content-textarea');
                                                    const start = textarea.selectionStart;
                                                    const end = textarea.selectionEnd;
                                                    const selectedText = textarea.value.substring(start, end);
                                                    const newText = textarea.value.substring(0, start) + 
                                                        `**${selectedText || 'texto'}**` + 
                                                        textarea.value.substring(end);
                                                    setEditingNoticia({ ...editingNoticia, content: newText });
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#1E293B',
                                                    border: '1px solid #475569',
                                                    borderRadius: '4px',
                                                    color: '#F8FAFC',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold'
                                                }}
                                                title="Negrito (selecione o texto e clique)"
                                            >
                                                <strong>B</strong> Negrito
                                            </button>
                                            
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const textarea = document.getElementById('content-textarea');
                                                    const start = textarea.selectionStart;
                                                    const end = textarea.selectionEnd;
                                                    const selectedText = textarea.value.substring(start, end);
                                                    const newText = textarea.value.substring(0, start) + 
                                                        `## ${selectedText || 'Título da Seção'}` + 
                                                        textarea.value.substring(end);
                                                    setEditingNoticia({ ...editingNoticia, content: newText });
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#1E293B',
                                                    border: '1px solid #475569',
                                                    borderRadius: '4px',
                                                    color: '#F8FAFC',
                                                    fontSize: '12px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Criar título de seção"
                                            >
                                                📌 Título
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const currentContent = editingNoticia.content || '';
                                                    setEditingNoticia({ 
                                                        ...editingNoticia, 
                                                        content: currentContent + '\n\n' 
                                                    });
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#1E293B',
                                                    border: '1px solid #475569',
                                                    borderRadius: '4px',
                                                    color: '#F8FAFC',
                                                    fontSize: '12px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Adicionar parágrafo"
                                            >
                                                ¶ Parágrafo
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (window.confirm('Isso vai limpar todo o conteúdo. Confirmar?')) {
                                                        setEditingNoticia({ ...editingNoticia, content: '' });
                                                    }
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#1E293B',
                                                    border: '1px solid #EF4444',
                                                    borderRadius: '4px',
                                                    color: '#EF4444',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    marginLeft: 'auto'
                                                }}
                                                title="Limpar tudo"
                                            >
                                                🗑️ Limpar
                                            </button>
                                        </div>

                                        <p style={{ color: '#64748B', fontSize: '11px', marginBottom: '8px', padding: '8px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '4px' }}>
                                            📖 <strong>Formatação Suportada:</strong><br/>
                                            • <code>**texto**</code> = <strong>negrito</strong><br/>
                                            • <code>## Título</code> = Título de seção (maior e destacado)<br/>
                                            • Shift+Enter = Nova linha<br/>
                                            • Linha em branco = Novo parágrafo<br/>
                                            • Cole texto já formatado do Google Docs/Word
                                        </p>
                                        
                                        <textarea
                                            id="content-textarea"
                                            value={editingNoticia.content || ''}
                                            onChange={(e) => setEditingNoticia({ ...editingNoticia, content: e.target.value })}
                                            placeholder="Digite ou cole o conteúdo completo aqui...&#10;&#10;Exemplo:&#10;&#10;## O Caminho para o Título&#10;&#10;A Minicup foi dividida em três etapas duplas, testando a versatilidade dos pilotos...&#10;&#10;**Rodadas 1 e 2 (Áustria e Austrália)**&#10;&#10;O torneio começou com equilíbrio..."
                                            rows={18}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '6px',
                                                border: '1px solid #475569',
                                                background: '#0F172A',
                                                color: '#F8FAFC',
                                                fontSize: '14px',
                                                lineHeight: '1.6',
                                                fontFamily: 'inherit',
                                                resize: 'vertical'
                                            }}
                                        />
                                        
                                        {/* Preview da formatação */}
                                        {editingNoticia.content && (
                                            <details style={{ marginTop: '10px' }}>
                                                <summary style={{ color: '#94A3B8', cursor: 'pointer', fontSize: '12px' }}>
                                                    👁️ Visualizar prévia da formatação
                                                </summary>
                                                <div style={{
                                                    marginTop: '10px',
                                                    padding: '16px',
                                                    background: '#0F172A',
                                                    borderRadius: '6px',
                                                    border: '1px solid #475569',
                                                    color: '#CBD5E1',
                                                    fontSize: '14px',
                                                    lineHeight: '1.8',
                                                    textAlign: 'justify',
                                                    maxHeight: '300px',
                                                    overflowY: 'auto'
                                                }}
                                                dangerouslySetInnerHTML={{
                                                    __html: editingNoticia.content
                                                        .replace(/## (.*?)(\n|$)/g, '<h3 style="color: #F59E0B; font-size: 1.2rem; margin: 20px 0 10px 0;">$1</h3>')
                                                        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: white;">$1</strong>')
                                                        .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
                                                        .replace(/^(.+)/, '<p style="margin: 12px 0;">$1')
                                                        .replace(/(.+)$/, '$1</p>')
                                                }}
                                                />
                                            </details>
                                        )}
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                            Link Externo (opcional)
                                        </label>
                                        <input
                                            type="url"
                                            value={editingNoticia.link}
                                            onChange={(e) => setEditingNoticia({ ...editingNoticia, link: e.target.value })}
                                            placeholder="Ex: https://exemplo.com/materia-completa"
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: '1px solid #475569',
                                                background: '#0F172A',
                                                color: '#F8FAFC',
                                                fontSize: '14px'
                                            }}
                                        />
                                        <p style={{ color: '#64748B', fontSize: '11px', marginTop: '5px' }}>
                                            Se preencher, o botão "Ler mais" irá abrir este link em nova aba
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                        <button
                                            onClick={() => {
                                                setEditingNoticia(null);
                                                setShowNovaNoticia(false);
                                            }}
                                            style={{
                                                padding: '10px 20px',
                                                background: 'transparent',
                                                color: '#94A3B8',
                                                border: '1px solid #475569',
                                                borderRadius: '6px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSaveNoticia}
                                            disabled={savingNoticia}
                                            style={{
                                                padding: '10px 24px',
                                                background: savingNoticia ? '#475569' : '#F59E0B',
                                                color: savingNoticia ? '#94A3B8' : '#0F172A',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: savingNoticia ? 'not-allowed' : 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {savingNoticia ? '⏳ Salvando...' : '💾 Salvar Notícia'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Lista de Notícias */}
                            <div style={{
                                background: '#1E293B',
                                borderRadius: '10px',
                                padding: '25px',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <h4 style={{ color: '#F59E0B', margin: '0 0 15px 0' }}>📋 Notícias Cadastradas</h4>
                                
                                {loadingNoticias ? (
                                    <p style={{ color: '#94A3B8', textAlign: 'center', padding: '20px' }}>
                                        ⏳ Carregando notícias...
                                    </p>
                                ) : noticias.length === 0 ? (
                                    <p style={{ color: '#94A3B8', textAlign: 'center', padding: '20px' }}>
                                        📭 Nenhuma notícia cadastrada ainda. Clique em "Nova Notícia" para começar.
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {noticias.map((noticia) => (
                                            <div
                                                key={noticia.id}
                                                style={{
                                                    background: '#0F172A',
                                                    padding: '15px',
                                                    borderRadius: '8px',
                                                    border: noticia.featured ? '2px solid #F59E0B' : '1px solid #475569',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: '15px'
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                        <span style={{
                                                            background: '#475569',
                                                            color: '#F8FAFC',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            #{noticia.id}
                                                        </span>
                                                        <span style={{
                                                            background: 'var(--carreira-wine)',
                                                            color: 'white',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {noticia.category}
                                                        </span>
                                                        {noticia.featured && (
                                                            <span style={{
                                                                background: '#F59E0B',
                                                                color: '#0F172A',
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                ⭐ DESTAQUE
                                                            </span>
                                                        )}
                                                        <span style={{ color: '#64748B', fontSize: '12px' }}>
                                                            {noticia.date}
                                                        </span>
                                                    </div>
                                                    <h5 style={{ color: '#F8FAFC', margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>
                                                        {noticia.title}
                                                    </h5>
                                                    <p style={{ color: '#94A3B8', margin: 0, fontSize: '12px', lineHeight: '1.5' }}>
                                                        {noticia.excerpt ? noticia.excerpt.substring(0, 120) + '...' : 'Sem descrição'}
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => {
                                                            setEditingNoticia(noticia);
                                                            setShowNovaNoticia(false);
                                                        }}
                                                        style={{
                                                            padding: '8px 12px',
                                                            background: '#3B82F6',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNoticia(noticia.id)}
                                                        style={{
                                                            padding: '8px 12px',
                                                            background: '#EF4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== ABA DE REVISÃO DE VEREDITOS ===== */}
                {activeTab === 'revisao-vereditos' && (
                    <div className="adm-content">
                        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <h3 style={{ color: '#F59E0B', margin: 0 }}>🔧 Revisão de Vereditos</h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={fetchLancesRevisao}
                                    disabled={loadingRevisao}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#3B82F6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: loadingRevisao ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    🔄 Atualizar Lista
                                </button>
                                <button
                                    onClick={recalcularTodosProblemas}
                                    disabled={loadingRevisao || lancesRevisao.filter(l => l.temProblema).length === 0}
                                    style={{
                                        padding: '10px 20px',
                                        background: lancesRevisao.filter(l => l.temProblema).length > 0 ? '#EF4444' : '#475569',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: lancesRevisao.filter(l => l.temProblema).length > 0 ? 'pointer' : 'not-allowed',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    ⚡ Corrigir Todos ({lancesRevisao.filter(l => l.temProblema).length})
                                </button>
                            </div>
                        </div>

                        <p style={{ color: '#94A3B8', marginBottom: '20px', fontSize: '14px', lineHeight: '1.6' }}>
                            Esta ferramenta verifica e corrige discrepâncias nos pontos dos vereditos. 
                            Lances com <span style={{ color: '#EF4444', fontWeight: 'bold' }}>⚠️ DISCREPÂNCIA</span> têm pontos calculados incorretamente e precisam de correção.
                        </p>

                        {loadingRevisao ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                                ⏳ Carregando lances para revisão...
                            </div>
                        ) : lancesRevisao.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                                📭 Nenhum lance com veredito encontrado.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {/* Resumo */}
                                <div style={{
                                    background: '#1E293B',
                                    padding: '15px 20px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    gap: '30px',
                                    flexWrap: 'wrap',
                                    border: '1px solid #475569'
                                }}>
                                    <div>
                                        <span style={{ color: '#94A3B8', fontSize: '12px' }}>Total de Lances</span>
                                        <div style={{ color: '#F8FAFC', fontSize: '24px', fontWeight: 'bold' }}>{lancesRevisao.length}</div>
                                    </div>
                                    <div>
                                        <span style={{ color: '#22C55E', fontSize: '12px' }}>✅ Corretos</span>
                                        <div style={{ color: '#22C55E', fontSize: '24px', fontWeight: 'bold' }}>{lancesRevisao.filter(l => !l.temProblema).length}</div>
                                    </div>
                                    <div>
                                        <span style={{ color: '#EF4444', fontSize: '12px' }}>⚠️ Com Discrepância</span>
                                        <div style={{ color: '#EF4444', fontSize: '24px', fontWeight: 'bold' }}>{lancesRevisao.filter(l => l.temProblema).length}</div>
                                    </div>
                                </div>

                                {/* Lista de Lances */}
                                {lancesRevisao.map((lance) => (
                                    <div
                                        key={lance.id}
                                        style={{
                                            background: lance.temProblema ? 'rgba(239, 68, 68, 0.1)' : '#1E293B',
                                            padding: '20px',
                                            borderRadius: '10px',
                                            border: lance.temProblema ? '2px solid #EF4444' : '1px solid #475569'
                                        }}
                                    >
                                        {/* Header do Lance */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '14px' }}>🔖 {lance.codigo}</span>
                                                    {lance.temProblema ? (
                                                        <span style={{ background: '#EF4444', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                                            ⚠️ DISCREPÂNCIA
                                                        </span>
                                                    ) : (
                                                        <span style={{ background: '#22C55E', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                                            ✅ OK
                                                        </span>
                                                    )}
                                                    <span style={{ background: '#3B82F6', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                                        📊 {lance.placar}
                                                    </span>
                                                </div>
                                                
                                                {/* Informações do Lance */}
                                                <div style={{ 
                                                    display: 'grid', 
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                                                    gap: '8px',
                                                    marginBottom: '10px',
                                                    padding: '10px',
                                                    background: 'rgba(0,0,0,0.2)',
                                                    borderRadius: '6px'
                                                }}>
                                                    <div style={{ color: '#CBD5E1', fontSize: '13px' }}>
                                                        <span style={{ color: '#94A3B8' }}>📊 Temporada:</span> <strong>{String(lance.temporada || 'N/A')}</strong>
                                                    </div>
                                                    <div style={{ color: '#CBD5E1', fontSize: '13px' }}>
                                                        <span style={{ color: '#94A3B8' }}>🏁 Etapa:</span> <strong>{String(lance.round || 'N/A')}</strong> {lance.circuit && lance.circuit !== 'N/A' && `- ${String(lance.circuit)}`}
                                                    </div>
                                                    <div style={{ color: '#CBD5E1', fontSize: '13px' }}>
                                                        <span style={{ color: '#94A3B8' }}>🎯 Grid:</span> <strong>{String(lance.grid || 'N/A').toUpperCase()}</strong>
                                                    </div>
                                                    <div style={{ color: '#CBD5E1', fontSize: '13px' }}>
                                                        <span style={{ color: '#94A3B8' }}>📅 Data:</span> {(() => {
                                                            if (!lance.date) return 'N/A';
                                                            // Se já está em formato dd/mm/yyyy ou dd/mm/yy, usar direto
                                                            if (typeof lance.date === 'string' && lance.date.includes('/')) {
                                                                return lance.date;
                                                            }
                                                            // Tentar parsear como Date
                                                            const d = new Date(lance.date);
                                                            if (isNaN(d.getTime())) return lance.date || 'N/A';
                                                            return d.toLocaleDateString('pt-BR');
                                                        })()}
                                                    </div>
                                                    <div style={{ color: '#CBD5E1', fontSize: '13px' }}>
                                                        <span style={{ color: '#94A3B8' }}>👤 Acusador:</span> <strong>{String(lance.acusador || 'N/A')}</strong>
                                                    </div>
                                                    <div style={{ color: '#CBD5E1', fontSize: '13px' }}>
                                                        <span style={{ color: '#94A3B8' }}>🎯 Acusado:</span> <strong style={{ color: '#F59E0B' }}>{String(lance.acusado || 'N/A')}</strong>
                                                    </div>
                                                    <div style={{ color: '#CBD5E1', fontSize: '13px' }}>
                                                        <span style={{ color: '#94A3B8' }}>📹 Vídeo Defesa:</span> 
                                                        {lance.enviouVideoDefesa ? (
                                                            <strong style={{ color: '#22C55E' }}> ✅ Enviado</strong>
                                                        ) : (
                                                            <strong style={{ color: '#EF4444' }}> ❌ Não enviado</strong>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Botões de Ação */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <button
                                                    onClick={() => setEditandoVeredito(lance)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#3B82F6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    ✏️ Editar
                                                </button>
                                                {lance.temProblema && (
                                                    <button
                                                        onClick={() => recalcularPontosLance(lance)}
                                                        disabled={revisandoLance === lance.id}
                                                        style={{
                                                            padding: '8px 16px',
                                                            background: revisandoLance === lance.id ? '#475569' : '#F59E0B',
                                                            color: revisandoLance === lance.id ? '#94A3B8' : '#0F172A',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: revisandoLance === lance.id ? 'not-allowed' : 'pointer',
                                                            fontWeight: 'bold',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        {revisandoLance === lance.id ? '⏳...' : '🔧 Auto-corrigir'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Detalhes dos Pontos */}
                                        <div style={{
                                            background: '#0F172A',
                                            padding: '15px',
                                            borderRadius: '8px',
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                            gap: '15px'
                                        }}>
                                            <div>
                                                <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '3px' }}>Decisão</div>
                                                <div style={{ 
                                                    color: lance.veredito.culpado ? '#EF4444' : '#22C55E', 
                                                    fontWeight: 'bold',
                                                    fontSize: '14px'
                                                }}>
                                                    {lance.veredito.culpado ? '❌ CULPADO' : '✅ INOCENTE'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '3px' }}>Punição</div>
                                                <div style={{ color: '#F8FAFC', fontSize: '14px' }}>
                                                    {lance.punicaoLabel || 'N/A'} ({lance.pontosBase}pts)
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '3px' }}>Agravante</div>
                                                <div style={{ color: lance.veredito.agravante ? '#F59E0B' : '#64748B', fontSize: '14px' }}>
                                                    {lance.veredito.agravante ? `✅ Sim (+${lance.pontosAgravante}pts)` : '❌ Não'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '3px' }}>Sem Vídeo</div>
                                                <div style={{ color: lance.veredito.semVideo ? '#F59E0B' : '#64748B', fontSize: '14px' }}>
                                                    {lance.veredito.semVideo ? `✅ Sim (+${lance.pontosSemVideo}pts)` : '❌ Não'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '3px' }}>Pontos Atuais</div>
                                                <div style={{ 
                                                    color: lance.temProblema ? '#EF4444' : '#F8FAFC', 
                                                    fontWeight: 'bold',
                                                    fontSize: '18px'
                                                }}>
                                                    {lance.pontosAtuais}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '3px' }}>Pontos Corretos</div>
                                                <div style={{ 
                                                    color: '#22C55E', 
                                                    fontWeight: 'bold',
                                                    fontSize: '18px'
                                                }}>
                                                    {lance.pontosCorretos}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cálculo detalhado se houver problema */}
                                        {lance.temProblema && (
                                            <div style={{
                                                marginTop: '10px',
                                                padding: '10px 15px',
                                                background: 'rgba(239, 68, 68, 0.2)',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                color: '#FCA5A5'
                                            }}>
                                                <strong>📊 Cálculo:</strong> {lance.pontosBase} (punição) + {lance.pontosAgravante} (agravante) + {lance.pontosSemVideo} (sem vídeo) = <strong>{lance.pontosCorretos}</strong> pts
                                                <br/>
                                                <strong>⚠️ Diferença:</strong> {Math.abs(lance.pontosCorretos - lance.pontosAtuais)} ponto(s) {lance.pontosCorretos > lance.pontosAtuais ? 'a menos' : 'a mais'} registrado(s)
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== MODAL DE EDIÇÃO DE VEREDITO ===== */}
                {editandoVeredito && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10000,
                            padding: '20px'
                        }}
                        onClick={() => setEditandoVeredito(null)}
                    >
                        <div
                            style={{
                                background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)',
                                borderRadius: '12px',
                                padding: '30px',
                                maxWidth: '700px',
                                width: '100%',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                border: '2px solid #F59E0B'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ color: '#F59E0B', margin: 0 }}>
                                    ✏️ Editar Veredito - {editandoVeredito.codigo}
                                </h3>
                                <button
                                    onClick={() => setEditandoVeredito(null)}
                                    style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    ✕ Fechar
                                </button>
                            </div>

                            {/* Info do Lance */}
                            <div style={{ background: '#0F172A', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '13px' }}>
                                    <div><span style={{ color: '#94A3B8' }}>Acusador:</span> <span style={{ color: '#F8FAFC' }}>{String(editandoVeredito.acusador || 'N/A')}</span></div>
                                    <div><span style={{ color: '#94A3B8' }}>Acusado:</span> <span style={{ color: '#F59E0B', fontWeight: 'bold' }}>{String(editandoVeredito.acusado || 'N/A')}</span></div>
                                    <div><span style={{ color: '#94A3B8' }}>Etapa:</span> <span style={{ color: '#F8FAFC' }}>T{String(editandoVeredito.temporada || '')} R{String(editandoVeredito.round || '')} - {String(editandoVeredito.circuit || '')}</span></div>
                                    <div><span style={{ color: '#94A3B8' }}>Grid:</span> <span style={{ color: '#F8FAFC' }}>{editandoVeredito.grid?.toUpperCase()}</span></div>
                                </div>
                            </div>

                            {/* Formulário de Edição */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {/* Decisão */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Decisão</label>
                                    <select
                                        value={editandoVeredito.veredito.culpado ? 'culpado' : 'inocente'}
                                        onChange={(e) => setEditandoVeredito({
                                            ...editandoVeredito,
                                            veredito: { ...editandoVeredito.veredito, culpado: e.target.value === 'culpado' }
                                        })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC', fontSize: '14px' }}
                                    >
                                        <option value="culpado">❌ CULPADO</option>
                                        <option value="inocente">✅ INOCENTE</option>
                                    </select>
                                </div>

                                {/* Punição */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Punição</label>
                                    <select
                                        value={editandoVeredito.veredito.punicao || ''}
                                        onChange={(e) => setEditandoVeredito({
                                            ...editandoVeredito,
                                            veredito: { ...editandoVeredito.veredito, punicao: e.target.value }
                                        })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC', fontSize: '14px' }}
                                    >
                                        <option value="">Nenhuma</option>
                                        <option value="advertencia">⚠️ Advertência (0 pts)</option>
                                        <option value="leve">🟡 Leve (5 pts)</option>
                                        <option value="media">🟠 Média (10 pts)</option>
                                        <option value="grave">🔴 Grave (15 pts)</option>
                                        <option value="gravissima">⛔ Gravíssima (20 pts)</option>
                                    </select>
                                </div>

                                {/* Checkboxes */}
                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#CBD5E1' }}>
                                        <input
                                            type="checkbox"
                                            checked={editandoVeredito.veredito.agravante || false}
                                            onChange={(e) => setEditandoVeredito({
                                                ...editandoVeredito,
                                                veredito: { ...editandoVeredito.veredito, agravante: e.target.checked }
                                            })}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        ➕ Agravante (+5 pts)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#CBD5E1' }}>
                                        <input
                                            type="checkbox"
                                            checked={editandoVeredito.veredito.semVideo || false}
                                            onChange={(e) => setEditandoVeredito({
                                                ...editandoVeredito,
                                                veredito: { ...editandoVeredito.veredito, semVideo: e.target.checked }
                                            })}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        📹 Sem Vídeo (+5 pts)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#CBD5E1' }}>
                                        <input
                                            type="checkbox"
                                            checked={editandoVeredito.veredito.raceBan || false}
                                            onChange={(e) => setEditandoVeredito({
                                                ...editandoVeredito,
                                                veredito: { ...editandoVeredito.veredito, raceBan: e.target.checked }
                                            })}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        ⛔ Race BAN
                                    </label>
                                </div>

                                {/* Pontos Perdidos (manual) */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Pontos Perdidos (total)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editandoVeredito.veredito.pontosPerdidos || 0}
                                        onChange={(e) => setEditandoVeredito({
                                            ...editandoVeredito,
                                            veredito: { ...editandoVeredito.veredito, pontosPerdidos: parseInt(e.target.value) || 0 }
                                        })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC', fontSize: '14px' }}
                                    />
                                    <p style={{ color: '#64748B', fontSize: '11px', marginTop: '5px' }}>
                                        Cálculo automático: {(() => {
                                            const pts = { advertencia: 0, leve: 5, media: 10, grave: 15, gravissima: 20 };
                                            const base = pts[editandoVeredito.veredito.punicao] || 0;
                                            const agr = editandoVeredito.veredito.agravante ? 5 : 0;
                                            const sv = editandoVeredito.veredito.semVideo ? 5 : 0;
                                            return `${base} + ${agr} + ${sv} = ${base + agr + sv} pts`;
                                        })()}
                                    </p>
                                </div>

                                {/* Botão Auto-Calcular */}
                                <button
                                    onClick={() => {
                                        const pts = { advertencia: 0, leve: 5, media: 10, grave: 15, gravissima: 20 };
                                        const base = pts[editandoVeredito.veredito.punicao] || 0;
                                        const agr = editandoVeredito.veredito.agravante ? 5 : 0;
                                        const sv = editandoVeredito.veredito.semVideo ? 5 : 0;
                                        setEditandoVeredito({
                                            ...editandoVeredito,
                                            veredito: { ...editandoVeredito.veredito, pontosPerdidos: base + agr + sv }
                                        });
                                    }}
                                    style={{ padding: '10px', background: '#6366F1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    🔄 Auto-Calcular Pontos
                                </button>

                                {/* Botão Salvar */}
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Confirmar alterações no veredito?')) return;
                                        
                                        try {
                                            const { error } = await supabase
                                                .from('notificacoes_admin')
                                                .update({
                                                    dados: {
                                                        ...editandoVeredito.dadosCompletos,
                                                        veredito: editandoVeredito.veredito
                                                    }
                                                })
                                                .eq('id', editandoVeredito.id);

                                            if (error) throw error;

                                            alert('✅ Veredito atualizado com sucesso!');
                                            setEditandoVeredito(null);
                                            fetchLancesRevisao();
                                        } catch (error) {
                                            console.error('Erro ao salvar:', error);
                                            alert('❌ Erro ao salvar: ' + error.message);
                                        }
                                    }}
                                    style={{ padding: '12px', background: '#22C55E', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
                                >
                                    💾 Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== MODAL DE EDIÇÃO DE USUÁRIO ===== */}
                {editingUser && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        padding: '20px'
                    }}
                    onClick={() => setEditingUser(null)}
                    >
                        <div style={{
                            background: '#1E293B',
                            borderRadius: '12px',
                            padding: '30px',
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            border: '2px solid #3B82F6'
                        }}
                        onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ color: '#3B82F6', margin: 0, fontSize: '18px' }}>
                                    ✏️ Editar Usuário
                                </h3>
                                <button
                                    onClick={() => setEditingUser(null)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94A3B8',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        padding: '0',
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Nome do Piloto *
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.nome}
                                        onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                                        placeholder="Ex: ALAIN PROST"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        E-mail *
                                    </label>
                                    <input
                                        type="email"
                                        value={editingUser.email}
                                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                        placeholder="Ex: piloto@example.com"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        COD IDML
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.cod_idml || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, cod_idml: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                                        placeholder="Ex: MLF1-0320"
                                        maxLength={9}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px',
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                    <div style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>
                                        Formato obrigatório: MLF1-XXXX (4 dígitos). Deixe vazio apenas se necessário.
                                    </div>
                                </div>

                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Grid *
                                    </label>
                                    <select
                                        value={editingUser.grid}
                                        onChange={(e) => setEditingUser({ ...editingUser, grid: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="carreira">Carreira</option>
                                        <option value="light">Light</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Equipe
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.equipe || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, equipe: e.target.value })}
                                        placeholder="Ex: MCLAREN"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.whatsapp || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, whatsapp: formatWhatsApp(e.target.value) })}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Gamertag
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.gamertag || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, gamertag: e.target.value })}
                                        placeholder="Ex: Piloto123"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#0F172A', borderRadius: '6px' }}>
                                    <input
                                        type="checkbox"
                                        id="is_steward"
                                        checked={editingUser.is_steward || false}
                                        onChange={(e) => setEditingUser({ ...editingUser, is_steward: e.target.checked })}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="is_steward" style={{ color: '#F8FAFC', fontSize: '14px', cursor: 'pointer', margin: 0 }}>
                                        É Steward (acesso ao painel de análises)
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                    <button
                                        onClick={() => setEditingUser(null)}
                                        style={{
                                            padding: '10px 20px',
                                            background: '#475569',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveUser}
                                        disabled={savingUser}
                                        style={{
                                            padding: '10px 20px',
                                            background: savingUser ? '#475569' : '#22C55E',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: savingUser ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {savingUser ? '⏳ Salvando...' : '💾 Salvar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Cadastro de Novo Piloto */}
                {showCadastroPiloto && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        padding: '20px'
                    }}>
                        <div style={{
                            background: '#1E293B',
                            borderRadius: '12px',
                            padding: '30px',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ margin: 0, color: '#F8FAFC', fontSize: '1.5rem' }}>➕ Cadastrar Novo Piloto</h2>
                                <button
                                    onClick={() => setShowCadastroPiloto(false)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94A3B8',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        padding: '0',
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {/* Tipo de Piloto */}
                                <div>
                                    <label style={{ color: '#F8FAFC', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                        Tipo de Piloto *
                                    </label>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            background: novoPiloto.tipo_piloto === 'ativo' ? 'rgba(34, 197, 94, 0.2)' : '#0F172A',
                                            border: `2px solid ${novoPiloto.tipo_piloto === 'ativo' ? '#22C55E' : '#475569'}`,
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            color: '#F8FAFC',
                                            flex: 1,
                                            transition: 'all 0.2s'
                                        }}>
                                            <input
                                                type="radio"
                                                name="tipo_piloto"
                                                value="ativo"
                                                checked={novoPiloto.tipo_piloto === 'ativo'}
                                                onChange={(e) => setNovoPiloto({ ...novoPiloto, tipo_piloto: e.target.value })}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontWeight: '600' }}>🏎️ Piloto Ativo</span>
                                        </label>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            background: novoPiloto.tipo_piloto === 'ex-piloto' ? 'rgba(148, 163, 184, 0.2)' : '#0F172A',
                                            border: `2px solid ${novoPiloto.tipo_piloto === 'ex-piloto' ? '#94A3B8' : '#475569'}`,
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            color: '#F8FAFC',
                                            flex: 1,
                                            transition: 'all 0.2s'
                                        }}>
                                            <input
                                                type="radio"
                                                name="tipo_piloto"
                                                value="ex-piloto"
                                                checked={novoPiloto.tipo_piloto === 'ex-piloto'}
                                                onChange={(e) => setNovoPiloto({ ...novoPiloto, tipo_piloto: e.target.value })}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontWeight: '600' }}>📜 Ex-Piloto</span>
                                        </label>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '5px' }}>
                                        {novoPiloto.tipo_piloto === 'ex-piloto' 
                                            ? '⚠️ Ex-pilotos ficam com status PENDENTE e precisam ser aprovados pelo admin.'
                                            : '✅ Pilotos ativos são cadastrados com status ATIVO automaticamente.'}
                                    </div>
                                </div>

                                {/* Nome */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Nome Completo *
                                    </label>
                                    <input
                                        type="text"
                                        value={novoPiloto.nome}
                                        onChange={(e) => setNovoPiloto({ ...novoPiloto, nome: e.target.value })}
                                        placeholder="Ex: JOÃO SILVA"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={novoPiloto.email}
                                        onChange={(e) => setNovoPiloto({ ...novoPiloto, email: e.target.value })}
                                        placeholder="Ex: joao@example.com"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                {/* WhatsApp */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        WhatsApp (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={novoPiloto.whatsapp}
                                        onChange={(e) => setNovoPiloto({ ...novoPiloto, whatsapp: e.target.value })}
                                        placeholder="Ex: (83) 99152-6615"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                {/* Grid */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Grid *
                                    </label>
                                    <select
                                        value={novoPiloto.grid}
                                        onChange={(e) => setNovoPiloto({ ...novoPiloto, grid: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="light">Light</option>
                                        <option value="carreira">Carreira</option>
                                    </select>
                                </div>

                                {/* Equipe */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Equipe (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={novoPiloto.equipe}
                                        onChange={(e) => setNovoPiloto({ ...novoPiloto, equipe: e.target.value })}
                                        placeholder="Ex: McLaren"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                {/* Gamertag */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Gamertag (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={novoPiloto.gamertag}
                                        onChange={(e) => setNovoPiloto({ ...novoPiloto, gamertag: e.target.value })}
                                        placeholder="Ex: Piloto123"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                {/* Botões */}
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                    <button
                                        onClick={() => {
                                            setShowCadastroPiloto(false);
                                            setNovoPiloto({
                                                tipo_piloto: 'ativo',
                                                nome: '',
                                                email: '',
                                                whatsapp: '',
                                                grid: 'light',
                                                equipe: '',
                                                gamertag: ''
                                            });
                                        }}
                                        style={{
                                            padding: '10px 20px',
                                            background: '#475569',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCadastrarPiloto}
                                        disabled={salvandoPiloto}
                                        style={{
                                            padding: '10px 20px',
                                            background: salvandoPiloto ? '#475569' : '#22C55E',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: salvandoPiloto ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {salvandoPiloto ? '⏳ Cadastrando...' : '💾 Cadastrar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Modal de Votos dos Jurados */}
        {lanceVotosModal && (
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    padding: isMobile ? '10px' : '20px',
                }}
                onClick={fecharModalVotos}
            >
                <div
                    style={{
                        background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)',
                        borderRadius: '12px',
                        padding: isMobile ? '20px' : '30px',
                        maxWidth: isMobile ? '100%' : '800px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        border: '1px solid #475569',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header do Modal */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ color: '#F8FAFC', margin: 0, fontSize: isMobile ? '18px' : '24px' }}>
                                👨‍⚖️ Votos dos Jurados
                            </h2>
                            <p style={{ color: '#94A3B8', margin: '5px 0 0 0', fontSize: '14px' }}>
                                🔖 {lanceVotosModal.codigoLance}
                            </p>
                        </div>
                        <button
                            onClick={fecharModalVotos}
                            style={{
                                background: '#EF4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold',
                            }}
                        >
                            ✕ Fechar
                        </button>
                    </div>

                    {loadingVotos ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                            ⏳ Carregando votos...
                        </div>
                    ) : (
                        <>
                            {/* Resumo do Lance */}
                            <div style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid #8B5CF6',
                                borderRadius: '8px',
                                padding: '15px',
                                marginBottom: '20px',
                            }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ color: '#94A3B8', fontSize: '12px' }}>Status:</span>
                                        <span style={{ 
                                            color: lanceVotosModal.status === 'solicitacao_anulada' ? '#6B7280' : lanceVotosModal.status === 'analise_realizada' ? '#22C55E' : '#F59E0B',
                                            marginLeft: '8px',
                                            fontWeight: 'bold'
                                        }}>
                                            {lanceVotosModal.status === 'solicitacao_anulada' ? '🚫 SOLICITAÇÃO ANULADA' : lanceVotosModal.status === 'analise_realizada' ? '✅ ANÁLISE REALIZADA' : '⏳ AGUARDANDO ANÁLISE'}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ color: '#94A3B8', fontSize: '12px' }}>Total de Votos:</span>
                                        <span style={{ color: '#F8FAFC', marginLeft: '8px', fontWeight: 'bold', fontSize: '18px' }}>
                                            {lanceVotosModal.votos.length}
                                        </span>
                                    </div>
                                    {lanceVotosModal.votos.length > 0 && (
                                        <>
                                            <div>
                                                <span style={{ color: '#94A3B8', fontSize: '12px' }}>Culpado:</span>
                                                <span style={{ color: '#EF4444', marginLeft: '8px', fontWeight: 'bold' }}>
                                                    {lanceVotosModal.votos.filter(v => v.culpado).length}
                                                </span>
                                            </div>
                                            <div>
                                                <span style={{ color: '#94A3B8', fontSize: '12px' }}>Inocente:</span>
                                                <span style={{ color: '#22C55E', marginLeft: '8px', fontWeight: 'bold' }}>
                                                    {lanceVotosModal.votos.filter(v => !v.culpado).length}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                    {lanceVotosModal.veredito && (
                                        <div style={{ width: '100%', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #475569' }}>
                                            <div style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '5px' }}>Veredito Final:</div>
                                            <div style={{ color: '#F8FAFC', fontWeight: 'bold' }}>
                                                {lanceVotosModal.veredito.decisao} - {lanceVotosModal.veredito.placar}
                                            </div>
                                            {lanceVotosModal.veredito.punicao && (
                                                <div style={{ color: '#F59E0B', fontSize: '14px', marginTop: '5px' }}>
                                                    Punição: {(() => {
                                                        const labelsPunicao = {
                                                            'advertencia': '⚠️ Advertência (Alerta Disciplinar!)',
                                                            'leve': '🟡 Leve - 5 pontos',
                                                            'media': '🟠 Média - 10 pontos',
                                                            'grave': '🔴 Grave - 15 pontos',
                                                            'gravissima': '⛔ Gravíssima - 20 pontos'
                                                        };
                                                        return labelsPunicao[lanceVotosModal.veredito.punicao] || lanceVotosModal.veredito.labelPunicao || lanceVotosModal.veredito.punicao;
                                                    })()}
                                                    {lanceVotosModal.veredito.agravante && ' + Agravante (+5pts)'}
                                                    {lanceVotosModal.veredito.semVideo && ' + Sem Vídeo (+5pts)'}
                                                </div>
                                            )}
                                            {lanceVotosModal.veredito.pontosPerdidos > 0 && (
                                                <div style={{ color: '#EF4444', fontSize: '14px', marginTop: '5px', fontWeight: 'bold' }}>
                                                    Pontos Perdidos: {lanceVotosModal.veredito.pontosPerdidos}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Lista de Votos */}
                            {lanceVotosModal.votos.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>📭</div>
                                    <p>Nenhum voto registrado ainda</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {lanceVotosModal.votos.map((voto, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                background: voto.culpado ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                                border: `2px solid ${voto.culpado ? '#EF4444' : '#22C55E'}`,
                                                borderRadius: '8px',
                                                padding: '15px',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>
                                                        {voto.jurado || 'Jurado Anônimo'}
                                                    </div>
                                                    {voto.juradoEmail && (
                                                        <div style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '5px' }}>
                                                            📧 {voto.juradoEmail}
                                                        </div>
                                                    )}
                                                    <div style={{ 
                                                        display: 'inline-block',
                                                        background: voto.culpado ? '#EF4444' : '#22C55E',
                                                        color: 'white',
                                                        padding: '4px 10px',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold',
                                                        marginTop: '5px'
                                                    }}>
                                                        {voto.culpado ? '❌ CULPADO' : '✅ INOCENTE'}
                                                    </div>
                                                </div>
                                                <div style={{ color: '#64748B', fontSize: '12px', textAlign: 'right' }}>
                                                    {voto.dataVoto ? new Date(voto.dataVoto).toLocaleString('pt-BR') : '-'}
                                                </div>
                                            </div>

                                            {voto.culpado && voto.punicao && (
                                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <div style={{ color: '#F59E0B', fontSize: '14px', fontWeight: 'bold' }}>
                                                        Punição: {voto.punicao}
                                                        {voto.agravante && ' + Agravante'}
                                                    </div>
                                                </div>
                                            )}

                                            {(voto.semVideo || voto.agravante) && (
                                                <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                    {voto.semVideo && (
                                                        <span style={{
                                                            background: '#F59E0B',
                                                            color: 'white',
                                                            padding: '3px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                        }}>
                                                            🎥 Sem Vídeo
                                                        </span>
                                                    )}
                                                    {voto.agravante && (
                                                        <span style={{
                                                            background: '#EF4444',
                                                            color: 'white',
                                                            padding: '3px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                        }}>
                                                            ⚠️ Agravante
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {voto.justificativa && (
                                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <div style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '5px' }}>Justificativa:</div>
                                                    <div style={{ color: '#E2E8F0', fontSize: '14px', lineHeight: '1.5' }}>
                                                        {voto.justificativa}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            )}

        {/* Modal Anular Solicitação (link com problema, sem visibilidade, etc.) */}
        {anulacaoModal && (
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10001,
                    padding: isMobile ? '16px' : '24px',
                }}
                onClick={() => { setAnulacaoModal(null); setMotivoAnulacaoInput(''); }}
            >
                <div
                    style={{
                        background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)',
                        borderRadius: '12px',
                        padding: isMobile ? '20px' : '28px',
                        maxWidth: '480px',
                        width: '100%',
                        border: '1px solid #475569',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ marginBottom: '16px' }}>
                        <h3 style={{ color: '#F8FAFC', margin: '0 0 6px 0', fontSize: '18px' }}>
                            🚫 Anular solicitação
                        </h3>
                        <p style={{ color: '#94A3B8', margin: 0, fontSize: '13px' }}>
                            Lance {anulacaoModal.dados?.codigoLance || 'N/A'} – use quando o link estiver incorreto, sem visibilidade ou com outro problema.
                        </p>
                    </div>
                    <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>
                        Justifique o motivo da anulação *
                    </label>
                    <textarea
                        value={motivoAnulacaoInput}
                        onChange={(e) => setMotivoAnulacaoInput(e.target.value)}
                        placeholder="Ex.: Link do vídeo incorreto / Vídeo privado ou sem visibilidade / Outro problema técnico..."
                        rows={4}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #475569',
                            background: '#0F172A',
                            color: '#E2E8F0',
                            fontSize: '14px',
                            resize: 'vertical',
                            minHeight: '90px',
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button
                            type="button"
                            onClick={() => { setAnulacaoModal(null); setMotivoAnulacaoInput(''); }}
                            style={{
                                padding: '10px 18px',
                                background: '#475569',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px',
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => anularSolicitacao(anulacaoModal.notifId, anulacaoModal.dados, motivoAnulacaoInput)}
                            style={{
                                padding: '10px 18px',
                                background: '#6B7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px',
                            }}
                        >
                            🚫 Anular solicitação
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}

export default Admin;
