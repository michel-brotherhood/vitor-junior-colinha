import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const real = JSON.parse(readFileSync(new URL('../data/candidatos.json', import.meta.url), 'utf8'));
const fx = JSON.parse(readFileSync(new URL('../tests/fixtures/candidatos-teste.json', import.meta.url), 'utf8'));
// Base de teste = registro real do RJ/6 (Vitor Júnior, fixo) + fixture sintética reposicionada como
// deputados estaduais (5 dígitos) + cargos que a fixture não cobre.
const estaduais = { candidatos: fx['RJ/6'].candidatos.map(c => ({ ...c, numero: c.numero + '0' })) };
const testData = { ...fx, 'RJ/6': real['RJ/6'], 'RJ/7': estaduais, 'RJ/3': { candidatos: [] } };

async function withFixture(page) {
  await page.route('**/data/candidatos.json', r => r.fulfill({ json: testData }));
}
const inp = (page, k) => page.locator('#in-' + k);
const ready = page => expect(inp(page, 'de')).toBeEnabled();

test.describe('base real mínima (data/candidatos.json)', () => {
  test('estado inicial: só Vitor Júnior 1200, travado, com aviso de base incompleta', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const de = inp(page, 'df');
    await expect(de).toHaveValue('1200');
    await expect(de).toBeDisabled();
    await expect(page.locator('#slot-df .clear')).toBeHidden();
    await expect(page.locator('#slot-df')).toContainText('VITOR JUNIOR');
    await expect(page.locator('#slot-df .fu')).toHaveText('1200 · PDT'); // sem nome completo nem status inventados
    await expect(page.locator('#slot-df .chip.ok, #slot-df .chip.warn, #slot-df .chip.bad')).toHaveCount(0);
    await expect(page.locator('#slot-df')).toContainText('Número fixo desta colinha');
    await expect(page.locator('#aviso')).toBeVisible();
    await expect(page.locator('#phrase')).toHaveText('Pro Rio voltar a funcionar! Esse é o meu time:');
    await expect(page.getByRole('button', { name: 'Pro Rio', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tabCampaign')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#out')).toHaveAttribute('aria-label', /Deputado Federal: VITOR JUNIOR, número 1200.*Deputado Estadual: ainda vou decidir/s);
    for (const k of ['de', 's1', 's2', 'go', 'pr']) await expect(inp(page, k)).toHaveValue('');
  });

  test('tentativa de alterar o campo fixo (teclado, força bruta, link)', async ({ page }) => {
    await page.goto('/?v=1111-99999-222-333-44-55');
    await ready(page);
    await expect(inp(page, 'df')).toHaveValue('1200');
    await inp(page, 'df').click({ force: true });
    await page.keyboard.type('12345');
    await expect(inp(page, 'df')).toHaveValue('1200');
    await expect(page.locator('#slot-df')).toContainText('VITOR JUNIOR');
    // o link gerado também mantém o número fixo, ignorando o 99999 vindo da URL
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#link').click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('v=1200-99999-222-333-44-55');
  });

  test('busca sem resultado na base real', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await inp(page, 'de').fill('12345');
    await expect(page.locator('#slot-de .err')).toHaveText('Nenhuma candidatura com o número 12345 para Deputado Estadual no Rio de Janeiro.');
  });

  test('falha de carregamento: banner e "Tentar de novo"', async ({ page }) => {
    await page.route('**/data/candidatos.json', r => r.abort());
    await page.goto('/');
    await expect(page.locator('#banner')).toBeVisible();
    await expect(inp(page, 'de')).toBeDisabled();
    await page.unroute('**/data/candidatos.json');
    await page.locator('#retry').click();
    await expect(page.locator('#banner')).toBeHidden();
    await ready(page);
    await expect(page.locator('#slot-df')).toContainText('VITOR JUNIOR');
  });

  test('JSON HTTP 500 também mostra o banner', async ({ page }) => {
    await page.route('**/data/candidatos.json', r => r.fulfill({ status: 500, body: 'x' }));
    await page.goto('/');
    await expect(page.locator('#banner')).toBeVisible();
  });
});

test.describe('com fixture sintética de teste', () => {
  test.beforeEach(async ({ page }) => { await withFixture(page); await page.goto('/'); await ready(page); });

  test('número completo seleciona, mostra cartão e avança o foco', async ({ page }) => {
    await inp(page, 'de').fill('99020');
    await expect(page.locator('#slot-de .nu')).toHaveText('TESTE JOSÉ');
    await expect(page.locator('#slot-de')).toContainText('99020 · XX');
    await expect(inp(page, 's1')).toBeFocused(); // pula o deputado estadual travado
    await expect(page.locator('#out')).toHaveAttribute('aria-label', /Deputado Estadual: TESTE JOSÉ, número 99020/);
  });

  test('busca por nome com teclado (setas + Enter) e homônimos', async ({ page }) => {
    await inp(page, 'de').click();
    await page.keyboard.type('jose');
    const opts = page.locator('#sugs-de [role=option]');
    await expect(opts).toHaveCount(2);
    await expect(inp(page, 'de')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(inp(page, 'de')).toHaveAttribute('aria-activedescendant', /opt-de-1/);
    await page.keyboard.press('Enter');
    await expect(inp(page, 'de')).toHaveValue(/^990[23]0$/);
    await expect(page.locator('#slot-de .res')).toBeVisible();
  });

  test('Esc fecha a lista sem apagar o texto', async ({ page }) => {
    await inp(page, 'de').click();
    await page.keyboard.type('teste');
    await expect(page.locator('#sugs-de')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#sugs-de')).toBeHidden();
    await expect(inp(page, 'de')).toHaveValue('teste');
  });

  test('sugestão de legenda e voto de legenda', async ({ page }) => {
    await inp(page, 'de').click();
    await page.keyboard.type('99');
    await expect(page.locator('#sugs-de [role=option]').first()).toContainText('Votar só no partido (legenda)');
    await page.keyboard.press('Enter');
    await expect(page.locator('#slot-de .note')).toHaveText('Voto de legenda: o voto vai para o partido XX (99).');
    await expect(page.locator('#out')).toHaveAttribute('aria-label', /voto na legenda XX, número 99/);
  });

  test('legenda digitada só confirma ao sair do campo', async ({ page }) => {
    await inp(page, 'de').fill('88');
    await expect(page.locator('#slot-de .note')).toHaveCount(0);
    await inp(page, 's1').click();
    await expect(page.locator('#slot-de .note')).toContainText('partido YY (88)');
  });

  test('número inexistente, dígitos demais e limpar', async ({ page }) => {
    await inp(page, 'de').fill('11111');
    await expect(page.locator('#slot-de .err')).toContainText('Nenhuma candidatura com o número 11111');
    await inp(page, 'de').fill('111111');
    await expect(page.locator('#slot-de .err')).toHaveText('Deputado Estadual tem 5 dígitos.');
    await inp(page, 'de').fill('99010');
    await expect(page.locator('#slot-de .res')).toBeVisible();
    await page.locator('#slot-de .clear').click();
    await expect(inp(page, 'de')).toHaveValue('');
    await expect(page.locator('#slot-de .res')).toHaveCount(0);
    await expect(inp(page, 'de')).toBeFocused();
  });

  test('nome sem resultado não abre lista', async ({ page }) => {
    await inp(page, 'de').fill('zzzzzz');
    await expect(page.locator('#sugs-de')).toBeHidden();
  });

  test('mesmo senador nas duas vagas é bloqueado', async ({ page }) => {
    await inp(page, 's1').fill('901');
    await expect(page.locator('#slot-s1 .res')).toBeVisible();
    await inp(page, 's2').fill('901');
    await expect(page.locator('#slot-s2 .err')).toHaveText('Você já escolheu essa candidatura na 1ª vaga. Escolha outra pessoa para a 2ª vaga.');
    await expect(page.locator('#slot-s2 .res')).toHaveCount(0);
    await inp(page, 's2').fill('902');
    await expect(page.locator('#slot-s2 .res')).toBeVisible();
    await expect(page.locator('#slot-s2 .err')).toHaveCount(0);
    await expect(page.locator('#slot-s2 .chip.warn')).toContainText('Registro ainda em julgamento');
  });

  test('situação: indeferido aparece como aviso vermelho', async ({ page }) => {
    await inp(page, 'de').fill('88010');
    await expect(page.locator('#slot-de .chip.bad')).toContainText('Renunciou');
  });

  test('editar depois de escolher remove o cartão anterior', async ({ page }) => {
    await inp(page, 'de').fill('99010');
    await expect(page.locator('#slot-de .res')).toBeVisible();
    await inp(page, 'de').fill('990');
    await expect(page.locator('#slot-de .res')).toHaveCount(0);
    await expect(page.locator('#out')).toHaveAttribute('aria-label', /Deputado Estadual: ainda vou decidir/);
  });

  test('link copiado reconstitui a colinha em sessão limpa', async ({ page, context, browser, baseURL }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await inp(page, 'de').fill('99020');
    await inp(page, 's1').fill('901');
    await page.locator('#tabCause').click();
    await page.getByRole('button', { name: 'Saúde' }).click();
    await page.locator('#link').click();
    await expect(page.locator('#toast')).toHaveText('Link copiado.');
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toBe(`${baseURL}/?v=1200-99020-901---&f=saude`);
    const ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    await withFixture(p2);
    await p2.goto(url);
    await ready(p2);
    await expect(inp(p2, 'de')).toHaveValue('99020');
    await expect(p2.locator('#slot-de .nu')).toHaveText('TESTE JOSÉ');
    await expect(p2.locator('#slot-s1 .nu')).toHaveText('TESTE SENADOR');
    await expect(inp(p2, 'df')).toHaveValue('1200');
    await expect(p2.locator('#phrase')).toHaveText('Para defender a Saúde, meu time é esse:');
    await expect(p2.locator('#tabCause')).toHaveAttribute('aria-pressed', 'true');
    await ctx2.close();
  });

  test('link com parâmetros maliciosos não executa nada nem quebra', async ({ page }) => {
    const dialogs = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/?f=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E&v=%3Cimg%20src%3Dx%20onerror%3Dalert(2)%3E-%22%3E%3Cscript%3Ealert(3)%3C%2Fscript%3E');
    await ready(page);
    expect(dialogs).toEqual([]);
    expect(errors).toEqual([]);
    await expect(page.locator('#phrase')).toHaveText('Pro Rio voltar a funcionar! Esse é o meu time:');
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });
});

test.describe('fundos', () => {
  test.beforeEach(async ({ page }) => { await withFixture(page); await page.goto('/'); await ready(page); });
  const jogos = [['RPG', 'RPG'], ['RTS', 'RTS'], ['FPS', 'FPS'], ['Luta', 'luta'], ['Corrida', 'corrida'], ['Plataforma', 'plataforma'], ['Puzzle', 'puzzle'], ['MOBA', 'MOBA']];
  const causas = [['Educação', 'a Educação'], ['Ciência', 'a Ciência'], ['Saúde', 'a Saúde'], ['Segurança', 'a Segurança'], ['Cultura', 'a Cultura'], ['Meio Ambiente', 'o Meio Ambiente'], ['Esporte', 'o Esporte'], ['Tecnologia', 'a Tecnologia']];

  test('as 17 opções: seleção, frase e prévia mudam; Pro Rio (Vitor) inicial marcado', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Pro Rio', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#bgs .bg')).toHaveCount(1);
    const seen = new Set();
    const shot = async () => { await page.waitForTimeout(200); return page.evaluate(() => { const u = document.querySelector('#out').toDataURL(); return u.length + ':' + u.slice(-200); }); };
    seen.add(await shot());
    await page.locator('#tabGame').click();
    await expect(page.locator('#bgs .bg')).toHaveCount(8);
    for (const [label, frase] of jogos) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#phrase')).toHaveText(`Sou fã de ${frase} e vou entrar no jogo com esse time:`);
      seen.add(await shot());
    }
    await page.locator('#tabCause').click();
    await expect(page.locator('#bgs .bg')).toHaveCount(8);
    for (const [label, frase] of causas) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#phrase')).toHaveText(`Para defender ${frase}, meu time é esse:`);
      seen.add(await shot());
    }
    expect(seen.size).toBe(17); // cada fundo gera uma imagem distinta
    await page.locator('#tabCampaign').click();
    await expect(page.locator('#bgs .bg')).toHaveCount(1);
  });

  test('fundo da campanha carrega a imagem laranja e o link ?f=vitor abre nele', async ({ page }) => {
    await page.waitForTimeout(500);
    // pixel da margem esquerda do canvas (fora dos painéis) deve ser laranja (imagem carregada, não o azul-escuro do site)
    const px = await page.evaluate(() => { const c = document.querySelector('#out'); return [...c.getContext('2d').getImageData(20, 1000, 1, 1).data]; });
    expect(px[0]).toBeGreaterThan(200); expect(px[1]).toBeGreaterThan(60); expect(px[1]).toBeLessThan(150); expect(px[2]).toBeLessThan(40);
    await page.goto('/?f=vitor');
    await ready(page);
    await expect(page.locator('#tabCampaign')).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/?f=rpg');
    await ready(page);
    await expect(page.locator('#tabGame')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'RPG', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('exportação', () => {
  test.beforeEach(async ({ page }) => { await withFixture(page); await page.goto('/'); await ready(page); await inp(page, 'de').fill('99020'); });

  test('baixar imagem: nome, PNG 1080×1920 e idêntica à prévia', async ({ page }) => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#dl').click()]);
    expect(dl.suggestedFilename()).toBe('colinha-2026-rj.png');
    const path = await dl.path();
    const buf = readFileSync(path);
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
    expect(buf.readUInt32BE(16)).toBe(1080);
    expect(buf.readUInt32BE(20)).toBe(1920);
    // mesmos pixels que o canvas da prévia
    const same = await page.evaluate(async b64 => {
      const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const px = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
      const a = px(await load('data:image/png;base64,' + b64)); const b = px(document.querySelector('#out'));
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true;
    }, buf.toString('base64'));
    expect(same).toBe(true);
    await expect(page.locator('#toast')).toHaveText('Imagem baixada.');
  });

  test('compartilhar com Web Share (arquivo)', async ({ page }) => {
    await page.evaluate(() => { navigator.canShare = () => true; navigator.share = async d => { window.__shared = { n: d.files[0].name, t: d.files[0].type, s: d.files[0].size, text: d.text }; }; });
    await page.locator('#share').click();
    await expect.poll(() => page.evaluate(() => window.__shared)).toMatchObject({ n: 'colinha-2026-rj.png', t: 'image/png' });
    const sh = await page.evaluate(() => window.__shared);
    expect(sh.s).toBeGreaterThan(10000);
    expect(sh.text).toContain('Pro Rio voltar a funcionar!');
    expect(sh.text).toContain('?v=1200-99020');
  });

  test('compartilhar sem arquivo (só texto/URL)', async ({ page }) => {
    await page.evaluate(() => { navigator.canShare = () => false; navigator.share = async d => { window.__shared = d; }; });
    await page.locator('#share').click();
    await expect.poll(() => page.evaluate(() => window.__shared && window.__shared.url)).toContain('f=vitor');
  });

  test('compartilhar sem Web Share cai para download', async ({ page }) => {
    await page.evaluate(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }); });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#share').click()]);
    expect(dl.suggestedFilename()).toBe('colinha-2026-rj.png');
  });

  test('cancelar o compartilhamento não baixa nada nem mostra erro', async ({ page }) => {
    await page.evaluate(() => { navigator.canShare = () => true; navigator.share = async () => { throw new DOMException('x', 'AbortError'); }; });
    let downloaded = false; page.on('download', () => { downloaded = true; });
    await page.locator('#share').click();
    await page.waitForTimeout(500);
    expect(downloaded).toBe(false);
  });

  test('copiar link sem Clipboard API usa o fallback prompt()', async ({ page }) => {
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
    let seen = null;
    page.once('dialog', async d => { seen = { type: d.type(), value: d.defaultValue() }; await d.dismiss(); });
    await page.locator('#link').click();
    await expect.poll(() => seen).not.toBeNull();
    expect(seen.type).toBe('prompt');
    expect(seen.value).toContain('?v=1200-99020');
  });

  test('imprimir: só a imagem aparece e ela é a mesma da prévia', async ({ page }) => {
    await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
    await page.locator('#print').click();
    await expect.poll(() => page.evaluate(() => window.__printed)).toBe(1);
    const same = await page.evaluate(() => document.querySelector('#printImg').src === document.querySelector('#out').toDataURL('image/png'));
    expect(same).toBe(true);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#printImg')).toBeVisible();
    await expect(page.locator('.wrap')).toBeHidden();
    await expect(page.locator('#slots')).toBeHidden();
    await expect(page.locator('#share')).toBeHidden();
    const w = await page.locator('#printImg').boundingBox();
    expect(Math.round(w.width)).toBeGreaterThan(280); // ~8 cm a 96 dpi ≈ 302 px
    expect(Math.round(w.width)).toBeLessThan(320);
    const pdf = await page.pdf();
    expect(pdf.length).toBeGreaterThan(5000);
  });
});

test.describe('layout e acessibilidade', () => {
  test('mobile 390×844: sem rolagem horizontal e ordem dos blocos', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await withFixture(page); await page.goto('/'); await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const y = sel => page.locator(sel).evaluate(e => e.getBoundingClientRect().top + scrollY);
    expect(await y('#slots')).toBeLessThan(await y('#bgs'));
    expect(await y('#bgs')).toBeLessThan(await y('#out'));
    await inp(page, 'de').tap(); await page.keyboard.type('jose');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await ctx.close();
  });

  test('desktop: prévia à direita do formulário', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await withFixture(page); await page.goto('/'); await ready(page);
    const a = await page.locator('main').boundingBox(); const b = await page.locator('aside.preview').boundingBox();
    expect(b.x).toBeGreaterThan(a.x + a.width - 1);
    expect(b.width).toBeLessThan(a.width);
  });

  test('navegação só por teclado até compartilhar', async ({ page }) => {
    await withFixture(page); await page.goto('/'); await ready(page);
    await page.keyboard.press('Tab');
    await expect(inp(page, 'de')).toBeFocused();
    await page.keyboard.type('99010');
    await expect(inp(page, 's1')).toBeFocused();
    const focusOutline = await inp(page, 's1').evaluate(e => getComputedStyle(e).outlineStyle);
    expect(focusOutline).not.toBe('none');
    for (let i = 0; i < 40 && !(await page.locator('#share').evaluate(e => e === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(page.locator('#share')).toBeFocused();
  });
});
