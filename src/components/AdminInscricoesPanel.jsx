import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function pad2(n) {
    return String(n).padStart(2, '0');
}

function toLocalDatetimeInput(d) {
    const x = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(x.getTime())) return toLocalDatetimeInput(new Date());
    return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}T${pad2(x.getHours())}:${pad2(x.getMinutes())}`;
}

function fromLocalDatetimeInput(s) {
    if (!s || !String(s).trim()) return new Date().toISOString();
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function emptyDraft(temporadaPadrao) {
    return {
        temporada: temporadaPadrao || 20,
        nome: '',
        gamertag_id: '',
        whatsapp: '',
        plataforma: 'xbox',
        grid: 'carreira',
        email_login: '',
        data_inscricao: toLocalDatetimeInput(new Date()),
        nome_piloto_transmissao: '',
        numero_carro: '',
        forma_pagamento: 'pix_agora',
        data_pagamento_prevista: '',
        status_inscricao: 'pendente',
        foto_url: '',
    };
}

function rowToDraft(row) {
    return {
        temporada: row.temporada ?? 20,
        nome: row.nome || '',
        gamertag_id: row.gamertag_id || '',
        whatsapp: String(row.whatsapp || '').replace(/\D/g, ''),
        plataforma: row.plataforma || 'xbox',
        grid: row.grid || 'carreira',
        email_login: row.email_login || '',
        data_inscricao: toLocalDatetimeInput(row.data_inscricao),
        nome_piloto_transmissao: row.nome_piloto_transmissao || '',
        numero_carro: row.numero_carro || '',
        forma_pagamento: row.forma_pagamento || 'pix_agora',
        data_pagamento_prevista: row.data_pagamento_prevista || '',
        status_inscricao: row.status_inscricao || 'pendente',
        foto_url: row.foto_url || '',
    };
}

function validateDraft(f) {
    if (!f.nome?.trim()) return 'Informe o nome.';
    if (!f.gamertag_id?.trim()) return 'Informe a gamertag.';
    const w = String(f.whatsapp || '').replace(/\D/g, '');
    if (w.length < 10 || w.length > 13) return 'WhatsApp inválido (apenas números, 10–13 dígitos).';
    if (!f.email_login?.trim()) return 'Informe o e-mail.';
    if (!f.nome_piloto_transmissao?.trim()) return 'Informe o nome de piloto (transmissão).';
    if (!f.numero_carro?.trim()) return 'Informe o número do carro.';
    if (f.forma_pagamento === 'pagar_depois' && !f.data_pagamento_prevista) {
        return 'Informe a data prevista de pagamento.';
    }
    return '';
}

function draftToPayload(f, { isInsert }) {
    const whatsapp = String(f.whatsapp || '').replace(/\D/g, '');
    const base = {
        temporada: Math.max(1, parseInt(String(f.temporada), 10) || 1),
        nome: f.nome.trim(),
        gamertag_id: f.gamertag_id.trim(),
        whatsapp,
        plataforma: f.plataforma,
        grid: f.grid,
        email_login: f.email_login.trim().toLowerCase(),
        data_inscricao: fromLocalDatetimeInput(f.data_inscricao),
        nome_piloto_transmissao: f.nome_piloto_transmissao.trim(),
        numero_carro: f.numero_carro.trim(),
        forma_pagamento: f.forma_pagamento,
        data_pagamento_prevista:
            f.forma_pagamento === 'pagar_depois' && f.data_pagamento_prevista ? f.data_pagamento_prevista : null,
        status_inscricao: f.status_inscricao,
        foto_url: f.foto_url?.trim() || null,
    };
    if (isInsert) return base;
    return { ...base, updated_at: new Date().toISOString() };
}

const modalInput = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #475569',
    background: '#1E293B',
    color: '#F8FAFC',
    fontSize: '0.85rem',
    boxSizing: 'border-box',
};

const modalLabel = { display: 'block', marginBottom: '4px', color: '#94A3B8', fontSize: '0.72rem', fontWeight: 700 };

function AdminInscricoesPanel() {
    const [loading, setLoading] = useState(false);
    const [inscricoes, setInscricoes] = useState([]);
    const [erro, setErro] = useState('');
    const [temporadaAtual, setTemporadaAtual] = useState(20);
    const [salvandoTemporada, setSalvandoTemporada] = useState(false);
    const [modalMode, setModalMode] = useState(null);
    const [editId, setEditId] = useState(null);
    const [formDraft, setFormDraft] = useState(() => emptyDraft(20));
    const [savingModal, setSavingModal] = useState(false);
    const [modalErro, setModalErro] = useState('');

    const fetchInscricoes = async () => {
        setLoading(true);
        setErro('');
        try {
            const { data, error } = await supabase
                .from('season_registrations')
                .select('*')
                .order('data_inscricao', { ascending: false });
            if (error) throw error;
            setInscricoes(data || []);
        } catch (err) {
            setErro(err.message || 'Erro ao carregar inscrições.');
        } finally {
            setLoading(false);
        }
    };

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
            // fallback
        }
    };

    useEffect(() => {
        fetchInscricoes();
        fetchTemporadaAtual();
    }, []);

    const salvarTemporadaAtual = async () => {
        if (!temporadaAtual || Number(temporadaAtual) < 1) {
            alert('Informe uma temporada válida.');
            return;
        }
        setSalvandoTemporada(true);
        try {
            const { error } = await supabase
                .from('app_config')
                .upsert({ key: 'inscricao_temporada_atual', value: String(temporadaAtual) });
            if (error) throw error;
            alert(`Temporada de inscrição definida como T${temporadaAtual}.`);
        } catch (err) {
            alert(`Erro ao salvar temporada: ${err.message || 'desconhecido'}`);
        } finally {
            setSalvandoTemporada(false);
        }
    };

    const updateField = async (id, patch) => {
        try {
            const { error } = await supabase
                .from('season_registrations')
                .update({ ...patch, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            setInscricoes((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
        } catch (err) {
            alert(`Erro ao atualizar: ${err.message || 'desconhecido'}`);
        }
    };

    const abrirNovo = () => {
        setFormDraft(emptyDraft(temporadaAtual));
        setEditId(null);
        setModalErro('');
        setModalMode('add');
    };

    const abrirEditar = (item) => {
        setFormDraft(rowToDraft(item));
        setEditId(item.id);
        setModalErro('');
        setModalMode('edit');
    };

    const fecharModal = () => {
        if (savingModal) return;
        setModalMode(null);
        setEditId(null);
        setModalErro('');
    };

    const salvarModal = async () => {
        const v = validateDraft(formDraft);
        if (v) {
            setModalErro(v);
            return;
        }
        setSavingModal(true);
        setModalErro('');
        try {
            if (modalMode === 'add') {
                const payload = draftToPayload(formDraft, { isInsert: true });
                const { data, error } = await supabase.from('season_registrations').insert(payload).select().single();
                if (error) throw error;
                setInscricoes((prev) => [data, ...prev]);
            } else if (modalMode === 'edit' && editId) {
                const payload = draftToPayload(formDraft, { isInsert: false });
                const { data, error } = await supabase
                    .from('season_registrations')
                    .update(payload)
                    .eq('id', editId)
                    .select()
                    .single();
                if (error) throw error;
                setInscricoes((prev) => prev.map((i) => (i.id === editId ? data : i)));
            }
            setModalMode(null);
            setEditId(null);
            setModalErro('');
        } catch (err) {
            setModalErro(err.message || 'Erro ao salvar.');
        } finally {
            setSavingModal(false);
        }
    };

    const excluirLinha = async (item) => {
        const ok = window.confirm(
            `Excluir permanentemente a inscrição de "${item.nome}" (${item.email_login})?\nEsta ação não pode ser desfeita.`
        );
        if (!ok) return;
        try {
            const { error } = await supabase.from('season_registrations').delete().eq('id', item.id);
            if (error) throw error;
            setInscricoes((prev) => prev.filter((i) => i.id !== item.id));
        } catch (err) {
            alert(`Erro ao excluir: ${err.message || 'desconhecido'}\n\nSe aparecer erro de permissão, execute no Supabase a política season_registrations_delete_anon (ver scripts/create_season_registrations.sql).`);
        }
    };

    const formatWhatsAppExibicao = (digits) => {
        const d = String(digits || '').replace(/\D/g, '');
        if (d.length === 11) return `${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`;
        return d || '—';
    };

    const escapeCsvCell = (val) => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
    };

    const exportarCsv = () => {
        if (!inscricoes.length) return;
        const headers = [
            '#',
            'ID',
            'Temporada',
            'Data inscrição',
            'Nome',
            'Gamertag',
            'WhatsApp',
            'Plataforma',
            'Grid',
            'E-mail',
            'Piloto transmissão',
            'Nº carro',
            'Status inscrição',
            'Forma pagamento',
            'Data pagamento prevista',
            'URL foto',
            'Criado em',
            'Atualizado em',
        ];
        const rows = [headers.map(escapeCsvCell).join(',')];
        inscricoes.forEach((item, idx) => {
            const line = [
                idx + 1,
                item.id,
                item.temporada,
                item.data_inscricao ? new Date(item.data_inscricao).toLocaleString('pt-BR') : '',
                item.nome,
                item.gamertag_id,
                String(item.whatsapp || '').replace(/\D/g, ''),
                item.plataforma,
                item.grid,
                item.email_login,
                item.nome_piloto_transmissao,
                item.numero_carro,
                item.status_inscricao,
                item.forma_pagamento,
                item.data_pagamento_prevista || '',
                item.foto_url || '',
                item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
                item.updated_at ? new Date(item.updated_at).toLocaleString('pt-BR') : '',
            ];
            rows.push(line.map(escapeCsvCell).join(','));
        });
        const bom = '\uFEFF';
        const blob = new Blob([bom + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
        const a = document.createElement('a');
        a.href = url;
        a.download = `inscricoes_mlf_${stamp}.csv`;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const cellInput = {
        width: '100%',
        minWidth: '72px',
        padding: '6px 8px',
        borderRadius: '6px',
        border: '1px solid #475569',
        background: '#1E293B',
        color: '#F8FAFC',
        fontSize: '0.78rem',
        boxSizing: 'border-box',
    };

    const setDraft = (field, value) => {
        setFormDraft((prev) => ({ ...prev, [field]: value }));
        setModalErro('');
    };

    return (
        <div className="adm-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#F8FAFC' }}>🧾 Pilotos Inscritos</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={abrirNovo}
                        style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: '#22C55E', color: 'white', cursor: 'pointer', fontWeight: 700 }}
                    >
                        ➕ Nova inscrição
                    </button>
                    <button
                        type="button"
                        onClick={exportarCsv}
                        disabled={loading || inscricoes.length === 0}
                        style={{
                            padding: '8px 14px',
                            border: 'none',
                            borderRadius: '8px',
                            background: loading || inscricoes.length === 0 ? '#475569' : '#0EA5E9',
                            color: 'white',
                            cursor: loading || inscricoes.length === 0 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        Exportar CSV
                    </button>
                    <button
                        type="button"
                        onClick={fetchInscricoes}
                        style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: '#3B82F6', color: 'white', cursor: 'pointer' }}
                    >
                        Atualizar
                    </button>
                </div>
            </div>
            <div style={{ marginBottom: '16px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', padding: '12px' }}>
                <div style={{ color: '#E2E8F0', fontWeight: 700, marginBottom: '8px' }}>Temporada atual da inscrição (controlada pelo ADM)</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="number"
                        min="1"
                        value={temporadaAtual}
                        onChange={(e) => setTemporadaAtual(parseInt(e.target.value || '0', 10))}
                        style={{ width: '120px', padding: '8px', borderRadius: '8px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC' }}
                    />
                    <button
                        type="button"
                        onClick={salvarTemporadaAtual}
                        disabled={salvandoTemporada}
                        style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: '#22C55E', color: 'white', cursor: 'pointer' }}
                    >
                        {salvandoTemporada ? 'Salvando...' : 'Salvar temporada'}
                    </button>
                </div>
            </div>

            {erro && <div style={{ color: '#F87171', marginBottom: '12px', fontWeight: 700 }}>{erro}</div>}
            {loading && <div style={{ color: '#94A3B8' }}>Carregando inscrições...</div>}

            {!loading && inscricoes.length === 0 && (
                <div style={{ color: '#94A3B8', padding: '20px 0' }}>Nenhuma inscrição registrada. Use &quot;Nova inscrição&quot; para adicionar.</div>
            )}

            {!loading && inscricoes.length > 0 && (
                <div
                    style={{
                        overflowX: 'auto',
                        borderRadius: '10px',
                        border: '1px solid #334155',
                        background: '#020617',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    <table
                        style={{
                            width: '100%',
                            minWidth: '1280px',
                            borderCollapse: 'collapse',
                            fontSize: '0.8rem',
                        }}
                    >
                        <thead>
                            <tr style={{ background: '#0F172A', color: '#94A3B8', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>#</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Ações</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Temp.</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Data inscrição</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Nome</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Gamertag</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>WhatsApp</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Plat.</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Grid</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap', minWidth: '180px' }}>E-mail</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap', minWidth: '140px' }}>Piloto (TV)</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Nº</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap', minWidth: '56px' }}>Foto</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap', minWidth: '120px' }}>Status</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap', minWidth: '130px' }}>Pagamento</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Data pag.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inscricoes.map((item, idx) => (
                                <tr
                                    key={item.id}
                                    style={{
                                        background: idx % 2 === 0 ? '#0F172A' : '#1E293B',
                                        color: '#E2E8F0',
                                    }}
                                >
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle' }}>{idx + 1}</td>
                                    <td style={{ padding: '6px', borderBottom: '1px solid #334155', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => abrirEditar(item)}
                                            style={{ marginRight: '6px', padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#2563EB', color: 'white', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => excluirLinha(item)}
                                            style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#DC2626', color: 'white', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                                        >
                                            Excluir
                                        </button>
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                        T{item.temporada}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                        {new Date(item.data_inscricao).toLocaleString('pt-BR')}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', maxWidth: '160px', wordBreak: 'break-word' }}>
                                        {item.nome}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', maxWidth: '120px', wordBreak: 'break-word' }}>
                                        {item.gamertag_id}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace' }}>
                                        {formatWhatsAppExibicao(item.whatsapp)}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', textTransform: 'uppercase' }}>
                                        {(item.plataforma || '').slice(0, 4)}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', textTransform: 'uppercase' }}>
                                        {(item.grid || '').slice(0, 8)}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', wordBreak: 'break-all', maxWidth: '200px' }}>
                                        {item.email_login}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', wordBreak: 'break-word', maxWidth: '160px' }}>
                                        {item.nome_piloto_transmissao}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', textAlign: 'center' }}>
                                        {item.numero_carro}
                                    </td>
                                    <td style={{ padding: '6px', borderBottom: '1px solid #334155', verticalAlign: 'middle', textAlign: 'center' }}>
                                        {item.foto_url ? (
                                            <a href={item.foto_url} target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', fontWeight: 700 }}>
                                                Abrir
                                            </a>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td style={{ padding: '6px', borderBottom: '1px solid #334155', verticalAlign: 'middle' }}>
                                        <select
                                            value={item.status_inscricao || 'pendente'}
                                            onChange={(e) => updateField(item.id, { status_inscricao: e.target.value })}
                                            style={cellInput}
                                        >
                                            <option value="pendente">Pendente</option>
                                            <option value="aprovado">Aprovado</option>
                                            <option value="reserva">Reserva</option>
                                            <option value="recusado">Recusado</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '6px', borderBottom: '1px solid #334155', verticalAlign: 'middle' }}>
                                        <select
                                            value={item.forma_pagamento || 'pix_agora'}
                                            onChange={(e) => updateField(item.id, { forma_pagamento: e.target.value })}
                                            style={cellInput}
                                        >
                                            <option value="ja_paguei">Já paguei</option>
                                            <option value="pix_agora">PIX agora</option>
                                            <option value="pagar_depois">Depois</option>
                                            <option value="adm">ADM</option>
                                            <option value="premiacao_equipe">Prêmio eq.</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '6px', borderBottom: '1px solid #334155', verticalAlign: 'middle' }}>
                                        <input
                                            type="date"
                                            value={item.data_pagamento_prevista || ''}
                                            onChange={(e) => updateField(item.id, { data_pagamento_prevista: e.target.value || null })}
                                            style={{ ...cellInput, minWidth: '118px' }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modalMode && (
                <div
                    role="dialog"
                    aria-modal="true"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        overflowY: 'auto',
                    }}
                    onClick={(e) => e.target === e.currentTarget && fecharModal()}
                >
                    <div
                        style={{
                            background: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '12px',
                            maxWidth: '560px',
                            width: '100%',
                            maxHeight: '92vh',
                            overflowY: 'auto',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ padding: '16px 18px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <h4 style={{ margin: 0, color: '#F8FAFC', fontSize: '1.05rem' }}>
                                {modalMode === 'add' ? 'Nova inscrição' : 'Editar inscrição'}
                            </h4>
                            <button type="button" onClick={fecharModal} disabled={savingModal} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #475569', background: '#1E293B', color: '#E2E8F0', cursor: savingModal ? 'not-allowed' : 'pointer' }}>
                                Fechar
                            </button>
                        </div>
                        <div style={{ padding: '16px 18px', display: 'grid', gap: '12px' }}>
                            {modalErro && <div style={{ color: '#F87171', fontWeight: 700, fontSize: '0.88rem' }}>{modalErro}</div>}
                            <div>
                                <label style={modalLabel}>Temporada</label>
                                <input type="number" min={1} value={formDraft.temporada} onChange={(e) => setDraft('temporada', parseInt(e.target.value || '1', 10))} style={modalInput} />
                            </div>
                            <div>
                                <label style={modalLabel}>Data da inscrição</label>
                                <input type="datetime-local" value={formDraft.data_inscricao} onChange={(e) => setDraft('data_inscricao', e.target.value)} style={modalInput} />
                            </div>
                            <div>
                                <label style={modalLabel}>Nome</label>
                                <input value={formDraft.nome} onChange={(e) => setDraft('nome', e.target.value)} style={modalInput} />
                            </div>
                            <div>
                                <label style={modalLabel}>Gamertag / ID</label>
                                <input value={formDraft.gamertag_id} onChange={(e) => setDraft('gamertag_id', e.target.value)} style={modalInput} />
                            </div>
                            <div>
                                <label style={modalLabel}>WhatsApp (só números)</label>
                                <input value={formDraft.whatsapp} onChange={(e) => setDraft('whatsapp', e.target.value.replace(/\D/g, ''))} style={modalInput} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={modalLabel}>Plataforma</label>
                                    <select value={formDraft.plataforma} onChange={(e) => setDraft('plataforma', e.target.value)} style={modalInput}>
                                        <option value="xbox">Xbox</option>
                                        <option value="play">Play</option>
                                        <option value="pc">PC</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={modalLabel}>Grid</label>
                                    <select value={formDraft.grid} onChange={(e) => setDraft('grid', e.target.value)} style={modalInput}>
                                        <option value="carreira">Carreira</option>
                                        <option value="light">Light</option>
                                        <option value="open">Open</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={modalLabel}>E-mail login</label>
                                <input type="email" value={formDraft.email_login} onChange={(e) => setDraft('email_login', e.target.value)} style={modalInput} />
                            </div>
                            <div>
                                <label style={modalLabel}>Nome piloto (transmissão)</label>
                                <input value={formDraft.nome_piloto_transmissao} onChange={(e) => setDraft('nome_piloto_transmissao', e.target.value)} style={modalInput} />
                            </div>
                            <div>
                                <label style={modalLabel}>Número do carro</label>
                                <input value={formDraft.numero_carro} onChange={(e) => setDraft('numero_carro', e.target.value)} style={modalInput} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={modalLabel}>Status</label>
                                    <select value={formDraft.status_inscricao} onChange={(e) => setDraft('status_inscricao', e.target.value)} style={modalInput}>
                                        <option value="pendente">Pendente</option>
                                        <option value="aprovado">Aprovado</option>
                                        <option value="reserva">Reserva</option>
                                        <option value="recusado">Recusado</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={modalLabel}>Forma de pagamento</label>
                                    <select value={formDraft.forma_pagamento} onChange={(e) => setDraft('forma_pagamento', e.target.value)} style={modalInput}>
                                        <option value="ja_paguei">Já paguei</option>
                                        <option value="pix_agora">PIX agora</option>
                                        <option value="pagar_depois">Pagar depois</option>
                                        <option value="adm">ADM</option>
                                        <option value="premiacao_equipe">Premiação equipe</option>
                                    </select>
                                </div>
                            </div>
                            {formDraft.forma_pagamento === 'pagar_depois' && (
                                <div>
                                    <label style={modalLabel}>Data prevista pagamento</label>
                                    <input type="date" value={formDraft.data_pagamento_prevista} onChange={(e) => setDraft('data_pagamento_prevista', e.target.value)} style={modalInput} />
                                </div>
                            )}
                            <div>
                                <label style={modalLabel}>URL da foto (opcional)</label>
                                <input value={formDraft.foto_url} onChange={(e) => setDraft('foto_url', e.target.value)} placeholder="https://..." style={modalInput} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop:8 }}>
                                <button
                                    type="button"
                                    onClick={salvarModal}
                                    disabled={savingModal}
                                    style={{
                                        padding: '10px 18px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        background: savingModal ? '#475569' : '#22C55E',
                                        color: 'white',
                                        fontWeight: 800,
                                        cursor: savingModal ? 'not-allowed' : 'pointer',
                                        flex: 1,
                                        minWidth: '140px',
                                    }}
                                >
                                    {savingModal ? 'Salvando...' : modalMode === 'add' ? 'Adicionar' : 'Salvar alterações'}
                                </button>
                                <button
                                    type="button"
                                    onClick={fecharModal}
                                    disabled={savingModal}
                                    style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #64748B', background: '#1E293B', color: '#E2E8F0', cursor: savingModal ? 'not-allowed' : 'pointer' }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminInscricoesPanel;
