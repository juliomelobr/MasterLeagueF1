import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { requestVerificationCode, verifyCode, cleanWhatsAppNumber, formatWhatsAppDisplay } from '../utils/whatsappAuth';
import { findAndSyncPilotoFromSheet, findDriverByEmail } from '../utils/syncPilotosFromSheet';
import { 
    isMobileDevice, 
    is2FAValidatedForDevice, 
    set2FAValidatedForDevice, 
    clearAll2FAForEmail,
    getDeviceInfo 
} from '../utils/deviceDetection';
import { getRedirectUrl } from '../utils/urlHelpers';

function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(() => sessionStorage.getItem('login_step') || 'login'); 
    const [user, setUser] = useState(null);
    const [whatsappInput, setWhatsappInput] = useState(() => sessionStorage.getItem('login_whatsapp') || '');
    const [codeInput, setCodeInput] = useState('');
    const [codeSent, setCodeSent] = useState(() => sessionStorage.getItem('login_code_sent') === 'true');

    // Persistir estado de login para recarregamentos
    useEffect(() => {
        if (step === 'login') {
            sessionStorage.removeItem('login_step');
            sessionStorage.removeItem('login_whatsapp');
            sessionStorage.removeItem('login_code_sent');
        } else {
            sessionStorage.setItem('login_step', step);
        }
        if (whatsappInput) {
            sessionStorage.setItem('login_whatsapp', whatsappInput);
        }
        if (codeSent) {
            sessionStorage.setItem('login_code_sent', 'true');
        } else {
            sessionStorage.removeItem('login_code_sent');
        }
    }, [step, whatsappInput, codeSent]);

    const [sendingCode, setSendingCode] = useState(false);
    const [verifyingCode, setVerifyingCode] = useState(false);
    const [codeAttempts, setCodeAttempts] = useState(0); // Contador de tentativas de código
    const [errorMsg, setErrorMsg] = useState('');
    const [showWhatsAppError, setShowWhatsAppError] = useState(false);
    const [whatsappAttempts, setWhatsappAttempts] = useState(0);
    const [pilotoData, setPilotoData] = useState(null);
    const [pilotoPlanilhaData, setPilotoPlanilhaData] = useState(null); // Dados da planilha para validação
    const [inscricaoEnviada, setInscricaoEnviada] = useState(false);
    const [inscricaoData, setInscricaoData] = useState({
        email: '',
        nome: '',
        gamertag: '',
        whatsapp: '',
        plataforma: 'Xbox',
        grid: 'Carreira',
        nomePiloto: ''
    });

    // Detectar dispositivo atual
    const [deviceInfo, setDeviceInfo] = useState(getDeviceInfo());
    
    // Atualizar info do dispositivo quando a tela redimensionar
    useEffect(() => {
        const handleResize = () => {
            setDeviceInfo(getDeviceInfo());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Flag local para manter 2FA validado entre recarregamentos/navegação
    // Agora usa detecção de dispositivo para diferenciar PC e mobile
    const get2FAKey = (email) => {
        // Usar função utilitária que diferencia PC e mobile
        const baseKey = `ml_pilot_2fa_ok:${(email || '').toLowerCase().trim()}`;
        return deviceInfo.isMobile ? `${baseKey}:mobile` : `${baseKey}:desktop`;
    };

    // 1. Verificar se já existe sessão ao carregar
    useEffect(() => {
        const checkSession = async () => {
            // Log do ambiente atual
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            console.log('🌐 Ambiente detectado:', {
                hostname: window.location.hostname,
                origin: window.location.origin,
                href: window.location.href,
                isLocalhost: isLocalhost
            });
            
            // Processar retorno OAuth (PKCE: ?code=...) ou hash antigo (#access_token)
            const url = new URL(window.location.href);
            const hasAccessTokenInHash = !!(url.hash && url.hash.includes('access_token'));
            const hasCode = url.searchParams.has('code');
            const hasOAuthError = url.searchParams.has('error') || url.searchParams.has('error_description');

            if (hasAccessTokenInHash || hasCode || hasOAuthError) {
                console.log('🔄 Detectado retorno de OAuth na página /login', { 
                    hasCode, 
                    hasAccessTokenInHash, 
                    hasOAuthError,
                    currentUrl: window.location.href,
                    isLocalhost: isLocalhost
                });
                
                // Se estiver em produção mas deveria estar em localhost, alertar
                if (!isLocalhost && window.location.href.includes('localhost')) {
                    console.error('⚠️ ATENÇÃO: OAuth retornou para produção mas deveria estar em localhost!');
                }
                
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            
            let { data: { session } } = await supabase.auth.getSession();

            // Se ainda não houver sessão e houver code, tentar exchange manualmente
            if (!session && hasCode) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
                if (exchangeError) {
                    console.warn('⚠️ Falha ao trocar code por sessão no /login:', exchangeError);
                }
                ({ data: { session } } = await supabase.auth.getSession());
            }

            // Limpar URL (code/hash) para não ficar com parâmetros de OAuth
            try {
                window.history.replaceState({}, '', window.location.pathname);
            } catch {
                // noop
            }

            if (session?.user?.email) {
                console.log('📧 Sessão encontrada com email:', session.user.email);
                console.log('📱 Informações do dispositivo:', deviceInfo);
                setUser(session.user);

                // Verificar 2FA usando detecção de dispositivo
                // No PC: mantém sessão persistente
                // No mobile: pode ter comportamento diferente (mais seguro)
                const already2FAOk = is2FAValidatedForDevice(session.user.email);
                
                if (already2FAOk) {
                    const deviceType = deviceInfo.isMobile ? 'mobile' : 'desktop';
                    console.log(`✅ 2FA já validado anteriormente no ${deviceType}. Redirecionando direto para /dashboard...`);
                    console.log('🌐 URL atual:', window.location.href);
                    
                    // No mobile, usar window.location.href para garantir redirecionamento
                    if (deviceInfo.isMobile) {
                        const baseUrl = window.location.origin;
                        console.log('📱 Redirecionando mobile para:', `${baseUrl}/dashboard`);
                        window.location.href = `${baseUrl}/dashboard`;
                    } else {
                        console.log('💻 Redirecionando desktop para: /dashboard');
                        navigate('/dashboard');
                    }
                    return;
                }

                // Se há sessão ativa, verificar se o piloto já está validado no banco
                // SEMPRE verificar e pedir confirmação do WhatsApp (mesmo se já tiver cadastrado)
                // Isso garante segurança a cada login
                console.log('🔍 Sempre pedir confirmação de WhatsApp (segurança a cada login)...');
                checkDriverRegistration(session.user.email, sessionStorage.getItem('login_step'));
            } else if (session?.user && !session.user.email) {
                console.error('⚠️ Sessão encontrada mas sem email!');
                setErrorMsg('❌ Erro: Email não foi obtido do login. Por favor, faça login novamente.');
                setStep('login');
            }
        };
        checkSession();

        // Listener para mudanças de auth (login do Google)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            console.log('🔄 Login - Auth state changed:', event, session ? 'Sessão ativa' : 'Sem sessão', {
                hostname: window.location.hostname,
                origin: window.location.origin,
                isLocalhost: isLocalhost
            });
            
            // Verificar se estamos na página de login antes de processar
            if (window.location.pathname !== '/login') {
                console.log('⚠️ Auth event fora da página /login, ignorando...');
                return;
            }
            
            // Se estiver em produção mas deveria estar em localhost, alertar
            if (!isLocalhost && event === 'SIGNED_IN') {
                console.warn('⚠️ ATENÇÃO: Login detectado em ambiente de produção! Se você está testando localmente, verifique a configuração do Supabase.');
            }
            
            if (event === 'SIGNED_IN' && session?.user?.email) {
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                console.log('✅ Login - Usuário autenticado (pode ser após logout):', session.user.email, {
                    isLocalhost,
                    isMobile,
                    hostname: window.location.hostname,
                    origin: window.location.origin
                });
                setUser(session.user);
                
                // Garantir que estamos na página de login
                if (window.location.pathname !== '/login') {
                    console.log('🔄 Redirecionando para /login...');
                    window.location.href = '/login';
                    return;
                }
                
                // Aguardar um pouco para garantir que a sessão está persistida
                await new Promise(resolve => setTimeout(resolve, 500));

                // Verificar 2FA usando detecção de dispositivo
                const currentDeviceInfo = getDeviceInfo();
                const already2FAOk = is2FAValidatedForDevice(session.user.email);
                
                if (already2FAOk) {
                    const deviceType = currentDeviceInfo.isMobile ? 'mobile' : 'desktop';
                    console.log(`✅ 2FA já validado anteriormente no ${deviceType}. Redirecionando direto para /dashboard...`);
                    console.log('🌐 URL atual:', window.location.href);
                    
                    // No mobile, usar window.location.href para garantir redirecionamento
                    if (currentDeviceInfo.isMobile) {
                        const baseUrl = window.location.origin;
                        console.log('📱 Redirecionando mobile para:', `${baseUrl}/dashboard`);
                        window.location.href = `${baseUrl}/dashboard`;
                    } else {
                        console.log('💻 Redirecionando desktop para: /dashboard');
                        navigate('/dashboard');
                    }
                    return;
                }
                
                // Quando o piloto faz login (incluindo após logout), SEMPRE verificar na planilha
                // e pedir confirmação do WhatsApp para garantir que é ele mesmo
                // Isso garante segurança mesmo que o WhatsApp já esteja no banco
                console.log('🔍 Verificando na planilha e pedindo confirmação do WhatsApp...');
                checkDriverRegistration(session.user.email, sessionStorage.getItem('login_step'));
            } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                console.log('🔄 Login - Token atualizado (renovação, não novo login):', session.user.email);
                setUser(session.user);
                // Em refresh de token, apenas manter a sessão ativa
                // NÃO redirecionar - deixar o usuário onde está
                // Se estiver na página de login, não fazer nada (não é novo login)
            } else if (event === 'SIGNED_OUT') {
                console.log('🚪 Login - Usuário deslogado');
                setUser(null);
                setStep('login');
                // Limpar estados ao fazer logout
                setWhatsappInput('');
                setCodeInput('');
                setCodeAttempts(0);
                setPilotoData(null);
                setPilotoPlanilhaData(null);
                setErrorMsg('');
                setShowWhatsAppError(false);
                setWhatsappAttempts(0);
            }
        });

        return () => authListener.subscription.unsubscribe();
    }, []);

    // 2. Login com Google - FORÇAR SELEÇÃO DE CONTA
    const handleGoogleLogin = async () => {
        setLoading(true);
        setErrorMsg('');

        // SEMPRE usar a URL atual dinamicamente (resolve problema mobile localhost)
        // Isso funciona tanto para localhost no PC quanto para IP da rede no celular
        const redirectUrl = getRedirectUrl('/login');
        
        console.log('🔄 Redirect URL (Google):', redirectUrl, 'current origin:', window.location.origin);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    prompt: 'select_account', // Força o Google a mostrar seletor de conta (quando aplicável)
                },
                skipBrowserRedirect: false
            }
        });
        
        if (error) {
            setErrorMsg('Erro ao conectar com Google: ' + error.message);
            setLoading(false);
        }
    };

    // Logout e tentar novamente
    const handleLogout = async () => {
        try {
            // 1. Fazer logout no Supabase
            await supabase.auth.signOut();

            // Limpar flag local de 2FA (tanto PC quanto mobile)
            if (user?.email) {
                clearAll2FAForEmail(user.email);
            }
            
            // 2. Limpar todos os estados e storage
            setUser(null);
            setPilotoData(null);
            setWhatsappInput('');
            setCodeInput('');
            setErrorMsg('');
            setStep('login');
            setLoading(false);
            sessionStorage.removeItem('login_step');
            sessionStorage.removeItem('login_whatsapp');
            sessionStorage.removeItem('login_code_sent');
            
            // 3. Limpar cookies do Google (tentar limpar sessão do Google OAuth)
            // Isso ajuda a forçar o Google a pedir seleção de conta novamente
            try {
                // Limpar cookies relacionados ao Google
                const cookies = document.cookie.split(';');
                cookies.forEach(cookie => {
                    const eqPos = cookie.indexOf('=');
                    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                    // Limpar cookies do Google (gid, __Secure-3PSID, etc)
                    if (name.includes('google') || name.includes('gid') || name.includes('SID') || name.includes('HSID')) {
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.google.com`;
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.googleapis.com`;
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                    }
                });
            } catch (cookieError) {
                console.warn('Não foi possível limpar cookies do Google:', cookieError);
            }
            
            // 4. Aguardar um pouco antes de permitir novo login
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('🚪 Logout realizado. Ao fazer login novamente, o Google pedirá para selecionar a conta.');
            
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            setErrorMsg('Erro ao deslogar. Tente recarregar a página.');
        }
    };

    // 3. Verificar se o email está na tabela pilotos do Supabase
    const checkDriverRegistration = async (email, restoredStep = null) => {
        // Verificar se o email foi fornecido
        if (!email || !email.trim()) {
            console.error('❌ Email não fornecido!');
            setErrorMsg('❌ Erro: Email não foi obtido do login. Por favor, faça login novamente com Google.');
            setStep('login');
            return;
        }

        // PRIMEIRO: Verificar se é piloto ANTES de verificar jurado
        // Isso permite que alguém que seja jurado E piloto acesse como piloto pela página /login
        const emailLower = email.toLowerCase().trim();
        console.log('🔍 [CHECK DRIVER] Verificando email:', emailLower);
        console.log('🔍 [CHECK DRIVER] User Agent:', navigator.userAgent);
        console.log('🔍 [CHECK DRIVER] É mobile?', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        
        try {
            // PASSO 1: Verificar se é piloto PRIMEIRO (CRÍTICO)
            console.log('🔍 [CHECK DRIVER] PASSO 1: Verificando se é piloto...');
            const { data: pilotoCheck, error: pilotoCheckError } = await supabase
                .from('pilotos')
                .select('email, nome')
                .eq('email', emailLower)
                .maybeSingle();
            
            console.log('🔍 [CHECK DRIVER] Resultado verificação piloto:', {
                pilotoCheck,
                pilotoCheckError,
                encontrado: !!pilotoCheck
            });
            
            // Se for piloto, SEMPRE processar como piloto (mesmo que seja jurado também)
            if (pilotoCheck && pilotoCheck.email) {
                console.log('✅ [CHECK DRIVER] Email encontrado na tabela pilotos. Processando como PILOTO (ignorando verificação de jurado)...', {
                    email: pilotoCheck.email,
                    nome: pilotoCheck.nome
                });
                // NÃO verificar jurado se for piloto - continuar direto para verificação de piloto
            } else {
                // PASSO 2: Só verificar jurado se NÃO for piloto
                console.log('🔍 [CHECK DRIVER] PASSO 2: Não é piloto. Verificando se é jurado...');
                const { data: jurado, error: juradoError } = await supabase
                    .from('jurados')
                    .select('*')
                    .eq('email_google', emailLower)
                    .eq('ativo', true)
                    .maybeSingle();
                
                console.log('🔍 [CHECK DRIVER] Resultado verificação jurado:', {
                    jurado: jurado ? { nome: jurado.nome, email: jurado.email_google, ativo: jurado.ativo } : null,
                    juradoError
                });
                
                if (juradoError) {
                    console.error('❌ [CHECK DRIVER] Erro ao verificar jurado:', juradoError);
                    // Em caso de erro, continuar como piloto (não bloquear)
                } else if (jurado && jurado.email_google && jurado.ativo === true) {
                    // Verificação dupla: garantir que realmente é um jurado válido
                    const emailJurado = (jurado.email_google || '').toLowerCase().trim();
                    if (emailJurado === emailLower) {
                        console.log('⚠️ [CHECK DRIVER] Email pertence a um jurado (e NÃO é piloto). Redirecionando para /veredito...', {
                            email: emailLower,
                            juradoNome: jurado.nome,
                            juradoEmail: jurado.email_google
                        });
                        // Se for jurado mas NÃO for piloto, redirecionar para veredito
                        navigate('/veredito');
                        return;
                    } else {
                        console.warn('⚠️ [CHECK DRIVER] Email de jurado não corresponde exatamente:', {
                            emailLower,
                            emailJurado
                        });
                    }
                } else {
                    console.log('✅ [CHECK DRIVER] Não é jurado ativo.');
                }
            }
            
            console.log('✅ [CHECK DRIVER] Continuando verificação como piloto...');
        } catch (err) {
            console.error('❌ [CHECK DRIVER] Erro inesperado:', err);
            // Em caso de erro, continuar como piloto (não bloquear)
        }
        
        if (!restoredStep) setStep('verifying_email');
        setErrorMsg('');
        
        console.log('🔍 [PASSO 1] Buscando piloto na tabela pilotos (Supabase)...');
        console.log('📧 Email sendo verificado:', email);
        
        try {
            // PASSO 1: Verificar se email está no Supabase
            const { data: piloto, error } = await supabase
                .from('pilotos')
                .select('*')
                .eq('email', email.toLowerCase().trim())
                .single();

            if (error || !piloto) {
                console.log('❌ [PASSO 1] Piloto não encontrado no Supabase.');
                console.log('🔍 [PASSO 2] Buscando na planilha CADASTRO MLF1...');
                
                // PASSO 2: Se não encontrou no Supabase, buscar na planilha
                const syncResult = await findAndSyncPilotoFromSheet(email);
                
                if (syncResult.found && syncResult.piloto) {
                    console.log('✅ [PASSO 2] Piloto encontrado na planilha e sincronizado com Supabase!');
                    
                    // Armazenar dados do piloto e da planilha
                    setPilotoData(syncResult.piloto);
                    setPilotoPlanilhaData(syncResult.dadosPlanilha);
                    
                    // Se não tiver WhatsApp restaurado, limpar campo
                    if (!sessionStorage.getItem('login_whatsapp')) setWhatsappInput('');
                    
                    if (restoredStep) setStep(restoredStep);
                    else setStep('input_whatsapp');
                    return;
                } else {
                    // PASSO 3: Não encontrou nem no Supabase nem na planilha
                    console.log('❌ [PASSO 2] Piloto não encontrado na planilha.');
                    setStep('inscricao_manual');
                    setInscricaoData(prev => ({ ...prev, email: email }));
                    setErrorMsg(`❌ E-mail não encontrado na base de dados nem na planilha de inscrição.\n\nPreencha o formulário abaixo para que a administração possa verificar suas informações.`);
                    return;
                }
            }

            // PASSO 1: Piloto encontrado no Supabase
            console.log('✅ [PASSO 1] Piloto encontrado no Supabase:', piloto);
            
            // VERIFICAR STATUS: Se estiver pendente, bloquear acesso
            const status = piloto.status?.toLowerCase() || '';
            if (status === 'pendente' || status === 'pending') {
                console.log('⚠️ Piloto encontrado mas está com status PENDENTE');
                setErrorMsg(`⏳ Seu cadastro está aguardando aprovação da administração.\n\nVocê receberá uma notificação no WhatsApp quando seu acesso for liberado.\n\nPor favor, aguarde a aprovação antes de tentar fazer login novamente.`);
                setStep('login');
                // Fazer logout para limpar a sessão
                await supabase.auth.signOut();
                setUser(null);
                return;
            }
            
            setPilotoData(piloto);
            
            // Buscar dados da planilha também para validação de WhatsApp
            console.log('🔍 Buscando dados na planilha para validação...');
            const planilhaResult = await findDriverByEmail(email);
            if (planilhaResult.found) {
                setPilotoPlanilhaData(planilhaResult);
            }
            
            // Se não tiver WhatsApp restaurado, limpar campo
            if (!sessionStorage.getItem('login_whatsapp')) setWhatsappInput('');
            
            if (restoredStep) setStep(restoredStep);
            else setStep('input_whatsapp');
            
        } catch (err) {
            console.error('❌ Erro ao buscar piloto:', err);
            setErrorMsg('Erro ao verificar cadastro. Tente novamente.');
            setStep('login');
        }
    };

    // 4. Enviar código de verificação via WhatsApp (com validação)
    const handleSendCode = async () => {
        if (!whatsappInput || whatsappInput.length < 14) {
            setErrorMsg('Digite um número de WhatsApp válido');
            return;
        }

        if (!user?.email || !pilotoData) {
            setErrorMsg('Erro: Sessão inválida. Faça login novamente.');
            setStep('login');
            return;
        }

        // VERIFICAÇÃO: Se já chegou até aqui (handleSendCode), significa que passou pela verificação inicial
        // e foi identificado como piloto. Não precisamos verificar jurado novamente aqui.
        // Se o usuário chegou até esta etapa, ele é um piloto válido.
        console.log('✅ Usuário já validado como piloto. Continuando processo de verificação WhatsApp...');

        setSendingCode(true);
        setErrorMsg('');

        try {
            const whatsappCleaned = cleanWhatsAppNumber(whatsappInput);
            console.log('📱 WhatsApp informado:', whatsappCleaned);
            
            // VALIDAÇÃO: Se tem dados da planilha, validar WhatsApp
            if (pilotoPlanilhaData?.whatsappEsperado) {
                const whatsappPlanilha = cleanWhatsAppNumber(pilotoPlanilhaData.whatsappEsperado);
                console.log('📱 WhatsApp esperado (planilha):', whatsappPlanilha);
                
                // Comparar últimos 9 dígitos ou número completo
                const ultimos9Digitado = whatsappCleaned.slice(-9);
                const ultimos9Planilha = whatsappPlanilha.slice(-9);
                
                if (whatsappCleaned !== whatsappPlanilha && ultimos9Digitado !== ultimos9Planilha) {
                    console.log('❌ WhatsApp não confere com a planilha');
                    const newAttempts = (whatsappAttempts || 0) + 1;
                    setWhatsappAttempts(newAttempts);
                    setShowWhatsAppError(true);
                    setSendingCode(false);

                    // Até 3 tentativas: 1 e 2 ficam na tela para tentar de novo
                    if (newAttempts >= 3) {
                        setErrorMsg('❌ O número informado não confere com o cadastro na planilha.\n\nPor segurança, você atingiu o limite de tentativas.\n\nPreencha o formulário abaixo para reenviar sua inscrição e o administrador validar seus dados.');
                        setStep('inscricao_manual');
                        setInscricaoData(prev => ({ 
                            ...prev, 
                            email: user.email,
                            nome: pilotoPlanilhaData.nomeCadastrado || '',
                            nomePiloto: pilotoPlanilhaData.nome || '',
                            whatsapp: whatsappInput
                        }));
                        return;
                    }

                    setErrorMsg(`❌ O número de WhatsApp informado não confere com o cadastro na planilha.\n\nTente novamente. Tentativa ${newAttempts} de 3.\n\nSe preferir, você pode reenviar sua inscrição para atualização dos dados.`);
                    // Dar chance de digitar novamente (limpa o campo)
                    setWhatsappInput('');
                    return;
                }
                
                console.log('✅ WhatsApp confere com a planilha!');
                // Resetar tentativas ao validar corretamente
                setShowWhatsAppError(false);
                setWhatsappAttempts(0);
            }
            
            // Se WhatsApp está no Supabase, usar ele; senão, usar o informado
            const whatsappParaEnviar = pilotoData.whatsapp 
                ? cleanWhatsAppNumber(pilotoData.whatsapp)
                : whatsappCleaned;

            console.log('📱 Enviando código para:', whatsappParaEnviar);

            const result = await requestVerificationCode(
                user.email,
                whatsappParaEnviar,
                pilotoData.nome || 'Piloto'
            );

            if (!result.success) {
                console.error('❌ Falha ao enviar código:', result.error);
                
                // Mensagem de erro mais específica baseada no tipo de erro
                let errorMessage = result.error || 'Erro desconhecido';
                
                // Se for erro 404, significa que a Edge Function não está deployada
                if (errorMessage.includes('404') || errorMessage.includes('not found')) {
                    errorMessage = `❌ Serviço de envio de código não configurado (HTTP 404).\n\nA Edge Function 'send-whatsapp-code' precisa ser deployada no Supabase.\n\nPor favor, entre em contato com o administrador do sistema.`;
                } else if (errorMessage.includes('Erro ao processar resposta')) {
                    errorMessage = `❌ Erro ao processar resposta do servidor.\n\nPor favor, tente novamente em alguns instantes.`;
                } else {
                    errorMessage = `❌ Erro ao enviar código de verificação: ${errorMessage}\n\nPor favor, verifique o número e tente novamente.`;
                }
                
                // Manter na tela de input_whatsapp para permitir nova tentativa
                setErrorMsg(errorMessage);
                setSendingCode(false);
                // Garantir que estamos no step correto
                if (step !== 'input_whatsapp') {
                    setStep('input_whatsapp');
                }
                return;
            }

            console.log('✅ Código enviado com sucesso!');
            setCodeSent(true);
            setErrorMsg(''); // Limpar erros anteriores
            setStep('verify_code');
            setSendingCode(false);
            
        } catch (err) {
            console.error('❌ Erro ao enviar código (exceção):', err);
            // Manter na tela de input_whatsapp para permitir nova tentativa
            setErrorMsg(`❌ Erro inesperado ao enviar código: ${err.message || 'Erro desconhecido'}\n\nPor favor, tente novamente ou verifique sua conexão.`);
            setSendingCode(false);
            // Garantir que estamos no step correto
            if (step !== 'input_whatsapp') {
                setStep('input_whatsapp');
            }
        }
    };

    // 5. Validar código de verificação
    const handleVerifyCode = async () => {
        if (!codeInput || codeInput.length !== 6) {
            setErrorMsg('Digite o código de 6 dígitos');
            return;
        }

        if (!user?.email) {
            setErrorMsg('Erro: Sessão inválida. Faça login novamente.');
            setStep('login');
            return;
        }

        setVerifyingCode(true);
        setErrorMsg('');

        try {
            console.log('🔍 Validando código...');

            const result = await verifyCode(user.email, codeInput);

            if (!result.success || !result.valid) {
                const newAttempts = codeAttempts + 1;
                setCodeAttempts(newAttempts);
                
                // Após 3 tentativas incorretas, redirecionar para formulário de inscrição
                if (newAttempts >= 3) {
                    console.log('❌ Muitas tentativas incorretas de código. Redirecionando para formulário...');
                    setErrorMsg('❌ Muitas tentativas incorretas.\n\nPreencha o formulário abaixo para que a administração possa verificar suas informações.');
                    setStep('inscricao_manual');
                    setInscricaoData(prev => ({ 
                        ...prev, 
                        email: user.email,
                        nome: pilotoPlanilhaData?.nomeCadastrado || pilotoData?.nome || '',
                        nomePiloto: pilotoPlanilhaData?.nome || pilotoData?.nome || '',
                        whatsapp: whatsappInput
                    }));
                    setVerifyingCode(false);
                    return;
                }
                
                setErrorMsg(result.error || `Código inválido. Tentativa ${newAttempts} de 3. Verifique e tente novamente.`);
                setVerifyingCode(false);
                setCodeInput(''); // Limpar campo para nova tentativa
                return;
            }

            console.log('✅ Código validado com sucesso!');
            setCodeAttempts(0); // Resetar contador de tentativas

            // Marcar 2FA como validado para o dispositivo atual
            // No PC: sessão persistente até logout
            // No mobile: sessão persistente até logout (com chave separada)
            if (user?.email) {
                set2FAValidatedForDevice(user.email);
                const deviceType = deviceInfo.isMobile ? 'mobile' : 'desktop';
                console.log(`💾 2FA salvo no localStorage para ${deviceType} - usuário permanecerá logado neste dispositivo até fazer logout`);
            }
            
            // SEMPRE atualizar WhatsApp do piloto no Supabase após validação bem-sucedida
            // Isso garante que o WhatsApp está salvo no banco antes de redirecionar
            if (user?.email && whatsappInput) {
                const whatsappCleaned = cleanWhatsAppNumber(whatsappInput);
                console.log('💾 Atualizando WhatsApp do piloto no Supabase:', whatsappCleaned);
                
                const { error: updateError } = await supabase
                    .from('pilotos')
                    .update({ whatsapp: whatsappCleaned })
                    .eq('email', user.email.toLowerCase().trim());
                
                if (updateError) {
                    console.error('❌ Erro ao atualizar WhatsApp:', updateError);
                    // Mesmo com erro, continuar o fluxo pois o código foi validado
                } else {
                    console.log('✅ WhatsApp atualizado no Supabase com sucesso!');
                }
            } else {
                console.warn('⚠️ Não foi possível atualizar WhatsApp: email ou whatsappInput ausente');
            }

            // Verificar se a sessão está ativa antes de redirecionar
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
                console.warn('⚠️ Sessão não encontrada após validar código. Aguardando...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                const { data: { session: retrySession } } = await supabase.auth.getSession();
                if (!retrySession) {
                    console.error('❌ Sessão ainda não encontrada. Redirecionando para login...');
                    setErrorMsg('Erro ao manter sessão. Por favor, faça login novamente.');
                    setStep('login');
                    setVerifyingCode(false);
                    return;
                }
            }
            
            console.log('✅ Sessão confirmada. Redirecionando para /dashboard...');
            console.log('📱 Informações do dispositivo:', deviceInfo);
            console.log('🌐 URL atual:', window.location.href);
            setStep('success');
            setVerifyingCode(false);
            
            // Redirecionar após um breve delay
            // No mobile, usar window.location.href para garantir redirecionamento correto
            setTimeout(() => {
                const currentDeviceInfo = getDeviceInfo();
                if (currentDeviceInfo.isMobile) {
                    // No mobile, usar URL absoluta para garantir redirecionamento
                    const baseUrl = window.location.origin;
                    console.log('📱 Redirecionando mobile para:', `${baseUrl}/dashboard`);
                    window.location.href = `${baseUrl}/dashboard`;
                } else {
                    // No PC, usar navigate (mais suave)
                    console.log('💻 Redirecionando desktop para: /dashboard');
                    navigate('/dashboard');
                }
            }, 1500);
            
        } catch (err) {
            console.error('❌ Erro ao validar código:', err);
            setErrorMsg('Erro ao validar código. Tente novamente.');
            setVerifyingCode(false);
        }
    };

    // Função para tentar novamente o WhatsApp
    const handleRetryWhatsApp = () => {
        setShowWhatsAppError(false);
        setWhatsappInput('');
        sessionStorage.removeItem('login_whatsapp');
        setErrorMsg('');
        // Não resetar o contador de tentativas aqui, apenas quando validar com sucesso
    };

    // Formatar WhatsApp automaticamente enquanto digita
    const formatWhatsApp = (value) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 2) return cleaned;
        if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        if (cleaned.length <= 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    };

    const handleWhatsAppChange = (e) => {
        const formatted = formatWhatsApp(e.target.value);
        setWhatsappInput(formatted);
        setErrorMsg(''); // Limpa erro ao digitar
    };

    // 5. Enviar formulário de inscrição manual
    const handleSubmitInscricao = async () => {
        if (!inscricaoData.nome || !inscricaoData.gamertag || !inscricaoData.nomePiloto || !inscricaoData.whatsapp) {
            setErrorMsg('Preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            // Salvar no banco para admin verificar
            const { data, error } = await supabase
                .from('pilotos')
                .upsert({
                    email: user?.email || inscricaoData.email,
                    nome: inscricaoData.nomePiloto || inscricaoData.nome,
                    whatsapp: inscricaoData.whatsapp.replace(/\D/g, ''),
                    grid: inscricaoData.grid.toLowerCase(),
                    is_steward: false,
                    equipe: null
                    // Removido 'status', 'nome_completo', 'gamertag' e 'plataforma' pois não existem na tabela pilotos
                }, {
                    onConflict: 'email',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                console.error('Erro ao salvar inscrição:', error);
                setErrorMsg(`Erro ao enviar inscrição: ${error.message}`);
                setLoading(false);
                return;
            }

            setErrorMsg('');
            setInscricaoEnviada(true);
            setStep('success');
            
            // Não redirecionar, mostrar mensagem de sucesso

        } catch (err) {
            console.error('Erro inesperado:', err);
            setErrorMsg(`Erro ao enviar inscrição: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '20px',
            fontFamily: "'Montserrat', sans-serif"
        }}>
            <div style={{ 
                background: 'rgba(15, 23, 42, 0.95)', 
                padding: '50px 40px', 
                borderRadius: '20px', 
                border: '1px solid rgba(6, 182, 212, 0.3)',
                maxWidth: '480px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}>
                {/* Logo/Header */}
                <div style={{ marginBottom: '30px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🏎️</div>
                    <h1 style={{ 
                        color: 'white', 
                        fontSize: '2.2rem', 
                        marginBottom: '8px', 
                        fontWeight: '900', 
                        fontStyle: 'italic',
                        background: 'linear-gradient(90deg, #06B6D4, #3B82F6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        PAINEL DO PILOTO
                    </h1>
                    <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>Master League F1</p>
                </div>

                {/* Mensagens de Erro com Botão de Logout */}
                {errorMsg && (
                    <div style={{ 
                        background: 'rgba(239, 68, 68, 0.15)', 
                        color: '#FCA5A5', 
                        padding: '15px', 
                        borderRadius: '10px', 
                        marginBottom: '25px', 
                        fontSize: '0.9rem',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        textAlign: 'left',
                        whiteSpace: 'pre-line'
                    }}>
                        {errorMsg}
                        
                        {/* Botão para tentar com outro e-mail */}
                        {user && (
                            <button
                                onClick={handleLogout}
                                style={{
                                    width: '100%',
                                    marginTop: '15px',
                                    padding: '10px',
                                    background: 'transparent',
                                    color: '#FCA5A5',
                                    border: '1px solid #FCA5A5',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                                    e.target.style.borderColor = '#EF4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'transparent';
                                    e.target.style.borderColor = '#FCA5A5';
                                }}
                            >
                                🔄 Tentar com outro e-mail
                            </button>
                        )}
                        
                        {/* Informações de ajuda */}
                        <div style={{ 
                            marginTop: '15px', 
                            padding: '10px', 
                            background: 'rgba(0,0,0,0.2)', 
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            color: '#CBD5E1'
                        }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>💡 Dica:</p>
                            <p style={{ margin: 0 }}>
                                Certifique-se de usar o <strong>mesmo e-mail</strong> que você cadastrou na planilha de inscrição da liga.
                            </p>
                        </div>
                    </div>
                )}

                {/* STEP: Login com Google ou Microsoft */}
                {step === 'login' && (
                    <div>
                        <p style={{ color: '#94A3B8', marginBottom: '25px', fontSize: '0.95rem' }}>
                            Faça login com o <strong style={{ color: '#06B6D4' }}>e-mail cadastrado</strong> na inscrição da liga.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: 'white',
                                    color: '#0F172A',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 'bold',
                                    fontSize: '1.05rem',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    transition: 'all 0.3s',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: '24px' }} />
                                {loading ? 'Conectando...' : 'Entrar com Google'}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP: Verificando Email */}
                {step === 'verifying_email' && (
                    <div style={{ padding: '40px 0' }}>
                        <div style={{ 
                            width: '60px', 
                            height: '60px', 
                            border: '4px solid rgba(6, 182, 212, 0.3)',
                            borderTop: '4px solid #06B6D4',
                            borderRadius: '50%',
                            margin: '0 auto 20px',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <p style={{ color: '#06B6D4', fontSize: '1.1rem', fontWeight: 'bold' }}>🔍 Verificando inscrição...</p>
                        {user?.email && (
                            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: '15px', marginBottom: '5px' }}>
                                E-mail: <strong style={{ color: '#E2E8F0' }}>{user.email}</strong>
                            </p>
                        )}
                        <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '10px' }}>Consultando base de dados</p>
                    </div>
                )}

                {/* STEP: Input WhatsApp */}
                {step === 'input_whatsapp' && (
                    <div>
                        {/* Info do Piloto */}
                        <div style={{ 
                            marginBottom: '25px', 
                            padding: '20px',
                            background: 'rgba(6, 182, 212, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(6, 182, 212, 0.3)'
                        }}>
                            <p style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Piloto Identificado
                            </p>
                            <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: '900' }}>
                                {pilotoData?.nome || 'Piloto'}
                            </h3>
                            {user?.email && (
                                <p style={{ color: '#06B6D4', fontSize: '0.85rem', margin: 0 }}>
                                    📧 {user.email}
                                </p>
                            )}
                            {pilotoData?.grid && (
                                <p style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '8px' }}>
                                    {pilotoData.grid === 'carreira' ? '🏆 Grid Carreira' : '💡 Grid Light'}
                                </p>
                            )}
                        </div>

                        <p style={{ color: '#E2E8F0', marginBottom: '20px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            Para confirmar sua identidade, informe seu <strong style={{ color: '#06B6D4' }}>WhatsApp</strong>. Enviaremos um código de verificação:
                        </p>

                        <input
                            type="tel"
                            value={whatsappInput}
                            onChange={handleWhatsAppChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && whatsappInput.length >= 14 && !sendingCode) {
                                    e.preventDefault();
                                    handleSendCode();
                                }
                            }}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '2px solid rgba(6, 182, 212, 0.3)',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '1.15rem',
                                textAlign: 'center',
                                marginBottom: '20px',
                                outline: 'none',
                                fontWeight: 'bold',
                                letterSpacing: '1px',
                                transition: 'all 0.3s',
                                boxSizing: 'border-box'
                            }}
                        />

                        <button
                            onClick={handleSendCode}
                            disabled={whatsappInput.length < 14 || sendingCode}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: (whatsappInput.length >= 14 && !sendingCode)
                                    ? 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)' 
                                    : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                fontSize: '1.05rem',
                                cursor: (whatsappInput.length >= 14 && !sendingCode) ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s',
                                opacity: (whatsappInput.length >= 14 && !sendingCode) ? 1 : 0.5
                            }}
                        >
                            {sendingCode ? '📤 Enviando código...' : '📱 Enviar Código de Verificação'}
                        </button>

                        {/* Se WhatsApp não confere, permitir reenviar inscrição sem forçar imediatamente */}
                        {showWhatsAppError && (
                            <button
                                onClick={() => {
                                    setStep('inscricao_manual');
                                    setInscricaoData(prev => ({
                                        ...prev,
                                        email: user?.email || '',
                                        nome: pilotoPlanilhaData?.nomeCadastrado || '',
                                        nomePiloto: pilotoPlanilhaData?.nome || pilotoData?.nome || '',
                                        whatsapp: whatsappInput
                                    }));
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    marginTop: '12px',
                                    background: 'transparent',
                                    color: '#FCA5A5',
                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                    borderRadius: '10px',
                                    fontWeight: '700',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                            >
                                📝 Reenviar inscrição (atualizar dados)
                            </button>
                        )}
                    </div>
                )}

                {/* STEP: Verificar Código */}
                {step === 'verify_code' && (
                    <div>
                        {/* Info do Piloto */}
                        <div style={{ 
                            marginBottom: '25px', 
                            padding: '20px',
                            background: 'rgba(6, 182, 212, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(6, 182, 212, 0.3)'
                        }}>
                            <p style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Código Enviado
                            </p>
                            <p style={{ color: '#E2E8F0', fontSize: '0.95rem', margin: 0 }}>
                                Enviamos um código de 6 dígitos para:
                            </p>
                            <p style={{ color: '#06B6D4', fontSize: '1rem', marginTop: '8px', fontWeight: 'bold' }}>
                                📱 {formatWhatsAppDisplay(whatsappInput)}
                            </p>
                        </div>

                        <p style={{ color: '#E2E8F0', marginBottom: '20px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            Digite o código que você recebeu no WhatsApp:
                        </p>

                        <input
                            type="text"
                            value={codeInput}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setCodeInput(value);
                                setErrorMsg(''); // Limpa erro ao digitar
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && codeInput.length === 6 && !verifyingCode) {
                                    e.preventDefault();
                                    handleVerifyCode();
                                }
                            }}
                            placeholder="000000"
                            maxLength={6}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '2px solid rgba(6, 182, 212, 0.3)',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '1.5rem',
                                textAlign: 'center',
                                marginBottom: '20px',
                                outline: 'none',
                                fontWeight: 'bold',
                                letterSpacing: '8px',
                                transition: 'all 0.3s',
                                boxSizing: 'border-box'
                            }}
                            autoFocus
                        />

                        <button
                            onClick={handleVerifyCode}
                            disabled={codeInput.length !== 6 || verifyingCode}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: (codeInput.length === 6 && !verifyingCode)
                                    ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' 
                                    : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                fontSize: '1.05rem',
                                cursor: (codeInput.length === 6 && !verifyingCode) ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s',
                                opacity: (codeInput.length === 6 && !verifyingCode) ? 1 : 0.5,
                                marginBottom: '15px'
                            }}
                        >
                            {verifyingCode ? '⏳ Validando...' : '✅ Confirmar Código'}
                        </button>

                        <button
                            onClick={() => {
                                setCodeSent(false);
                                setCodeInput('');
                                setCodeAttempts(0); // Resetar tentativas ao voltar
                                setStep('input_whatsapp');
                            }}
                            disabled={sendingCode}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'transparent',
                                color: '#94A3B8',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.05)';
                                e.target.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.color = '#94A3B8';
                            }}
                        >
                            🔄 Usar outro número ou reenviar código
                        </button>
                    </div>
                )}

                {/* STEP: Formulário de Inscrição Manual */}
                {step === 'inscricao_manual' && (
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#FBBF24', fontWeight: '900' }}>
                            📝 Formulário de Inscrição
                        </h2>
                        <p style={{ color: '#94A3B8', marginBottom: '25px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Preencha os dados abaixo para que a administração possa verificar suas informações e liberar seu acesso.
                        </p>

                        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                E-mail (já preenchido)
                            </label>
                            <input
                                type="email"
                                value={user?.email || inscricaoData.email || ''}
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#94A3B8',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                Nome Completo *
                            </label>
                            <input
                                type="text"
                                value={inscricaoData.nome}
                                onChange={(e) => setInscricaoData({ ...inscricaoData, nome: e.target.value })}
                                placeholder="Seu nome completo"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid rgba(6, 182, 212, 0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                Nome do Piloto *
                            </label>
                            <input
                                type="text"
                                value={inscricaoData.nomePiloto}
                                onChange={(e) => setInscricaoData({ ...inscricaoData, nomePiloto: e.target.value })}
                                placeholder="Nome que aparece nas transmissões"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid rgba(6, 182, 212, 0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                Gamertag/ID *
                            </label>
                            <input
                                type="text"
                                value={inscricaoData.gamertag}
                                onChange={(e) => setInscricaoData({ ...inscricaoData, gamertag: e.target.value })}
                                placeholder="Seu gamertag no jogo"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid rgba(6, 182, 212, 0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                WhatsApp *
                            </label>
                            <input
                                type="tel"
                                value={inscricaoData.whatsapp}
                                onChange={(e) => {
                                    const formatted = formatWhatsApp(e.target.value);
                                    setInscricaoData({ ...inscricaoData, whatsapp: formatted });
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !loading && inscricaoData.nome && inscricaoData.gamertag && inscricaoData.nomePiloto && inscricaoData.whatsapp) {
                                        e.preventDefault();
                                        handleSubmitInscricao();
                                    }
                                }}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid rgba(6, 182, 212, 0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ textAlign: 'left' }}>
                                <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                    Plataforma *
                                </label>
                                <select
                                    value={inscricaoData.plataforma}
                                    onChange={(e) => setInscricaoData({ ...inscricaoData, plataforma: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '2px solid rgba(6, 182, 212, 0.3)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="Xbox" style={{ background: '#1E293B' }}>Xbox</option>
                                    <option value="PlayStation" style={{ background: '#1E293B' }}>PlayStation</option>
                                    <option value="PC" style={{ background: '#1E293B' }}>PC</option>
                                </select>
                            </div>

                            <div style={{ textAlign: 'left' }}>
                                <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                    Grid *
                                </label>
                                <select
                                    value={inscricaoData.grid}
                                    onChange={(e) => setInscricaoData({ ...inscricaoData, grid: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '2px solid rgba(6, 182, 212, 0.3)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="Carreira" style={{ background: '#1E293B' }}>Carreira</option>
                                    <option value="Light" style={{ background: '#1E293B' }}>Light</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmitInscricao}
                            disabled={loading || !inscricaoData.nome || !inscricaoData.gamertag || !inscricaoData.nomePiloto || !inscricaoData.whatsapp}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: (loading || !inscricaoData.nome || !inscricaoData.gamertag || !inscricaoData.nomePiloto || !inscricaoData.whatsapp)
                                    ? 'rgba(255,255,255,0.1)'
                                    : 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                fontSize: '1.05rem',
                                cursor: (loading || !inscricaoData.nome || !inscricaoData.gamertag || !inscricaoData.nomePiloto || !inscricaoData.whatsapp) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s',
                                opacity: (loading || !inscricaoData.nome || !inscricaoData.gamertag || !inscricaoData.nomePiloto || !inscricaoData.whatsapp) ? 0.5 : 1
                            }}
                        >
                            {loading ? 'Enviando...' : '📤 Enviar para Verificação'}
                        </button>

                        <p style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '15px', textAlign: 'center' }}>
                            * Campos obrigatórios. A administração verificará suas informações e liberará seu acesso.
                        </p>
                    </div>
                )}

                {/* STEP: Success */}
                {step === 'success' && (
                    <div style={{ padding: '40px 0' }}>
                        <div style={{ 
                            width: '80px', 
                            height: '80px', 
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            fontSize: '3rem'
                        }}>
                            ✅
                        </div>
                        <h2 style={{ fontSize: '1.8rem', margin: '0 0 10px 0', color: '#22C55E', fontWeight: '900' }}>
                            {inscricaoEnviada ? 'Inscrição Enviada!' : 'Acesso Liberado!'}
                        </h2>
                        <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto' }}>
                            {inscricaoEnviada 
                                ? 'Sua solicitação foi enviada com sucesso! A administração irá analisar suas informações e retornar em breve. Você receberá uma notificação quando seu acesso for liberado.'
                                : 'Redirecionando para o painel...'}
                        </p>
                        {inscricaoEnviada && (
                            <button
                                onClick={handleLogout}
                                style={{
                                    marginTop: '25px',
                                    padding: '12px 24px',
                                    background: 'transparent',
                                    color: '#94A3B8',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.05)';
                                    e.target.style.color = 'white';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'transparent';
                                    e.target.style.color = '#94A3B8';
                                }}
                            >
                                Voltar ao Login
                            </button>
                        )}
                    </div>
                )}

                {/* Rodapé */}
                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ color: '#475569', fontSize: '0.75rem', margin: 0 }}>
                        🔒 Sistema de autenticação segura
                    </p>
                </div>
            </div>

            {/* Animations CSS */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>

            {/* POPUP: Erro WhatsApp - Fora do container principal */}
            {showWhatsAppError && (
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
                    zIndex: 1000,
                    padding: '20px'
                }} onClick={() => setShowWhatsAppError(false)}>
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.98)',
                        borderRadius: '20px',
                        padding: '40px',
                        maxWidth: '450px',
                        width: '100%',
                        border: '2px solid rgba(239, 68, 68, 0.5)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            fontSize: '3rem'
                        }}>
                            ❌
                        </div>
                        <h2 style={{ fontSize: '1.5rem', margin: '0 0 15px 0', color: '#EF4444', fontWeight: '900', textAlign: 'center' }}>
                            WhatsApp Incorreto
                        </h2>
                        <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '25px', textAlign: 'center' }}>
                            O número informado não confere com o cadastro na planilha.
                            {whatsappAttempts < 3 && (
                                <><br/><br/><strong style={{color: '#E2E8F0'}}>Tentativa {whatsappAttempts} de 3</strong></>
                            )}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                            {whatsappAttempts < 3 ? (
                                <>
                                    <button
                                        onClick={handleRetryWhatsApp}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontWeight: 'bold',
                                            fontSize: '1.05rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'translateY(-2px)';
                                            e.target.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    >
                                        🔄 Tentar Novamente
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowWhatsAppError(false);
                                            setStep('inscricao_manual');
                                            setInscricaoData(prev => ({ 
                                                ...prev, 
                                                email: user?.email || '',
                                                nome: pilotoData?.nome || '',
                                                nomePiloto: pilotoData?.nome || '',
                                                whatsapp: whatsappInput
                                            }));
                                            setErrorMsg('❌ O número informado não confere com o cadastro na planilha.\n\nPreencha o formulário abaixo para que a administração possa verificar suas informações.');
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'transparent',
                                            color: '#94A3B8',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '10px',
                                            fontWeight: '600',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = 'rgba(255,255,255,0.05)';
                                            e.target.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'transparent';
                                            e.target.style.color = '#94A3B8';
                                        }}
                                    >
                                        Ou reenviar inscrição agora
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        setShowWhatsAppError(false);
                                        setStep('inscricao_manual');
                                        setInscricaoData(prev => ({ 
                                            ...prev, 
                                            email: user?.email || '',
                                            nome: pilotoData?.nome || '',
                                            nomePiloto: pilotoData?.nome || '',
                                            whatsapp: whatsappInput
                                        }));
                                        setErrorMsg('❌ Após várias tentativas, o número informado não confere com o cadastro na planilha.\n\nPreencha o formulário abaixo para que a administração possa verificar suas informações.');
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: 'bold',
                                        fontSize: '1.05rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'translateY(-2px)';
                                        e.target.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                >
                                    📝 Reenviar Inscrição
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Login;


