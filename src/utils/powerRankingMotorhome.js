/**
 * Exibição e persistência do Power Ranking no Motorhome (power_ranking_stats).
 * Mantém os mesmos arredondamentos no painel admin, na página /powerranking e nos upserts.
 */

const PILLAR_DEFAULTS = {
    performance: 60,
    racecraft: 60,
    overall: 60,
    historico: 60,
    conduta: 100,
    power_ranking: 60,
};

/** Inteiro exibido (sempre para cima), alinhado às colunas do admin. */
export function displayPilarInt(field, value) {
    const def = PILLAR_DEFAULTS[field] ?? 60;
    if (value === undefined || value === null || value === '') return def;
    const n = Number(value);
    if (!Number.isFinite(n)) return def;
    return Math.ceil(n);
}

/** Fórmula oficial do PR a partir dos pilares (inteiros ou não). */
export function calcularPowerRankingParaPersistencia(stats, faltas = 0) {
    const perf = Number(stats?.performance) || 60;
    const race = Number(stats?.racecraft) || 60;
    const over = Number(stats?.overall) || 60;
    const cond = Number(stats?.conduta) ?? 100;
    const hist = Number(stats?.historico) || 60;
    const prBase = Math.ceil(
        (perf * 0.30) + (race * 0.25) + (over * 0.20) + (cond * 0.15) + (hist * 0.10),
    );
    return Math.max(0, prBase - ((faltas || 0) * 2));
}

/**
 * Linha para upsert em power_ranking_stats: pilares arredondados como no painel;
 * power_ranking usa o valor já calculado pelo motor quando existir (evita divergência de 1 pt).
 */
export function buildStatsUpsertForMotorhome({ piloto_id, season, stats, faltas = 0 }) {
    const performance = displayPilarInt('performance', stats?.performance);
    const racecraft = displayPilarInt('racecraft', stats?.racecraft);
    const overall = displayPilarInt('overall', stats?.overall);
    const historico = displayPilarInt('historico', stats?.historico);
    const conduta = displayPilarInt('conduta', stats?.conduta);

    let power_ranking;
    if (stats?.power_ranking != null && Number.isFinite(Number(stats.power_ranking))) {
        power_ranking = Math.max(0, Math.ceil(Number(stats.power_ranking)));
    } else {
        power_ranking = calcularPowerRankingParaPersistencia(
            { performance, racecraft, overall, historico, conduta },
            faltas,
        );
    }

    return {
        piloto_id,
        season,
        performance,
        racecraft,
        overall,
        historico,
        conduta,
        power_ranking,
        updated_at: new Date().toISOString(),
    };
}
