import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ADMIN_WHATSAPP, sendWhatsappNotification } from '../utils/whatsappNotify';
import Footer from '../components/Footer';
import './FormularioAcusacaoDefesa.css';
import './Inscricao.css';

const PIX_PHONE = '51983433940';
const PIX_LABEL = '(51) 98343-3940';
const INSCRICAO_FOTOS_BUCKET = 'inscricoes-fotos';
const FOTO_MAX_BYTES = 5 * 1024 * 1024;
const FOTO_TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

const initialForm = {
    nome: '',
    gamertagId: '',
    whatsapp: '',
    plataforma: '',
    grid: '',
    emailLogin: '',
    nomePilotoTransmissao: '',
    numeroCarro: '',
    formaPagamento: '',
    dataPagamento: '',
};

const formatWhatsapp = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

function Inscricao() {
    const [form, setForm] = useState(initialForm);
    const [fotoFile, setFotoFile] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null);
    const fotoInputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [temporadaAtual, setTemporadaAtual] = useState(20);

    const dataInscricao = useMemo(() => new Date(), []);
    const dataInscricaoFormatada = useMemo(
        () => dataInscricao.toLocaleString('pt-BR'),
        [dataInscricao]
    );

    useEffect(() => {
        const fetchTemporadaAtual = async () => {
            try {
                const { data, error } = await supabase
                    .from('app_config')
                    .select('value')
                    .eq('key', 'inscricao_temporada_atual')
                    .single();
                if (!error && data?.value) {
                    const t = parseInt(String(data.value), 10);
                    if (!Number.isNaN(t) && t > 0) setTemporadaAtual(t);
                }
            } catch {
                // mantém fallback 20
            }
        };
        fetchTemporadaAtual();
    }, []);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrorMsg('');
        setSuccessMsg('');
    };

    const handleFotoChange = (e) => {
        const f = e.target.files?.[0];
        setErrorMsg('');
        setSuccessMsg('');
        if (!f) {
            setFotoFile(null);
            setFotoPreview(null);
            return;
        }
        if (!FOTO_TIPOS_ACEITOS.includes(f.type)) {
            setErrorMsg('Foto: use JPG, PNG ou WebP.');
            setFotoFile(null);
            setFotoPreview(null);
            e.target.value = '';
            return;
        }
        if (f.size > FOTO_MAX_BYTES) {
            setErrorMsg('Foto: tamanho máximo 5 MB.');
            setFotoFile(null);
            setFotoPreview(null);
            e.target.value = '';
            return;
        }
        setFotoFile(f);
        setFotoPreview(URL.createObjectURL(f));
    };

    const limparFoto = () => {
        setFotoFile(null);
        setFotoPreview(null);
        if (fotoInputRef.current) fotoInputRef.current.value = '';
    };

    useEffect(() => () => {
        if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    }, [fotoPreview]);

    const validate = () => {
        if (!form.nome.trim()) return 'Informe seu nome.';
        if (!form.gamertagId.trim()) return 'Informe a Gamertag/ID.';
        if (form.whatsapp.replace(/\D/g, '').length !== 11) return 'Whatsapp inválido. Use o formato 00 00000-0000.';
        if (!form.emailLogin.trim()) return 'Informe o e-mail de login.';
        if (!form.nomePilotoTransmissao.trim()) return 'Informe o nome de piloto para transmissão.';
        if (!form.numeroCarro.trim()) return 'Informe o número do carro.';
        if (!form.plataforma) return 'Selecione a plataforma.';
        if (!form.grid) return 'Selecione o grid.';
        if (!form.formaPagamento) return 'Selecione uma opção de pagamento.';
        if (form.formaPagamento === 'pagar_depois' && !form.dataPagamento) {
            return 'Informe a data para pagamento posterior.';
        }
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validate();
        if (validationError) {
            setErrorMsg(validationError);
            return;
        }

        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            let fotoUrl = null;
            if (fotoFile) {
                const ext =
                    fotoFile.type === 'image/png' ? 'png' : fotoFile.type === 'image/webp' ? 'webp' : 'jpg';
                const path = `inscricoes/${crypto.randomUUID()}.${ext}`;
                const { error: upErr } = await supabase.storage
                    .from(INSCRICAO_FOTOS_BUCKET)
                    .upload(path, fotoFile, { contentType: fotoFile.type, upsert: false });
                if (upErr) throw upErr;
                const { data: pub } = supabase.storage.from(INSCRICAO_FOTOS_BUCKET).getPublicUrl(path);
                fotoUrl = pub.publicUrl;
            }

            const payload = {
                temporada: temporadaAtual,
                nome: form.nome.trim(),
                gamertag_id: form.gamertagId.trim(),
                whatsapp: form.whatsapp.replace(/\D/g, ''),
                plataforma: form.plataforma.toLowerCase(),
                grid: form.grid.toLowerCase(),
                email_login: form.emailLogin.trim().toLowerCase(),
                data_inscricao: dataInscricao.toISOString(),
                nome_piloto_transmissao: form.nomePilotoTransmissao.trim(),
                numero_carro: form.numeroCarro.trim(),
                forma_pagamento: form.formaPagamento,
                data_pagamento_prevista: form.formaPagamento === 'pagar_depois' ? form.dataPagamento : null,
                status_inscricao: 'pendente',
                foto_url: fotoUrl,
            };

            const { data: inserted, error } = await supabase.from('season_registrations').insert(payload).select('id').single();
            if (error) throw error;

            // Mensagem de boas-vindas + cópia ao ADM (reusa o mesmo mecanismo já usado em análises/propostas)
            // Não bloqueia a inscrição se falhar.
            const gridUpper = String(form.grid || '').trim().toUpperCase();
            const plataformaUpper = String(form.plataforma || '').trim().toUpperCase();
            const msgPiloto =
                `🏁 *BEM-VINDO À MASTER LEAGUE F1!*\n\n` +
                `Olá ${payload.nome}!\n\n` +
                `✅ Recebemos sua inscrição para a *T${temporadaAtual}*.\n\n` +
                `📌 *Grid:* ${gridUpper}\n` +
                `🎮 *Plataforma:* ${plataformaUpper}\n\n` +
                `Em breve o ADM vai analisar e atualizar o status da sua inscrição.\n\n` +
                `🏎️ Boa sorte e nos vemos na pista!`;
            const msgAdm =
                `📥 *NOVA INSCRIÇÃO (CÓPIA ADM)*\n\n` +
                `👤 Nome: ${payload.nome}\n` +
                `🎮 Plataforma: ${plataformaUpper}\n` +
                `🏁 Grid: ${gridUpper}\n` +
                `📧 E-mail: ${payload.email_login}\n` +
                `📱 WhatsApp: ${payload.whatsapp}\n` +
                `🗓️ Temporada: T${temporadaAtual}\n` +
                `${payload.foto_url ? `🖼️ Foto: ${payload.foto_url}\n` : ''}` +
                `⏰ ${new Date(payload.data_inscricao).toLocaleString('pt-BR')}`;

            Promise.allSettled([
                sendWhatsappNotification({
                    phone: payload.whatsapp,
                    email: payload.email_login,
                    nome: payload.nome,
                    message: msgPiloto,
                }),
                sendWhatsappNotification({
                    phone: ADMIN_WHATSAPP,
                    email: 'admin@masterleaguef1.com',
                    nome: 'ADM Master League F1',
                    message: msgAdm,
                }),
            ])
                .then(async (results) => {
                    const okPiloto = results?.[0]?.status === 'fulfilled' && results?.[0]?.value?.success;
                    if (okPiloto && inserted?.id) {
                        await supabase
                            .from('season_registrations')
                            .update({ boas_vindas_enviada_em: new Date().toISOString() })
                            .eq('id', inserted.id);
                    }
                })
                .catch(() => { /* ignorar */ });

            setSuccessMsg('Inscrição enviada com sucesso! Seus dados já estão disponíveis para o ADM.');
            setForm(initialForm);
            limparFoto();
        } catch (err) {
            setErrorMsg(`Erro ao salvar inscrição: ${err.message || 'erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    const copyPix = async () => {
        try {
            await navigator.clipboard.writeText(PIX_PHONE);
            setSuccessMsg('Chave PIX copiada com sucesso.');
        } catch {
            setErrorMsg('Não foi possível copiar a chave PIX automaticamente.');
        }
    };

    return (
        <div className="form-steward-page inscricao-page" style={{ minHeight: '100vh', padding: '90px 20px 40px' }}>
            <div className="form-steward-container inscricao-container" style={{ maxWidth: '820px', margin: '0 auto' }}>
                <div className="form-steward-card inscricao-card" style={{ background: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 35px rgba(0,0,0,0.35)' }}>
                    <div className="form-steward-card-header inscricao-card-header" style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #2563EB 100%)', padding: '26px 30px' }}>
                        <h1 className="form-steward-card-title" style={{ margin: 0, color: 'white', fontSize: '1.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>
                            Formulário de Inscrição
                        </h1>
                        <p className="form-steward-card-subtitle" style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Dados usados para definição dos pilotos da temporada
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="form-steward-card-body inscricao-form-body" style={{ padding: '28px' }}>
                        <div className="form-steward-info-grid inscricao-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                            <div className="form-steward-field-block">
                                <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Nome</label>
                                <input className="form-steward-input" value={form.nome} onChange={(e) => handleChange('nome', e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#374151', border: 'none', borderRadius: '8px', color: 'white' }} />
                            </div>
                            <div className="form-steward-field-block">
                                <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Gamertag/ID</label>
                                <input className="form-steward-input" value={form.gamertagId} onChange={(e) => handleChange('gamertagId', e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#374151', border: 'none', borderRadius: '8px', color: 'white' }} />
                            </div>
                            <div className="form-steward-field-block">
                                <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Whatsapp (00 00000-0000)</label>
                                <input className="form-steward-input" value={form.whatsapp} onChange={(e) => handleChange('whatsapp', formatWhatsapp(e.target.value))} style={{ width: '100%', padding: '12px 14px', background: '#374151', border: 'none', borderRadius: '8px', color: 'white' }} />
                            </div>
                            <div className="form-steward-field-block">
                                <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Plataforma</label>
                                <select className="form-steward-select" value={form.plataforma} onChange={(e) => handleChange('plataforma', e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#374151', border: 'none', borderRadius: '8px', color: 'white' }} required>
                                    <option value="">Selecione a plataforma</option>
                                    <option value="Xbox">Xbox</option>
                                    <option value="Play">Play</option>
                                    <option value="PC">PC</option>
                                </select>
                            </div>
                            <div className="form-steward-field-block">
                                <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Grid</label>
                                <select className="form-steward-select" value={form.grid} onChange={(e) => handleChange('grid', e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#374151', border: 'none', borderRadius: '8px', color: 'white' }} required>
                                    <option value="">Selecione o grid</option>
                                    <option value="Carreira">Carreira</option>
                                    <option value="Light">Light</option>
                                    <option value="Open">Open</option>
                                </select>
                            </div>
                            <div className="form-steward-field-block">
                                <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>E-mail Login</label>
                                <input type="email" className="form-steward-input" value={form.emailLogin} onChange={(e) => handleChange('emailLogin', e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#374151', border: 'none', borderRadius: '8px', color: 'white' }} />
                            </div>
                            <div className="form-steward-field-block">
                                <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Data Inscrição</label>
                                <input className="form-steward-input" value={dataInscricaoFormatada} disabled style={{ width: '100%', padding: '12px 14px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#7F1D1D', fontWeight: 700 }} />
                            </div>
                            <div className="form-steward-field-block">
                                <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Temporada (definida pelo ADM)</label>
                                <input className="form-steward-input" value={`T${temporadaAtual}`} disabled style={{ width: '100%', padding: '12px 14px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#7F1D1D', fontWeight: 700 }} />
                            </div>
                            <div className="form-steward-field-block">
                                <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Nome de Piloto (transmissão)</label>
                                <input className="form-steward-input" value={form.nomePilotoTransmissao} onChange={(e) => handleChange('nomePilotoTransmissao', e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#374151', border: 'none', borderRadius: '8px', color: 'white' }} />
                            </div>
                            <div className="form-steward-field-block">
                                <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Número do Carro</label>
                                <input className="form-steward-input" value={form.numeroCarro} onChange={(e) => handleChange('numeroCarro', e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#374151', border: 'none', borderRadius: '8px', color: 'white' }} />
                            </div>
                        </div>

                        <div className="inscricao-payment-box" style={{ marginTop: '18px', padding: '16px', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '10px' }}>
                            <div className="form-steward-section-title" style={{ color: '#92400E', fontWeight: 800, marginBottom: '8px', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Pagamento</div>
                            <button
                                type="button"
                                onClick={copyPix}
                                className="inscricao-pix-btn"
                                style={{ padding: '10px 14px', borderRadius: '8px', border: 'none', background: '#16A34A', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Pagar via PIX agora ({PIX_LABEL})
                            </button>
                            <p style={{ color: '#78350F', margin: '8px 0 12px', fontWeight: 600 }}>
                                Chave/contato PIX: {PIX_LABEL}
                            </p>

                            <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '6px', color: '#92400E', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Opção alternativa</label>
                            <select className="form-steward-select" value={form.formaPagamento} onChange={(e) => handleChange('formaPagamento', e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#374151', border: 'none', borderRadius: '8px', color: 'white' }} required>
                                <option value="">Selecione uma opção</option>
                                <option value="ja_paguei">Já paguei</option>
                                <option value="pix_agora">PIX agora</option>
                                <option value="pagar_depois">Pagar depois</option>
                                <option value="adm">ADM</option>
                                <option value="premiacao_equipe">Premiação de Equipe</option>
                            </select>

                            {form.formaPagamento === 'pagar_depois' && (
                                <div style={{ marginTop: '10px' }}>
                                    <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '6px', color: '#92400E', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Data prevista para pagamento</label>
                                    <input type="date" className="form-steward-input" value={form.dataPagamento} onChange={(e) => handleChange('dataPagamento', e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#374151', border: 'none', borderRadius: '8px', color: 'white' }} />
                                </div>
                            )}
                        </div>

                        <div className="inscricao-foto-box" style={{ marginTop: '18px', padding: '16px', background: '#E0F2FE', border: '1px solid #38BDF8', borderRadius: '10px' }}>
                            <label className="form-steward-section-title" style={{ display: 'block', marginBottom: '8px', color: '#0C4A6E', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Foto (opcional)
                            </label>
                            <p style={{ color: '#075985', margin: '0 0 10px', fontSize: '0.88rem', lineHeight: 1.45 }}>
                                Anexe uma imagem sua (JPG, PNG ou WebP, até 5 MB), por exemplo para identificação no grid.
                            </p>
                            <input
                                ref={fotoInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleFotoChange}
                                className="inscricao-foto-input"
                                style={{ width: '100%', fontSize: '0.9rem' }}
                            />
                            {fotoPreview && (
                                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                                    <img src={fotoPreview} alt="Pré-visualização" style={{ maxWidth: '160px', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #0EA5E9' }} />
                                    <button
                                        type="button"
                                        onClick={limparFoto}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#64748B', color: 'white', fontWeight: 700, cursor: 'pointer', alignSelf: 'center' }}
                                    >
                                        Remover foto
                                    </button>
                                </div>
                            )}
                        </div>

                        {errorMsg && <div className="inscricao-feedback inscricao-feedback-error" style={{ color: '#B91C1C', fontWeight: 700, marginTop: '14px' }}>{errorMsg}</div>}
                        {successMsg && <div className="inscricao-feedback inscricao-feedback-success" style={{ color: '#059669', fontWeight: 700, marginTop: '14px' }}>{successMsg}</div>}

                        <button
                            type="submit"
                            className="form-steward-btn-submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                marginTop: '18px',
                                padding: '16px',
                                background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #06B6D4 0%, #1D4ED8 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: '800',
                                fontSize: '1.02rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                            }}
                        >
                            {loading ? 'Enviando inscrição...' : 'Finalizar inscrição'}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default Inscricao;
