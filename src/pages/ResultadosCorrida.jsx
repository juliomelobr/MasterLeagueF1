import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';

function ResultadosCorrida() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [qualifyingData, setQualifyingData] = useState([]);
    const [raceData, setRaceData] = useState([]);
    const [fileName, setFileName] = useState('f3.08.csv');

    // Função para parsear CSV manualmente (lidando com seções)
    const parseCSV = (csvText) => {
        const lines = csvText.split('\n').map(line => line.trim());
        const qualifying = [];
        const race = [];
        let currentSection = null;

        for (const line of lines) {
            // Ignorar linhas vazias
            if (!line) continue;

            // Detectar seções
            if (line.toUpperCase().includes('QUALIFYING')) {
                currentSection = 'qualifying';
                continue;
            } else if (line.toUpperCase().includes('RACE')) {
                currentSection = 'race';
                continue;
            }

            // Processar dados da seção qualifying
            if (currentSection === 'qualifying') {
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 4 && parts[0] && !isNaN(parseInt(parts[0]))) {
                    qualifying.push({
                        posicao: parts[0],
                        piloto: parts[1],
                        equipe: parts[2],
                        tempo: parts[3]
                    });
                }
            } 
            // Processar dados da seção race
            else if (currentSection === 'race') {
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 5 && parts[0] && !isNaN(parseInt(parts[0]))) {
                    const codigo = parts[4];
                    let status = 'Sem Punição';
                    let statusColor = '#22C55E'; // Verde
                    
                    if (codigo === '1') {
                        status = 'Com Punição';
                        statusColor = '#F59E0B'; // Amarelo
                    } else if (codigo === '2') {
                        status = 'NC';
                        statusColor = '#EF4444'; // Vermelho
                    }

                    race.push({
                        posicao: parts[0],
                        piloto: parts[1],
                        equipe: parts[2],
                        melhorVolta: parts[3],
                        codigo: codigo,
                        status: status,
                        statusColor: statusColor
                    });
                }
            }
        }

        return { qualifying, race };
    };

    // Função para carregar dados do CSV
    const loadCSVData = async (filename) => {
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch(`/resultados/${filename}`);
            if (!response.ok) {
                throw new Error(`Erro ao carregar arquivo: ${response.status}`);
            }
            
            const csvText = await response.text();
            const { qualifying, race } = parseCSV(csvText);
            
            setQualifyingData(qualifying);
            setRaceData(race);
            setLoading(false);
        } catch (err) {
            console.error('Erro ao carregar CSV:', err);
            setError(`Erro ao carregar arquivo: ${err.message}`);
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCSVData(fileName);
    }, [fileName]);

    // Função para obter cor da equipe (similar ao usado em outras páginas)
    const getTeamColor = (teamName) => {
        const teamColors = {
            'Red Bull': '#1E41FF',
            'Mercedes': '#00D2BE',
            'Ferrari': '#DC143C',
            'McLaren': '#FF8700',
            'Aston Martin': '#00665E',
            'Alpine': '#0090FF',
            'Williams': '#005AFF',
            'Haas': '#FFFFFF',
            'RB': '#1E41FF',
            'Sauber': '#52C41A'
        };
        return teamColors[teamName] || '#94A3B8';
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{ textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        border: '4px solid rgba(6, 182, 212, 0.3)',
                        borderTop: '4px solid #06B6D4',
                        borderRadius: '50%',
                        margin: '0 auto 20px',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <p>Carregando resultados...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            padding: '40px 20px',
            color: 'white'
        }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '30px',
                    flexWrap: 'wrap',
                    gap: '20px'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '2.5rem',
                            fontWeight: '900',
                            margin: '0 0 10px 0',
                            background: 'linear-gradient(90deg, #06B6D4, #3B82F6)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            RESULTADOS DA CORRIDA
                        </h1>
                        <p style={{ color: '#94A3B8', margin: 0 }}>
                            Arquivo: {fileName}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            placeholder="f3.08.csv"
                            style={{
                                padding: '10px 15px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '2px solid rgba(6, 182, 212, 0.3)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.95rem',
                                outline: 'none',
                                minWidth: '150px'
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    loadCSVData(fileName);
                                }
                            }}
                        />
                        <button
                            onClick={() => loadCSVData(fileName)}
                            style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '0.95rem'
                            }}
                        >
                            🔄 Carregar
                        </button>
                        <button
                            onClick={() => navigate('/admin')}
                            style={{
                                padding: '10px 20px',
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '0.95rem'
                            }}
                        >
                            ← Voltar ao Admin
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#FCA5A5',
                        padding: '15px',
                        borderRadius: '10px',
                        marginBottom: '25px',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                        {error}
                    </div>
                )}

                {/* Qualifying Section */}
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{
                        fontSize: '1.8rem',
                        fontWeight: '800',
                        marginBottom: '20px',
                        color: '#06B6D4',
                        borderBottom: '2px solid rgba(6, 182, 212, 0.3)',
                        paddingBottom: '10px'
                    }}>
                        🏁 QUALIFYING
                    </h2>
                    
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse'
                        }}>
                            <thead>
                                <tr style={{
                                    background: 'rgba(6, 182, 212, 0.2)',
                                    borderBottom: '2px solid rgba(6, 182, 212, 0.3)'
                                }}>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'left',
                                        fontWeight: '700',
                                        color: '#06B6D4',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>Pos</th>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'left',
                                        fontWeight: '700',
                                        color: '#06B6D4',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>Piloto</th>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'left',
                                        fontWeight: '700',
                                        color: '#06B6D4',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>Equipe</th>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'right',
                                        fontWeight: '700',
                                        color: '#06B6D4',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>Tempo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {qualifyingData.map((row, index) => (
                                    <tr
                                        key={index}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <td style={{
                                            padding: '15px',
                                            fontWeight: '700',
                                            color: '#E2E8F0',
                                            fontSize: '1.1rem'
                                        }}>{row.posicao}</td>
                                        <td style={{
                                            padding: '15px',
                                            color: 'white',
                                            fontWeight: '600'
                                        }}>{row.piloto}</td>
                                        <td style={{
                                            padding: '15px',
                                            color: getTeamColor(row.equipe),
                                            fontWeight: '600'
                                        }}>{row.equipe}</td>
                                        <td style={{
                                            padding: '15px',
                                            textAlign: 'right',
                                            color: '#94A3B8',
                                            fontFamily: 'monospace',
                                            fontSize: '1rem'
                                        }}>{row.tempo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Race Section */}
                <div>
                    <h2 style={{
                        fontSize: '1.8rem',
                        fontWeight: '800',
                        marginBottom: '20px',
                        color: '#22C55E',
                        borderBottom: '2px solid rgba(34, 197, 94, 0.3)',
                        paddingBottom: '10px'
                    }}>
                        🏆 RACE
                    </h2>
                    
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse'
                        }}>
                            <thead>
                                <tr style={{
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    borderBottom: '2px solid rgba(34, 197, 94, 0.3)'
                                }}>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'left',
                                        fontWeight: '700',
                                        color: '#22C55E',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>Pos</th>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'left',
                                        fontWeight: '700',
                                        color: '#22C55E',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>Piloto</th>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'left',
                                        fontWeight: '700',
                                        color: '#22C55E',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>Equipe</th>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'right',
                                        fontWeight: '700',
                                        color: '#22C55E',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>Melhor Volta</th>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'center',
                                        fontWeight: '700',
                                        color: '#22C55E',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {raceData.map((row, index) => (
                                    <tr
                                        key={index}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <td style={{
                                            padding: '15px',
                                            fontWeight: '700',
                                            color: '#E2E8F0',
                                            fontSize: '1.1rem'
                                        }}>{row.posicao}</td>
                                        <td style={{
                                            padding: '15px',
                                            color: 'white',
                                            fontWeight: '600'
                                        }}>{row.piloto}</td>
                                        <td style={{
                                            padding: '15px',
                                            color: getTeamColor(row.equipe),
                                            fontWeight: '600'
                                        }}>{row.equipe}</td>
                                        <td style={{
                                            padding: '15px',
                                            textAlign: 'right',
                                            color: '#94A3B8',
                                            fontFamily: 'monospace',
                                            fontSize: '1rem'
                                        }}>{row.melhorVolta}</td>
                                        <td style={{
                                            padding: '15px',
                                            textAlign: 'center'
                                        }}>
                                            <span style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                fontSize: '0.85rem',
                                                fontWeight: '700',
                                                background: `${row.statusColor}20`,
                                                color: row.statusColor,
                                                border: `1px solid ${row.statusColor}40`
                                            }}>
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ResultadosCorrida;

