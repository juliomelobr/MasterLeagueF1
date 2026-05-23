import { useState, useEffect, useMemo } from 'react';
import { useLeagueData } from '../hooks/useLeagueData';
import { supabase } from '../supabaseClient';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, Cell, ReferenceLine, LabelList
} from 'recharts';
import '../index.css';

// --- CONSTANTES DE PONTUAÇÃO ---
const POINTS_RACE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const POINTS_SPRINT = [8, 7, 6, 5, 4, 3, 2, 1];

const getTeamColor = (teamName) => {
    if(!teamName) return "#94A3B8";
    const t = teamName.toLowerCase();
    if(t.includes("red bull")) return "#3671C6"; 
    if(t.includes("ferrari")) return "#E8002D"; 
    if(t.includes("mercedes")) return "#27F4D2"; 
    if(t.includes("mclaren")) return "#FF8000"; 
    if(t.includes("aston")) return "#229971"; 
    if(t.includes("alpine")) return "#FD4BC7"; 
    if(t.includes("haas")) return "#B6BABD"; 
    if(t.includes("williams")) return "#64C4FF"; 
    if(t.includes("stake") || t.includes("sauber")) return "#52E252"; 
    if(t.includes("vcarb") || t.includes("racing bulls")) return "#6692FF";
    return "#94A3B8";
};

const CustomLegend = ({ payload }) => {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginTop: '15px' }}>
            {payload.map((entry, index) => {
                const isDashed = entry.payload.strokeDasharray !== "0";
                return (
                    <div key={`legend-${index}`} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#CBD5E1' }}>
                        <div style={{ width: '25px', height: '0', borderTop: `3px ${isDashed ? 'dashed' : 'solid'} ${entry.color}`, marginRight: '8px' }}></div>
                        <span style={{fontWeight: '700'}}>{entry.value}</span>
                    </div>
                );
            })}
        </div>
    );
};

function Telemetria() {
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const { rawCarreira, rawLight, seasons, loading } = useLeagueData();
    const [gridType, setGridType] = useState('carreira');
    const [selectedSeason, setSelectedSeason] = useState(0);
    const [showCharts, setShowCharts] = useState(false);
    const [punicoes, setPunicoes] = useState({});

    // Função auxiliar para normalizar nome do piloto (usada para comparação de punições)
    const normalizeNomePiloto = (nome) => {
        if (!nome) return '';
        return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, ' ').toLowerCase();
    };

    // Função auxiliar para extrair número de uma string (ex: "Etapa 8" -> 8)
    const extrairNumero = (str) => {
        if (!str && str !== 0) return 0;
        const texto = String(str).trim();
        const num = parseInt(texto);
        if (!isNaN(num)) return num;
        const match = texto.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    };

    const normalizeStr = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : "";

    // Buscar punições do Supabase (vereditos finalizados)
    useEffect(() => {
        const buscarPunicoes = async () => {
            const seasonValido = selectedSeason && parseInt(selectedSeason) > 0;
            if (!seasonValido) { setPunicoes({}); return; }
            try {
                const { data, error } = await supabase
                    .from('notificacoes_admin')
                    .select('dados')
                    .eq('tipo', 'nova_acusacao');

                if (error) {
                    setPunicoes({});
                    return;
                }

                const punicoesMap = {};
                (data || []).forEach((item) => {
                    const veredito = item.dados?.veredito;
                    const acusado = item.dados?.acusado;
                    const etapa = item.dados?.etapa || {};
                    const temporadaLance = etapa?.season || etapa?.temporada || item.dados?.season || item.dados?.temporada || null;
                    const gridLance = etapa?.grid || item.dados?.grid || null;
                    const temporadaCompativel = temporadaLance ? parseInt(temporadaLance) === parseInt(selectedSeason) : true;
                    const gridCompativel = gridLance ? gridLance === gridType : true;
                    
                    const pontosPerdidos = parseInt(veredito?.pontosPerdidos, 10) || 0;
                    const vereditoFinalizado = item.dados?.status === 'analise_realizada' || Boolean(veredito?.dataVeredito);
                    if (vereditoFinalizado && veredito && acusado && acusado.nome && temporadaCompativel && gridCompativel && pontosPerdidos > 0) {
                        const nomePilotoNormalizado = normalizeNomePiloto(acusado.nome);
                        if (pontosPerdidos > 0 && nomePilotoNormalizado) {
                            punicoesMap[nomePilotoNormalizado] = (punicoesMap[nomePilotoNormalizado] || 0) + pontosPerdidos;
                        }
                    }
                });
                setPunicoes(punicoesMap);
            } catch (err) {
                console.error('❌ [Telemetria] Erro ao buscar punições:', err);
                setPunicoes({});
            }
        };
        buscarPunicoes();
    }, [selectedSeason, gridType]);

    useEffect(() => {
        if (!loading && seasons.length > 0 && selectedSeason === 0) {
            setSelectedSeason(seasons[0]);
            setShowCharts(true);
        }
    }, [seasons, loading, selectedSeason]);

    useEffect(() => {
        setShowCharts(false);
        const timer = setTimeout(() => setShowCharts(true), 100);
        return () => clearTimeout(timer);
    }, [gridType, selectedSeason]);

    const { evolutionData, qualyData, racePaceData, topDriversList } = useMemo(() => {
        if (!showCharts || (gridType === 'light' && parseInt(selectedSeason) < 16)) {
            return { evolutionData: [], qualyData: [], racePaceData: [], topDriversList: [] };
        }

        const data = gridType === 'carreira' ? rawCarreira : rawLight;
        if (!data || data.length === 0 || !selectedSeason) return { evolutionData: [], qualyData: [], racePaceData: [], topDriversList: [] };

        console.log(`📊 [Telemetria] DEBUG START`);
        console.log(`📊 [Telemetria] gridType: ${gridType}`);
        console.log(`📊 [Telemetria] selectedSeason: ${selectedSeason}`);
        console.log(`📊 [Telemetria] Total lines: ${data.length}`);
        
        const targetS = extrairNumero(selectedSeason);
        const driverMap = new Map();
        const roundsMap = new Set();

        let matchedLines = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const s = extrairNumero(row[3]);
            
            if (s !== targetS) continue;
            matchedLines++;

            const name = row[9];
            const round = extrairNumero(row[4]);
            
            if (!name || round <= 0) continue;

            const qualy = parseInt(row[6]);
            const racePos = parseInt(row[8]);
            const sprintPos = parseInt(row[7]);
            
            // Cálculo robusto de pontos (idêntico ao Standings.jsx)
            let points = 0;
            if (s >= 20) {
                if (row.length > 15 && row[15] !== undefined && row[15] !== '') {
                    points = parseFloat(String(row[15]).replace(',', '.').replace(/\s/g, ''));
                    if (isNaN(points)) points = 0;
                }
                // Fallback: calcular pela posição da corrida se não encontrou na coluna 15
                if (points === 0 && racePos >= 1 && racePos <= 10) {
                    points = POINTS_RACE[racePos - 1];
                }
                // Sempre somar pontos da Sprint (não estão na coluna 15)
                if (sprintPos >= 1 && sprintPos <= 8) {
                    points += POINTS_SPRINT[sprintPos - 1];
                }
            } else {
                if (racePos >= 1 && racePos <= 10) points = POINTS_RACE[racePos - 1];
                if (sprintPos >= 1 && sprintPos <= 8) points += POINTS_SPRINT[sprintPos - 1];
            }

            roundsMap.add(round);

            if (!driverMap.has(name)) {
                driverMap.set(name, { 
                    name, team: row[10], totalPoints: 0, pointsHistory: {}, 
                    qualySum: 0, raceSum: 0, deltaSum: 0, racesCount: 0 
                });
            }

            const driver = driverMap.get(name);
            if (!isNaN(qualy) && !isNaN(racePos)) {
                driver.qualySum += qualy;
                driver.raceSum += racePos;
                driver.deltaSum += (qualy - racePos); 
                driver.racesCount++;
            }

            driver.totalPoints += points;
            driver.pointsHistory[round] = driver.totalPoints;
        }

        console.log(`📊 [Telemetria] Processando dados para ${gridType} S${selectedSeason}`);

        // Aplicar punições antes de definir o Top 5
        driverMap.forEach((driver, name) => {
            const nomeNormalizado = normalizeNomePiloto(name);
            const pontosPerdidos = punicoes[nomeNormalizado] || 0;
            driver.totalPoints -= pontosPerdidos;
        });

        const sortedDrivers = Array.from(driverMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);
        const topDrivers = sortedDrivers.slice(0, 5); 
        const rounds = Array.from(roundsMap).sort((a, b) => a - b);
        
        const evolData = rounds.map(r => {
            const point = { name: `R${r}` };
            for (const d of topDrivers) {
                for (let i = r; i >= 1; i--) {
                    if (d.pointsHistory[i] !== undefined) {
                        point[d.name] = d.pointsHistory[i];
                        break;
                    }
                }
            }
            return point;
        });

        const consistentDrivers = sortedDrivers.filter(d => d.racesCount > 0).slice(0, 20);

        const qData = consistentDrivers.map(d => {
            const avgQualy = d.qualySum / d.racesCount;
            // Ritmo de Classificação: baixa de 1 em 1% (1º=100%, 2º=99%, ..., 20º=81%)
            const score = Math.max(81, Math.min(100, Math.ceil(101 - avgQualy)));
            return { name: d.name, score: score, display: `${score}%`, avgPos: avgQualy.toFixed(1), team: d.team };
        }).sort((a, b) => b.score - a.score);

        // Calcular deltas e posições médias de corrida e largada
        const deltas = consistentDrivers.map(d => {
            const avgDelta = d.deltaSum / d.racesCount;
            const avgRace = d.raceSum / d.racesCount; // Posição média na corrida
            const avgQualy = d.qualySum / d.racesCount; // Posição média na largada
            return { 
                name: d.name, 
                delta: parseFloat(avgDelta.toFixed(1)), 
                avgRace: parseFloat(avgRace.toFixed(1)),
                avgQualy: parseFloat(avgQualy.toFixed(1)),
                team: d.team 
            };
        });
        
        // Função para converter delta em percentual melhorado
        // Considera: posição final, ganho/perda de posições, e capacidade de manter posições na frente
        const deltaToPercent = (delta, avgRace, avgQualy) => {
            // Base da nota pela posição final (P1=100, P2=98, P3=96...)
            const posScore = Math.max(0, 100 - (avgRace - 1) * 2);
            
            // Bônus por manter posição quando está na frente (delta = 0)
            // Quanto mais na frente, maior o mérito de manter
            let bonusManterPosicao = 0;
            if (delta === 0) {
                // Manter posição no Top 3 = muito mérito
                if (avgQualy <= 3) bonusManterPosicao = 5;
                // Manter posição no Top 5 = bom mérito
                else if (avgQualy <= 5) bonusManterPosicao = 3;
                // Manter posição no Top 10 = algum mérito
                else if (avgQualy <= 10) bonusManterPosicao = 1;
            }
            
            // Bônus por ganhar posições (sempre positivo)
            let bonusGanharPosicoes = 0;
            if (delta > 0) {
                // Ganhar posições sempre é bom, mas ganhar muitas é ainda melhor
                bonusGanharPosicoes = delta * 2.5;
            }
            
            // Penalidade por perder posições (ajustada pela posição de largada)
            let penalidadePerderPosicoes = 0;
            if (delta < 0) {
                const posicoesPerdidas = Math.abs(delta);
                
                // Se está no Top 3 e perde poucas posições, penalidade menor
                if (avgQualy <= 3) {
                    if (posicoesPerdidas === 1) penalidadePerderPosicoes = -1; // Perder 1 posição no top 3 = quase nada
                    else if (posicoesPerdidas === 2) penalidadePerderPosicoes = -3; // Perder 2 posições = leve
                    else penalidadePerderPosicoes = posicoesPerdidas * 2; // Perder 3+ = penalidade normal
                }
                // Se está no Top 5 e perde poucas posições, penalidade moderada
                else if (avgQualy <= 5) {
                    if (posicoesPerdidas === 1) penalidadePerderPosicoes = -2;
                    else if (posicoesPerdidas === 2) penalidadePerderPosicoes = -4;
                    else penalidadePerderPosicoes = posicoesPerdidas * 2.5;
                }
                // Se está no Top 10, penalidade normal
                else if (avgQualy <= 10) {
                    penalidadePerderPosicoes = posicoesPerdidas * 2.5;
                }
                // Se está fora do Top 10, penalidade maior
                else {
                    penalidadePerderPosicoes = posicoesPerdidas * 3;
                }
            }
            
            let finalScore = posScore + bonusManterPosicao + bonusGanharPosicoes + penalidadePerderPosicoes;
            
            // Aplicar tetos baseados na realidade da corrida
            if (avgRace > 3 && finalScore > 95) finalScore = 95;
            if (avgRace > 10 && finalScore > 85) finalScore = 85;
            if (avgRace > 15 && finalScore > 80) finalScore = 80;
            
            return Math.round(Math.max(0, Math.min(100, finalScore)));
        };
        
        const rData = deltas.map(d => {
            const percent = deltaToPercent(d.delta, d.avgRace, d.avgQualy);
            return { 
                name: d.name, 
                delta: d.delta, 
                avgRace: d.avgRace,
                percent: percent,
                display: `${percent}%`,
                team: d.team 
            };
        }).sort((a, b) => b.percent - a.percent);

        return { evolutionData: evolData, qualyData: qData, racePaceData: rData, topDriversList: topDrivers };

    }, [gridType, selectedSeason, rawCarreira, rawLight, showCharts, punicoes]);

    if (loading) return <div style={{padding:'100px', textAlign:'center', color:'white'}}>Carregando Telemetria...</div>;

    return (
        <div className="page-wrapper">
            
            {/* HEADER */}
            <div className="analises-hero">
                <div className="analises-content" style={{textAlign: 'center'}}>
                    <h1 className="hero-title" style={{fontSize:'3rem', marginBottom:'10px'}}>TELEMETRIA</h1>
                    <p className="hero-subtitle" style={{margin:'0 auto 30px'}}>Análise avançada de desempenho e consistência.</p>

                    <div style={{display:'flex', gap:'15px', justifyContent:'center', flexWrap:'wrap'}}>
                         <div className="grid-toggle">
                            <button onClick={() => setGridType('carreira')} className={`grid-btn ${gridType === 'carreira' ? 'active-carreira' : ''}`}>CARREIRA</button>
                            <button onClick={() => setGridType('light')} className={`grid-btn ${gridType === 'light' ? 'active-light' : ''}`}>LIGHT</button>
                        </div>
                        <select className="season-select" value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} style={{minWidth:'150px'}}>
                            {seasons.map(s => <option key={s} value={s}>Temporada {s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="hub-container" style={{marginTop:'-40px', position:'relative', zIndex:2}}>
                
                {/* AVISO LIGHT S16 */}
                {(gridType === 'light' && parseInt(selectedSeason) < 16) ? (
                    <div style={{textAlign: 'center', padding: '80px 20px', background: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '600px', margin: '40px auto', boxShadow: '0 10px 40px rgba(0,0,0,0.3)'}}>
                        <div style={{fontSize: '4rem', marginBottom: '20px'}}>🚧</div>
                        <h2 style={{color: 'white', marginBottom: '15px', fontSize: '1.8rem', fontWeight: '900', textTransform:'uppercase'}}>TEMPORADA NÃO DISPONÍVEL</h2>
                        <p style={{color: '#94A3B8', marginBottom: '30px', fontSize: '1.1rem'}}>O <strong>Grid Light</strong> teve início apenas na <strong>Temporada 16</strong>.</p>
                        <button onClick={() => setSelectedSeason(16)} className="btn-primary" style={{textDecoration:'none', cursor:'pointer', border:'none'}}>IR PARA TEMPORADA 16</button>
                    </div>
                ) : (
                    <>
                        {/* GRÁFICO 1 (EVOLUÇÃO) - Margem top adicionada */}
                        <div className="chart-card" style={{marginTop: '40px'}}>
                            <div className="chart-header">
                                <h3>DISPUTA PELO TÍTULO (TOP 5)</h3>
                                <span>Evolução de pontos acumulados por etapa</span>
                            </div>
                            <div style={{ width: '100%', height: 500 }}> 
                                <ResponsiveContainer>
                                    <LineChart data={evolutionData} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="name" stroke="#94A3B8" />
                                        <YAxis stroke="#94A3B8" />
                                        <Tooltip content={<div style={{display: 'none'}} />} />
                                        <Legend content={<CustomLegend />} verticalAlign="bottom" />
                                        {topDriversList.map((driver) => {
                                            const isSecondDriver = new Set([...topDriversList.slice(0, topDriversList.indexOf(driver))].map(d => d.team)).has(driver.team);
                                            return (
                                                <Line 
                                                    key={driver.name} type="monotone" dataKey={driver.name} 
                                                    stroke={getTeamColor(driver.team)} strokeWidth={3}
                                                    strokeDasharray={isSecondDriver ? "5 5" : "0"}
                                                    dot={{r: 4}} activeDot={{ r: 6 }} 
                                                />
                                            );
                                        })}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CONTAINER LADO A LADO */}
                        <div className="chart-grid-row" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                            
                            {/* GRÁFICO 2 */}
                            <div className="chart-card" style={{width: '100%'}}>
                                <div className="chart-header">
                                    <h3>RITMO DE CLASSIFICAÇÃO</h3>
                                    <span>Potência em volta rápida (0% a 100%)</span>
                                </div>
                                <div style={{ width: '100%', height: 600 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={qualyData} layout="vertical" margin={{top: 5, right: 50, left: 40, bottom: 5}}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                            <XAxis type="number" domain={[0, 100]} hide />
                                            <YAxis dataKey="name" type="category" stroke="white" width={100} tick={{fontSize: 11}} interval={0} />
                                            <Tooltip content={<div style={{display: 'none'}} />} />
                                            <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]} barSize={15}>
                                                <LabelList dataKey="display" position="right" fill="white" fontSize={11} fontWeight={800} />
                                                {qualyData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={getTeamColor(entry.team)} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* GRÁFICO 3 */}
                            <div className="chart-card" style={{width: '100%'}}>
                                <div className="chart-header">
                                    <h3>RITMO DE CORRIDA</h3>
                                    <span>Percentual de ritmo (0% a 100%)</span>
                                </div>
                                <div style={{ width: '100%', height: 600 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={racePaceData} layout="vertical" margin={{top: 5, right: 50, left: 80, bottom: 5}}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                            <XAxis type="number" domain={[0, 100]} hide />
                                            <YAxis dataKey="name" type="category" stroke="white" width={140} tick={{fontSize: 11}} interval={0} />
                                            <Tooltip content={<div style={{display: 'none'}} />} />
                                            <Bar dataKey="percent" name="Percentual" barSize={15} radius={[0, 4, 4, 0]}>
                                                {racePaceData.map((entry, index) => {
                                                    // Verde para quem ganha posições, amarelo/laranja para quem mantém/perde poucas nos top 5, vermelho para quem perde muitas
                                                    let color = '#EF4444'; // Vermelho padrão
                                                    if (entry.delta >= 0) {
                                                        color = '#10B981'; // Verde para ganhar posições
                                                    } else if (entry.percent >= 70) {
                                                        color = '#F59E0B'; // Amarelo/laranja para bom ritmo (perde poucas, especialmente nos top 5)
                                                    } else if (entry.percent >= 50) {
                                                        color = '#F97316'; // Laranja para ritmo médio
                                                    }
                                                    return <Cell key={`cell-${index}`} fill={color} />;
                                                })}
                                                <LabelList 
                                                    dataKey="display" 
                                                    position="right" 
                                                    fill="white" 
                                                    fontSize={11} 
                                                    fontWeight={800}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default Telemetria;