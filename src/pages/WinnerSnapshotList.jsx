import { useEffect, useMemo } from 'react';
import { useLeagueData } from '../hooks/useLeagueData';
import { computeConcludedWinnerStages } from '../utils/concludedWinnerStages';

/**
 * Rota Playwright: /snapshot/winner/list
 */
export default function WinnerSnapshotList() {
    const { rawCarreira, rawLight, loading } = useLeagueData();

    const stages = useMemo(() => {
        if (loading) return null;
        return computeConcludedWinnerStages(rawLight, rawCarreira);
    }, [loading, rawLight, rawCarreira]);

    useEffect(() => {
        if (stages) {
            document.body.setAttribute('data-snapshot-list-ready', 'true');
        } else {
            document.body.removeAttribute('data-snapshot-list-ready');
        }
        return () => document.body.removeAttribute('data-snapshot-list-ready');
    }, [stages]);

    return (
        <pre
            id="winner-list"
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
