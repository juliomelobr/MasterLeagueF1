/**
 * Lista todas as corridas de um piloto (equipe e grid por etapa).
 * Fontes: Google Sheets CSV (Carreira + Light), mesma estrutura do app.
 *
 * Uso (no terminal, na pasta do projeto):
 *   node scripts/listar-corridas-piloto.js "Julio Melo"
 *   node scripts/listar-corridas-piloto.js "Nome do Piloto"
 *
 * Estrutura da planilha (row): [0]=data, [3]=temporada, [4]=etapa, [5]=GP, [9]=piloto, [10]=equipe
 */

import Papa from 'papaparse';

const PROXY_URL = 'https://corsproxy.io/?';
const LINKS = {
  carreira: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=321791996&single=true&output=csv',
  light: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1687781433&single=true&output=csv',
};

function parseCSV(text) {
  const result = Papa.parse(text, { header: false, skipEmptyLines: true });
  const rows = (result.data || []).slice(1); // pular cabeçalho
  return rows;
}

function normalizarNome(nome) {
  return (nome || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function fetchCSV(url) {
  const res = await fetch(PROXY_URL + encodeURIComponent(url));
  const text = await res.text();
  return parseCSV(text);
}

async function main() {
  const nomePiloto = process.argv.slice(2).join(' ') || 'Julio Melo';
  const nomeNorm = normalizarNome(nomePiloto);

  console.log('Buscando dados (Carreira e Light)...');
  let rowsC, rowsL;
  try {
    [rowsC, rowsL] = await Promise.all([
      fetchCSV(LINKS.carreira),
      fetchCSV(LINKS.light),
    ]);
  } catch (err) {
    console.error('Erro ao buscar planilhas:', err.message);
    process.exit(1);
  }

  const entradas = [];

  [
    [rowsC, 'Carreira'],
    [rowsL, 'Light'],
  ].forEach(([rows, grid]) => {
    (rows || []).forEach((row) => {
      const piloto = (row[9] || '').trim();
      if (!piloto) return;
      if (normalizarNome(piloto) !== nomeNorm) return;
      const temporada = row[3] != null ? String(row[3]).trim() : '';
      const etapa = row[4] != null ? String(row[4]).trim() : '';
      const gp = (row[5] || '').trim() || '-';
      const equipe = (row[10] || '').trim() || '-';
      const data = (row[0] || '').trim() || '';
      entradas.push({
        temporada,
        grid,
        etapa,
        gp,
        equipe,
        data,
      });
    });
  });

  // Ordenar por temporada e etapa
  entradas.sort((a, b) => {
    const tA = parseInt(a.temporada, 10) || 0;
    const tB = parseInt(b.temporada, 10) || 0;
    if (tA !== tB) return tA - tB;
    const rA = String(a.etapa).replace(/\D/g, '') || '0';
    const rB = String(b.etapa).replace(/\D/g, '') || '0';
    return parseInt(rA, 10) - parseInt(rB, 10);
  });

  console.log('\n--- Corridas de:', nomePiloto, '---\n');
  if (entradas.length === 0) {
    console.log('Nenhuma corrida encontrada para este piloto.');
    return;
  }

  console.log('Temporada | Grid     | Etapa | GP           | Equipe');
  console.log('---------|----------|-------|--------------|--------');
  entradas.forEach((e) => {
    const temp = (e.temporada || '-').padEnd(9);
    const grid = (e.grid || '-').padEnd(8);
    const etapa = (e.etapa || '-').padEnd(5);
    const gp = (e.gp || '-').slice(0, 12).padEnd(12);
    const equipe = e.equipe || '-';
    console.log(`${temp} | ${grid} | ${etapa} | ${gp} | ${equipe}`);
  });

  console.log('\nTotal:', entradas.length, 'participação(ões).');
  const porEquipe = {};
  entradas.forEach((e) => {
    const eq = e.equipe || '(sem equipe)';
    porEquipe[eq] = (porEquipe[eq] || 0) + 1;
  });
  console.log('\nPor equipe:');
  Object.entries(porEquipe)
    .sort((a, b) => b[1] - a[1])
    .forEach(([eq, n]) => console.log('  -', eq + ':', n));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
