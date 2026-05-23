import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { displayPilarInt } from '../utils/powerRankingMotorhome';
import { fetchSeasonLifecycleConfig, defaultSeasonContext } from '../utils/seasonLifecycle';
import './Cards.css';

// Componente para exibir foto do piloto
const DriverImage = ({ name, gridType, season }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    const s = season || '20';
    
    const seasonSrc = `/pilotos/${gridType || 'carreira'}/s${s}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const fallbackS19Src = `/pilotos/${gridType || 'carreira'}/s19/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';

    const handleError = (e) => {
        if (e.target.src.includes(`/s${s}/`)) {
            e.target.src = smlSrc;
        } else if (e.target.src.includes('/SML/')) {
            if (!e.target.src.includes(`/s19/`)) e.target.src = fallbackS19Src;
            else e.target.src = shadowSrc;
        } else if (e.target.src.includes(`/s19/`)) {
            e.target.src = shadowSrc;
        }
    };

    const initialSrc = smlSrc;
    
    return <img src={initialSrc} onError={handleError} style={{width:'100%', height:'100%', objectFit:'cover'}} alt={name || ''} />;
};

function Cards() {
    const [loading, setLoading] = useState(true);
    const [pilotoData, setPilotoData] = useState(null);
    const [statsData, setStatsData] = useState(null);
    const [error, setError] = useState(null);
    const [selectedSeason, setSelectedSeason] = useState(20);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const ctx = await fetchSeasonLifecycleConfig();
                if (!cancelled && ctx?.currentSeason) {
                    setSelectedSeason(ctx.currentSeason);
                }
            } catch {
                const fallback = defaultSeasonContext();
                if (!cancelled && fallback?.currentSeason) {
                    setSelectedSeason(fallback.currentSeason);
                }
            }
        })();

        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const carregarDados = async () => {
            try {
                setLoading(true);
                setError(null);

                const targetName = 'Alexandre Henrique';

                // Buscar piloto "Alexandre Henrique"
                const { data: piloto, error: pilotoError } = await supabase
                    .from('pilotos')
                    .select('*')
                    .ilike('nome', `%${targetName}%`)
                    .limit(1)
                    .maybeSingle();

                if (pilotoError) throw pilotoError;
                if (!piloto) {
                    setPilotoData({ nome: targetName });
                    setStatsData({
                        performance: 60,
                        conduta: 100,
                        racecraft: 60,
                        overall: 60,
                        historico: 60,
                        power_ranking: 60
                    });
                    return;
                }

                setPilotoData(piloto);

                // Buscar stats do Power Ranking
                const { data: stats, error: statsError } = await supabase
                    .from('power_ranking_stats')
                    .select('*')
                    .eq('piloto_id', piloto.id)
                    .eq('season', selectedSeason)
                    .maybeSingle();

                if (statsError) throw statsError;

                // Se não tiver stats, criar dados padrão
                if (!stats) {
                    setStatsData({
                        performance: 60,
                        conduta: 100,
                        racecraft: 60,
                        overall: 60,
                        historico: 60,
                        power_ranking: 60
                    });
                } else {
                    setStatsData(stats);
                }

            } catch (err) {
                console.error('Erro ao carregar dados:', err);
                setError('Erro ao carregar dados do piloto');
            } finally {
                setLoading(false);
            }
        };

        carregarDados();
    }, [selectedSeason]);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F8FAFC'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '15px' }}>⏳</div>
                    <p>Carregando dados do piloto...</p>
                </div>
            </div>
        );
    }

    if (error || !pilotoData) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F8FAFC'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '15px' }}>❌</div>
                    <p>{error || 'Piloto não encontrado'}</p>
                </div>
            </div>
        );
    }

    const stats = statsData || {
        performance: 60,
        conduta: 100,
        racecraft: 60,
        overall: 60,
        historico: 60,
        power_ranking: 60
    };

    const powerRanking = displayPilarInt('power_ranking', stats.power_ranking);

    return (
        <div className="ea-container">
            <div className="driver-card">
                {/* Camada de FUNDO (Cards.png) */}
                <div className="card-bg-layer"></div>

                {/* Foto do piloto */}
                <div className="driver-photo">
                    <DriverImage 
                        name={pilotoData.nome} 
                        gridType={pilotoData.grid || 'carreira'} 
                        season={selectedSeason}
                    />
                </div>

                {/* Camada de FRENTE (Cards-Front.png) */}
                <div className="card-front-layer"></div>

                {/* Overlay de Informações (Stats e Nome) */}
                <div className="card-info-overlay">
                    {/* Bloco de Stats (Direita) */}
                    <div className="card-stats-block">
                        {/* Power Ranking Badge */}
                        <div className="card-pr-badge stat-pr">
                            <span className="label"></span>
                            <span className="value main-pr">{powerRanking}</span>
                        </div>

                        <div className="card-stat-row overall stat-overall">
                            <span className="label"></span>
                            <span className="value">{displayPilarInt('overall', stats.overall)}</span>
                        </div>
                        <div className="card-stat-row stat-performance">
                            <span className="label"></span>
                            <span className="value">{displayPilarInt('performance', stats.performance)}</span>
                        </div>
                        <div className="card-stat-row stat-racecraft">
                            <span className="label"></span>
                            <span className="value">{displayPilarInt('racecraft', stats.racecraft)}</span>
                        </div>
                        <div className="card-stat-row stat-conduta">
                            <span className="label"></span>
                            <span className="value">{displayPilarInt('conduta', stats.conduta)}</span>
                        </div>
                        <div className="card-stat-row stat-historico">
                            <span className="label"></span>
                        </div>
                    </div>

                    {/* Valor do Histórico alinhado à direita no banner */}
                    <div className="historico-value">
                        {displayPilarInt('historico', stats.historico)}
                    </div>

                    {/* Bloco de Nome (Esquerda) */}
                    <div className="card-name-block">
                        <div className="driver-name">
                            {pilotoData.nome.split(' ')[0]}<br/>
                            <span>{pilotoData.nome.split(' ').slice(1).join(' ')}</span>
                        </div>
                        {pilotoData.nacionalidade && (
                            <img 
                                src={`/flags/${pilotoData.nacionalidade.toLowerCase()}.png`} 
                                className="driver-flag" 
                                alt="flag"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Cards;
