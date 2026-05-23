import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePowerRankingCache } from '../hooks/useSupabaseCache';
import { fetchSeasonLifecycleConfig, defaultSeasonContext } from '../utils/seasonLifecycle';
import '../index.css'; 

// --- HELPERS VISUAIS ---
const DriverImage = ({ name, season, className, style }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    const primarySrc = `/pilotos/carreira/s${season}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    
    const [imgSrc, setImgSrc] = useState(primarySrc);
    useEffect(() => { setImgSrc(primarySrc); }, [name, season]);

    const handleError = (e) => {
        if (e.target.src.includes(`/s${season}/`)) {
            setImgSrc(smlSrc);
        } else if (e.target.src.includes('/SML/')) {
            setImgSrc(shadowSrc);
        }
    };
    
    return <img src={imgSrc} className={className} style={{...style}} onError={handleError} alt={name} />;
};

const getTeamLogo = (teamName) => {
    if(!teamName) return null;
    const t = teamName.toLowerCase().replace(/\s/g, ''); 
    if(t.includes("ferrari")) return "/team-logos/f1-ferrari.png"; 
    if(t.includes("mercedes")) return "/team-logos/f1-mercedes.png"; 
    if(t.includes("renault")) return "/team-logos/f1-renault.png";
    if(t.includes("alpine")) return "/team-logos/f1-alpine.png"; 
    if(t.includes("racingpoint") || (t.includes("racing") && t.includes("point"))) return "/team-logos/f1-racingpoint.png";
    if(t.includes("vcarb") || (t.includes("racing") && t.includes("bulls")) || t.includes("visa")) return "/team-logos/f1-racingbulls.png"; 
    if(t.includes("redbull") || t.includes("oracle") || t.includes("red bull")) return "/team-logos/f1-redbull.png"; 
    if(t.includes("mclaren")) return "/team-logos/f1-mclaren.png"; 
    if(t.includes("aston")) return "/team-logos/f1-astonmartin.png"; 
    if(t.includes("haas")) return "/team-logos/f1-haas.png"; 
    if(t.includes("alfaromeo") || t.includes("alfa romeo") || (t.includes("alfa") && !t.includes("tauri"))) return "/team-logos/f1-alfaromeo.png"; 
    if(t.includes("alphatauri") || t.includes("alpha tauri")) return "/team-logos/f1-alphatauri.png"; 
    if(t.includes("tororosso") || t.includes("toro rosso") || t.includes("toro")) return "/team-logos/f1-tororosso.png";
    if(t.includes("williams")) return "/team-logos/f1-williams.png"; 
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "/team-logos/f1-sauber.png";
    return null;
};

const getTeamColor = (teamName) => {
    if(!teamName) return "#FF9900";
    const t = teamName.toLowerCase();
    // Equipes antigas (verificar primeiro para evitar conflitos)
    if(t.includes("alfa") && !t.includes("tauri")) return "#900000"; // Alfa Romeo
    if(t.includes("alpha") || t.includes("tauri")) return "#FFFFFF"; // Alpha Tauri
    if(t.includes("toro") || t.includes("rosso")) return "#469BFF"; // Toro Rosso
    if(t.includes("racing point") || t.includes("bwt")) return "#F596C8"; // Racing Point
    if(t.includes("renault")) return "#FFF500"; // Renault
    // Equipes atuais
    if(t.includes("red bull") || t.includes("oracle")) return "#3671C6"; // Red Bull
    if(t.includes("ferrari")) return "#E8002D"; // Ferrari
    if(t.includes("mercedes")) return "#27F4D2"; // Mercedes
    if(t.includes("mclaren")) return "#FF8000"; // McLaren
    if(t.includes("aston")) return "#229971"; // Aston Martin
    if(t.includes("alpine")) return "#FD4BC7"; // Alpine
    if(t.includes("haas")) return "#B6BABD"; // Haas
    if(t.includes("williams")) return "#64C4FF"; // Williams
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "#52E252"; // Sauber/Stake
    if(t.includes("vcarb") || (t.includes("racing") && t.includes("bulls"))) return "#6692FF"; // VCARB/Racing Bulls
    return "#FF9900"; // Cor padrão
};

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "255, 153, 0";
};

const getRankColor = (rank) => {
    switch(rank) {
        case 2: return '#2563eb'; 
        case 3: return '#10b981'; 
        case 4: return '#db2777'; 
        case 5: return '#eab308'; 
        default: return '#64748B'; 
    }
};

function HistoricoPowerRanking() {
    const navigate = useNavigate();
    
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const { data: rawPR, loading } = usePowerRankingCache();
    const [rankingData, setRankingData] = useState([]);
    const [availableSeasons, setAvailableSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState("");
    const [seasonHint, setSeasonHint] = useState(null);

    useEffect(() => {
        let c = true;
        (async () => {
            try {
                const cfg = await fetchSeasonLifecycleConfig();
                if (c) setSeasonHint(cfg?.lastClosedSeason ?? cfg?.currentSeason ?? null);
            } catch {
                if (c) setSeasonHint(defaultSeasonContext()?.lastClosedSeason ?? 20);
            }
        })();
        return () => { c = false; };
    }, []);
    const [isPhone, setIsPhone] = useState(window.innerWidth <= 768);
    
    useEffect(() => {
        const handleResize = () => {
            setIsPhone(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Função para formatar nome: primeira letra maiúscula, resto minúscula (ex: "LUCAS RAIOL" -> "Lucas Raiol")
    const formatNameMobile = (name) => {
        if (!name) return { first: '', last: '' };
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return { first: '', last: '' };
        // Primeiro nome: apenas primeira letra maiúscula, resto minúscula
        const first = parts[0].charAt(0).toUpperCase() + (parts[0].slice(1) || '').toLowerCase();
        // Sobrenome: primeira letra maiúscula, resto minúscula
        const rest = parts.slice(1).map(word => word.charAt(0).toUpperCase() + (word.slice(1) || '').toLowerCase()).join(' ');
        return { first, last: rest };
    };

    useEffect(() => {
        if (loading || !rawPR || rawPR.length === 0) return;
        const seasons = [...new Set(rawPR.map(row => row[9]?.trim()))]
            .filter(s => s && !isNaN(s))
            .sort((a, b) => b - a);
        setAvailableSeasons(seasons);
        if (seasons.length > 0 && !selectedSeason) {
            const prefer = seasonHint != null ? String(seasonHint) : null;
            const pick = prefer && seasons.includes(prefer) ? prefer : seasons[0];
            setSelectedSeason(pick);
        }
    }, [rawPR, loading, selectedSeason, seasonHint]);

    useEffect(() => {
        if (!selectedSeason || !rawPR || rawPR.length === 0) return;
        const driverStats = {};
        let totalRowsProcessed = 0;
        let rowsForSeason = 0;
        
        rawPR.forEach(row => {
            totalRowsProcessed++;
            const driverName = (row[0] || '').trim();
            const totalPR = parseFloat((row[8] || '0').replace(',', '.')); 
            const rowSeason = (row[9] || '').trim();
            const teamName = (row[10] || '').trim();
            
            // Verificar se a linha pertence à temporada selecionada e tem nome de piloto válido
            if (rowSeason === String(selectedSeason) && driverName && driverName.length > 0) {
                rowsForSeason++;
                if (!driverStats[driverName]) {
                    driverStats[driverName] = { name: driverName, team: teamName || "Sem Equipe", totalScore: 0 };
                }
                if (teamName && teamName.length > 0) {
                    driverStats[driverName].team = teamName;
                }
                if (!isNaN(totalPR) && totalPR > 0) {
                    driverStats[driverName].totalScore += totalPR;
                }
            }
        });
        
        const sortedRank = Object.values(driverStats)
            .sort((a, b) => {
                // Primeiro critério: maior score
                if (b.totalScore !== a.totalScore) {
                    return b.totalScore - a.totalScore;
                }
                // Segundo critério (desempate): ordem alfabética do nome
                return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
            })
            .map((d, index) => ({
                ...d,
                rank: index + 1,
                displayScore: d.totalScore.toFixed(0) 
            }));
        
        console.log(`📊 Power Ranking - Temporada ${selectedSeason}:`, {
            totalRowsInData: rawPR.length,
            totalRowsProcessed,
            rowsForSeason,
            uniqueDrivers: sortedRank.length,
            drivers: sortedRank.map(d => ({ name: d.name, score: d.totalScore }))
        });
        
        setRankingData(sortedRank);
    }, [selectedSeason, rawPR]);

    if (loading) {
        return <div style={{padding:'100px', textAlign:'center', color:'white', background:'#050505', minHeight:'100vh'}}>Carregando Power Ranking...</div>;
    }

    const leader = rankingData[0];
    const rest = rankingData.slice(1);

    return (
        <div className="pr-new-wrapper">
            <header className="pr-new-header">
                <h1 className="pr-new-title">
                    POWER RANKING
                </h1>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap'}}>
                    <button
                        className="pr-voltar-btn"
                        onClick={() => navigate('/powerranking')}
                    >
                        ← VOLTAR
                    </button>
                    <div style={{position: 'relative', display:'inline-block'}}>
                        <select 
                            className="pr-new-season-selector" 
                            value={selectedSeason} 
                            onChange={(e) => setSelectedSeason(e.target.value)}
                            style={{appearance: 'none', WebkitAppearance: 'none'}}
                        >
                            {availableSeasons.map(s => (
                                <option key={s} value={s}>SEASON {s}</option>
                            ))}
                        </select>
                        <i className="fas fa-chevron-down" style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '8px', pointerEvents: 'none', color: '#888'}}></i>
                    </div>
                </div>
            </header>

            <main className="pr-new-main">
                {leader && (
                    <section 
                        className="pr-hero-banner" 
                        style={{
                            '--team-color': getTeamColor(leader.team),
                            '--team-color-rgb': hexToRgb(getTeamColor(leader.team))
                        }}
                    >
                        <div className="pr-hero-rank-side">
                            <span className="pr-hero-pos-num">1</span>
                            <span className="pr-hero-pos-label hide-mobile">TOP 1</span>
                        </div>
                        
                        <div className="pr-hero-photo-center">
                            <DriverImage name={leader.name} season={selectedSeason} style={{ height: '100%' }} />
                        </div>

                        <div className="pr-hero-info-side">
                            <h2 className="pr-hero-driver-name">
                                {isPhone ? (() => {
                                    const formatted = formatNameMobile(leader.name);
                                    return (
                                        <>
                                            <span className="pr-hero-name-first-mobile">{formatted.first}</span>
                                            {formatted.last && <span className="pr-hero-name-last-mobile"> {formatted.last}</span>}
                                        </>
                                    );
                                })() : (
                                    <>
                                        <span className="first">{leader.name?.split(' ')[0]}</span>
                                        <span className="last">{leader.name?.split(' ').slice(1).join(' ')}</span>
                                    </>
                                )}
                            </h2>
                            <div className="pr-hero-team-row">
                                {getTeamLogo(leader.team) && <img src={getTeamLogo(leader.team)} className="pr-hero-team-logo" alt="" />}
                                <span className="pr-hero-team-name">{leader.team}</span>
                            </div>
                            <div className="pr-hero-points-box">
                                <span className="pr-hero-points-text">{leader.displayScore} PONTOS</span>
                            </div>
                        </div>
                    </section>
                )}

                <div className="pr-rankings-grid">
                    {rest.map((driver) => {
                        const rankColor = getTeamColor(driver.team);
                        const rankColorRgb = hexToRgb(rankColor);
                        return (
                            <div 
                                key={driver.name} 
                                className="pr-grid-card"
                                style={{
                                    '--rank-color': rankColor,
                                    '--rank-color-rgb': rankColorRgb
                                }}
                            >
                                <div className="pr-grid-left">
                                    <div className="pr-grid-rank-box">
                                        <span className="pr-grid-rank-num">{driver.rank}</span>
                                    </div>
                                    <div className="pr-grid-photo">
                                        <DriverImage name={driver.name} season={selectedSeason} />
                                    </div>
                                    <div className="pr-grid-info">
                                        <span className="pr-grid-name">{driver.name}</span>
                                        <span className="pr-grid-team">
                                            {getTeamLogo(driver.team) && <img src={getTeamLogo(driver.team)} className="pr-grid-team-logo" alt="" />}
                                            {driver.team}
                                        </span>
                                    </div>
                                </div>
                                <div className="pr-grid-points">
                                    <div className="pr-grid-points-val">{driver.displayScore}</div>
                                    <div className="pr-grid-points-label">PTS</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            <nav className="pr-bottom-nav">
                <a href="/" className="pr-nav-link">HOME</a>
                <a href="/standings" className="pr-nav-link active">RANKINGS</a>
                <a href="/pilotos" className="pr-nav-link">DRIVERS</a>
                <a href="/teams" className="pr-nav-link">TEAMS</a>
                <a href="/news" className="pr-nav-link">NEWS</a>
            </nav>
        </div>
    );
}

export default HistoricoPowerRanking;
