import { slugify } from '../components/Top10Art';

/**
 * Etapas com vencedor registrado (posição 1) cuja data já passou,
 * na temporada mais recente de cada grid.
 */
export function computeConcludedWinnerStages(rawLight, rawCarreira) {
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
            if (Number.isNaN(s) || Number.isNaN(r) || pos !== 1) return;
            const key = `${s}-${r}`;
            if (!map.has(key)) {
                map.set(key, {
                    grid,
                    season: s,
                    round: r,
                    gp: row[5],
                    date: row[0],
                    winner: row[9] || '',
                    team: row[10] || '',
                });
            }
        });

        const candidates = Array.from(map.values())
            .map((entry) => ({ ...entry, ts: parseStageDate(entry.date) }))
            .filter((entry) => Number.isFinite(entry.ts) && entry.ts <= todayMs);

        if (!candidates.length) return [];
        const latestSeason = Math.max(...candidates.map((c) => c.season));
        return candidates.filter((c) => c.season === latestSeason);
    };

    const all = [
        ...computeForGrid(rawCarreira, 'carreira'),
        ...computeForGrid(rawLight, 'light'),
    ];

    all.sort((a, b) => {
        if (b.ts !== a.ts) return b.ts - a.ts;
        if (b.round !== a.round) return b.round - a.round;
        if (a.grid !== b.grid) return a.grid === 'carreira' ? -1 : 1;
        return 0;
    });

    return all.map((entry) => ({
        ...entry,
        gpSlug: slugify(entry.gp || ''),
    }));
}
