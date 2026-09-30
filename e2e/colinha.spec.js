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

test.describe('base real (data/candidatos.json, importada do TSE)', () => {
  test('estado inicial: Vitor Júnior 1200 travado, com nome completo e situação oficiais', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const de = inp(page, 'df');
    await expect(de).toHaveValue('1200');
    await expect(de).toBeDisabled();
    await expect(page.locator('#slot-df .clear')).toBeHidden();
    await expect(page.locator('#slot-df')).toContainText('VITOR JUNIOR');
    await expect(page.locator('#slot-df .fu')).toHaveText('JOSE VITOR VIEIRA BISSONHO JUNIOR · 1200 · PDT');
    await expect(page.locator('#slot-df .chip.ok')).toHaveText('Candidatura deferida');
    await expect(page.locator('#slot-df')).toContainText('Número fixo desta colinha');
    await expect(page.locator('#aviso')).toBeHidden(); // base completa: sem aviso
    await expect(page.locator('#sig')).toHaveText('Iniciativa de Vitor Júnior 1200 (PDT), candidato a deputado federal pelo RJ · CNPJ 68.441.810/0001-17');
    await expect(page.locator('footer .foot-logo')).toBeVisible();
    expect(await page.locator('footer .foot-logo').evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
    await expect(page.locator('#phrase')).toHaveText('Pro Rio voltar a funcionar! Esse é o meu time:');
    await expect(page.getByRole('button', { name: 'Laranja', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tabFundo')).toHaveAttribute('aria-pressed', 'true');
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
    const usados = new Set(real['RJ/7'].candidatos.map(c => c.numero));
    const livre = ['99999', '00001', '11111', '22222'].find(n => !usados.has(n));
    await page.goto('/');
    await ready(page);
    await inp(page, 'de').fill(livre);
    await expect(page.locator('#slot-de .err')).toHaveText(`Nenhuma candidatura com o número ${livre} para Deputado Estadual no Rio de Janeiro.`);
  });

  test('metadados da base: completa, com fonte e data', async () => {
    expect(real._meta.completo).toBe(true);
    expect(real._meta.fonte).toMatch(/TSE/);
    expect(real._meta.tseGeradoEm).toMatch(/\d{2}\/\d{2}\/2026/);
    const n = k => real[k].candidatos.length;
    expect([n('RJ/7'), n('RJ/6'), n('RJ/5'), n('RJ/3'), n('BR/1')].every(v => v > 0)).toBe(true);
  });

  test('deputado estadual real: por número e por nome, com foto oficial', async ({ page }) => {
    const c = real['RJ/7'].candidatos.find(x => x.descricaoSituacao === 'DEFERIDO');
    await page.goto('/'); await ready(page);
    await inp(page, 'de').fill(c.numero);
    const card = page.locator('#slot-de .res');
    await expect(card.locator('.nu')).toHaveText(c.nomeUrna);
    await expect(card.locator('.fu')).toContainText(`${c.numero} · ${c.partido.sigla}`);
    await expect(card.locator('.chip.ok')).toHaveText('Candidatura deferida');
    await expect.poll(() => card.locator('img').evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
    // pelo nome (primeira palavra do nome de urna, sem acento e em minúsculas)
    await page.locator('#slot-de .clear').click();
    const palavra = c.nomeUrna.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(' ').find(w => w.length >= 4) || c.nomeUrna;
    await inp(page, 'de').fill(palavra.toLowerCase());
    await expect(page.locator('#sugs-de [role=option]').first()).toBeVisible();
  });

  test('senadores, governador e presidente reais aparecem nas listas', async ({ page }) => {
    await page.goto('/'); await ready(page);
    for (const [slot, chave] of [['s1', 'RJ/5'], ['go', 'RJ/3'], ['pr', 'BR/1']]) {
      const c = real[chave].candidatos.find(x => x.descricaoSituacao === 'DEFERIDO') || real[chave].candidatos[0];
      await inp(page, slot).fill(c.numero);
      await expect(page.locator(`#slot-${slot} .nu`), `${chave} ${c.numero}`).toHaveText(c.nomeUrna);
      await page.locator(`#slot-${slot} .clear`).click();
    }
  });

  test('situações reais: indeferido/inapto/renúncia viram aviso vermelho; deferido com recurso vira amarelo', async ({ page }) => {
    await page.goto('/'); await ready(page);
    const todos = [...real['RJ/7'].candidatos];
    const acha = f => todos.find(f);
    const casos = [
      [acha(c => /^INDEFERIDO/.test(c.descricaoSituacao)), '.chip.bad', /indeferido/i],
      [acha(c => c.descricaoSituacao === 'inapto'), '.chip.bad', /inapta/i],
      [acha(c => c.descricaoSituacao === 'renuncia'), '.chip.bad', /Renunciou/],
      [acha(c => /^DEFERIDO EM PRAZO/.test(c.descricaoSituacao)), '.chip.warn', /Deferida, com recurso/]
    ];
    for (const [c, seletor, texto] of casos) {
      if (!c) continue; // o estado pode não existir numa base futura
      await inp(page, 'de').fill(c.numero);
      await expect(page.locator(`#slot-de ${seletor}`), `${c.nomeUrna} (${c.descricaoSituacao})`).toHaveText(texto);
      await page.locator('#slot-de .clear').click();
    }
  });

  test('voto de legenda com número de partido real', async ({ page }) => {
    await page.goto('/'); await ready(page);
    await inp(page, 'de').fill('12'); await inp(page, 's1').click();
    await expect(page.locator('#slot-de .note')).toContainText('partido PDT (12)');
  });

  test('duas vagas de senador: candidato real repetido é bloqueado', async ({ page }) => {
    const [a, b] = real['RJ/5'].candidatos.filter(x => x.descricaoSituacao === 'DEFERIDO');
    await page.goto('/'); await ready(page);
    await inp(page, 's1').fill(a.numero);
    await inp(page, 's2').fill(a.numero);
    await expect(page.locator('#slot-s2 .err')).toContainText('Você já escolheu essa candidatura na 1ª vaga');
    await inp(page, 's2').fill(b.numero);
    await expect(page.locator('#slot-s2 .nu')).toHaveText(b.nomeUrna);
  });

  test('a imagem exportada traz os candidatos reais escolhidos', async ({ page }) => {
    const c = real['RJ/5'].candidatos.find(x => x.descricaoSituacao === 'DEFERIDO');
    await page.goto('/?f=vitor'); await ready(page);
    await inp(page, 's1').fill(c.numero);
    await expect(page.locator('#out')).toHaveAttribute('aria-label', new RegExp(`Senador · 1ª vaga: ${c.nomeUrna.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, número ${c.numero}`));
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
    await page.getByRole('button', { name: '3. Super Centros de Saúde' }).click();
    await page.locator('#link').click();
    await expect(page.locator('#toast')).toHaveText('Link copiado.');
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toBe(`${baseURL}/?v=1200-99020-901---&f=c03`);
    const ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    await withFixture(p2);
    await p2.goto(url);
    await ready(p2);
    await expect(inp(p2, 'de')).toHaveValue('99020');
    await expect(p2.locator('#slot-de .nu')).toHaveText('TESTE JOSÉ');
    await expect(p2.locator('#slot-s1 .nu')).toHaveText('TESTE SENADOR');
    await expect(inp(p2, 'df')).toHaveValue('1200');
    await expect(p2.locator('#phrase')).toHaveText('Compromisso 3: Super Centros de Saúde. Esse é o meu time:');
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
  const compromissos = [
    'Integração no transporte', 'Mais recursos para a mobilidade', 'Super Centros de Saúde', 'Inclusão e famílias atípicas',
    'Proteção à infância e à adolescência', 'Educação em tempo integral', 'Universidade para Todos', 'Qualificação para o trabalho',
    'Incentivos para quem produz', 'Rio de portas abertas para investimento', 'Pacto Fiscal', 'Segurança Integrada'
  ];

  test('15 fundos (3 em "Fundo" + 12 compromissos): seleção, frase e prévia mudam; sem "Estilo de jogo"', async ({ page }) => {
    await expect(page.getByText('Estilo de jogo')).toHaveCount(0);
    await expect(page.getByText('Campanha', { exact: true })).toHaveCount(0);
    await expect(page.locator('.toggle button')).toHaveText(['Fundo', 'Causa']);
    await expect(page.getByRole('button', { name: 'Laranja', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#bgs .bg')).toHaveCount(3);
    const seen = new Set();
    const shot = async () => { await page.waitForTimeout(200); return page.evaluate(() => { const u = document.querySelector('#out').toDataURL(); return u.length + ':' + u.slice(-200); }); };
    seen.add(await shot());
    for (const nome of ['Azul', 'Colorido', 'Laranja']) {
      await page.getByRole('button', { name: nome, exact: true }).click();
      await expect(page.getByRole('button', { name: nome, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#phrase')).toHaveText('Pro Rio voltar a funcionar! Esse é o meu time:');
      seen.add(await shot());
    }
    await page.locator('#tabCause').click();
    await expect(page.locator('#bgs .bg')).toHaveCount(12);
    for (const [i, titulo] of compromissos.entries()) {
      const btn = page.locator('#bgs .bg').nth(i);
      await expect(btn).toContainText(`${i + 1}. ${titulo}`);
      await btn.click();
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#phrase')).toHaveText(`Compromisso ${i + 1}: ${titulo}. Esse é o meu time:`);
      seen.add(await shot());
    }
    expect(seen.size).toBe(15); // cada fundo gera uma imagem distinta
    await page.locator('#tabFundo').click();
    await expect(page.locator('#bgs .bg')).toHaveCount(3);
  });

  test('miniaturas dos compromissos não estouram a largura (390 px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#tabCause').click();
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra).toBeLessThanOrEqual(0);
    const cortados = await page.evaluate(() => [...document.querySelectorAll('#bgs .bg span')].filter(s => s.scrollWidth > s.clientWidth + 1).length);
    expect(cortados).toBe(0);
  });

  test('fundo laranja carrega a imagem e o link ?f=vitor abre nele', async ({ page }) => {
    await page.waitForTimeout(500);
    // pixel da margem esquerda do canvas (fora dos painéis) deve ser laranja (imagem carregada, não o azul-escuro do site)
    const px = await page.evaluate(() => { const c = document.querySelector('#out'); return [...c.getContext('2d').getImageData(20, 1000, 1, 1).data]; });
    expect(px[0]).toBeGreaterThan(200); expect(px[1]).toBeGreaterThan(60); expect(px[1]).toBeLessThan(150); expect(px[2]).toBeLessThan(40);
    await page.goto('/?f=vitor');
    await ready(page);
    await expect(page.locator('#tabFundo')).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/?f=azul');
    await ready(page);
    await expect(page.locator('#tabFundo')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Azul', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/?f=c11');
    await ready(page);
    await expect(page.locator('#tabCause')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#phrase')).toHaveText('Compromisso 11: Pacto Fiscal. Esse é o meu time:');
    await page.goto('/?f=rpg'); // link antigo (estilo de jogo removido) volta ao padrão
    await ready(page);
    await expect(page.locator('#tabFundo')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#phrase')).toHaveText('Pro Rio voltar a funcionar! Esse é o meu time:');
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
    expect(Math.round(w.width)).toBeGreaterThan(330); // 9 cm a 96 dpi ≈ 340 px
    expect(Math.round(w.width)).toBeLessThan(350);
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

test.describe('auditoria: responsividade e usabilidade', () => {
  const inViewport = async (page, sel) => page.locator(sel).evaluate(e => { const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; });

  for (const [w, h] of [[1280, 720], [1024, 700], [1366, 768]]) {
    test(`notebook ${w}×${h}: as 4 ações ficam dentro da janela em qualquer ponto da rolagem`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await withFixture(page); await page.goto('/'); await ready(page);
      for (const y of [0, 300, 700, 1100, 1500]) {
        await page.evaluate(y => scrollTo(0, y), y);
        await page.waitForTimeout(80);
        // no topo da página a prévia começa abaixo do cabeçalho; depois de rolar, tudo deve caber
        if (y === 0) continue;
        for (const s of ['#share', '#dl', '#print', '#link']) expect(await inViewport(page, s), `${s} fora da janela em scrollY=${y}`).toBe(true);
      }
    });
  }

  test('tablet 768: duas colunas e prévia estreita', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await withFixture(page); await page.goto('/'); await ready(page);
    const a = await page.locator('main').boundingBox(), c = await page.locator('#out').boundingBox();
    expect(c.x).toBeGreaterThan(a.x + a.width - 1);
    expect(c.width).toBeLessThanOrEqual(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test('celular em paisagem 844×390: prévia limitada, sem rolagem lateral', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); await withFixture(page); await page.goto('/'); await ready(page);
    const c = await page.locator('#out').boundingBox();
    expect(c.width).toBeLessThanOrEqual(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await ctx.close();
  });

  test('celular 390×844: barra fixa aparece, leva à prévia e some quando ela está na tela', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); await withFixture(page); await page.goto('/'); await ready(page);
    const dock = page.locator('#dock');
    await expect(dock).toBeVisible();
    const box = await dock.boundingBox();
    expect(Math.round(box.y + box.height)).toBe(844); // colada no rodapé
    for (const el of await dock.locator('.btn').all()) expect((await el.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await dock.getByRole('link', { name: 'Ver prévia' }).tap();
    await expect.poll(() => page.evaluate(() => document.querySelector('#out').getBoundingClientRect().top < innerHeight * 0.6)).toBe(true);
    await expect(dock).toBeHidden(); // visibility:hidden enquanto a prévia aparece
    await page.locator('.voltar').tap();
    await expect.poll(() => page.evaluate(() => { const t = document.querySelector('#h1s').getBoundingClientRect().top; return t > -8 && t < innerHeight * 0.5; })).toBe(true);
    await expect(dock).toBeVisible();
    await ctx.close();
  });

  test('compartilhar pela barra fixa usa o mesmo fluxo do botão principal', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); await withFixture(page); await page.goto('/'); await ready(page);
    await page.evaluate(() => { navigator.canShare = () => true; navigator.share = async d => { window.__s = d.files[0].name; }; });
    await page.locator('#share2').tap();
    await expect.poll(() => page.evaluate(() => window.__s)).toBe('colinha-2026-rj.png');
    await ctx.close();
  });

  test('barra fixa não existe no desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await withFixture(page); await page.goto('/'); await ready(page);
    await expect(page.locator('#dock')).toBeHidden();
    await expect(page.locator('.voltar')).toBeHidden();
  });

  test('× nativo do type=search oculto; fica só o botão de limpar do app', async ({ page }) => {
    await withFixture(page); await page.goto('/'); await ready(page);
    // getComputedStyle não enxerga pseudo-elementos internos do WebKit; confere a regra no CSS carregado
    // (a ausência do × nativo também foi conferida por captura de tela).
    const regra = await page.evaluate(() => [...document.styleSheets].flatMap(s => [...s.cssRules]).some(r => r.cssText.includes('::-webkit-search-cancel-button') && r.cssText.includes('display: none')));
    expect(regra).toBe(true);
    await expect(page.locator('#slot-de .clear')).toBeVisible();
  });

  test('alvos de toque e contraste do texto secundário', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); await withFixture(page); await page.goto('/'); await ready(page);
    await inp(page, 'de').fill('jose');
    const menores = await page.evaluate(() => [...document.querySelectorAll('button:not([hidden]), [role=option], .dock .btn')]
      .filter(e => { const b = e.getBoundingClientRect(), s = getComputedStyle(e); return b.width > 0 && s.visibility !== 'hidden' && b.height < 44; })
      .map(e => (e.id || e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().height)));
    expect(menores).toEqual([]);
    // --faint sobre o painel mais claro: razão de contraste >= 4,5
    const razao = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const parse = v => v.match(/[\d.]+/g).map(Number);
      const faint = parse(cs.getPropertyValue('--faint')), fundo = [0x21, 0x1f, 0x38];
      const mix = faint.slice(0, 3).map((v, i) => v * faint[3] + fundo[i] * (1 - faint[3]));
      const L = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const a = L(mix), b = L(fundo); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(razao).toBeGreaterThanOrEqual(4.5);
    await ctx.close();
  });

  test('aba Fundo: 3 miniaturas (laranja, azul, colorido), imagens carregadas e sem pedido de logos', async ({ page }) => {
    const falhas = [];
    page.on('response', r => { if (r.url().includes('/logos/') || (r.url().includes('/img/fundo-') && !r.ok())) falhas.push(r.url()); });
    await withFixture(page); await page.goto('/'); await ready(page);
    await page.waitForTimeout(600);
    await expect(page.locator('#bgs .bg')).toHaveText(['Laranja', 'Azul', 'Colorido']);
    // pixel da margem esquerda (fora dos painéis) de cada fundo: laranja = R alto; azul = B > R; colorido = mistura, nunca o cinza do site
    const px = async nome => { await page.getByRole('button', { name: nome, exact: true }).click(); await page.waitForTimeout(300);
      return page.evaluate(() => [...document.querySelector('#out').getContext('2d').getImageData(6, 1300, 1, 1).data]); };
    const lar = await px('Laranja'), azu = await px('Azul'), col = await px('Colorido');
    expect(lar[0]).toBeGreaterThan(200); expect(lar[2]).toBeLessThan(60);
    expect(azu[2]).toBeGreaterThan(azu[0] + 40);
    expect(col[3]).toBe(255);
    expect(falhas).toEqual([]);
  });

  test('impressão a 9 cm', async ({ page }) => {
    await withFixture(page); await page.goto('/'); await ready(page);
    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('#print').click();
    await page.emulateMedia({ media: 'print' });
    const w = (await page.locator('#printImg').boundingBox()).width;
    expect(Math.round(w)).toBeGreaterThan(330); expect(Math.round(w)).toBeLessThan(350); // 9 cm ≈ 340 px
  });
});

/* ---------- auditoria geral: contraste da imagem, paisagem, aba com fundo escolhido ---------- */
test.describe('auditoria 2: imagem exportada, paisagem e abas', () => {
  // Intercepta fillText do canvas da prévia (sem desenhar o texto) e mede, pixel a pixel, o contraste real atrás de cada texto.
  const medir = async (page, url) => {
    await page.addInitScript(() => {
      const orig = CanvasRenderingContext2D.prototype.fillText; window.__rec = null;
      CanvasRenderingContext2D.prototype.fillText = function (t, x, y, mw) {
        if (window.__rec && this.canvas.id === 'out') { window.__rec.push({ t: String(t), font: this.font, fill: String(this.fillStyle), a: this.globalAlpha, x, y, w: this.measureText(String(t)).width, al: this.textAlign }); return; }
        return orig.call(this, t, x, y, mw);
      };
    });
    await page.goto(url); await page.waitForTimeout(1200);
    await page.evaluate(() => { window.__rec = []; document.querySelector('#bgs .bg[aria-pressed=true]').click(); });
    await page.waitForTimeout(900);
    return page.evaluate(() => {
      const cv = document.querySelector('#out'), c = cv.getContext('2d');
      const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
      const k = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const cor = s => { k.clearRect(0, 0, 1, 1); k.fillStyle = '#000'; k.fillStyle = s; k.fillRect(0, 0, 1, 1); return [...k.getImageData(0, 0, 1, 1).data.slice(0, 3)]; };
      return window.__rec.map(r => {
        const fs = +/(\d+(?:\.\d+)?)px/.exec(r.font)[1]; const m = /rgba\(([^)]*)\)/.exec(r.fill); const a = r.a * (m ? +m[1].split(',')[3] : 1); const fg = cor(r.fill);
        const x0 = Math.max(0, Math.round(r.al === 'center' ? r.x - r.w / 2 : r.al === 'right' ? r.x - r.w : r.x)), y0 = Math.max(0, Math.round(r.y - fs * .72));
        const d = c.getImageData(x0, y0, Math.max(2, Math.min(Math.round(r.w), 1080 - x0)), Math.round(fs * .8)).data; const cr = [];
        for (let i = 0; i < d.length; i += 12) { const bg = [d[i], d[i + 1], d[i + 2]]; const L1 = lum(fg.map((v, j) => a * v + (1 - a) * bg[j])), L2 = lum(bg); cr.push((Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05)); }
        cr.sort((p, q) => p - q); return { t: r.t, p5: cr[Math.floor(cr.length * .05)] };
      });
    });
  };
  const IDS = ['vitor', 'azul', 'colorido', ...Array.from({ length: 12 }, (_, i) => 'c' + String(i + 1).padStart(2, '0'))];

  test('imagem: todo texto ≥ 4,5:1 e "Esse é o meu time:" sempre inteiro (15 fundos, colinha vazia)', async ({ page }) => {
    test.setTimeout(120000);
    for (const id of IDS) {
      const r = await medir(page, `/?f=${id}&v=1200`);
      const fracos = r.filter(x => x.p5 < 4.5).map(x => `${x.t} ${x.p5.toFixed(2)}`);
      expect(fracos, `contraste em ${id}`).toEqual([]);
      expect(r.filter(x => x.t === 'Esse é o meu time:'), `fecho em ${id}`).toHaveLength(1);
      await page.reload();
    }
  });

  test('imagem: colinha cheia, com selo de candidatura irregular, também ≥ 4,5:1', async ({ page }) => {
    test.setTimeout(60000);
    for (const id of ['vitor', 'azul', 'colorido', 'c10']) {
      const r = await medir(page, `/?f=${id}&v=1200-45200-555-131-55-22`);
      expect(r.some(x => x.t.startsWith('⚠')), 'selo presente').toBe(true);
      expect(r.filter(x => x.p5 < 4.5).map(x => `${x.t} ${x.p5.toFixed(2)}`), `contraste em ${id}`).toEqual([]);
      await page.reload();
    }
  });

  test('celular deitado (844×390): barra com Compartilhar sempre visível e sem cobrir o fim da página', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?v=1200-45200'); await expect(page.locator('#share2')).toBeVisible();
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let y = 0; y <= max; y += Math.max(1, Math.floor(max / 12))) {
      await page.evaluate(v => scrollTo(0, v), y);
      const b = await page.locator('#share2').boundingBox();
      expect(b.y).toBeGreaterThanOrEqual(0); expect(b.y + b.height).toBeLessThanOrEqual(390); expect(b.height).toBeGreaterThanOrEqual(44);
    }
    await page.evaluate(() => scrollTo({ top: 1e7, behavior: 'instant' })); await page.waitForTimeout(150); // fim da página: o último bloco (rodapé) não fica atrás da barra
    const f = await page.locator('footer').boundingBox(); const d = await page.locator('#dock').boundingBox();
    expect(f.y + f.height).toBeLessThanOrEqual(d.y + 1);
    await page.setViewportSize({ width: 1280, height: 720 }); // notebook: sem barra
    await expect(page.locator('#dock')).toBeHidden();
  });

  test('aba com o fundo escolhido ganha um ponto; a outra não', async ({ page }) => {
    await withFixture(page); await page.goto('/'); await ready(page);
    await expect(page.locator('#tabFundo')).toHaveAttribute('data-tem-fundo', '');
    await expect(page.locator('#tabCause')).not.toHaveAttribute('data-tem-fundo', '');
    await page.locator('#tabCause').click(); await page.locator('#bgs .bg').nth(4).click();
    await page.locator('#tabFundo').click();
    await expect(page.locator('#tabCause')).toHaveAttribute('data-tem-fundo', '');
    await expect(page.locator('#tabCause')).toHaveAccessibleName('Causa (fundo escolhido)');
    await expect(page.locator('#tabFundo')).not.toHaveAttribute('data-tem-fundo', '');
    await expect(page.locator('#bgs .bg[aria-pressed=true]')).toHaveCount(0); // grade do Fundo sem marcação, mas a aba Causa indica onde está
  });
});

test.describe('auditoria 3: texto, prévia maior, fontes e barra fixa', () => {
  test('título sem o resto do tema de jogos', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Monte sua colinha e leve o seu time para a urna.');
    await expect(page.locator('body')).not.toContainText(/entre no jogo/i);
  });

  test('nenhum texto visível abaixo de 14 px (abas Fundo e Causa)', async ({ page }) => {
    await page.goto('/?v=1200-45200'); await page.waitForTimeout(600);
    const menores = () => page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getBoundingClientRect().width && !e.closest('canvas') && parseFloat(getComputedStyle(e).fontSize) < 14).map(e => e.tagName + ' ' + getComputedStyle(e).fontSize + ' ' + e.textContent.trim().slice(0, 20)));
    expect(await menores()).toEqual([]);
    await page.locator('#tabCause').click();
    expect(await menores()).toEqual([]);
  });

  for (const [w, h, minCanvas] of [[320, 568, 250], [360, 740, 290], [390, 844, 325]]) {
    test(`celular em pé ${w}×${h}: prévia usa a largura do quadro (≥ ${minCanvas}px) e "Baixar imagem" cabe em 1 linha`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/?v=1200-45200');
      const c = await page.locator('#out').boundingBox();
      expect(c.width).toBeGreaterThanOrEqual(minCanvas);
      expect(Math.abs(c.height / c.width - 16 / 9)).toBeLessThan(0.02);
      expect((await page.locator('#dl').boundingBox()).height).toBeLessThan(56);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }

  test('notebook 1280×720: prévia maior (≥ 250 px) e os 4 botões continuam na janela', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/?v=1200-45200'); await page.waitForTimeout(500);
    expect((await page.locator('#out').boundingBox()).width).toBeGreaterThanOrEqual(250);
    await page.evaluate(() => scrollTo({ top: 600, behavior: 'instant' })); await page.waitForTimeout(150);
    for (const id of ['#share', '#dl', '#print', '#link']) { const b = await page.locator(id).boundingBox(); expect(b.y).toBeGreaterThanOrEqual(0); expect(b.y + b.height).toBeLessThanOrEqual(720); }
  });

  test('barra fixa só some quando o botão Compartilhar do quadro está inteiro na tela', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?v=1200-45200-555-131-55-22'); await page.waitForTimeout(600);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let y = 0; y <= max; y += 60) {
      await page.evaluate(v => scrollTo({ top: v, behavior: 'instant' }), y); await page.waitForTimeout(60);
      const s = await page.evaluate(() => { const r = document.querySelector('#share').getBoundingClientRect(); return { dentro: r.top >= 0 && r.bottom <= innerHeight, off: document.querySelector('#dock').hasAttribute('data-off') }; });
      if (s.off) expect(s.dentro, `barra oculta com o botão fora da tela em y=${y}`).toBe(true);
    }
  });
});
