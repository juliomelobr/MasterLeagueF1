/**
 * Calcula a lista de etapas com TOP 10 completo (10 posições registradas)
 * cuja data já passou — agrupando por grid (carreira/light) e mantendo
 * apenas a temporada mais recente de cada um. Ordena pela data mais recente
 * primeiro; em empate, Carreira antes de Light.
 *
 * É a mesma lógica usada na Home (carrossel) e na rota de listagem
 * `/snapshot/top10/list` consumida pelo Playwright na GitHub Action.
 *
 * @param {Array<Array<string>>} rawLight  Linhas brutas da Data Light
 * @param {Array<Array<string>>} rawCarreira  Linhas brutas da Data Carreira
 * @returns {Array<{ grid: 'light' | 'carreira', season: number, round: number, gp: string, date: string, ts: number }>}
 */
export function computeConcludedTop10Stages(rawLight, rawCarreira) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const parseStageDate = (dateStr) => {
        if (!dateStr) return NaN;
        if (String(dateStr).includes('/')) {
            const [d, m, y] = String(dateStr).split('/');
            if (!d || !m || !y) return NaN;
            const fullYear = String(y).length === 2 ? `20${y}` : y;
            const ts = new Date(`${fullYear}-${m}-${d}`).getTime();
            return Number.isFinite(ts) ? ts : NaN;
        }
        const ts = new Date(dateStr).getTime();
        return Number.isFinite(ts) ? ts : NaN;
    };

    const computeForGrid = (raw, grid) => {
        if (!raw?.length) return [];
        const map = new Map();
        raw.forEach((row) => {
            const s = parseInt(row[3], 10);
            const r = parseInt(row[4], 10);
            const pos = parseInt(row[8], 10);
            if (Number.isNaN(s) || Number.isNaN(r)) return;
            const key = `${s}-${r}`;
            if (!map.has(key)) {
                map.set(key, {
                    grid,
                    season: s,
                    round: r,
                    gp: row[5],
                    date: row[0],
                    positions: new Set(),
                });
            }
            const entry = map.get(key);
            if (!Number.isNaN(pos) && pos >= 1 && pos <= 10) entry.positions.add(pos);
        });

        const candidates = Array.from(map.values())
            .map((entry) => ({ ...entry, ts: parseStageDate(entry.date) }))
            .filter((entry) => {
                if (entry.positions.size < 10) return false;
                if (!Number.isFinite(entry.ts)) return false;
                return entry.ts <= todayMs;
            });

        if (!candidates.length) return [];
        const latestSeason = Math.max(...candidates.map((c) => c.season));
        return candidates
            .filter((c) => c.season === latestSeason)
            .map((c) => {
                // remove o Set antes de serializar (não é JSON-friendly)
                // mantém só campos planos.
                const { positions, ...rest } = c;
                return rest;
            });
    };

    const lightStages = computeForGrid(rawLight, 'light');
    const carreiraStages = computeForGrid(rawCarreira, 'carreira');
    const all = [...carreiraStages, ...lightStages];

    all.sort((a, b) => {
        if (b.ts !== a.ts) return b.ts - a.ts;
        if (b.round !== a.round) return b.round - a.round;
        if (a.grid !== b.grid) return a.grid === 'carreira' ? -1 : 1;
        return 0;
    });

    return all;
}
