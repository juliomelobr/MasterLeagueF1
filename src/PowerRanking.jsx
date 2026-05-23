import { useState, useEffect } from 'react';
import { useLeagueData } from '../hooks/useLeagueData';

// Ícones
const TrendUp = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>;
const TrendDown = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 18l-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/></svg>;
const TrendFlat = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>;

const DriverImage = ({ name, gridType, season, className }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    const primarySrc = `/pilotos/${gridType}/s${season}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    
    const handleError = (e) => {
        if (e.target.src.includes(`/s${season}/`)) {
            e.target.src = smlSrc;
        } else if (e.target.src.includes('/SML/')) {
            e.target.src = shadowSrc;
        }
    };
    
    return <img src={primarySrc} className={className} onError={handleError} alt="" />;
};

function PowerRanking() {
    const { rawCarreira, seasons, loading } = useLeagueData();
    const [rankingData, setRankingData] = useState([]);
    const currentSeason = seasons[0] || 19;

    useEffect(() => {
        if (loading || rawCarreira.length === 0) return;

        // 1. Agrupar Pilotos Reais
        const totals = {};
        rawCarreira.forEach(row => {
            const s = parseInt(row[3]);
            if (s === parseInt(currentSeason)) {
                const name = row[9];
                if (name) {
                    if (!totals[name]) totals[name] = { name, team: row[10], totalPoints: 0 };
                    let p = parseFloat((row[15]||'0').replace(',', '.'));
                    if (!isNaN(p)) totals[name].totalPoints += p;
                }
            }
        });

        // 2. Criar Mock de Power Ranking (SIMULAÇÃO VISUAL)
        // Na vida real, você puxaria isso de uma aba "Analises" da planilha
        const processed = Object.values(totals)
            .map(d => {
                // Simula uma nota baseada nos pontos + um fator aleatório de "momento"
                const score = (Math.min(d.totalPoints / 20, 9.0) + Math.random()).toFixed(1);
                // Simula uma tendência
                const trendType = Math.random() > 0.6 ? 'up' : (Math.random() > 0.3 ? 'down' : 'flat');
                const change = Math.floor(Math.random() * 3) + 1;
                
                return { ...d, score, trendType, change };
            })
            .sort((a, b) => b.score - a.score) // Ordena pela nota do Power Ranking
            .map((d, index) => ({ ...d, rank: index + 1 })); // Adiciona posição

        setRankingData(processed);

    }, [rawCarreira, loading, currentSeason]);

    if (loading) return <div style={{padding:'100px', textAlign:'center'}}>Carregando Power Ranking...</div>;

    const leader = rankingData[0];
    const rest = rankingData.slice(1);

    return (
        <div className="page-wrapper">
            {/* Header Exclusivo do Power Ranking */}
            <div className="pr-header">
                <h1 className="pr-title">POWER <span>RANKING</span></h1>
                <p className="pr-subtitle">Nossa análise subjetiva de quem está guiando muito (ou pouco) na Temporada {currentSeason}.</p>
            </div>

            <div className="pr-container">
                
                {/* Destaque #1 */}
                {leader && (
                    <div className="pr-leader-card">
                        <div className="pr-leader-pos">1</div>
                        <DriverImage name={leader.name} gridType="carreira" season={currentSeason} className="pr-leader-photo" />
                        <div className="pr-leader-info">
                            <div className="pr-leader-name">{leader.name}</div>
                            <div className="pr-leader-team" style={{color: 'var(--highlight-cyan)'}}>{leader.team}</div>
                        </div>
                        <div className="pr-leader-score">
                            {leader.score}
                            <span>SCORE</span>
                        </div>
                    </div>
                )}

                {/* Lista Restante */}
                <div className="pr-list">
                    {rest.map((driver) => (
                        <div key={driver.name} className="pr-row">
                            <div className="pr-rank">{driver.rank}º</div>
                            
                            {/* Ícone de Tendência */}
                            <div className={`pr-trend trend-${driver.trendType}`}>
                                {driver.trendType === 'up' && <><TrendUp/> {driver.change}</>}
                                {driver.trendType === 'down' && <><TrendDown/> {driver.change}</>}
                                {driver.trendType === 'flat' && <TrendFlat/>}
                            </div>

                            <div className="pr-driver-info">
                                <DriverImage name={driver.name} gridType="carreira" season={currentSeason} className="pr-row-photo" />
                                <div className="pr-name-group">
                                    <span className="pr-row-name">{driver.name}</span>
                                    <span className="pr-row-team">{driver.team}</span>
                                </div>
                            </div>

                            <div className="pr-score-box">{driver.score}</div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}

export default PowerRanking;