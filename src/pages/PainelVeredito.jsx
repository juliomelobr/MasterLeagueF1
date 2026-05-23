import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import VideoEmbed from '../components/VideoEmbed';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { isMobileDevice } from '../utils/deviceDetection';
import { atualizarLancesComDefesaExpirada } from '../hooks/useAnalises';
import { flushPendingJuradoNotifications, notifyAdminVereditoFinal } from '../utils/emailService';
import '../index.css';

function PainelVeredito() {
    const navigate = useNavigate();
    const { showAlert, showConfirm, alertState } = useCustomAlert();
    const [loading, setLoading] = useState(true);
    const [lances, setLances] = useState([]);
    const [expandedLances, setExpandedLances] = useState({});
    
    // Detectar dispositivo para responsividade
    const [isMobile, setIsMobile] = useState(isMobileDevice());
    useEffect(() => {
        const handleResize = () => setIsMobile(isMobileDevice());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        flushPendingJuradoNotifications();
        const intervalId = setInterval(() => {
            flushPendingJuradoNotifications();
        }, 10 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, []);
    
    // Estado dos votos em edição (preserva durante re-renders)
    const [votosEmEdicao, setVotosEmEdicao] = useState({});

    // Autenticação - Fluxo: Google Login -> Verificação WhatsApp -> Acesso
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authStep, setAuthStep] = useState('checking'); // 'checking', 'google_required', 'whatsapp_required', 'authenticated'
    const [userEmail, setUserEmail] = useState('');
    const [whatsappInput, setWhatsappInput] = useState('');
    const [nomeJurado, setNomeJurado] = useState('');
    const [juradoId, setJuradoId] = useState(null);
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [juradoData, setJuradoData] = useState(null);

    // Opções de punição com peso para desempate
    const punicoes = [
        { value: 'advertencia', label: '⚠️ Advertência (Alerta Disciplinar!)', pontos: 0, peso: 1 },
        { value: 'leve', label: '🟡 Leve - Perda de 5 pontos', pontos: 5, peso: 2 },
        { value: 'media', label: '🟠 Média - Perda de 10 pontos', pontos: 10, peso: 3 },
        { value: 'grave', label: '🔴 Grave - Perda de 15 pontos', pontos: 15, peso: 4 },
        { value: 'gravissima', label: '⛔ Gravíssima - Perda de 20 pontos + Race BAN', pontos: 20, peso: 5, raceBan: true },
    ];

    // Scroll removido - estava causando problemas no formulário

    const toggleLance = (lanceId) => {
        // Preservar posição do scroll antes de expandir/colapsar
        const currentScroll = window.scrollY || document.documentElement.scrollTop;
        
        setExpandedLances(prev => ({ ...prev, [lanceId]: !prev[lanceId] }));
        
        // Preservar scroll após expandir/colapsar
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const newScroll = window.scrollY || document.documentElement.scrollTop;
                if (newScroll !== currentScroll && currentScroll > 0) {
                    window.scrollTo(0, currentScroll);
                }
            });
        });
    };

    // Formatar WhatsApp com máscara (00) 00000-0000
    const formatWhatsApp = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) {
            return `(${numbers}`;
        } else if (numbers.length <= 7) {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        } else {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
        }
    };

    // Gerar caminho da foto do jurado baseado no nome
    // Formato: /jurados/nomesobrenome.png (lowercase, sem espaços)
    const getFotoJurado = (nome) => {
        if (!nome) return null;
        const nomeFormatado = nome.toLowerCase().replace(/\s+/g, '');
        return `/jurados/${nomeFormatado}.png`;
    };

    useEffect(() => {
        const init = async () => {
            // 1. Verificar se há sessão salva completa
            const savedAuth = localStorage.getItem('ml_juri_auth');
            const savedNome = localStorage.getItem('ml_juri_nome');
            const savedEmail = localStorage.getItem('ml_juri_email');
            const savedId = localStorage.getItem('ml_juri_id');
            
            if (savedAuth === 'true' && savedNome && savedEmail) {
                // Validar se o jurado ainda está ativo com esse email
                const { data: jurado } = await supabase
                    .from('jurados')
                    .select('*')
                    .eq('email_google', savedEmail.toLowerCase())
                    .eq('ativo', true)
                    .single();
                
                if (jurado) {
                    setIsAuthenticated(true);
                    setNomeJurado(jurado.nome);
                    setUserEmail(savedEmail);
                    setJuradoData(jurado);
                    setJuradoId(jurado.id ?? savedId ?? null);
                    setAuthStep('authenticated');
                    setLoading(false);
                    if (jurado.id != null) localStorage.setItem('ml_juri_id', String(jurado.id));
                    return;
                } else {
                    // Jurado desativado ou email alterado, limpar sessão
                    localStorage.removeItem('ml_juri_auth');
                    localStorage.removeItem('ml_juri_nome');
                    localStorage.removeItem('ml_juri_email');
                    localStorage.removeItem('ml_juri_id');
                }
            }

            // 2. Verificar sessão Google
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                // Não tem sessão Google, redirecionar para login de jurado
                navigate('/login-jurado');
                return;
            }

            // 3. Tem sessão Google, verificar se o email está vinculado a um jurado
            const email = sessionData.session.user.email?.toLowerCase();
            setUserEmail(email);

            const { data: jurado } = await supabase
                .from('jurados')
                .select('*')
                .eq('email_google', email)
                .eq('ativo', true)
                .single();

            if (!jurado) {
                // Email não está vinculado a nenhum jurado ativo
                navigate('/login-jurado');
                return;
            }

            // 4. Email vinculado, precisamos verificar WhatsApp
            setJuradoData(jurado);
            setAuthStep('whatsapp_required');
            setLoading(false);
        };
        init();
    }, [navigate]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchLances(true); // Primeira carga com loading
            // Auto-refresh desabilitado - use o botão Atualizar manualmente
        }
    }, [isAuthenticated]);

    const fetchLances = async (showLoading = true) => {
        // Preservar posição do scroll antes de buscar dados
        const currentScroll = window.scrollY || document.documentElement.scrollTop;
        
        if (showLoading) setLoading(true);
        try {
            // Atualizar lances com deadline de defesa expirado antes de buscar
            await atualizarLancesComDefesaExpirada(supabase);
            
            const { data, error } = await supabase
                .from('notificacoes_admin')
                .select('*')
                .eq('tipo', 'nova_acusacao')
                .eq('dados->>status', 'aguardando_analise')
                .order('created_at', { ascending: true });

            if (error) throw error;
            
            // Filtrar apenas lances que o jurado ainda NÃO votou
            const nomeJuradoAtual = localStorage.getItem('ml_juri_nome');
            const juradoIdAtual = localStorage.getItem('ml_juri_id');
            const juradoEmailAtual = (localStorage.getItem('ml_juri_email') || '').toLowerCase().trim();
            const lancesNaoVotados = (data || []).filter(lance => {
                const jaVotou = lance.dados?.votos?.some(v => {
                    const vEmail = (v?.juradoEmail || '').toLowerCase().trim();
                    return (juradoIdAtual && String(v?.juradoId) === String(juradoIdAtual)) ||
                           (juradoEmailAtual && vEmail && vEmail === juradoEmailAtual) ||
                           (nomeJuradoAtual && v?.jurado === nomeJuradoAtual);
                });
                return !jaVotou;
            });
            
            setLances(lancesNaoVotados);
            
            // Preservar scroll após atualizar dados
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const newScroll = window.scrollY || document.documentElement.scrollTop;
                    if (newScroll !== currentScroll && currentScroll > 0) {
                        window.scrollTo(0, currentScroll);
                    }
                });
            });
        } catch (err) {
            console.error('Erro ao buscar lances:', err);
            // Preservar scroll mesmo em caso de erro
            requestAnimationFrame(() => {
                if (currentScroll > 0) {
                    window.scrollTo(0, currentScroll);
                }
            });
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    // Redirecionar para login de jurado (separado do login de piloto)
    const handleGoogleLogin = () => {
        navigate('/login-jurado');
    };

    // Verificar WhatsApp
    const handleVerifyWhatsApp = async (e) => {
        e.preventDefault();
        setLoginError('');

        const whatsappDigits = whatsappInput.replace(/\D/g, '');
        
        if (whatsappDigits.length !== 11) {
            setLoginError('⚠️ WhatsApp deve ter 11 dígitos! Ex: (11) 99999-9999');
            return;
        }

        setLoginLoading(true);

        try {
            // Verificar se o WhatsApp bate com o cadastrado
            const whatsappCadastrado = juradoData.whatsapp?.replace(/\D/g, '');
            
            if (whatsappDigits !== whatsappCadastrado) {
                setLoginError('❌ WhatsApp não confere com o cadastro. Verifique com o administrador.');
                setLoginLoading(false);
                return;
            }

            // Sucesso! Autenticar o jurado
            setIsAuthenticated(true);
            setNomeJurado(juradoData.nome);
            setJuradoId(juradoData.id ?? null);
            setAuthStep('authenticated');

            // Salvar sessão (manter conectado)
            localStorage.setItem('ml_juri_auth', 'true');
            localStorage.setItem('ml_juri_nome', juradoData.nome);
            localStorage.setItem('ml_juri_email', userEmail);
            if (juradoData.id != null) localStorage.setItem('ml_juri_id', String(juradoData.id));

        } catch (err) {
            console.error('Erro na verificação:', err);
            setLoginError('❌ Erro ao verificar. Tente novamente.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('ml_juri_auth');
        localStorage.removeItem('ml_juri_nome');
        localStorage.removeItem('ml_juri_email');
        localStorage.removeItem('ml_juri_id');
        setIsAuthenticated(false);
        setAuthStep('checking');
        setWhatsappInput('');
        setNomeJurado('');
        setJuradoId(null);
        setJuradoData(null);
        setLoginError('');
        // Redirecionar para login de jurado
        navigate('/login-jurado');
    };

    // Identificar se um voto pertence ao jurado logado (compatível com votos antigos e novos)
    const isVotoDoJuradoAtual = (v) => {
        const juradoIdAtual = juradoData?.id ?? juradoId ?? localStorage.getItem('ml_juri_id');
        const juradoEmailAtual = (userEmail || localStorage.getItem('ml_juri_email') || '').toLowerCase().trim();
        const juradoNomeAtual = nomeJurado || localStorage.getItem('ml_juri_nome') || '';
        const vEmail = (v?.juradoEmail || '').toLowerCase().trim();

        return (juradoIdAtual && String(v?.juradoId) === String(juradoIdAtual)) ||
               (juradoEmailAtual && vEmail && vEmail === juradoEmailAtual) ||
               (juradoNomeAtual && v?.jurado === juradoNomeAtual);
    };

    // Ajustar rótulo da decisão para casos de "retirada de bug"
    const getDecisaoLabel = (decisao, isRetiradaBug) => {
        if (!decisao) return decisao;
        if (!isRetiradaBug) return decisao;
        return decisao === 'CULPADO' ? 'RETIRAR PUNIÇÃO' : 'MANTER PUNIÇÃO';
    };

    // Regra oficial: sem vídeo de defesa gera -5 pontos automaticamente
    const shouldApplySemVideoPenalty = (dadosLance, isRetiradaBug) => {
        if (isRetiradaBug) return false;
        const videoLinkDefesa = dadosLance?.defesa?.videoLinkDefesa;
        return !String(videoLinkDefesa || '').trim();
    };

    // Registrar voto do jurado
    const registrarVoto = async (lance, voto) => {
        // voto = { culpado: boolean, anulada: boolean, punicao: string (se culpado), agravante: boolean, justificativa: string }
        
        // Verificar se é retirada de bug
        const isRetiradaBug = lance.dados?.tipoSolicitacao === 'retirada_bug' || 
                               lance.dados?.acusado?.nome === 'Administração Master League F1';
        
        // Preservar posição do scroll antes de qualquer operação
        const currentScroll = window.scrollY || document.documentElement.scrollTop;
        
        if (!voto.justificativa || voto.justificativa.trim().length < 10) {
            await showAlert('Escreva uma justificativa (mínimo 10 caracteres)', 'Aviso');
            return;
        }

        // ===== OPÇÃO: ANULAR SOLICITAÇÃO (link com problema, sem visibilidade, etc.) =====
        if (voto.anulada === true) {
            try {
                const { data: lanceFresh, error: fetchError } = await supabase
                    .from('notificacoes_admin')
                    .select('id, dados')
                    .eq('id', lance.id)
                    .single();
                if (fetchError) throw fetchError;
                const dadosAtualizados = {
                    ...(lanceFresh?.dados || {}),
                    status: 'solicitacao_anulada',
                    motivoAnulacao: voto.justificativa.trim(),
                    dataAnulacao: new Date().toISOString(),
                    anuladaPorJurado: {
                        nome: nomeJurado || localStorage.getItem('ml_juri_nome') || '',
                        email: (userEmail || localStorage.getItem('ml_juri_email') || '').toLowerCase().trim()
                    }
                };
                const { error: updateError } = await supabase
                    .from('notificacoes_admin')
                    .update({ dados: dadosAtualizados })
                    .eq('id', lance.id);
                if (updateError) throw updateError;
                await showAlert('Solicitação anulada. O lance foi marcado como anulado (link com problema / sem visibilidade).', 'Sucesso');
                setVotosEmEdicao(prev => { const n = { ...prev }; delete n[lance.id]; return n; });
                setExpandedLances(prev => ({ ...prev, [lance.id]: false }));
                fetchLances(true);
                requestAnimationFrame(() => { window.scrollTo(0, currentScroll); });
            } catch (err) {
                console.error('Erro ao anular solicitação:', err);
                await showAlert('Erro ao anular solicitação: ' + err.message, 'Erro');
                requestAnimationFrame(() => { window.scrollTo(0, currentScroll); });
            }
            return;
        }

        // Validar punição apenas se for acusação normal (não retirada de bug)
        if (voto.culpado && !voto.punicao && !isRetiradaBug) {
            await showAlert('Selecione a punição!', 'Aviso');
            return;
        }

        try {
            // Identidade do jurado (preferir ID/email para não depender de nome)
            const juradoIdAtual = juradoData?.id ?? juradoId ?? localStorage.getItem('ml_juri_id');
            const juradoEmailAtual = (userEmail || localStorage.getItem('ml_juri_email') || '').toLowerCase().trim();
            const juradoNomeAtual = nomeJurado || localStorage.getItem('ml_juri_nome') || '';

            const MAX_TENTATIVAS = 3;
            let vereditoFinal = null;
            let decisaoFinal = null;
            let lanceDecidido = false;

            for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
                // Buscar versão mais recente do lance (evita sobrescrever voto de outro jurado)
                const { data: lanceFresh, error: fetchError } = await supabase
                    .from('notificacoes_admin')
                    .select('id, dados')
                    .eq('id', lance.id)
                    .single();

                if (fetchError) throw fetchError;

                const votosAtuais = lanceFresh?.dados?.votos || [];

                // Verifica se jurado já votou (compatível com votos antigos e novos)
                const jaVotou = votosAtuais.find(v => {
                    const vEmail = (v?.juradoEmail || '').toLowerCase().trim();
                    return (juradoIdAtual && String(v?.juradoId) === String(juradoIdAtual)) ||
                           (juradoEmailAtual && vEmail && vEmail === juradoEmailAtual) ||
                           (juradoNomeAtual && v?.jurado === juradoNomeAtual);
                });

                if (jaVotou) {
                    await showAlert('Você já registrou seu voto neste lance!', 'Aviso');
                    return;
                }

                const novoVoto = {
                    juradoId: juradoIdAtual ?? null,
                    juradoEmail: juradoEmailAtual || null,
                    jurado: juradoNomeAtual,
                    culpado: voto.culpado,
                    punicao: voto.culpado ? voto.punicao : null,
                    agravante: voto.culpado ? voto.agravante : false,
                    semVideo: voto.semVideo || false,
                    justificativa: voto.justificativa,
                    dataVoto: new Date().toISOString()
                };

                const novosVotos = [...votosAtuais, novoVoto];

                // Verificar se o lance foi decidido (3 votos culpado ou 3 votos inocente)
                const votosCulpado = novosVotos.filter(v => v.culpado).length;
                const votosInocente = novosVotos.filter(v => !v.culpado).length;
                lanceDecidido = votosCulpado >= 3 || votosInocente >= 3;
                decisaoFinal = votosCulpado >= 3 ? 'CULPADO' : (votosInocente >= 3 ? 'INOCENTE' : null);
                const decisaoFinalLabel = getDecisaoLabel(decisaoFinal, isRetiradaBug);

                // Sem vídeo: automático por ausência de link na defesa.
                // Mantemos o voto "semVideo" como fallback para casos técnicos.
                const votosSemVideo = novosVotos.filter(v => v.semVideo).length;
                const semVideoAutomatico = shouldApplySemVideoPenalty(lanceFresh?.dados, isRetiradaBug);
                const aplicarSemVideo = semVideoAutomatico || votosSemVideo >= 2;

                // Calcular punição final se culpado
                let veredito = null;
                if (lanceDecidido) {
                    if (decisaoFinal === 'CULPADO') {
                        // Calcular punição por maioria
                        const votosCulpadosList = novosVotos.filter(v => v.culpado);
                        const contagemPunicoes = {};
                        
                        votosCulpadosList.forEach(v => {
                            const key = v.punicao + (v.agravante ? '_agravante' : '');
                            contagemPunicoes[key] = (contagemPunicoes[key] || 0) + 1;
                        });

                        // Encontrar punição mais votada (desempate pela mais grave)
                        let punicaoVencedora = null;
                        let maxVotos = 0;
                        let pesoMax = 0;

                        Object.entries(contagemPunicoes).forEach(([key, count]) => {
                            const punicaoBase = key.replace('_agravante', '');
                            const temAgravante = key.includes('_agravante');
                            const punicaoInfo = punicoes.find(p => p.value === punicaoBase);
                            const pesoTotal = (punicaoInfo?.peso || 0) + (temAgravante ? 0.5 : 0);

                            if (count > maxVotos || (count === maxVotos && pesoTotal > pesoMax)) {
                                maxVotos = count;
                                pesoMax = pesoTotal;
                                punicaoVencedora = { punicao: punicaoBase, agravante: temAgravante };
                            }
                        });

                        const punicaoInfo = punicoes.find(p => p.value === punicaoVencedora?.punicao);
                        const pontosBase = punicaoInfo?.pontos || 0;
                        const pontosFinal = pontosBase + (punicaoVencedora?.agravante ? 5 : 0) + (aplicarSemVideo ? 5 : 0);

                        veredito = {
                            culpado: true,
                            decisao: decisaoFinalLabel,
                            placar: `${votosCulpado} x ${votosInocente}`,
                            punicao: punicaoVencedora?.punicao,
                            agravante: punicaoVencedora?.agravante,
                            semVideo: aplicarSemVideo,
                            pontosPerdidos: pontosFinal,
                            raceBan: punicaoInfo?.raceBan || false,
                            labelPunicao: punicaoInfo?.label || '',
                            dataVeredito: new Date().toISOString(),
                            totalVotos: novosVotos.length
                        };
                    } else {
                        // Inocente, mas pode ter punição por sem vídeo
                        const pontosPerdidos = aplicarSemVideo ? 5 : 0;
                        
                        veredito = {
                            culpado: false,
                            decisao: decisaoFinalLabel,
                            placar: `${votosInocente} x ${votosCulpado}`,
                            punicao: null,
                            agravante: false,
                            semVideo: aplicarSemVideo,
                            pontosPerdidos: pontosPerdidos,
                            raceBan: false,
                            labelPunicao: null,
                            dataVeredito: new Date().toISOString(),
                            totalVotos: novosVotos.length
                        };
                    }
                }

                const jaEstavaDecidido = lanceFresh?.dados?.status === 'analise_realizada' || !!lanceFresh?.dados?.veredito;

                const dadosAtualizados = {
                    ...lanceFresh.dados,
                    votos: novosVotos,
                    // Se lance foi decidido, atualizar status e adicionar veredito
                    ...(lanceDecidido && {
                        status: 'analise_realizada',
                        veredito: veredito
                    })
                };

                const { data: updatedRow, error: updateError } = await supabase
                    .from('notificacoes_admin')
                    .update({ dados: dadosAtualizados })
                    .eq('id', lance.id)
                    .select('id, dados')
                    .single();

                if (updateError) throw updateError;

                const votosConfirmados = updatedRow?.dados?.votos || [];
                const votoConfirmado = votosConfirmados.some(v => {
                    const vEmail = (v?.juradoEmail || '').toLowerCase().trim();
                    return (juradoIdAtual && String(v?.juradoId) === String(juradoIdAtual)) ||
                           (juradoEmailAtual && vEmail && vEmail === juradoEmailAtual) ||
                           (juradoNomeAtual && v?.jurado === juradoNomeAtual);
                });

                if (votoConfirmado) {
                    vereditoFinal = veredito;

                    // Se lance foi decidido AGORA (e não estava decidido antes), enviar notificação Telegram
                    if (lanceDecidido && veredito && !jaEstavaDecidido) {
                        await enviarTelegramVeredito(lance, veredito);
                    }
                    break;
                }

                if (tentativa === MAX_TENTATIVAS) {
                    throw new Error('Seu voto não foi confirmado no servidor. Tente novamente (ou avise o admin).');
                }

                await new Promise(resolve => setTimeout(resolve, 250 * tentativa));
            }

            if (lanceDecidido && vereditoFinal) {
                const decisaoFinalLabel = getDecisaoLabel(decisaoFinal, isRetiradaBug);
                await showAlert(`Voto registrado!\n\n🏁 LANCE DECIDIDO: ${decisaoFinalLabel}\nPlacar: ${vereditoFinal.placar}`, 'Sucesso');
            } else {
                await showAlert('Voto registrado com sucesso!', 'Sucesso');
            }
            
            // Limpar estado do voto em edição para este lance
            setVotosEmEdicao(prev => {
                const novo = { ...prev };
                delete novo[lance.id];
                return novo;
            });
            
            // Fecha a gaveta após votar
            setExpandedLances(prev => ({ ...prev, [lance.id]: false }));
            
            fetchLances(true);
            
            // Preservar scroll após todas as atualizações
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const newScroll = window.scrollY || document.documentElement.scrollTop;
                    if (newScroll !== currentScroll) {
                        window.scrollTo(0, currentScroll);
                    }
                });
            });

        } catch (err) {
            console.error('Erro ao registrar voto:', err);
            await showAlert('Erro ao registrar voto: ' + err.message, 'Erro');
            // Preservar scroll mesmo em caso de erro
            requestAnimationFrame(() => {
                window.scrollTo(0, currentScroll);
            });
        }
    };

    // Enviar notificação Telegram e WhatsApp quando lance é decidido
    const enviarTelegramVeredito = async (lance, veredito) => {
        const dados = lance.dados || {};
        const codigo = dados.codigoLance || 'N/A';
        const acusadoNome = dados.acusado?.nome || '-';
        const acusador = dados.acusador?.nome || '-';
        const etapa = dados.etapa || {};
        const circuit = etapa.circuit || '-';
        const round = etapa.round || '-';
        const season = etapa.season || etapa.temporada || dados.season || dados.temporada || '-';
        const grid = etapa.grid || dados.grid || '-';
        const date = etapa.date || dados.dataCorrida || '-';
        const gridLabel = grid === 'carreira' ? '🏆 CARREIRA' : (grid === 'light' ? '💡 LIGHT' : grid);
        const isRetiradaBug = dados?.tipoSolicitacao === 'retirada_bug' || acusadoNome === 'Administração Master League F1';
        
        // Se for retirada de bug, abreviar nome da administração
        const acusado = (isRetiradaBug && acusadoNome === 'Administração Master League F1') ? 'ADM MLF1' : acusadoNome;

        let mensagem = `👨‍⚖️ VEREDITO FINAL\n\n📋 Código: ${codigo}\n📊 Temporada: ${season}\n${gridLabel ? `🎯 Grid: ${gridLabel}\n` : ''}🏁 Round ${round} - ${circuit}\n📅 Data: ${date}\n👤 Acusador: ${acusador}\n🎯 Acusado: ${acusado}\n\n📊 Placar: ${veredito.placar}\n⚖️ Decisão: ${veredito.decisao}`;

        if (!isRetiradaBug && veredito.culpado) {
            mensagem += `\n\n⚠️ Punição: ${veredito.labelPunicao}`;
            if (veredito.agravante) mensagem += `\n➕ Agravante: +5 pontos`;
            if (veredito.semVideo) mensagem += `\n📹 Sem envio do vídeo: -5 pontos`;
            mensagem += `\n📉 Pontos perdidos: ${veredito.pontosPerdidos}`;
            if (veredito.raceBan) mensagem += `\n⛔ RACE BAN APLICADO!`;
        } else if (!isRetiradaBug && veredito.semVideo) {
            mensagem += `\n\n📹 Sem envio do vídeo: -5 pontos`;
            mensagem += `\n📉 Pontos perdidos: ${veredito.pontosPerdidos}`;
        }

        mensagem += `\n\n🔗 masterleaguef1.netlify.app/analises?tab=consulta`;

        const TELEGRAM_TOKEN = '8564635113:AAGjr7wnmepztm3CwmZoSw5RmC8BO1pNG04';
        const CHAT_ID = '5176212626';
        
        // CallMeBot WhatsApp API - Lista de destinatários
        const WHATSAPP_RECIPIENTS = [
            { phone: '555183433940', apikey: '6022419', nome: 'Admin' },
            { phone: '5511940133084', apikey: '3666307', nome: 'Edvan Paiva' },
        ];

        // Enviar Telegram
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CHAT_ID, text: mensagem })
            });
            console.log('✅ Telegram veredito enviado');
        } catch (err) {
            console.error('Erro Telegram:', err);
        }
        
        // Enviar WhatsApp para todos os destinatários
        const encodedMessage = encodeURIComponent(mensagem);
        for (const recipient of WHATSAPP_RECIPIENTS) {
            try {
                await fetch(`https://api.callmebot.com/whatsapp.php?phone=${recipient.phone}&text=${encodedMessage}&apikey=${recipient.apikey}`);
                console.log(`✅ WhatsApp veredito enviado para ${recipient.nome}`);
                // Pequeno delay entre envios
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                console.error(`Erro WhatsApp ${recipient.nome}:`, err);
            }
        }
    };

    // Calcular resultado final (mínimo 3 votos)
    const calcularResultado = (votos, dadosLance = null) => {
        if (!votos || votos.length < 3) return null;

        const votosCulpado = votos.filter(v => v.culpado).length;
        const votosInocente = votos.filter(v => !v.culpado).length;
        const votosSemVideo = votos.filter(v => v.semVideo).length;
        const isRetiradaBug = dadosLance?.tipoSolicitacao === 'retirada_bug' ||
                              dadosLance?.acusado?.nome === 'Administração Master League F1';
        const semVideoAutomatico = shouldApplySemVideoPenalty(dadosLance, isRetiradaBug);
        const aplicarSemVideo = semVideoAutomatico || votosSemVideo >= 2;

        const culpado = votosCulpado > votosInocente;

        if (!culpado) {
            const pontosPerdidos = aplicarSemVideo ? 5 : 0;
            return {
                culpado: false,
                placar: `${votosInocente} x ${votosCulpado}`,
                decisao: 'INOCENTADO',
                punicaoFinal: null,
                semVideo: aplicarSemVideo,
                pontosPerdidos: pontosPerdidos,
                raceBan: false
            };
        }

        // Calcular punição por maioria (com desempate pela mais grave)
        const votosCulpadosList = votos.filter(v => v.culpado);
        const contagemPunicoes = {};
        
        votosCulpadosList.forEach(v => {
            const key = v.punicao + (v.agravante ? '_agravante' : '');
            contagemPunicoes[key] = (contagemPunicoes[key] || 0) + 1;
        });

        // Encontrar punição com mais votos
        let punicaoVencedora = null;
        let maxVotos = 0;
        let pesoMax = 0;

        Object.entries(contagemPunicoes).forEach(([key, count]) => {
            const punicaoBase = key.replace('_agravante', '');
            const temAgravante = key.includes('_agravante');
            const punicaoInfo = punicoes.find(p => p.value === punicaoBase);
            const pesoTotal = (punicaoInfo?.peso || 0) + (temAgravante ? 0.5 : 0);

            // Se tem mais votos, ou empate e é mais grave
            if (count > maxVotos || (count === maxVotos && pesoTotal > pesoMax)) {
                maxVotos = count;
                pesoMax = pesoTotal;
                punicaoVencedora = { punicao: punicaoBase, agravante: temAgravante };
            }
        });

        const punicaoInfo = punicoes.find(p => p.value === punicaoVencedora.punicao);
        const pontosBase = punicaoInfo?.pontos || 0;
        const pontosFinal = pontosBase + (punicaoVencedora.agravante ? 5 : 0) + (aplicarSemVideo ? 5 : 0);

        return {
            culpado: true,
            placar: `${votosCulpado} x ${votosInocente}`,
            decisao: 'CULPADO',
            punicaoFinal: punicaoVencedora.punicao,
            agravante: punicaoVencedora.agravante,
            semVideo: aplicarSemVideo,
            pontosPerdidos: pontosFinal,
            raceBan: punicaoInfo?.raceBan || false,
            labelPunicao: punicaoInfo?.label || ''
        };
    };

    // Finalizar análise (quando tem mínimo 3 votos)
    const finalizarAnalise = async (lance) => {
        // Preservar posição do scroll antes de qualquer operação
        const currentScroll = window.scrollY || document.documentElement.scrollTop;
        
        const resultado = calcularResultado(lance.dados?.votos, lance.dados);
        
        if (!resultado) {
            await showAlert('São necessários pelo menos 3 votos para finalizar!', 'Aviso');
            return;
        }

        const confirmMessage = `Confirmar finalização?\n\nDecisão: ${resultado.decisao}\nPlacar: ${resultado.placar}${resultado.culpado ? `\nPunição: ${resultado.labelPunicao}${resultado.agravante ? ' + Agravante (+5pts)' : ''}\nPontos perdidos: ${resultado.pontosPerdidos}${resultado.raceBan ? '\n⛔ RACE BAN!' : ''}` : ''}`;
        const confirmed = await showConfirm(confirmMessage, 'Confirmar Finalização');
        if (!confirmed) {
            return;
        }

        try {
            const dadosAtualizados = {
                ...lance.dados,
                status: 'analise_realizada',
                veredito: {
                    culpado: resultado.culpado,
                    placar: resultado.placar,
                    punicao: resultado.punicaoFinal,
                    agravante: resultado.agravante,
                    semVideo: resultado.semVideo || false,
                    pontosPerdidos: resultado.pontosPerdidos,
                    raceBan: resultado.raceBan,
                    labelPunicao: resultado.labelPunicao,
                    dataVeredito: new Date().toISOString(),
                    totalVotos: lance.dados?.votos?.length || 0
                }
            };

            const { error } = await supabase
                .from('notificacoes_admin')
                .update({ dados: dadosAtualizados })
                .eq('id', lance.id);

            if (error) throw error;

            await enviarTelegram(lance, resultado);
            
            // Notificar ADM sobre o veredito final
            await notifyAdminVereditoFinal(lance, resultado);

            await showAlert('Análise finalizada com sucesso!', 'Sucesso');
            fetchLances(false); // Não mostrar loading ao finalizar
            
            // Preservar scroll após finalizar
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const newScroll = window.scrollY || document.documentElement.scrollTop;
                    if (newScroll !== currentScroll && currentScroll > 0) {
                        window.scrollTo(0, currentScroll);
                    }
                });
            });

        } catch (err) {
            console.error('Erro ao finalizar:', err);
            await showAlert('Erro: ' + err.message, 'Erro');
            // Preservar scroll mesmo em caso de erro
            requestAnimationFrame(() => {
                if (currentScroll > 0) {
                    window.scrollTo(0, currentScroll);
                }
            });
        }
    };

    const enviarTelegram = async (lance, resultado) => {
        const dados = lance.dados || {};
        const codigo = dados.codigoLance || 'N/A';
        const acusadoNome = dados.acusado?.nome || '-';
        const acusador = dados.acusador?.nome || '-';
        const etapa = dados.etapa || {};
        const circuit = etapa.circuit || '-';
        const round = etapa.round || '-';
        const season = etapa.season || etapa.temporada || dados.season || dados.temporada || '-';
        const grid = etapa.grid || dados.grid || '-';
        const date = etapa.date || dados.dataCorrida || '-';
        const gridLabel = grid === 'carreira' ? '🏆 CARREIRA' : (grid === 'light' ? '💡 LIGHT' : grid);
        const isRetiradaBug = dados?.tipoSolicitacao === 'retirada_bug' || acusadoNome === 'Administração Master League F1';
        
        // Se for retirada de bug, abreviar nome da administração
        const acusado = (isRetiradaBug && acusadoNome === 'Administração Master League F1') ? 'ADM MLF1' : acusadoNome;

        let mensagem = `👨‍⚖️ VEREDITO FINAL\n\n📋 Código: ${codigo}\n📊 Temporada: ${season}\n${gridLabel ? `🎯 Grid: ${gridLabel}\n` : ''}🏁 Round ${round} - ${circuit}\n📅 Data: ${date}\n👤 Acusador: ${acusador}\n🎯 Acusado: ${acusado}\n\n📊 Placar: ${resultado.placar}\n⚖️ Decisão: ${resultado.decisao}`;

        if (resultado.culpado) {
            mensagem += `\n\n⚠️ Punição: ${resultado.labelPunicao}`;
            if (resultado.agravante) mensagem += `\n➕ Agravante: +5 pontos`;
            if (resultado.semVideo) mensagem += `\n📹 Sem envio do vídeo: -5 pontos`;
            mensagem += `\n📉 Pontos perdidos: ${resultado.pontosPerdidos}`;
            if (resultado.raceBan) mensagem += `\n⛔ RACE BAN APLICADO!`;
        } else if (resultado.semVideo) {
            mensagem += `\n\n📹 Sem envio do vídeo: -5 pontos`;
            mensagem += `\n📉 Pontos perdidos: ${resultado.pontosPerdidos}`;
        }

        mensagem += `\n\n🔗 masterleaguef1.netlify.app/analises`;

        const TELEGRAM_TOKEN = '8564635113:AAGjr7wnmepztm3CwmZoSw5RmC8BO1pNG04';
        const CHAT_ID = '5176212626';

        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CHAT_ID, text: mensagem })
            });
        } catch (err) {
            console.error('Erro Telegram:', err);
        }
    };

    const formatarData = (isoDate) => {
        if (!isoDate) return '-';
        return new Date(isoDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    };

    // Componente de Votação Individual
    const VotacaoJurado = ({ lance }) => {
        const lanceId = lance.id;
        // Usar estado do componente pai para preservar durante re-renders
        const voto = votosEmEdicao[lanceId] || { culpado: null, punicao: '', agravante: false, semVideo: false, anulada: false, justificativa: '' };
        // Detectar mobile dentro do componente
        const [isMobileLocal] = useState(isMobileDevice());
        
        // Verificar se é retirada de bug
        const isRetiradaBug = lance.dados?.tipoSolicitacao === 'retirada_bug' || 
                           lance.dados?.acusado?.nome === 'Administração Master League F1';
        
        // Usar ref para justificativa (não causa re-render ao digitar)
        const justificativaRef = useRef(null);
        const [charCount, setCharCount] = useState(voto.justificativa?.length || 0);
        
        const setVoto = (novoVoto) => {
            setVotosEmEdicao(prev => ({ ...prev, [lanceId]: novoVoto }));
        };
        
        const votos = lance.dados?.votos || [];
        const jaVotou = votos.find(isVotoDoJuradoAtual);
        const resultado = calcularResultado(votos, lance.dados);

        // Função para obter justificativa atual
        const getJustificativa = () => {
            return justificativaRef.current?.value || '';
        };

        if (jaVotou) {
            const votoTexto = isRetiradaBug 
                ? (jaVotou.culpado ? 'RETIRAR PUNIÇÃO' : 'MANTER PUNIÇÃO')
                : (jaVotou.culpado ? 'CULPADO' : 'INOCENTE');
            
            return (
                <div style={{ background: '#0F172A', borderRadius: '8px', padding: '15px', border: '2px solid #22C55E' }}>
                    <div style={{ color: '#22C55E', fontWeight: 'bold', marginBottom: '10px' }}>✅ Você já votou neste lance</div>
                    <div style={{ color: '#94A3B8', fontSize: '13px' }}>
                        Seu voto: <strong style={{ color: jaVotou.culpado ? '#EF4444' : '#22C55E' }}>{votoTexto}</strong>
                        {jaVotou.culpado && !isRetiradaBug && <span> • {punicoes.find(p => p.value === jaVotou.punicao)?.label}{jaVotou.agravante ? ' + Agravante' : ''}</span>}
                    </div>
                </div>
            );
        }

        return (
            <div style={{ 
                background: '#0F172A', 
                borderRadius: '12px', 
                padding: isMobileLocal ? '15px' : '20px', 
                border: '2px solid #8B5CF6' 
            }}>
                <h4 style={{ 
                    color: '#8B5CF6', 
                    margin: '0 0 20px', 
                    fontSize: isMobileLocal ? '0.85rem' : '14px' 
                }}>🗳️ SEU VOTO ({nomeJurado})</h4>

                {/* Decisão */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '10px' }}>DECISÃO *</label>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '15px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                const currentScroll = window.scrollY || document.documentElement.scrollTop;
                                setVoto({ ...voto, culpado: true, anulada: false });
                                requestAnimationFrame(() => { window.scrollTo(0, currentScroll); });
                            }}
                            style={{ 
                                flex: 1, 
                                minWidth: isMobile ? '100%' : '100px',
                                padding: isMobile ? '12px' : '15px', 
                                borderRadius: '8px', 
                                border: voto.culpado === true ? '3px solid #EF4444' : '2px solid #475569', 
                                background: voto.culpado === true ? 'rgba(239, 68, 68, 0.2)' : 'transparent', 
                                color: voto.culpado === true ? '#EF4444' : '#94A3B8', 
                                fontSize: isMobile ? '0.85rem' : '14px', 
                                fontWeight: 'bold', 
                                cursor: 'pointer' 
                            }}
                        >
                            {isRetiradaBug ? '❌ RETIRAR PUNIÇÃO' : '❌ CULPADO'}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                const currentScroll = window.scrollY || document.documentElement.scrollTop;
                                setVoto({ ...voto, culpado: false, punicao: '', agravante: false, anulada: false });
                                requestAnimationFrame(() => { window.scrollTo(0, currentScroll); });
                            }}
                            style={{ 
                                flex: 1, 
                                minWidth: isMobile ? '100%' : '100px',
                                padding: isMobile ? '12px' : '15px', 
                                borderRadius: '8px', 
                                border: voto.culpado === false ? '3px solid #22C55E' : '2px solid #475569', 
                                background: voto.culpado === false ? 'rgba(34, 197, 94, 0.2)' : 'transparent', 
                                color: voto.culpado === false ? '#22C55E' : '#94A3B8', 
                                fontSize: isMobile ? '0.85rem' : '14px', 
                                fontWeight: 'bold', 
                                cursor: 'pointer' 
                            }}
                        >
                            {isRetiradaBug ? '✅ MANTER PUNIÇÃO' : '✅ INOCENTE'}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                const currentScroll = window.scrollY || document.documentElement.scrollTop;
                                setVoto({ ...voto, culpado: null, punicao: '', agravante: false, semVideo: false, anulada: true });
                                requestAnimationFrame(() => { window.scrollTo(0, currentScroll); });
                            }}
                            style={{ 
                                flex: 1, 
                                minWidth: isMobile ? '100%' : '100px',
                                padding: isMobile ? '12px' : '15px', 
                                borderRadius: '8px', 
                                border: voto.anulada === true ? '3px solid #6B7280' : '2px solid #475569', 
                                background: voto.anulada === true ? 'rgba(107, 114, 128, 0.25)' : 'transparent', 
                                color: voto.anulada === true ? '#E5E7EB' : '#94A3B8', 
                                fontSize: isMobile ? '0.85rem' : '14px', 
                                fontWeight: 'bold', 
                                cursor: 'pointer' 
                            }}
                        >
                            🚫 ANULAR SOLICITAÇÃO
                        </button>
                    </div>
                    {voto.anulada === true && (
                        <p style={{ color: '#9CA3AF', fontSize: '11px', marginTop: '8px', marginBottom: 0 }}>
                            Use quando o link do vídeo estiver incorreto, sem visibilidade ou com outro problema que impeça a análise.
                        </p>
                    )}
                </div>

                {/* Punição por Sem Envio de Vídeo (desabilitada para retirada de bug e quando anular solicitação) */}
                {!isRetiradaBug && !voto.anulada && (
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px 15px', background: voto.semVideo ? 'rgba(245, 158, 11, 0.2)' : 'transparent', border: voto.semVideo ? '2px solid #F59E0B' : '1px solid #475569', borderRadius: '8px' }}>
                            <input
                                type="checkbox"
                                checked={voto.semVideo || false}
                                onChange={(e) => {
                                    const currentScroll = window.scrollY || document.documentElement.scrollTop;
                                    setVoto({ ...voto, semVideo: e.target.checked });
                                    // Preservar scroll após re-render
                                    requestAnimationFrame(() => {
                                        window.scrollTo(0, currentScroll);
                                    });
                                }}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ color: voto.semVideo ? '#F59E0B' : '#CBD5E1', fontWeight: voto.semVideo ? 'bold' : 'normal' }}>
                                📹 Sem envio do vídeo de defesa (-5 pontos)
                            </span>
                        </label>
                    </div>
                )}

                {/* Punição (se culpado e não for retirada de bug e não for anular) - altura fixa para evitar scroll */}
                <div style={{ minHeight: voto.culpado === true && !isRetiradaBug && !voto.anulada ? 'auto' : '0', overflow: 'hidden' }}>
                {voto.culpado === true && !isRetiradaBug && !voto.anulada && (
                    <>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '10px' }}>PUNIÇÃO *</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {punicoes.map(p => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={(e) => { 
                                            e.preventDefault(); 
                                            e.stopPropagation(); 
                                            const currentScroll = window.scrollY || document.documentElement.scrollTop;
                                            setVoto({ ...voto, punicao: p.value });
                                            // Preservar scroll após re-render
                                            requestAnimationFrame(() => {
                                                window.scrollTo(0, currentScroll);
                                            });
                                        }}
                                        style={{
                                            padding: '12px 15px',
                                            borderRadius: '8px',
                                            border: voto.punicao === p.value ? '2px solid #F59E0B' : '1px solid #475569',
                                            background: voto.punicao === p.value ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                                            color: voto.punicao === p.value ? '#F59E0B' : '#CBD5E1',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Agravante */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px 15px', background: voto.agravante ? 'rgba(239, 68, 68, 0.2)' : 'transparent', border: voto.agravante ? '2px solid #EF4444' : '1px solid #475569', borderRadius: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={voto.agravante}
                                    onChange={(e) => {
                                        const currentScroll = window.scrollY || document.documentElement.scrollTop;
                                        setVoto({ ...voto, agravante: e.target.checked });
                                        // Preservar scroll após re-render
                                        requestAnimationFrame(() => {
                                            window.scrollTo(0, currentScroll);
                                        });
                                    }}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ color: voto.agravante ? '#EF4444' : '#CBD5E1', fontWeight: voto.agravante ? 'bold' : 'normal' }}>
                                    ➕ Aplicar Agravante (+5 pontos na punição)
                                </span>
                            </label>
                        </div>
                    </>
                )}
                </div>

                {/* Justificativa */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '10px' }}>JUSTIFICATIVA * (mínimo 10 caracteres)</label>
                    <textarea
                        ref={justificativaRef}
                        defaultValue={voto.justificativa || ''}
                        onChange={(e) => setCharCount(e.target.value.length)}
                        onFocus={(e) => {
                            // Prevenir scroll automático ao focar
                            const currentScroll = window.scrollY || document.documentElement.scrollTop;
                            requestAnimationFrame(() => {
                                if (window.scrollY !== currentScroll) {
                                    window.scrollTo(0, currentScroll);
                                }
                            });
                        }}
                        placeholder="Descreva sua análise do lance..."
                        rows={3}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC', fontSize: '14px', resize: 'vertical' }}
                    />
                    <div style={{ textAlign: 'right', color: charCount >= 10 ? '#22C55E' : '#64748B', fontSize: '11px', marginTop: '5px' }}>
                        {charCount} caracteres
                    </div>
                </div>

                {/* Botão Registrar Voto */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        registrarVoto(lance, { ...voto, justificativa: getJustificativa() });
                    }}
                    disabled={voto.culpado === null && !voto.anulada}
                    style={{
                        width: '100%',
                        padding: '15px',
                        background: (voto.culpado !== null || voto.anulada) ? 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' : '#475569',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        cursor: (voto.culpado !== null || voto.anulada) ? 'pointer' : 'not-allowed',
                        opacity: (voto.culpado !== null || voto.anulada) ? 1 : 0.5
                    }}
                >
                    {voto.anulada ? '🚫 Anular solicitação' : '🗳️ Registrar Meu Voto'}
                </button>
            </div>
        );
    };

    // Componente Placar de Votos
    const PlacarVotos = ({ lance }) => {
        const votos = lance.dados?.votos || [];
        const votosCulpado = votos.filter(v => v.culpado).length;
        const votosInocente = votos.filter(v => !v.culpado).length;
        const resultado = calcularResultado(votos);
        const podeFinalizarJurado = votos.length >= 3 && votos.find(isVotoDoJuradoAtual);
        
        // Verificar se é retirada de bug
        const isRetiradaBug = lance.dados?.tipoSolicitacao === 'retirada_bug' ||
                               lance.dados?.acusado?.nome === 'Administração Master League F1';
        
        // Definir labels baseado no tipo
        const labelCulpado = isRetiradaBug ? 'RETIRAR' : 'CULPADO';
        const labelInocente = isRetiradaBug ? 'MANTER' : 'INOCENTE';

        return (
            <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderRadius: '12px', padding: '20px', border: '2px solid #F59E0B', marginBottom: '20px' }}>
                <h4 style={{ color: '#F59E0B', margin: '0 0 15px', fontSize: '14px', textAlign: 'center' }}>📊 PLACAR DE VOTOS</h4>

                {/* Placar Visual */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', marginBottom: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#EF4444' }}>{votosCulpado}</div>
                        <div style={{ color: '#EF4444', fontSize: '12px' }}>{labelCulpado}</div>
                    </div>
                    <div style={{ fontSize: '24px', color: '#64748B' }}>X</div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#22C55E' }}>{votosInocente}</div>
                        <div style={{ color: '#22C55E', fontSize: '12px' }}>{labelInocente}</div>
                    </div>
                </div>

                {/* Barra de progresso */}
                <div style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginBottom: '5px' }}>
                        <span>{votos.length} de 3 votos mínimos</span>
                        <span>{votos.length >= 3 ? '✅ Quórum atingido' : `Faltam ${3 - votos.length}`}</span>
                    </div>
                    <div style={{ height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min((votos.length / 3) * 100, 100)}%`, background: votos.length >= 3 ? '#22C55E' : '#F59E0B', transition: 'width 0.3s' }} />
                    </div>
                </div>

                {/* Painel informativo de votos (sem revelar resultado) */}
                <div style={{ marginBottom: '15px' }}>
                    <div style={{ 
                        background: 'rgba(139, 92, 246, 0.1)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '8px',
                        padding: '12px 15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '20px' }}>🗳️</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '4px' }}>VOTOS REGISTRADOS</div>
                            <div style={{ color: '#F8FAFC', fontSize: '16px', fontWeight: 'bold' }}>
                                {votos.length === 0 ? (
                                    <span style={{ color: '#64748B' }}>Nenhum voto registrado ainda</span>
                                ) : (
                                    <span>{votos.length} {votos.length === 1 ? 'voto' : 'votos'} já {votos.length === 1 ? 'foi' : 'foram'} dado{votos.length === 1 ? '' : 's'}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resultado prévio (se já tem 3+ votos) */}
                {resultado && (
                    <div style={{
                        background: resultado.culpado ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        border: `2px solid ${resultado.culpado ? '#EF4444' : '#22C55E'}`,
                        borderRadius: '8px',
                        padding: '15px',
                        marginBottom: '15px'
                    }}>
                        <div style={{ color: resultado.culpado ? '#EF4444' : '#22C55E', fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>
                            {resultado.decisao}
                        </div>
                        {resultado.culpado && (
                            <div style={{ color: '#F8FAFC', fontSize: '13px' }}>
                                <div>📌 Punição: {resultado.labelPunicao}</div>
                                {resultado.agravante && <div>➕ Agravante aplicado</div>}
                                <div>📉 Pontos a perder: <strong>{resultado.pontosPerdidos}</strong></div>
                                {resultado.raceBan && <div style={{ color: '#EF4444', fontWeight: 'bold' }}>⛔ RACE BAN!</div>}
                            </div>
                        )}
                    </div>
                )}

                {/* Botão Finalizar */}
                {podeFinalizarJurado && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            finalizarAnalise(lance);
                        }}
                        style={{
                            width: '100%',
                            padding: '15px',
                            background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)'
                        }}
                    >
                        ✅ Finalizar Análise e Publicar Resultado
                    </button>
                )}
            </div>
        );
    };

    // Tela de Loading
    if (loading || authStep === 'checking') {
        return (
            <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '50px', marginBottom: '20px' }}>⏳</div>
                    <p>Verificando autenticação...</p>
                </div>
            </div>
        );
    }

    // Tela: Verificação de WhatsApp
    if (authStep === 'whatsapp_required') {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ background: '#1E293B', borderRadius: '16px', padding: '40px', maxWidth: '420px', width: '100%', border: '1px solid #22C55E', textAlign: 'center' }}>
                    <div style={{ fontSize: '60px', marginBottom: '20px' }}>🔐</div>
                    <h2 style={{ color: '#F8FAFC', marginBottom: '10px' }}>Verificação de Segurança</h2>
                    <p style={{ color: '#94A3B8', marginBottom: '10px' }}>
                        Bem-vindo, <strong style={{ color: '#22C55E' }}>{userEmail}</strong>
                    </p>
                    <p style={{ color: '#64748B', marginBottom: '25px', fontSize: '14px' }}>
                        Para confirmar sua identidade, informe o número de WhatsApp cadastrado.
                    </p>

                    <form onSubmit={handleVerifyWhatsApp}>
                        <input
                            type="text"
                            placeholder="(00) 00000-0000"
                            value={whatsappInput}
                            onChange={(e) => {
                                setWhatsappInput(formatWhatsApp(e.target.value));
                                setLoginError('');
                            }}
                            maxLength={15}
                            style={{ 
                                width: '100%', 
                                padding: '15px', 
                                borderRadius: '8px', 
                                border: '1px solid #475569', 
                                background: '#0F172A', 
                                color: '#F8FAFC', 
                                fontSize: '18px', 
                                marginBottom: '15px', 
                                textAlign: 'center',
                                letterSpacing: '1px'
                            }}
                        />

                        {/* Mensagem de erro */}
                        {loginError && (
                            <div style={{ 
                                background: 'rgba(239, 68, 68, 0.1)', 
                                border: '1px solid #EF4444', 
                                borderRadius: '8px', 
                                padding: '10px', 
                                marginBottom: '15px',
                                color: '#EF4444',
                                fontSize: '14px'
                            }}>
                                {loginError}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loginLoading}
                            style={{ 
                                width: '100%', 
                                padding: '15px', 
                                background: loginLoading ? '#475569' : 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '8px', 
                                fontSize: '16px', 
                                fontWeight: 'bold', 
                                cursor: loginLoading ? 'not-allowed' : 'pointer' 
                            }}
                        >
                            {loginLoading ? '⏳ Verificando...' : '✅ Confirmar e Entrar'}
                        </button>
                    </form>

                    <button 
                        onClick={handleLogout}
                        style={{ 
                            width: '100%', 
                            padding: '12px', 
                            background: 'transparent',
                            color: '#94A3B8', 
                            border: '1px solid #475569', 
                            borderRadius: '8px', 
                            fontSize: '14px', 
                            cursor: 'pointer',
                            marginTop: '15px'
                        }}
                    >
                        ← Usar outra conta
                    </button>
                </div>
            </div>
        );
    }

    // Se chegou aqui, está autenticado
    if (!isAuthenticated) {
        return (
            <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                ⏳ Carregando...
            </div>
        );
    }

    return (
        <div className="analises-page" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)', paddingTop: '90px', paddingBottom: '60px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', paddingBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {/* Foto do Jurado - Formato 3x4 */}
                        <div style={{ 
                            width: '60px', 
                            height: '80px', 
                            borderRadius: '8px', 
                            overflow: 'hidden', 
                            border: '2px solid #8B5CF6',
                            background: '#1E293B',
                            flexShrink: 0
                        }}>
                            <img 
                                src={getFotoJurado(nomeJurado)} 
                                alt={nomeJurado}
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover' 
                                }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#64748B;font-size:24px;">👤</div>';
                                }}
                            />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#8B5CF6', margin: 0 }}>
                                👨‍⚖️ TRIBUNAL DO <span style={{ color: '#F8FAFC' }}>JÚRI</span>
                            </h1>
                            <p style={{ color: '#94A3B8', margin: '5px 0 0', fontSize: '14px' }}>
                                Logado como: <strong style={{ color: '#F59E0B' }}>{nomeJurado}</strong>
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleLogout} style={{ padding: '8px 20px', background: 'transparent', color: '#EF4444', border: '1px solid #EF4444', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>LOGOUT</button>
                        <button onClick={() => navigate('/')} style={{ padding: '8px 20px', background: 'transparent', color: '#94A3B8', border: '1px solid #475569', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>VOLTAR</button>
                    </div>
                </div>

                {/* Contador */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', 
                    borderRadius: '10px', 
                    padding: isMobile ? '12px 15px' : '15px 20px', 
                    marginBottom: isMobile ? '20px' : '25px', 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between', 
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: isMobile ? '10px' : '0'
                }}>
                    <span style={{ color: 'white', fontWeight: 'bold' }}>📋 {lances.length} lance{lances.length !== 1 ? 's' : ''} aguardando análise</span>
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            fetchLances(false); // Não mostrar loading ao atualizar manualmente
                        }} 
                        style={{ padding: '6px 15px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}
                    >
                        🔄 Atualizar
                    </button>
                </div>

                {/* Lista de Lances */}
                {lances.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', background: '#1E293B', borderRadius: '12px', border: '1px dashed #475569' }}>
                        <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
                        <h3 style={{ color: '#F8FAFC', marginBottom: '10px' }}>Nenhum lance pendente!</h3>
                        <p style={{ color: '#64748B' }}>Todos os lances já foram analisados.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {lances.map((lance) => {
                            const dados = lance.dados || {};
                            const acusador = dados.acusador || {};
                            const acusado = dados.acusado || {};
                            const etapa = dados.etapa || {};
                            const codigoLance = dados.codigoLance || 'N/A';
                            const defesa = dados.defesa || null;
                            const isRetiradaBug = dados?.tipoSolicitacao === 'retirada_bug' || dados?.acusado?.nome === 'Administração Master League F1';
                            const isExpanded = expandedLances[lance.id];
                            const votos = dados.votos || [];

                            // Função para obter cores baseadas no status
                            const getStatusColors = (status) => {
                                switch(status) {
                                    case 'aguardando_defesa':
                                        return { bg: 'linear-gradient(135deg, #7F1D1D 0%, #450A0A 100%)', border: '#EF4444', badgeBg: '#EF4444', badgeColor: '#FFF' };
                                    case 'defesa_enviada':
                                        return { bg: 'linear-gradient(135deg, #1E3A8A 0%, #1E1B4B 100%)', border: '#3B82F6', badgeBg: '#3B82F6', badgeColor: '#FFF' };
                                    case 'aguardando_analise':
                                        return { bg: 'linear-gradient(135deg, #581C87 0%, #3B0764 100%)', border: '#8B5CF6', badgeBg: '#8B5CF6', badgeColor: '#FFF' };
                                    case 'analise_realizada':
                                        return { bg: 'linear-gradient(135deg, #166534 0%, #14532D 100%)', border: '#22C55E', badgeBg: '#22C55E', badgeColor: '#000' };
                                    default:
                                        return { bg: 'linear-gradient(135deg, #6B7280 0%, #374151 100%)', border: '#9CA3AF', badgeBg: '#9CA3AF', badgeColor: '#000' };
                                }
                            };

                            const statusAtual = dados.status || 'aguardando_analise';
                            const statusColors = getStatusColors(statusAtual);

                            // Verificar se o jurado atual já votou neste lance
                            const jaVotouNesteLance = votos.find(isVotoDoJuradoAtual);
                            
                            // Contar votos de culpado e inocente
                            const votosCulpado = votos.filter(v => v.culpado).length;
                            const votosInocente = votos.filter(v => !v.culpado).length;
                            
                            // Lance só é finalizado quando há 3 votos de CULPADO ou 3 votos de INOCENTE
                            const lanceFinalizado = votosCulpado >= 3 || votosInocente >= 3;
                            const decisaoFinal = lanceFinalizado ? (votosCulpado >= 3 ? 'CULPADO' : 'INOCENTE') : null;
                            const decisaoFinalLabel = getDecisaoLabel(decisaoFinal, isRetiradaBug);
                            
                            // Bloquear se já votou OU se lance já finalizou
                            const bloqueado = jaVotouNesteLance || lanceFinalizado;

                            return (
                                <div key={lance.id} style={{ background: statusColors.bg, border: `2px solid ${statusColors.border}`, borderRadius: '10px', overflow: 'hidden', opacity: bloqueado ? 0.7 : 1 }}>
                                    
                                    {/* Prévia */}
                                    <div
                                        onClick={(e) => {
                                            if (!bloqueado) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleLance(lance.id);
                                            }
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', cursor: bloqueado ? 'default' : 'pointer', gap: '12px', transition: 'background 0.2s' }}
                                        onMouseEnter={(e) => !bloqueado && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span style={{ background: '#E5E7EB', color: '#1F2937', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>🔖 {codigoLance}</span>
                                        {lanceFinalizado ? (
                                            <span style={{ background: decisaoFinal === 'CULPADO' ? '#EF4444' : '#22C55E', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                                🏁 DECIDIDO: {decisaoFinalLabel}
                                            </span>
                                        ) : jaVotouNesteLance ? (
                                            <span style={{ background: '#22C55E', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>✅ VOCÊ JÁ VOTOU</span>
                                        ) : (
                                            <span style={{ background: '#8B5CF6', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                                🗳️ {votos.length} {votos.length === 1 ? 'voto' : 'votos'}
                                            </span>
                                        )}
                                        <span style={{ color: '#475569' }}>|</span>
                                        <span style={{ color: '#F8FAFC', fontSize: '13px', fontWeight: '500' }}>{acusador.nome || '-'} <span style={{ color: '#64748B' }}>vs</span> {acusado.nome || '-'}</span>
                                        <span style={{ color: '#475569' }}>|</span>
                                        <span style={{ color: '#94A3B8', fontSize: '12px' }}>🏁 {etapa.circuit || '-'}</span>
                                        <span style={{ background: dados.grid === 'carreira' ? '#8B5CF6' : '#06B6D4', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', marginLeft: 'auto' }}>{dados.grid === 'carreira' ? '🏆' : '💡'}</span>
                                        {!bloqueado && <span style={{ color: '#8B5CF6', fontSize: '18px', fontWeight: 'bold', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>}
                                    </div>

                                    {/* Conteúdo Expandido - só abre se não votou ainda e lance não finalizou */}
                                    {isExpanded && !bloqueado && (
                                        <div style={{ 
                                            borderTop: '1px solid rgba(139, 92, 246, 0.3)', 
                                            padding: isMobile ? '15px' : '20px', 
                                            background: 'rgba(0,0,0,0.2)' 
                                        }}>
                                            
                                            {/* Info */}
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
                                                gap: isMobile ? '10px' : '15px', 
                                                marginBottom: isMobile ? '15px' : '20px', 
                                                padding: isMobile ? '12px' : '15px', 
                                                background: '#0F172A', 
                                                borderRadius: isMobile ? '6px' : '8px' 
                                            }}>
                                                <div>
                                                    <span style={{ color: '#64748B', fontSize: isMobile ? '10px' : '11px' }}>ETAPA</span>
                                                    <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: isMobile ? '0.85rem' : 'inherit' }}>
                                                        Round {etapa.round} - {etapa.circuit}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748B', fontSize: isMobile ? '10px' : '11px' }}>VOLTA</span>
                                                    <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: isMobile ? '0.85rem' : 'inherit' }}>
                                                        {dados.volta || '-'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748B', fontSize: isMobile ? '10px' : '11px' }}>DATA</span>
                                                    <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: isMobile ? '0.8rem' : 'inherit' }}>
                                                        {formatarData(lance.created_at)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Pilotos */}
                                            <div style={{ 
                                                display: 'flex', 
                                                justifyContent: 'center', 
                                                gap: isMobile ? '20px' : '40px', 
                                                padding: isMobile ? '12px' : '15px', 
                                                background: '#0F172A', 
                                                borderRadius: isMobile ? '6px' : '8px', 
                                                marginBottom: isMobile ? '15px' : '20px',
                                                flexWrap: isMobile ? 'wrap' : 'nowrap'
                                            }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <span style={{ color: '#EF4444', fontSize: isMobile ? '10px' : '11px' }}>ACUSADOR</span>
                                                    <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: isMobile ? '0.85rem' : 'inherit' }}>
                                                        {acusador.nome || '-'}
                                                    </div>
                                                </div>
                                                <div style={{ color: '#64748B', fontSize: isMobile ? '20px' : '24px', alignSelf: 'center' }}>⚔️</div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <span style={{ color: '#F59E0B', fontSize: isMobile ? '10px' : '11px' }}>ACUSADO</span>
                                                    <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: isMobile ? '0.85rem' : 'inherit' }}>
                                                        {acusado.nome || '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Vídeos */}
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: isMobile ? '1fr' : (defesa ? '1fr 1fr' : '1fr'), 
                                                gap: isMobile ? '15px' : '20px', 
                                                marginBottom: isMobile ? '15px' : '20px' 
                                            }}>
                                                <div>
                                                    <div style={{ 
                                                        color: '#EF4444', 
                                                        fontSize: isMobile ? '0.9rem' : '18px', 
                                                        fontWeight: '900', 
                                                        marginBottom: isMobile ? '10px' : '12px', 
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
                                                {defesa && (
                                                    <div>
                                                        <div style={{ 
                                                            color: '#22C55E', 
                                                            fontSize: isMobile ? '0.9rem' : '18px', 
                                                            fontWeight: '900', 
                                                            marginBottom: isMobile ? '10px' : '12px', 
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

                                            {/* Descrições */}
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: isMobile ? '1fr' : (defesa ? '1fr 1fr' : '1fr'), 
                                                gap: isMobile ? '12px' : '15px', 
                                                marginBottom: isMobile ? '20px' : '25px' 
                                            }}>
                                                <div style={{ 
                                                    background: '#0F172A', 
                                                    borderRadius: isMobile ? '6px' : '8px', 
                                                    padding: isMobile ? '12px' : '15px', 
                                                    borderLeft: '3px solid #EF4444' 
                                                }}>
                                                    <div style={{ 
                                                        color: '#EF4444', 
                                                        fontSize: isMobile ? '10px' : '11px', 
                                                        marginBottom: isMobile ? '6px' : '8px' 
                                                    }}>
                                                        📝 DESCRIÇÃO DA ACUSAÇÃO
                                                    </div>
                                                    <div style={{ 
                                                        color: '#E2E8F0', 
                                                        fontSize: isMobile ? '0.85rem' : '13px', 
                                                        lineHeight: '1.5' 
                                                    }}>
                                                        {dados.descricao || 'Sem descrição'}
                                                    </div>
                                                </div>
                                                {defesa && (
                                                    <div style={{ 
                                                        background: '#0F172A', 
                                                        borderRadius: isMobile ? '6px' : '8px', 
                                                        padding: isMobile ? '12px' : '15px', 
                                                        borderLeft: '3px solid #22C55E' 
                                                    }}>
                                                        <div style={{ 
                                                            color: '#22C55E', 
                                                            fontSize: isMobile ? '10px' : '11px', 
                                                            marginBottom: isMobile ? '6px' : '8px' 
                                                        }}>
                                                            🛡️ ARGUMENTOS DA DEFESA
                                                        </div>
                                                        <div style={{ 
                                                            color: '#E2E8F0', 
                                                            fontSize: isMobile ? '0.85rem' : '13px', 
                                                            lineHeight: '1.5' 
                                                        }}>
                                                            {defesa.descricaoDefesa || defesa.argumentos || 'Sem argumentos'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Placar de Votos */}
                                            <PlacarVotos lance={lance} />

                                            {/* Área de Votação */}
                                            <VotacaoJurado lance={lance} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Custom Alert */}
            <CustomAlert
                show={alertState.show}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onConfirm={alertState.onConfirm}
                onCancel={alertState.onCancel}
                confirmText={alertState.confirmText}
                cancelText={alertState.cancelText}
            />
        </div>
    );
}

export default PainelVeredito;
