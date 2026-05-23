import { useEffect, useMemo, useState } from 'react';
import { getAllObjetivos } from '../utils/powerRankingObjectives';
import { supabase } from '../supabaseClient';
import '../index.css';

const STORAGE_KEY = 'prObjetivosClassificacao';

function PowerRankingObjetivos() {
    const objetivos = useMemo(() => getAllObjetivos(), []);
    const [mapa, setMapa] = useState({});
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const carregarClassificacao = async () => {
            setLoading(true);
            let next = {};

            try {
                const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                if (stored && typeof stored === 'object') {
                    next = stored;
                }
            } catch {
                next = {};
            }

            const { data, error } = await supabase
                .from('objetivos_classificacao')
                .select('objetivo_texto, classificacao');

            if (!error && Array.isArray(data) && data.length) {
                const dbMap = {};
                data.forEach((row) => {
                    if (row?.objetivo_texto && row?.classificacao) {
                        dbMap[row.objetivo_texto] = row.classificacao;
                    }
                });
                next = { ...next, ...dbMap };
            }

            if (isMounted) {
                setMapa(next);
                if (Object.keys(next).length > 0) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                }
                if (error) {
                    setStatus('Erro ao carregar do banco.');
                }
                setLoading(false);
            }
        };

        carregarClassificacao();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleChange = async (objetivo, value) => {
        const next = { ...mapa, [objetivo]: value };
        setMapa(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event('prObjetivosClassificacaoUpdated'));
        setStatus('Salvando...');

        const { data: sessionData } = await supabase.auth.getSession();
        const userEmail = sessionData?.session?.user?.email || null;

        const { error } = await supabase
            .from('objetivos_classificacao')
            .upsert({
                objetivo_texto: objetivo,
                classificacao: value,
                updated_at: new Date().toISOString(),
                updated_by_email: userEmail
            }, {
                onConflict: 'objetivo_texto'
            });

        if (error) {
            setStatus('Erro ao salvar no banco.');
            return;
        }

        setStatus('Salvo.');
    };

    return (
        <div style={{
            minHeight: '100vh',
            padding: '120px 24px 60px',
            background: '#0B1220',
            color: '#F8FAFC'
        }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <h1 style={{ textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 10 }}>
                    Objetivos - Classificação (Admin)
                </h1>
                <p style={{ color: '#94A3B8', marginBottom: 8 }}>
                    Defina manualmente se cada objetivo é qualitativo ou quantitativo.
                </p>
                <p style={{ color: '#94A3B8', marginBottom: 30, minHeight: 20 }}>
                    {loading ? 'Carregando...' : status}
                </p>

                <div style={{
                    display: 'grid',
                    gap: 12
                }}>
                    {objetivos.map((objetivo) => (
                        <div key={objetivo} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 220px',
                            gap: 16,
                            alignItems: 'center',
                            padding: '14px 16px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 12
                        }}>
                            <div style={{ lineHeight: 1.4 }}>{objetivo}</div>
                            <select
                                value={mapa[objetivo] || ''}
                                onChange={(e) => handleChange(objetivo, e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#111827',
                                    color: '#F8FAFC',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: 10,
                                    textTransform: 'uppercase',
                                    fontWeight: 700,
                                    letterSpacing: 0.5
                                }}
                            >
                                <option value="">Não definido</option>
                                <option value="qualitativo">Qualitativo</option>
                                <option value="quantitativo">Quantitativo</option>
                            </select>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PowerRankingObjetivos;
