#!/usr/bin/env node
/**
 * Gera PNGs de TOP 10 (1080×1500) e Vencedor (1080×1350) via Playwright.
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const PREVIEW_URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const OUTPUT_ROOT = resolve(process.cwd(), 'public/highlights');
const TOP10_MANIFEST_PATH = resolve(OUTPUT_ROOT, 'top10-manifest.json');
const WINNER_MANIFEST_PATH = resolve(OUTPUT_ROOT, 'winner-manifest.json');

const log = (...args) => console.log('[generate-highlights]', ...args);
const err = (...args) => console.error('[generate-highlights]', ...args);

async function loadStageList(page, listUrl, listSelector) {
    await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('body[data-snapshot-list-ready="true"]', { timeout: 60_000 });
    const listText = await page.locator(listSelector).innerText();
    return JSON.parse(listText);
}

async function captureStage(page, { url, stageSelector, filePath }) {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('body[data-snapshot-ready="true"]', { timeout: 60_000 });
    await page.waitForTimeout(200);

    const stageEl = await page.$(stageSelector);
    if (!stageEl) throw new Error(`${stageSelector} não encontrado`);

    await mkdir(dirname(filePath), { recursive: true });
    await stageEl.screenshot({ path: filePath, type: 'png', omitBackground: false });
}

async function generateBatch(page, {
    label,
    listUrl,
    listSelector,
    buildUrl,
    stageSelector,
    buildFileName,
    buildPublicPath,
}) {
    log(`Carregando lista ${label}…`);
    let stages = [];
    try {
        stages = await loadStageList(page, listUrl, listSelector);
    } catch (e) {
        err(`Falha ao carregar lista ${label}:`, e.message);
        return [];
    }

    if (!Array.isArray(stages) || stages.length === 0) {
        log(`Nenhuma etapa elegível para ${label}.`);
        return [];
    }

    log(`${label}: ${stages.length} etapa(s)`);
    const generated = [];

    for (const stage of stages) {
        const url = buildUrl(stage);
        const fileName = buildFileName(stage);
        const filePath = resolve(OUTPUT_ROOT, stage.gpSlug, fileName);
        log(`→ [${label}] ${url}`);
        try {
            await captureStage(page, { url, stageSelector, filePath });
            log(`  ✓ ${filePath}`);
            generated.push({
                ...stage,
                file: buildPublicPath(stage),
            });
        } catch (e) {
            err(`Falha [${label}] ${url}:`, e.message);
        }
    }

    return generated;
}

async function main() {
    log(`Preview URL: ${PREVIEW_URL}`);
    log(`Output dir: ${OUTPUT_ROOT}`);

    const browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({
        viewport: { width: 1080, height: 1500 },
        deviceScaleFactor: 2,
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
    });
    const page = await context.newPage();

    page.on('pageerror', (e) => err('pageerror:', e.message));

    const top10Generated = await generateBatch(page, {
        label: 'TOP 10',
        listUrl: `${PREVIEW_URL}/snapshot/top10/list`,
        listSelector: '#top10-list',
        buildUrl: (s) => `${PREVIEW_URL}/snapshot/top10/${s.grid}/${s.season}/${s.round}`,
        stageSelector: '#top10-snapshot-stage',
        buildFileName: (s) => `top10-${s.grid}.png`,
        buildPublicPath: (s) => `/highlights/${s.gpSlug}/top10-${s.grid}.png`,
    });

    const winnerGenerated = await generateBatch(page, {
        label: 'Vencedor',
        listUrl: `${PREVIEW_URL}/snapshot/winner/list`,
        listSelector: '#winner-list',
        buildUrl: (s) => `${PREVIEW_URL}/snapshot/winner/${s.grid}/${s.season}/${s.round}`,
        stageSelector: '#winner-snapshot-stage',
        buildFileName: (s) => `winner-${s.grid}.png`,
        buildPublicPath: (s) => `/highlights/${s.gpSlug}/winner-${s.grid}.png`,
    });

    await mkdir(OUTPUT_ROOT, { recursive: true });
    const generatedAt = new Date().toISOString();

    await writeFile(
        TOP10_MANIFEST_PATH,
        JSON.stringify({ generatedAt, stages: top10Generated }, null, 2),
    );
    await writeFile(
        WINNER_MANIFEST_PATH,
        JSON.stringify({ generatedAt, stages: winnerGenerated }, null, 2),
    );

    log(`Manifest TOP 10: ${TOP10_MANIFEST_PATH}`);
    log(`Manifest Vencedor: ${WINNER_MANIFEST_PATH}`);

    await browser.close();
    log(`Done. TOP10 ${top10Generated.length} · Vencedor ${winnerGenerated.length}`);
}

main().catch((e) => {
    err('Erro fatal:', e);
    process.exit(1);
});
