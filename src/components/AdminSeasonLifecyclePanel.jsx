import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
    fetchSeasonLifecycleConfig,
    defaultSeasonContext,
    SEASON_PHASE,
    phaseLabelPt,
    resetPowerRankingCondutaForSeason,
} from '../utils/seasonLifecycle';
import { importAllDraftPilotos } from '../utils/importDraftPilotos';

const nowIso = () => new Date().toISOString();

const normalizeText = (v) =>
    String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
const normalizeCod = (v) => String(v || '').trim().toUpperCase();
const PILOTOS_PR_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=884534812&single=true&output=csv';

function parseCsvLine(line) {
    const out = [];
    let curr = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            out.push(curr.trim());
            curr = '';
        } else {
            curr += ch;
        }
    }
    out.push(curr.trim());
    return out;
}

async function fetchPilotosPrAtivosSet() {
    const response = await fetch(PILOTOS_PR_CSV_URL);
    if (!response.ok) {
        throw new Error(`Falha ao ler PILOTOS PR (HTTP ${response.status})`);
    }
    const csvText = await response.text();
    const lines = String(csvText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

    const codSet = new Set();
    const nameSet = new Set();

    // Colunas: A=Drivers, B=COD IDML, J=Status
    for (let i = 1; i < lines.length; i += 1) {
        const cols = parseCsvLine(lines[i]);
        const nome = normalizeText(cols[0] || '');
        const cod = normalizeCod(cols[1] || '');
        const status = normalizeText(cols[9] || '');
        if (status !== 'ativo') continue;
        if (cod) codSet.add(cod);
        if (nome) nameSet.add(nome);
    }

    return { codSet, nameSet };
}

async function syncPilotosByDraftSeason(targetSeason) {
    const season = parseInt(String(targetSeason), 10);
    if (!Number.isFinite(season) || season < 1) {
        throw new Error(`Temporada inválida para sincronização de pilotos: ${targetSeason}`);
    }

    // Sempre sincronizar draft do banco com as planilhas antes de aplicar status.
    // Evita reaplicar com draft_pilotos desatualizado.
    const importResult = await importAllDraftPilotos(false);
    if (!importResult?.success) {
        throw new Error(
            `Falha ao sincronizar draft das planilhas antes da reaplicação: ${
                importResult?.error || 'erro desconhecido'
            }`
        );
    }

    const { data: draftRows, error: draftErr } = await supabase
        .from('draft_pilotos')
        .select('nome, cod_idml, season, grid')
        .eq('season', season)
        .in('grid', ['carreira', 'light']);
    if (draftErr) throw draftErr;

    const pilotosPrAtivos = await fetchPilotosPrAtivosSet();

    const draftCodSet = new Set();
    const draftNameSet = new Set();
    (draftRows || []).forEach((r) => {
        const cod = normalizeCod(r?.cod_idml);
        const nome = normalizeText(r?.nome);
        if (cod) draftCodSet.add(cod);
        if (nome) draftNameSet.add(nome);
    });

    if (draftCodSet.size === 0 && draftNameSet.size === 0) {
        throw new Error(
            `Draft da T${season} está vazio. Importe os pilotos do draft antes de ativar a pré-temporada.`
        );
    }

    const { data: pilotosRows, error: pilotosErr } = await supabase
        .from('pilotos')
        .select('id, nome, cod_idml, status, tipo_piloto');
    if (pilotosErr) throw pilotosErr;

    const ativos = [];
    const inativos = [];
    (pilotosRows || []).forEach((p) => {
        const cod = normalizeCod(p?.cod_idml);
        const nome = normalizeText(p?.nome);
        const inDraft = (cod && draftCodSet.has(cod)) || (nome && draftNameSet.has(nome));
        const ativoNoPilotosPr =
            (cod && pilotosPrAtivos.codSet.has(cod)) ||
            (nome && pilotosPrAtivos.nameSet.has(nome));
        if (inDraft && ativoNoPilotosPr) ativos.push(p.id);
        else inativos.push(p.id);
    });

    if (ativos.length > 0) {
        const { error: upActiveErr } = await supabase
            .from('pilotos')
            .update({
                status: 'ativo',
                tipo_piloto: null,
                updated_at: nowIso(),
            })
            .in('id', ativos);
        if (upActiveErr) throw upActiveErr;
    }

    if (inativos.length > 0) {
        const { error: upInactiveErr } = await supabase
            .from('pilotos')
            .update({
                status: 'inativo',
                tipo_piloto: 'ex-piloto',
                updated_at: nowIso(),
            })
            .in('id', inativos);
        if (upInactiveErr) throw upInactiveErr;
    }

    return {
        ativos: ativos.length,
        inativos: inativos.length,
        season,
        pilotosPrAtivos: pilotosPrAtivos.codSet.size || pilotosPrAtivos.nameSet.size,
    };
}

async function persistContext(patch, eventRow) {
    const rows = Object.entries(patch).map(([key, value]) => ({
        key,
        value: String(value),
        updated_at: nowIso(),
    }));
    const { error: upErr } = await supabase.from('app_config').upsert(rows, { onConflict: 'key' });
    if (upErr) throw upErr;
    if (eventRow) {
        const { error: evErr } = await supabase.from('season_lifecycle_events').insert([eventRow]);
        if (evErr) console.warn('Auditoria ciclo temporada:', evErr);
    }
}

export default function AdminSeasonLifecyclePanel() {
    const [ctx, setCtx] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [confirmModal, setConfirmModal] = useState(null);
    const [secondConfirmText, setSecondConfirmText] = useState('');

    const reload = useCallback(async () => {
        setLoading(true);
        setErr('');
        try {
            const c = await fetchSeasonLifecycleConfig();
            setCtx(c);
        } catch (e) {
            console.warn(e);
            setCtx(defaultSeasonContext());
            setErr(e.message || 'Não foi possível ler app_config.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const openConfirm = (payload) => {
        setSecondConfirmText('');
        setConfirmModal(payload);
    };

    const runTransition = async () => {
        if (!confirmModal || !ctx) return;
        const { action } = confirmModal;
        if (secondConfirmText.trim().toUpperCase() !== 'CONFIRMAR') {
            alert('Digite CONFIRMAR (maiúsculas) no segundo passo.');
            return;
        }

        setBusy(true);
        setErr('');
        let condutaResetSeason = null;
        try {
            const before = { ...ctx };
            let patch = {};
            let event = {
                from_phase: before.phase,
                triggered_by: 'admin_panel',
                notes: action,
                season_before: before.currentSeason,
                season_after: before.currentSeason,
                last_closed_before: before.lastClosedSeason,
                last_closed_after: before.lastClosedSeason,
            };

            if (action === 'fechar') {
                if (before.phase !== SEASON_PHASE.OPEN) throw new Error('Só é possível fechar com a fase “Em andamento”.');
                patch.season_phase = SEASON_PHASE.CLOSED;
                patch.last_closed_season = String(before.currentSeason);
                patch.phase_updated_at = nowIso();
                event.to_phase = SEASON_PHASE.CLOSED;
                event.last_closed_after = before.currentSeason;
            } else if (action === 'pre') {
                if (before.phase !== SEASON_PHASE.CLOSED) throw new Error('Antes, feche a temporada oficialmente.');
                const nextSeason = before.lastClosedSeason + 1;
                const syncResult = await syncPilotosByDraftSeason(nextSeason);
                patch.season_phase = SEASON_PHASE.PRE_SEASON;
                patch.phase_updated_at = nowIso();
                event.to_phase = SEASON_PHASE.PRE_SEASON;
                event.notes = `pre_temporada_sync_pilotos:t${syncResult.season}:ativos=${syncResult.ativos}:inativos=${syncResult.inativos}:pr_ativos=${syncResult.pilotosPrAtivos}`;
            } else if (action === 'mudar') {
                if (before.phase !== SEASON_PHASE.PRE_SEASON) throw new Error('Antes, ative a pré-temporada.');
                const nextS = before.lastClosedSeason + 1;
                condutaResetSeason = nextS;
                patch.season_phase = SEASON_PHASE.OPEN;
                patch.current_season = String(nextS);
                patch.phase_updated_at = nowIso();
                patch.inscricao_temporada_atual = String(nextS);
                event.to_phase = SEASON_PHASE.OPEN;
                event.season_after = nextS;
            } else if (action === 'abrir') {
                if (before.phase !== SEASON_PHASE.CLOSED && before.phase !== SEASON_PHASE.PRE_SEASON) {
                    throw new Error('“Abrir temporada” só aplica com fase Encerrada ou Pré-temporada.');
                }
                const nextS = before.lastClosedSeason + 1;
                condutaResetSeason = nextS;
                patch.season_phase = SEASON_PHASE.OPEN;
                patch.current_season = String(nextS);
                patch.phase_updated_at = nowIso();
                patch.inscricao_temporada_atual = String(nextS);
                event.to_phase = SEASON_PHASE.OPEN;
                event.season_after = nextS;
                event.notes = 'abrir_temporada_atalho';
            } else if (action === 'sync_pilotos_pre') {
                if (before.phase !== SEASON_PHASE.PRE_SEASON) {
                    throw new Error('Reaplicar status de pilotos só está disponível na pré-temporada.');
                }
                const nextS = before.lastClosedSeason + 1;
                const syncResult = await syncPilotosByDraftSeason(nextS);
                // Mantém a fase, só marca atualização e registra auditoria.
                patch.phase_updated_at = nowIso();
                event.to_phase = before.phase;
                event.notes = `sync_pilotos_pre:t${syncResult.season}:ativos=${syncResult.ativos}:inativos=${syncResult.inativos}:pr_ativos=${syncResult.pilotosPrAtivos}`;
            }

            event.to_phase = patch.season_phase || event.to_phase;
            event.season_after =
                patch.current_season != null ? parseInt(patch.current_season, 10) : event.season_after;
            event.last_closed_after =
                patch.last_closed_season != null
                    ? parseInt(patch.last_closed_season, 10)
                    : before.lastClosedSeason;

            await persistContext(patch, { ...event });

            if (condutaResetSeason != null) {
                await resetPowerRankingCondutaForSeason(condutaResetSeason);
            }

            setConfirmModal(null);
            await reload();
            alert(
                condutaResetSeason != null
                    ? `Transição registrada com sucesso. Conduta do Power Ranking (T${condutaResetSeason}) foi zerada para a temporada nova.`
                    : 'Transição registrada com sucesso.',
            );
        } catch (e) {
            setErr(e.message || String(e));
            alert('Erro: ' + (e.message || e));
        } finally {
            setBusy(false);
        }
    };

    if (loading || !ctx) {
        return (
            <div style={{ padding: 24, color: '#94A3B8' }}>
                Carregando ciclo de temporada…
            </div>
        );
    }

    const summaryStyle = {
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        color: '#e2e8f0',
    };

    const btn = (disabled) => ({
        padding: '12px 18px',
        borderRadius: 8,
        border: 'none',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
    });

    return (
        <div style={{ maxWidth: 960, margin: '0 auto 40px' }}>
            <h2 style={{ color: '#f8fafc', marginBottom: 8 }}>Ciclo de temporada</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
                Controle as fases sem sobrescrever histórico. Power Ranking editável só em <strong>Em andamento</strong>{' '}
                na <strong>temporada atual</strong>. O Hall da Fama prioriza o último título oficial após o fechamento.
            </p>

            {err && (
                <div style={{ background: 'rgba(220,38,38,0.15)', color: '#fecaca', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    {err}
                </div>
            )}

            <div style={summaryStyle}>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Fase atual</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{phaseLabelPt(ctx.phase)}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>({ctx.phase})</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Temporada atual (site)</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>T{ctx.currentSeason}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Última encerrada (oficial)</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>T{ctx.lastClosedSeason}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Atualizado em</div>
                        <div style={{ fontSize: 14 }}>{ctx.phaseUpdatedAt || '—'}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <button
                    type="button"
                    style={{ ...btn(ctx.phase !== SEASON_PHASE.OPEN || busy), background: '#b91c1c', color: '#fff' }}
                    disabled={ctx.phase !== SEASON_PHASE.OPEN || busy}
                    onClick={() =>
                        openConfirm({
                            action: 'fechar',
                            title: 'Fechar temporada',
                            body: `Encerrar oficialmente a T${ctx.currentSeason}? O Power Ranking desta temporada deixa de ser editável; última encerrada passa a ser T${ctx.currentSeason}.`,
                        })
                    }
                >
                    Fechar temporada
                </button>
                <button
                    type="button"
                    style={{ ...btn(ctx.phase !== SEASON_PHASE.CLOSED || busy), background: '#ca8a04', color: '#0f172a' }}
                    disabled={ctx.phase !== SEASON_PHASE.CLOSED || busy}
                    onClick={() =>
                        openConfirm({
                            action: 'pre',
                            title: 'Pré-temporada',
                            body: 'Ativar pré-temporada: motorhome sem equipe da planilha antiga; propostas voltam para a próxima temporada.',
                        })
                    }
                >
                    Pré-temporada
                </button>
                <button
                    type="button"
                    style={{ ...btn(ctx.phase !== SEASON_PHASE.PRE_SEASON || busy), background: '#0369a1', color: '#fff' }}
                    disabled={ctx.phase !== SEASON_PHASE.PRE_SEASON || busy}
                    onClick={() =>
                        openConfirm({
                            action: 'mudar',
                            title: 'Mudar temporada',
                            body: `Ativar a nova temporada T${ctx.lastClosedSeason + 1} (em andamento). Inscrições do site serão alinhadas a esta temporada. A checklist e a nota persistida do pilar Conduta do Power Ranking desta temporada serão zeradas (base 100).`,
                        })
                    }
                >
                    Mudar temporada
                </button>
                <button
                    type="button"
                    style={{
                        ...btn(
                            (ctx.phase !== SEASON_PHASE.CLOSED && ctx.phase !== SEASON_PHASE.PRE_SEASON) || busy,
                        ),
                        background: '#15803d',
                        color: '#fff',
                    }}
                    disabled={
                        (ctx.phase !== SEASON_PHASE.CLOSED && ctx.phase !== SEASON_PHASE.PRE_SEASON) || busy
                    }
                    onClick={() =>
                        openConfirm({
                            action: 'abrir',
                            title: 'Abrir temporada (atalho)',
                            body: `Pula ou confirma abertura direta da próxima temporada T${ctx.lastClosedSeason + 1}. Use se não quiser passar pela pré-temporada. Alinha inscrições (app_config). A conduta do Power Ranking (checklist + nota T${ctx.lastClosedSeason + 1}) será zerada.`,
                        })
                    }
                >
                    Abrir temporada
                </button>
                <button type="button" style={{ ...btn(false), background: '#334155', color: '#e2e8f0' }} onClick={reload} disabled={busy}>
                    Recarregar
                </button>
                <button
                    type="button"
                    style={{ ...btn(ctx.phase !== SEASON_PHASE.PRE_SEASON || busy), background: '#4f46e5', color: '#fff' }}
                    disabled={ctx.phase !== SEASON_PHASE.PRE_SEASON || busy}
                    onClick={() =>
                        openConfirm({
                            action: 'sync_pilotos_pre',
                            title: 'Reaplicar status de pilotos',
                            body: `Sem mudar fase: reprocessa a T${ctx.lastClosedSeason + 1} e marca ATIVO apenas quem está no draft e com status ATIVO na PILOTOS PR (coluna J); demais viram INATIVO (ex-piloto).`,
                        })
                    }
                >
                    Reaplicar status dos pilotos
                </button>
            </div>

            {confirmModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                >
                    <div
                        style={{
                            background: '#111827',
                            border: '1px solid #374151',
                            borderRadius: 12,
                            maxWidth: 480,
                            width: '100%',
                            padding: 24,
                            color: '#f3f4f6',
                        }}
                    >
                        <h3 style={{ marginTop: 0 }}>{confirmModal.title}</h3>
                        <p style={{ color: '#9ca3af', lineHeight: 1.5 }}>{confirmModal.body}</p>
                        <p style={{ fontSize: 13, color: '#fbbf24' }}>
                            Confirmação final: digite <strong>CONFIRMAR</strong> abaixo.
                        </p>
                        <input
                            value={secondConfirmText}
                            onChange={(e) => setSecondConfirmText(e.target.value)}
                            placeholder="CONFIRMAR"
                            style={{
                                width: '100%',
                                padding: 10,
                                borderRadius: 8,
                                border: '1px solid #4b5563',
                                background: '#030712',
                                color: '#fff',
                                marginBottom: 16,
                            }}
                        />
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setConfirmModal(null)}
                                style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #4b5563', background: 'transparent', color: '#e5e7eb', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={runTransition}
                                disabled={busy}
                                style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}
                            >
                                {busy ? '…' : 'Executar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
