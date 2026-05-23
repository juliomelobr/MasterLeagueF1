/**
 * Ciclo de temporada — leitura de app_config e regras de UI.
 * Valores de season_phase no banco: OPEN | CLOSED | PRE_SEASON
 */

import { supabase } from '../supabaseClient';

export const SEASON_PHASE = {
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
    PRE_SEASON: 'PRE_SEASON',
};

const KEYS = {
    currentSeason: 'current_season',
    seasonPhase: 'season_phase',
    lastClosedSeason: 'last_closed_season',
    phaseUpdatedAt: 'phase_updated_at',
};

function parseIntSafe(v, fallback) {
    const n = parseInt(String(v ?? '').trim(), 10);
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Normaliza linhas [{ key, value }] retornadas do Supabase.
 */
export function buildSeasonContextFromRows(rows) {
    const map = {};
    (rows || []).forEach((r) => {
        if (r?.key != null) map[r.key] = r.value;
    });
    const currentSeason = parseIntSafe(map[KEYS.currentSeason], 20);
    const phaseRaw = String(map[KEYS.seasonPhase] || SEASON_PHASE.OPEN).toUpperCase();
    const phase = ['OPEN', 'CLOSED', 'PRE_SEASON'].includes(phaseRaw) ? phaseRaw : SEASON_PHASE.OPEN;
    const lastClosedSeason = parseIntSafe(map[KEYS.lastClosedSeason], Math.max(1, currentSeason - 1));
    const phaseUpdatedAt = map[KEYS.phaseUpdatedAt] || null;

    return {
        currentSeason,
        phase,
        lastClosedSeason,
        phaseUpdatedAt,
        raw: map,
    };
}

/** Busca config no Supabase (anon). */
export async function fetchSeasonLifecycleConfig() {
    const keys = [
        KEYS.currentSeason,
        KEYS.seasonPhase,
        KEYS.lastClosedSeason,
        KEYS.phaseUpdatedAt,
    ];
    const { data, error } = await supabase.from('app_config').select('key, value').in('key', keys);
    if (error) throw error;
    return buildSeasonContextFromRows(data);
}

/** Contexto default se o banco não tiver linhas ainda */
export function defaultSeasonContext() {
    return buildSeasonContextFromRows([
        { key: KEYS.currentSeason, value: '20' },
        { key: KEYS.seasonPhase, value: SEASON_PHASE.OPEN },
        { key: KEYS.lastClosedSeason, value: '19' },
    ]);
}

/**
 * Edição do Power Ranking permitida apenas na temporada ativa e com fase OPEN.
 */
export function canEditPowerRanking(ctx, season) {
    if (!ctx) return true;
    const s = parseInt(String(season), 10);
    if (!Number.isFinite(s)) return false;
    return ctx.phase === SEASON_PHASE.OPEN && s === ctx.currentSeason;
}

/** Hall da Fama: considerar temporada “oficial” para título em destaque */
export function hallChampionDisplayCapSeason(ctx) {
    if (!ctx) return null;
    if (ctx.phase === SEASON_PHASE.OPEN && ctx.currentSeason > ctx.lastClosedSeason) {
        return ctx.lastClosedSeason;
    }
    return null;
}

export function isPreSeasonMode(ctx) {
    return ctx?.phase === SEASON_PHASE.PRE_SEASON;
}

export function isSeasonClosedPhase(ctx) {
    return ctx?.phase === SEASON_PHASE.CLOSED;
}

/**
 * Temporada cujos números de PR consolidados o motorhome deve priorizar.
 * Em pré-temporada ou temporada fechada: última encerrada; em OPEN: atual.
 */
export function motorhomePowerRankingSeason(ctx) {
    if (!ctx) return 20;
    if (ctx.phase === SEASON_PHASE.PRE_SEASON || ctx.phase === SEASON_PHASE.CLOSED) {
        return ctx.lastClosedSeason;
    }
    return ctx.currentSeason;
}

/**
 * Temporada para `/powerranking` (cards) e leitura de `power_ranking_stats` nessa página.
 * Sempre `current_season`: o admin publica com o mesmo critério (selectedSeason padrão = atual).
 * `motorhomePowerRankingSeason` continua em Dashboard/Hall, onde em pré-temporada faz sentido
 * priorizar a última encerrada — mas isso gerava T20 na página pública com dados gravados em T21.
 */
export function powerRankingPublicCardsSeason(ctx) {
    if (!ctx) return 20;
    return ctx.currentSeason;
}

/**
 * Temporada para buscar propostas / draft (pré-temporada olha para a próxima).
 */
export function proposalsDraftSeason(ctx) {
    if (!ctx) return 20;
    if (ctx.phase === SEASON_PHASE.PRE_SEASON) {
        return Math.max(ctx.currentSeason, ctx.lastClosedSeason + 1);
    }
    return ctx.currentSeason;
}

/**
 * Coluna "temporada" da planilha (ex. coluna D) para carrossel / TOP 3 da Home quando NÃO está em pré-temporada.
 * OPEN: temporada atual; CLOSED: última oficialmente encerrada. Em PRE_SEASON usar só os CSVs de draft (Home ignora isto no agregado).
 */
export function homeCarouselStandingsSeason(ctx) {
    if (!ctx) return 20;
    if (ctx.phase === SEASON_PHASE.PRE_SEASON) {
        return Math.max(ctx.currentSeason, ctx.lastClosedSeason + 1);
    }
    if (ctx.phase === SEASON_PHASE.CLOSED) {
        return ctx.lastClosedSeason;
    }
    return ctx.currentSeason;
}

export function canSwitchSeason(ctx) {
    return ctx?.phase === SEASON_PHASE.PRE_SEASON;
}

/** Indica se existe baseline de temporada oficial no Hall / narrativa de campeão */
export function canShowChampion(ctx) {
    return ctx != null && Number(ctx.lastClosedSeason) >= 1;
}

export function phaseLabelPt(phase) {
    switch (phase) {
        case SEASON_PHASE.CLOSED:
            return 'Temporada encerrada (oficial)';
        case SEASON_PHASE.PRE_SEASON:
            return 'Pré-temporada';
        case SEASON_PHASE.OPEN:
        default:
            return 'Temporada em andamento';
    }
}

/**
 * Limpa checklist e nota persistida do pilar Conduta do Power Ranking para uma temporada
 * (ao abrir temporada nova: flags por etapa, descontos manuais, etc.).
 * Não altera temporadas anteriores.
 */
export async function resetPowerRankingCondutaForSeason(season) {
    const s = parseInt(String(season), 10);
    if (!Number.isFinite(s) || s < 1) {
        return { ok: false, reason: 'invalid_season' };
    }
    const { error: delErr } = await supabase.from('power_ranking_conduta').delete().eq('season', s);
    if (delErr) {
        throw new Error(`Não foi possível limpar a conduta (checklist) da T${s}: ${delErr.message}`);
    }
    const { error: upErr } = await supabase
        .from('power_ranking_stats')
        .update({ conduta: 100, updated_at: new Date().toISOString() })
        .eq('season', s);
    if (upErr) {
        console.warn('[resetPowerRankingCondutaForSeason] power_ranking_stats:', upErr.message);
    }
    return { ok: true, season: s };
}
