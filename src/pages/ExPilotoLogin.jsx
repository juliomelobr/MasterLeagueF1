import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { requestVerificationCode, verifyCode, cleanWhatsAppNumber } from '../utils/whatsappAuth';
import { set2FAValidatedForDevice } from '../utils/deviceDetection';
import '../index.css';

// Função para hash de senha (mesma do cadastro)
const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

function ExPilotoLogin() {
    const navigate = useNavigate();
    const [step, setStep] = useState('email'); // 'email', 'whatsapp', 'codigo', 'senha', 'criar_senha'
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Dados
    const [email, setEmail] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [codeInput, setCodeInput] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [criandoSenha, setCriandoSenha] = useState(false);
    
    // Estados
    const [pilotoData, setPilotoData] = useState(null);
    const [sendingCode, setSendingCode] = useState(false);
    const [verifyingCode, setVerifyingCode] = useState(false);
    const [codeSent, setCodeSent] = useState(false);

    const formatWhatsApp = (value) => {
        let cleaned = value.replace(/\D/g, '');
        if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
        if (cleaned.length > 2) cleaned = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        if (cleaned.length > 10) cleaned = `${cleaned.slice(0, 10)}-${cleaned.slice(10)}`;
        return cleaned;
    };

    // Verificar email e buscar dados do ex-piloto
    const handleEmailSubmit = async () => {
        if (!email || !email.includes('@')) {
            setErrorMsg('⚠️ E-mail inválido');
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            const { data, error } = await supabase
                .from('pilotos')
                .select('*')
                .eq('email', email.toLowerCase().trim())
                .eq('tipo_piloto', 'ex-piloto')
                .single();

            if (error || !data) {
                setErrorMsg('⚠️ E-mail não encontrado ou não é um ex-piloto cadastrado. Deseja fazer o cadastro?');
                setLoading(false);
                // Não retornar aqui, deixar o usuário ver a mensagem e o botão de cadastro
                return;
            }

            // Verificar se está aprovado (status === 'ativo') - só pode fazer login se aprovado
            if (data.status !== 'ativo') {
                setErrorMsg('⚠️ Seu acesso ainda não foi liberado. Aguarde a aprovação do administrador.');
                setLoading(false);
                return;
            }

            setPilotoData(data);
            setWhatsapp(data.whatsapp || '');
            setStep('whatsapp');
        } catch (err) {
            console.error('Erro ao buscar ex-piloto:', err);
            setErrorMsg('Erro ao verificar e-mail. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Enviar código WhatsApp
    const handleSendCode = async () => {
        if (!whatsapp || cleanWhatsAppNumber(whatsapp).length < 10) {
            setErrorMsg('⚠️ WhatsApp inválido! Deve ter pelo menos 10 dígitos.');
            return;
        }

        setSendingCode(true);
        setErrorMsg('');

        try {
            const whatsappLimpo = cleanWhatsAppNumber(whatsapp);
            const result = await requestVerificationCode(
                email,
                whatsappLimpo,
                pilotoData.nome
            );

            if (result.success) {
                setCodeSent(true);
                setStep('codigo');
            } else {
                setErrorMsg(result.error || 'Erro ao enviar código. Tente novamente.');
            }
        } catch (err) {
            console.error('Erro ao enviar código:', err);
            setErrorMsg('Erro ao enviar código. Tente novamente.');
        } finally {
            setSendingCode(false);
        }
    };

    // Validar código WhatsApp
    const handleVerifyCode = async () => {
        if (!codeInput || codeInput.length !== 6) {
            setErrorMsg('⚠️ Digite o código de 6 dígitos');
            return;
        }

        setVerifyingCode(true);
        setErrorMsg('');

        try {
            const result = await verifyCode(email, codeInput);

            if (result.success) {
                console.log('✅ Código validado com sucesso');
                
                // Verificar novamente se está aprovado antes de permitir criar senha
                if (pilotoData.status !== 'ativo') {
                    setErrorMsg('⚠️ Você precisa ser aprovado pelo administrador antes de criar uma senha.');
                    setVerifyingCode(false);
                    return;
                }
                
                // Se já tem senha, pedir senha para login. Se não, pedir para criar senha
                if (pilotoData.senha_hash) {
                    setStep('senha'); // Passo de login com senha
                } else {
                    // Só permite criar senha se estiver aprovado (já verificado acima)
                    setStep('criar_senha'); // Passo de criar senha
                }
            } else {
                setErrorMsg(result.error || 'Código inválido. Tente novamente.');
            }
        } catch (err) {
            console.error('Erro ao validar código:', err);
            setErrorMsg('Erro ao validar código. Tente novamente.');
        } finally {
            setVerifyingCode(false);
        }
    };

    // Criar senha (após aprovação)
    const handleCriarSenha = async () => {
        if (!senha || senha.length < 6) {
            setErrorMsg('⚠️ A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (senha !== confirmarSenha) {
            setErrorMsg('⚠️ As senhas não conferem');
            return;
        }

        setCriandoSenha(true);
        setErrorMsg('');

        try {
            // Hash da senha
            const senhaHash = await hashPassword(senha);

            // Atualizar senha no banco
            const { error } = await supabase
                .from('pilotos')
                .update({ senha_hash: senhaHash })
                .eq('id', pilotoData.id);

            if (error) {
                throw new Error(error.message);
            }

            // Atualizar dados locais
            pilotoData.senha_hash = senhaHash;

            // Criar sessão manual
            sessionStorage.setItem('ex_piloto_session', JSON.stringify({
                email: pilotoData.email,
                nome: pilotoData.nome,
                tipo: 'ex-piloto',
                timestamp: Date.now()
            }));

            // Salvar flag de 2FA usando detecção de dispositivo
            set2FAValidatedForDevice(pilotoData.email);

            // Redirecionar para dashboard
            navigate('/dashboard');
        } catch (err) {
            console.error('Erro ao criar senha:', err);
            setErrorMsg('Erro ao criar senha. Tente novamente.');
        } finally {
            setCriandoSenha(false);
        }
    };

    // Fazer login com senha
    const handleLogin = async () => {
        if (!senha || senha.length < 6) {
            setErrorMsg('⚠️ Digite sua senha');
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            // Hash da senha digitada
            const senhaHash = await hashPassword(senha);

            // Verificar se a senha confere
            if (senhaHash !== pilotoData.senha_hash) {
                setErrorMsg('⚠️ Senha incorreta');
                setLoading(false);
                return;
            }

            // Criar sessão manual (já que não usa Supabase Auth)
            // Salvar dados na sessionStorage
            sessionStorage.setItem('ex_piloto_session', JSON.stringify({
                email: pilotoData.email,
                nome: pilotoData.nome,
                tipo: 'ex-piloto',
                timestamp: Date.now()
            }));

            // Salvar flag de 2FA usando detecção de dispositivo
            set2FAValidatedForDevice(pilotoData.email);

            // Redirecionar para dashboard
            navigate('/dashboard');
        } catch (err) {
            console.error('Erro ao fazer login:', err);
            setErrorMsg('Erro ao fazer login. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Renderizar passo de email
    if (step === 'email') {
        return (
            <div className="page-wrapper">
                <div className="login-section">
                    <div className="login-card" style={{ maxWidth: '400px' }}>
                        <h1 style={{ color: 'var(--highlight-cyan)', marginBottom: '10px' }}>
                            📜 LOGIN EX-PILOTO
                        </h1>
                        <p className="login-subtitle" style={{ marginBottom: '30px' }}>
                            Digite o e-mail cadastrado
                        </p>

                        {errorMsg && (
                            <div style={{
                                background: 'rgba(220, 38, 38, 0.2)',
                                color: '#FECACA',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                fontSize: '0.9rem'
                            }}>
                                {errorMsg}
                            </div>
                        )}

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '6px',
                                border: '1px solid #475569',
                                background: '#1E293B',
                                color: 'white',
                                marginBottom: '20px'
                            }}
                            autoFocus
                        />

                        <button
                            onClick={handleEmailSubmit}
                            disabled={loading || !email}
                            className="btn-primary"
                            style={{ width: '100%', marginBottom: '15px' }}
                        >
                            {loading ? 'VERIFICANDO...' : 'CONTINUAR'}
                        </button>

                        {errorMsg && errorMsg.includes('não encontrado') && (
                            <button
                                onClick={() => navigate('/ex-piloto/cadastro')}
                                className="btn-primary"
                                style={{ 
                                    width: '100%', 
                                    marginBottom: '15px',
                                    background: 'rgba(6, 182, 212, 0.2)',
                                    border: '1px solid var(--highlight-cyan)',
                                    color: 'var(--highlight-cyan)'
                                }}
                            >
                                📝 FAZER CADASTRO
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/dashboard/escolher-tipo')}
                            style={{
                                background: 'transparent',
                                border: '1px solid #64748B',
                                color: '#94A3B8',
                                padding: '10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                width: '100%'
                            }}
                        >
                            ← Voltar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Renderizar passo de WhatsApp
    if (step === 'whatsapp') {
        return (
            <div className="page-wrapper">
                <div className="login-section">
                    <div className="login-card" style={{ maxWidth: '400px' }}>
                        <h1 style={{ color: 'var(--highlight-cyan)', marginBottom: '10px' }}>
                            📱 CONFIRMAR WHATSAPP
                        </h1>
                        <p className="login-subtitle" style={{ marginBottom: '30px' }}>
                            Digite seu número de WhatsApp para receber o código
                        </p>

                        {errorMsg && (
                            <div style={{
                                background: 'rgba(220, 38, 38, 0.2)',
                                color: '#FECACA',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                fontSize: '0.9rem'
                            }}>
                                {errorMsg}
                            </div>
                        )}

                        <input
                            type="text"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                            placeholder="(00) 00000-0000"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '6px',
                                border: '1px solid #475569',
                                background: '#1E293B',
                                color: 'white',
                                marginBottom: '20px'
                            }}
                            autoFocus
                        />

                        <button
                            onClick={handleSendCode}
                            disabled={sendingCode || !whatsapp}
                            className="btn-primary"
                            style={{ width: '100%', marginBottom: '15px' }}
                        >
                            {sendingCode ? 'ENVIANDO CÓDIGO...' : 'ENVIAR CÓDIGO'}
                        </button>

                        <button
                            onClick={() => setStep('email')}
                            style={{
                                background: 'transparent',
                                border: '1px solid #64748B',
                                color: '#94A3B8',
                                padding: '10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                width: '100%'
                            }}
                        >
                            ← Voltar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Renderizar passo de código
    if (step === 'codigo') {
        return (
            <div className="page-wrapper">
                <div className="login-section">
                    <div className="login-card" style={{ maxWidth: '400px' }}>
                        <h1 style={{ color: 'var(--highlight-cyan)', marginBottom: '10px' }}>
                            📱 VALIDAR CÓDIGO
                        </h1>
                        <p className="login-subtitle" style={{ marginBottom: '30px' }}>
                            Digite o código de 6 dígitos enviado para<br/>
                            <strong>{whatsapp}</strong>
                        </p>

                        {errorMsg && (
                            <div style={{
                                background: 'rgba(220, 38, 38, 0.2)',
                                color: '#FECACA',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                fontSize: '0.9rem'
                            }}>
                                {errorMsg}
                            </div>
                        )}

                        <input
                            type="text"
                            value={codeInput}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setCodeInput(value);
                            }}
                            placeholder="000000"
                            maxLength={6}
                            style={{
                                width: '100%',
                                padding: '15px',
                                fontSize: '1.5rem',
                                textAlign: 'center',
                                letterSpacing: '10px',
                                borderRadius: '6px',
                                border: '1px solid #475569',
                                background: '#1E293B',
                                color: 'white',
                                marginBottom: '20px'
                            }}
                            autoFocus
                        />

                        <button
                            onClick={handleVerifyCode}
                            disabled={verifyingCode || codeInput.length !== 6}
                            className="btn-primary"
                            style={{ width: '100%', marginBottom: '15px' }}
                        >
                            {verifyingCode ? 'VALIDANDO...' : 'VALIDAR CÓDIGO'}
                        </button>

                        <button
                            onClick={() => setStep('whatsapp')}
                            style={{
                                background: 'transparent',
                                border: '1px solid #64748B',
                                color: '#94A3B8',
                                padding: '10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                width: '100%'
                            }}
                        >
                            ← Voltar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Renderizar passo de senha
    if (step === 'senha') {
        return (
            <div className="page-wrapper">
                <div className="login-section">
                    <div className="login-card" style={{ maxWidth: '400px' }}>
                        <h1 style={{ color: 'var(--highlight-cyan)', marginBottom: '10px' }}>
                            🔐 DIGITE SUA SENHA
                        </h1>
                        <p className="login-subtitle" style={{ marginBottom: '30px' }}>
                            Digite sua senha para acessar o painel
                        </p>

                        {errorMsg && (
                            <div style={{
                                background: 'rgba(220, 38, 38, 0.2)',
                                color: '#FECACA',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                fontSize: '0.9rem'
                            }}>
                                {errorMsg}
                            </div>
                        )}

                        <input
                            type="password"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            placeholder="Digite sua senha"
                            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '6px',
                                border: '1px solid #475569',
                                background: '#1E293B',
                                color: 'white',
                                marginBottom: '20px'
                            }}
                            autoFocus
                        />

                        <button
                            onClick={handleLogin}
                            disabled={loading || !senha}
                            className="btn-primary"
                            style={{ width: '100%', marginBottom: '15px' }}
                        >
                            {loading ? 'ENTRANDO...' : 'ENTRAR'}
                        </button>

                        <button
                            onClick={() => setStep('codigo')}
                            style={{
                                background: 'transparent',
                                border: '1px solid #64748B',
                                color: '#94A3B8',
                                padding: '10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                width: '100%'
                            }}
                        >
                            ← Voltar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Renderizar passo de criar senha (após aprovação, se não tiver senha)
    if (step === 'criar_senha') {
        return (
            <div className="page-wrapper">
                <div className="login-section">
                    <div className="login-card" style={{ maxWidth: '400px' }}>
                        <h1 style={{ color: 'var(--highlight-cyan)', marginBottom: '10px' }}>
                            🔐 CRIAR SENHA
                        </h1>
                        <p className="login-subtitle" style={{ marginBottom: '30px' }}>
                            Crie uma senha para acessar seu painel
                        </p>

                        {errorMsg && (
                            <div style={{
                                background: 'rgba(220, 38, 38, 0.2)',
                                color: '#FECACA',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                fontSize: '0.9rem'
                            }}>
                                {errorMsg}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#CBD5E1' }}>
                                    SENHA *
                                </label>
                                <input
                                    type="password"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        border: '1px solid #475569',
                                        background: '#1E293B',
                                        color: 'white'
                                    }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#CBD5E1' }}>
                                    CONFIRMAR SENHA *
                                </label>
                                <input
                                    type="password"
                                    value={confirmarSenha}
                                    onChange={(e) => setConfirmarSenha(e.target.value)}
                                    placeholder="Digite a senha novamente"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        border: '1px solid #475569',
                                        background: '#1E293B',
                                        color: 'white'
                                    }}
                                    required
                                />
                            </div>

                            <button
                                onClick={handleCriarSenha}
                                disabled={criandoSenha || !senha || !confirmarSenha}
                                className="btn-primary"
                                style={{ width: '100%', marginTop: '10px' }}
                            >
                                {criandoSenha ? 'CRIANDO...' : 'CRIAR SENHA E ENTRAR'}
                            </button>

                            <button
                                onClick={() => setStep('codigo')}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #64748B',
                                    color: '#94A3B8',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    width: '100%'
                                }}
                            >
                                ← Voltar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

export default ExPilotoLogin;

