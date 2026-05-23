import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import Dashboard from './Dashboard';
import '../index.css';

const normalizeGrid = (grid) => {
    const g = String(grid || '').trim().toLowerCase();
    if (g.includes('carreira')) return 'carreira';
    if (g.includes('light')) return 'light';
    return 'outros';
};

export default function MotorhomeMaster() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pilotos, setPilotos] = useState([]);
    const [gridFilter, setGridFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedEmail, setSelectedEmail] = useState('');

    useEffect(() => {
        let cancelled = false;

        const loadPilotos = async () => {
            setLoading(true);
            setError('');
            try {
                const { data, error: fetchError } = await supabase
                    .from('pilotos')
                    .select('id, nome, email, grid, status, tipo_piloto, equipe')
                    .not('email', 'is', null)
                    .order('nome');

                if (fetchError) throw fetchError;

                const ativos = (data || []).filter((p) => {
                    const status = String(p?.status || '').trim().toLowerCase();
                    const tipo = String(p?.tipo_piloto || '').trim().toLowerCase();
                    if (tipo.includes('ex-piloto')) return false;
                    if (!status) return true;
                    return status === 'ativo' || status === 'active';
                });

                if (cancelled) return;
                setPilotos(ativos);
            } catch (err) {
                if (cancelled) return;
                setError(err?.message || 'Erro ao carregar pilotos');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadPilotos();
        return () => { cancelled = true; };
    }, []);

    const filteredPilotos = useMemo(() => {
        const term = search.trim().toLowerCase();
        return pilotos.filter((p) => {
            const gridNorm = normalizeGrid(p?.grid);
            const okGrid = gridFilter === 'all' ? true : gridNorm === gridFilter;
            const okSearch = term
                ? String(p?.nome || '').toLowerCase().includes(term) || String(p?.email || '').toLowerCase().includes(term)
                : true;
            return okGrid && okSearch;
        });
    }, [pilotos, gridFilter, search]);

    useEffect(() => {
        if (!filteredPilotos.length) {
            setSelectedEmail('');
            return;
        }

        const exists = filteredPilotos.some((p) => p.email === selectedEmail);
        if (!exists) {
            setSelectedEmail(filteredPilotos[0].email);
        }
    }, [filteredPilotos, selectedEmail]);

    const selectedPilot = filteredPilotos.find((p) => p.email === selectedEmail) || null;

    return (
        <div style={{ minHeight: '100vh', background: '#0B1120', color: '#F8FAFC', paddingTop: '80px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.5px' }}>MOTORHOME MASTER</h1>
                <p style={{ marginTop: '8px', color: '#94A3B8' }}>
                    Selecione o grid e o piloto para visualizar o Motorhome em modo leitura.
                </p>

                <div style={{
                    marginTop: '16px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '10px'
                }}>
                    <select
                        value={gridFilter}
                        onChange={(e) => setGridFilter(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F8FAFC' }}
                    >
                        <option value="all">Todos os grids</option>
                        <option value="carreira">Carreira</option>
                        <option value="light">Light</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Buscar piloto por nome ou e-mail"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F8FAFC' }}
                    />

                    <select
                        value={selectedEmail}
                        onChange={(e) => setSelectedEmail(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F8FAFC' }}
                        disabled={!filteredPilotos.length}
                    >
                        {!filteredPilotos.length && <option value="">Nenhum piloto encontrado</option>}
                        {filteredPilotos.map((p) => (
                            <option key={p.id || p.email} value={p.email}>
                                {p.nome} ({normalizeGrid(p.grid)})
                            </option>
                        ))}
                    </select>
                </div>

                {loading && <p style={{ marginTop: '14px', color: '#94A3B8' }}>Carregando pilotos...</p>}
                {!loading && error && <p style={{ marginTop: '14px', color: '#FCA5A5' }}>{error}</p>}

                {!loading && selectedPilot && (
                    <div style={{ marginTop: '14px', color: '#CBD5E1', fontSize: '0.9rem' }}>
                        Visualizando: <strong>{selectedPilot.nome}</strong> ({normalizeGrid(selectedPilot.grid)}) - {selectedPilot.email}
                    </div>
                )}
            </div>

            {selectedEmail && (
                <Dashboard
                    key={selectedEmail}
                    isReadOnly={true}
                    pilotoEmail={selectedEmail}
                />
            )}
        </div>
    );
}
