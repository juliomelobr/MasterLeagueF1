import { useEffect, useMemo } from 'react';
import { useLeagueData } from '../hooks/useLeagueData';
import { computeConcludedTop10Stages } from '../utils/concludedTop10Stages';
import { slugify } from '../components/Top10Art';

/**
 * Página JSON consumida pelo Playwright (GitHub Action) para descobrir
 * quais (grid, season, round) precisam ter PNG gerado.
 *
 * Renderiza um único <pre id="top10-list"> contendo um JSON com a lista
 * de etapas elegíveis. Marca <body data-snapshot-list-ready="true"> quando
 * os dados estão prontos.
 *
 * Rota: /snapshot/top10/list
 */
export default function Top10SnapshotList() {
    const { rawCarreira, rawLight, loading } = useLeagueData();

    const stages = useMemo(() => {
        if (loading) return null;
        return computeConcludedTop10Stages(rawLight, rawCarreira).map((s) => ({
            grid: s.grid,
            season: s.season,
            round: s.round,
            gp: s.gp,
            gpSlug: slugify(s.gp || ''),
            date: s.date,
            ts: s.ts,
        }));
    }, [loading, rawLight, rawCarreira]);

    useEffect(() => {
        if (stages && stages.length >= 0) {
            document.body.setAttribute('data-snapshot-list-ready', 'true');
        } else {
            document.body.removeAttribute('data-snapshot-list-ready');
        }
        return () => {
            document.body.removeAttribute('data-snapshot-list-ready');
        };
    }, [stages]);

    return (
        <pre
            id="top10-list"
            style={{
                margin: 0,
                padding: 16,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                background: '#0b1020',
                color: '#cbd5e1',
                minHeight: '100vh',
            }}
        >
            {stages ? JSON.stringify(stages, null, 2) : '[]'}
        </pre>
    );
}
