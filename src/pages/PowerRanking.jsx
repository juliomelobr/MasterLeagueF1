import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { usePowerRankingCache, usePowerRankingLightCache } from '../hooks/useSupabaseCache';
import { useLeagueData } from '../hooks/useLeagueData';
import {
    fetchSeasonLifecycleConfig,
    defaultSeasonContext,
    motorhomePowerRankingSeason,
    powerRankingPublicCardsSeason,
} from '../utils/seasonLifecycle';
import { displayPilarInt } from '../utils/powerRankingMotorhome';
import './Cards.css';
import './PowerRankingCards.css';

const normalizeName = (name) => (name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POWER_RANKING_DRAFT_SEASON = 21;

/** Chave estável em `byId` (PostgREST pode devolver UUID em caixa mista). */
function statKeyForPilotoId(id) {
    const s = id == null ? '' : String(id).trim();
    if (!s) return '';
    return UUID_RE.test(s) ? s.toLowerCase() : s;
}

/** Fallback pré-temporada — alinhado ao Home (col A nome, col C season). */
function collectTitularesFromDraft(rows, season) {
    const seen = new Set();
    const order = [];
    if (!rows?.length) return order;
    const seasonInt = parseInt(String(season), 10);
    if (!Number.isFinite(seasonInt)) return order;

    for (const row of rows) {
        const nome = (row[0] || '').toString().trim();
        if (!nome || nome === 'Piloto' || nome === 'NOME' || nome === 'Nome' || nome.includes('#')) continue;
        const rowSeason = parseInt(String(row[2] ?? '').trim(), 10);
        if (rowSeason !== seasonInt) continue;
        const key = normalizeName(nome);
        if (seen.has(key)) continue;
        seen.add(key);
        order.push(nome);
    }
    return order;
}

function isPilotoAtivo(piloto) {
    const tipo = String(piloto?.tipo_piloto || '').trim().toLowerCase();
    if (tipo.includes('ex-piloto') || tipo === 'ex' || tipo === 'ex piloto') return false;

    const status = String(piloto?.status || '').trim().toLowerCase();
    if (!status) return true;
    if (status === 'ativo' || status === 'active') return true;
    if (status === 'pendente' || status === 'pending') return false;
    if (status === 'inativo' || status === 'inactive') return false;
    return true;
}

function isPilotoReserva(piloto) {
    const equipe = String(piloto?.equipe || '').trim().toLowerCase();
    return equipe.includes('reserva');
}

const DriverImage = ({ name, gridType, season }) => {
    const cleanName = name
        ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase()
        : "pilotoshadow";
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
    return <img src={initialSrc} onError={handleError} alt={name || ''} />;
};

function PowerRanking() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [seasonCtxLoading, setSeasonCtxLoading] = useState(true);
    /** Mesmo critério do Dashboard / Motorhome para qual temporada de PR exibir. */
    const [seasonCtx, setSeasonCtx] = useState(null);
    const [pilotos, setPilotos] = useState([]);
    const [rankingList, setRankingList] = useState([]);
    /** Stats por UUID e por nome (fallback quando classificação ≠ cadastro). */
    const [statsLookup, setStatsLookup] = useState({ byId: {}, byNome: {} });
    /** Diagnóstico quando todos os cards caem no default 60. */
    const [statsMatchInfo, setStatsMatchInfo] = useState(null);
    const [selectedGrid, setSelectedGrid] = useState('carreira');
    const [refreshTick, setRefreshTick] = useState(0);
    const { rawCarreira, rawLight, draftCarreira, draftLight, loading: leagueLoading } = useLeagueData();

    /** Temporada dos cards + `power_ranking_stats` — alinhada ao que o admin publica (current_season). */
    const prSeason = useMemo(() => {
        if (!seasonCtx) return 20;
        return powerRankingPublicCardsSeason(seasonCtx);
    }, [seasonCtx]);

    const motorhomePrSeason = useMemo(() => {
        if (!seasonCtx) return 20;
        return motorhomePowerRankingSeason(seasonCtx);
    }, [seasonCtx]);

    const { data: rawPRLight, loading: loadingPRLight } = usePowerRankingLightCache(prSeason);
    const { data: rawPRCarreira, loading: loadingPRCarreira } = usePowerRankingCache(prSeason);

    const reloadSeasonCtx = useCallback(async () => {
        try {
            const cfg = await fetchSeasonLifecycleConfig();
            setSeasonCtx(cfg);
        } catch {
            setSeasonCtx(defaultSeasonContext());
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const cfg = await fetchSeasonLifecycleConfig();
                if (!cancelled) setSeasonCtx(cfg);
            } catch {
                if (!cancelled) setSeasonCtx(defaultSeasonContext());
            } finally {
                if (!cancelled) setSeasonCtxLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                reloadSeasonCtx();
                setRefreshTick((v) => v + 1);
            }
        };
        const onFocus = () => {
            reloadSeasonCtx();
            setRefreshTick((v) => v + 1);
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onFocus);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onFocus);
        };
    }, [reloadSeasonCtx]);

    useEffect(() => {
        const loadData = async () => {
            if (seasonCtxLoading || leagueLoading) return;
            try {
                setLoading(true);

                const rawPR = selectedGrid === 'carreira' ? rawPRCarreira : rawPRLight;
                const draftRows = selectedGrid === 'carreira' ? draftCarreira : draftLight;

                const seasonNum = Number(prSeason);
                if (!Number.isFinite(seasonNum)) {
                    setPilotos([]);
                    setStatsLookup({ byId: {}, byNome: {} });
                    setStatsMatchInfo(null);
                    return;
                }

                let titularesNomes = [];

                const { data: allPilotos, error: pilotosError } = await supabase
                    .from('pilotos')
                    .select('*')
                    .in('grid', ['carreira', 'light']);

                if (pilotosError) throw pilotosError;

                const pilotosByName = new Map();
                (allPilotos || []).forEach((p) => {
                    const key = normalizeName(p.nome);
                    if (!pilotosByName.has(key)) pilotosByName.set(key, p);
                });

                const ativosNaoReservasPorGrid = new Set(
                    (allPilotos || [])
                        .filter((p) => (p.grid || '').toLowerCase() === selectedGrid)
                        .filter((p) => isPilotoAtivo(p))
                        .filter((p) => !isPilotoReserva(p))
                        .map((p) => normalizeName(p.nome))
                        .filter(Boolean),
                );

                const nomesDraftTemporada21 = collectTitularesFromDraft(draftRows, POWER_RANKING_DRAFT_SEASON);
                titularesNomes = nomesDraftTemporada21.filter((nome) =>
                    ativosNaoReservasPorGrid.has(normalizeName(nome)),
                );

                const driverStats = {};
                const titularesOverride = new Set(['lucas searom']);

                if (rawPR && rawPR.length > 0) {
                    rawPR.forEach((row) => {
                        const driverName = (row[0] || '').trim();
                        const totalPR = parseFloat((row[8] || '0').toString().replace(',', '.'));
                        const rowSeason = (row[9] || '').trim();
                        const teamName = (row[10] || '').trim();
                        const isTitular = !/reserva/i.test(teamName) || titularesOverride.has(normalizeName(driverName));

                        if (rowSeason === String(seasonNum) && driverName && !isNaN(totalPR) && isTitular) {
                            const key = normalizeName(driverName);
                            if (!driverStats[key]) {
                                driverStats[key] = { name: driverName, totalScore: 0 };
                            }
                            driverStats[key].totalScore += totalPR;
                        }
                    });
                }

                const ranking = Object.values(driverStats)
                    .sort((a, b) => {
                        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
                        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
                    });
                setRankingList(ranking);

                const prOrderIndex = new Map(
                    ranking.map((item, idx) => [normalizeName(item.name), idx])
                );

                const nomesOrdenados = [...titularesNomes].sort((a, b) => {
                    const ia = prOrderIndex.get(normalizeName(a));
                    const ib = prOrderIndex.get(normalizeName(b));
                    if (ia != null && ib != null) return ia - ib;
                    if (ia != null) return -1;
                    if (ib != null) return 1;
                    return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
                });

                const pilotosOrdenados = nomesOrdenados.map((nome) => {
                    const key = normalizeName(nome);
                    const piloto = pilotosByName.get(key);
                    if (piloto) {
                        return { ...piloto, grid: selectedGrid };
                    }
                    return { id: `pr-nom-${key}`, nome, grid: selectedGrid };
                });

                setPilotos(pilotosOrdenados);

                const rowToStat = (row) => ({
                    piloto_id: row.piloto_id,
                    performance: row.performance,
                    racecraft: row.racecraft,
                    conduta: row.conduta,
                    overall: row.overall,
                    historico: row.historico,
                    power_ranking: row.power_ranking,
                });

                // Uma query plana por temporada (sem join): o embed pilotos costuma falhar com RLS anônimo
                // e impedia os cards de receberem power_ranking_stats mesmo com dados no painel admin.
                const { data: statsFlat, error: statsFlatErr } = await supabase
                    .from('power_ranking_stats')
                    .select('piloto_id, performance, racecraft, conduta, overall, historico, power_ranking')
                    .eq('season', seasonNum);

                if (statsFlatErr) throw statsFlatErr;
                const statsRows = Array.isArray(statsFlat) ? statsFlat : [];

                const byId = {};
                const byNome = {};

                statsRows.forEach((row) => {
                    const stat = rowToStat(row);
                    if (stat.piloto_id == null || String(stat.piloto_id).length === 0) return;
                    const k = statKeyForPilotoId(stat.piloto_id);
                    if (k) byId[k] = stat;
                });

                const idsFromStats = [...new Set(
                    statsRows.map((r) => r?.piloto_id).filter((id) => id != null && String(id).length > 0),
                )];
                if (idsFromStats.length > 0) {
                    const { data: pilotoNomeRows, error: nomeErr } = await supabase
                        .from('pilotos')
                        .select('id, nome')
                        .in('id', idsFromStats);
                    if (!nomeErr && pilotoNomeRows?.length) {
                        pilotoNomeRows.forEach((p) => {
                            const st = byId[statKeyForPilotoId(p.id)];
                            if (!st || !p.nome) return;
                            const nk = normalizeName(p.nome);
                            if (nk) byNome[nk] = st;
                        });
                    }
                }

                // Reforço: titular já com UUID do cadastro
                pilotosOrdenados.forEach((p) => {
                    const idKey = statKeyForPilotoId(p.id);
                    if (!idKey || !UUID_RE.test(String(p.id || ''))) return;
                    const st = byId[idKey];
                    if (!st) return;
                    const nk = normalizeName(p.nome);
                    if (nk) byNome[nk] = st;
                });

                let matchedTitulares = 0;
                pilotosOrdenados.forEach((p) => {
                    const idKey = statKeyForPilotoId(p.id);
                    const nk = normalizeName(p.nome);
                    if ((idKey && byId[idKey]) || (nk && byNome[nk])) matchedTitulares += 1;
                });

                setStatsMatchInfo({
                    season: seasonNum,
                    rowCount: statsRows.length,
                    titulares: pilotosOrdenados.length,
                    matched: matchedTitulares,
                });

                setStatsLookup({ byId, byNome });
            } catch (err) {
                console.error('Erro ao carregar cards do Power Ranking:', err);
                setPilotos([]);
                setStatsLookup({ byId: {}, byNome: {} });
                setStatsMatchInfo(null);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [
        prSeason,
        rawPRLight,
        rawPRCarreira,
        selectedGrid,
        seasonCtxLoading,
        leagueLoading,
        rawCarreira,
        rawLight,
        draftCarreira,
        draftLight,
        refreshTick,
    ]);

    const resolveStats = useMemo(
        () => (piloto) => {
            const idKey = statKeyForPilotoId(piloto?.id);
            if (idKey && statsLookup.byId[idKey]) return statsLookup.byId[idKey];
            const nk = normalizeName(piloto?.nome);
            if (nk && statsLookup.byNome[nk]) return statsLookup.byNome[nk];
            return {};
        },
        [statsLookup],
    );

    const pilotosOrdenados = useMemo(() => {
        return [...pilotos].sort((a, b) => {
            const statsA = resolveStats(a);
            const statsB = resolveStats(b);

            const criteria = [
                'power_ranking',
                'overall',
                'performance',
                'racecraft',
                'conduta',
                'historico'
            ];

            for (const key of criteria) {
                const valA = displayPilarInt(key, statsA[key]);
                const valB = displayPilarInt(key, statsB[key]);
                if (valB !== valA) return valB - valA;
            }

            return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        });
    }, [pilotos, resolveStats]);

    if (seasonCtxLoading || leagueLoading || loading || loadingPRLight || loadingPRCarreira) {
        return (
            <div className="pr-cards-page">
                <div className="pr-cards-loading">Carregando cards...</div>
            </div>
        );
    }

    return (
        <div className="pr-cards-page">
            <div className="pr-cards-header">
                <h1>POWER RANKING T{prSeason} - {selectedGrid === 'carreira' ? 'CARREIRA' : 'LIGHT'}</h1>
                {seasonCtx && (
                    <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 6 }}>
                        Cards e banco (T{prSeason}) · Fase {seasonCtx.phase}
                        {motorhomePrSeason !== prSeason && (
                            <> · Consolidado em outras telas (motorhome): T{motorhomePrSeason}</>
                        )}
                    </p>
                )}
                {statsMatchInfo && statsMatchInfo.rowCount === 0 && (
                    <p
                        role="alert"
                        style={{
                            marginTop: 12,
                            padding: '12px 14px',
                            borderRadius: 8,
                            background: 'rgba(234, 179, 8, 0.12)',
                            border: '1px solid rgba(234, 179, 8, 0.45)',
                            color: '#fde68a',
                            fontSize: 14,
                            maxWidth: 720,
                        }}
                    >
                        Não há linhas em <code style={{ color: '#fff' }}>power_ranking_stats</code> para a
                        temporada <strong>T{statsMatchInfo.season}</strong>. O painel admin mostra cálculo local;
                        estes cards só leem o banco após <strong>Publicar no Motorhome</strong> (mesma temporada
                        no seletor).
                    </p>
                )}
                {statsMatchInfo && statsMatchInfo.rowCount > 0 && statsMatchInfo.matched === 0 && (
                    <p
                        role="alert"
                        style={{
                            marginTop: 12,
                            padding: '12px 14px',
                            borderRadius: 8,
                            background: 'rgba(248, 113, 113, 0.12)',
                            border: '1px solid rgba(248, 113, 113, 0.4)',
                            color: '#fecaca',
                            fontSize: 14,
                            maxWidth: 720,
                        }}
                    >
                        Existem {statsMatchInfo.rowCount} registro(s) no banco para T{statsMatchInfo.season}, mas
                        nenhum casa com os {statsMatchInfo.titulares} titular(es) deste grid (UUID ou nome na
                        classificação diferente do cadastro em <code style={{ color: '#fff' }}>pilotos</code>).
                    </p>
                )}
            </div>
            <div className="pr-cards-grid-toggle">
                <button
                    className={`grid-btn carreira ${selectedGrid === 'carreira' ? 'active' : ''}`}
                    onClick={() => setSelectedGrid('carreira')}
                >
                    Carreira
                </button>
                <button
                    className={`grid-btn light ${selectedGrid === 'light' ? 'active' : ''}`}
                    onClick={() => setSelectedGrid('light')}
                >
                    Light
                </button>
                <button
                    className="grid-btn historico"
                    onClick={() => navigate('/historicopowerranking')}
                >
                    Histórico
                </button>
            </div>
            <div className="pr-cards-grid">
                {pilotosOrdenados.map((piloto) => {
                    const stats = resolveStats(piloto);
                    const defaults = {
                        performance: 60,
                        conduta: 100,
                        racecraft: 60,
                        overall: 60,
                        historico: 60,
                        power_ranking: 60,
                    };
                    const merged = { ...defaults, ...stats };

                    return (
                        <div key={`${piloto.id}-${normalizeName(piloto.nome)}`} className="pr-card-wrapper">
                            <div className="driver-card">
                                <div className="card-bg-layer"></div>
                                <div className="driver-photo">
                                    <DriverImage
                                        name={piloto.nome}
                                        gridType={piloto.grid || 'light'}
                                        season={prSeason}
                                    />
                                </div>
                                <div className="card-front-layer"></div>
                                <div className="card-info-overlay">
                                    <div className="card-pr-badge stat-pr">
                                        <span className="label"></span>
                                        <span className="value main-pr">{displayPilarInt('power_ranking', merged.power_ranking)}</span>
                                    </div>
                                    <div className="card-stat-row overall stat-overall">
                                        <span className="label"></span>
                                        <span className="value">{displayPilarInt('overall', merged.overall)}</span>
                                    </div>
                                    <div className="card-stat-row stat-performance">
                                        <span className="label"></span>
                                        <span className="value">{displayPilarInt('performance', merged.performance)}</span>
                                    </div>
                                    <div className="card-stat-row stat-racecraft">
                                        <span className="label"></span>
                                        <span className="value">{displayPilarInt('racecraft', merged.racecraft)}</span>
                                    </div>
                                    <div className="card-stat-row stat-conduta">
                                        <span className="label"></span>
                                        <span className="value">{displayPilarInt('conduta', merged.conduta)}</span>
                                    </div>
                                    <div className="card-stat-row stat-historico">
                                        <span className="label"></span>
                                    </div>
                                    <div className="historico-value">
                                        {displayPilarInt('historico', merged.historico)}
                                    </div>
                                    <div className="card-name-block">
                                        <div className="driver-name">
                                            {piloto.nome.split(' ')[0]}<br />
                                            <span>{piloto.nome.split(' ').slice(1).join(' ')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default PowerRanking;
