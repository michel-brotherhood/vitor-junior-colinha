import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { norm, rank, status, buildList, suggest, resolveRaw, parseParams, buildQuery, sanitizeVoto } from '../src/search.js';
import { SLOTS, CAUSES, phraseText } from '../src/cargos.js';
import { COMPROMISSOS } from '../src/compromissos.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/candidatos-teste.json', import.meta.url), 'utf8'));
const df = buildList(fx['RJ/6'], 'RJ');
const sen = buildList(fx['RJ/5'], 'RJ');

describe('norm', () => {
  it('remove acentos, caixa e não quebra em null', () => {
    expect(norm('José  Ção')).toBe('JOSE  CAO');
    expect(norm(null)).toBe('');
  });
});

describe('situação', () => {
  it('rank ordena ativa antes de indeferida', () => {
    expect(rank('Deferido')).toBeLessThan(rank('Deferido com recurso'));
    expect(rank('Deferido com recurso')).toBeLessThan(rank('Pendente'));
    expect(rank('Indeferido com recurso')).toBeLessThan(rank('Indeferido'));
    expect(rank('Renúncia')).toBe(5);
  });
  it('status mapeia textos e classes', () => {
    expect(status('Deferido')).toEqual({ cls: 'ok', txt: 'Candidatura deferida' });
    expect(status('Deferido com recurso').cls).toBe('warn');
    expect(status('Pendente de julgamento').cls).toBe('warn');
    expect(status('Indeferido').short).toBe('INDEFERIDA');
    expect(status('Renúncia').short).toBe('RENUNCIOU');
    expect(status('Cassado').cls).toBe('bad');
    expect(status('')).toBeNull();
  });
});

describe('situação: textos reais do TSE/colinha.ai', () => {
  const casos = [
    ['DEFERIDO', 'ok', 0], ['DEFERIDO EM PRAZO RECURSAL OU COM RECURSO', 'warn', 1], ['PENDENTE DE JULGAMENTO', 'warn', 2],
    ['INDEFERIDO EM PRAZO RECURSAL OU COM RECURSO', 'bad', 3], ['INDEFERIDO COM RECURSO', 'bad', 3], ['INDEFERIDO', 'bad', 4],
    ['CANCELADO', 'bad', 5], ['FALECIMENTO', 'bad', 5], ['RENÚNCIA', 'bad', 5], ['renuncia', 'bad', 5], ['inapto', 'bad', 5], ['PEDIDO NÃO CONHECIDO', 'warn', 5]
  ];
  for (const [txt, cls, r] of casos) it(`${txt} → ${cls}, rank ${r}`, () => { expect(status(txt).cls).toBe(cls); expect(rank(txt)).toBe(r); });
  it('INDEFERIDO com recurso nunca aparece como deferida', () => {
    expect(status('INDEFERIDO COM RECURSO').txt).not.toMatch(/^Deferida/);
    expect(status('INDEFERIDO EM PRAZO RECURSAL OU COM RECURSO').short).toBe('INDEFERIDA');
  });
});

describe('buildList', () => {
  it('mesmo número repetido fica com a candidatura mais ativa', () => {
    expect(df.byNum.get('9901').id).toBe(1);
    expect(df.active.filter(c => c.num === '9901')).toHaveLength(1);
  });
  it('ignora registros sem número válido e entrada vazia', () => {
    expect(buildList({ candidatos: [{ id: 1, numero: 'abc' }, { id: 2 }] }, 'RJ').list).toHaveLength(0);
    expect(buildList(undefined, 'RJ').list).toHaveLength(0);
  });
  it('mapeia número do partido → sigla', () => {
    expect(df.parties.get('99')).toBe('XX');
    expect(df.parties.get('88')).toBe('YY');
  });
});

describe('suggest', () => {
  it('por prefixo numérico', () => {
    expect(suggest(df, 6, '990').map(i => i.c.num).sort()).toEqual(['9901', '9902', '9903']);
  });
  it('2 dígitos em cargo com legenda oferece legenda primeiro', () => {
    const r = suggest(df, 6, '99');
    expect(r[0]).toEqual({ legenda: '99', sigla: 'XX' });
    expect(r.length).toBeGreaterThan(1);
  });
  it('senador (sem legenda) não oferece legenda', () => {
    expect(suggest(sen, 5, '90').every(i => !i.legenda)).toBe(true);
  });
  it('por nome ignora acento, caixa e espaços extras', () => {
    expect(suggest(df, 6, '  jose ').map(i => i.c.id).sort()).toEqual([2, 3]);
    expect(suggest(df, 6, 'JOSÉ homônimo').map(i => i.c.id)).toEqual([2]);
  });
  it('nome com 1 caractere e termos inexistentes não sugerem', () => {
    expect(suggest(df, 6, 'a')).toEqual([]);
    expect(suggest(df, 6, 'zzzz')).toEqual([]);
  });
  it('limita a 8 itens', () => {
    const many = buildList({ candidatos: Array.from({ length: 20 }, (_, i) => ({ id: i, numero: '99' + String(i).padStart(2, '0'), nomeUrna: 'TESTE ' + i })) }, 'RJ');
    expect(suggest(many, 6, 'teste')).toHaveLength(8);
  });
});

describe('resolveRaw', () => {
  it('número completo existente', () => {
    expect(resolveRaw(df, 6, 'RJ', '9902', false).cand.id).toBe(2);
  });
  it('número completo inexistente → mensagem por cargo', () => {
    expect(resolveRaw(df, 6, 'RJ', '1111', false).err).toBe('Nenhuma candidatura com o número 1111 para Deputado Federal no Rio de Janeiro.');
    expect(resolveRaw(buildList({ candidatos: [] }, 'BR'), 1, 'BR', '13', false).err).toBe('Nenhuma candidatura com o número 13 para Presidente.');
  });
  it('legenda só confirma fora de foco', () => {
    expect(resolveRaw(df, 6, 'RJ', '99', true)).toEqual({ cand: null, party: null, err: '' });
    expect(resolveRaw(df, 6, 'RJ', '99', false).party).toEqual({ num: '99', sigla: 'XX' });
    expect(resolveRaw(df, 6, 'RJ', '55', false).err).toMatch(/Nenhum partido com o número 55/);
  });
  it('2 dígitos em cargo sem legenda não confirma nada', () => {
    expect(resolveRaw(sen, 5, 'RJ', '90', false)).toEqual({ cand: null, party: null, err: '' });
  });
  it('excesso de dígitos e texto', () => {
    expect(resolveRaw(df, 6, 'RJ', '99011', false).err).toBe('Deputado Federal tem 4 dígitos.');
    expect(resolveRaw(df, 6, 'RJ', 'alfa', false).err).toBe('');
    expect(resolveRaw(df, 6, 'RJ', '', false).err).toBe('');
  });
});

describe('link', () => {
  it('parseParams valida fundo e votos', () => {
    expect(parseParams('?f=c08&v=1200-99020-123-456-13-22')).toEqual({ bg: 'c08', votos: ['1200', '99020', '123', '456', '13', '22'] });
    expect(parseParams('?f=vitor').bg).toBe('vitor');
    expect(parseParams('?f=__proto__').bg).toBeNull();
    expect(parseParams('?f=constructor').bg).toBeNull();
    expect(parseParams('?f=<script>').bg).toBeNull();
  });
  it('descarta lixo, HTML e valores longos demais', () => {
    const p = parseParams('?v=' + encodeURIComponent('<img src=x onerror=alert(1)>-12345678-abc-9999999-1-2'));
    expect(p.votos).toEqual(['', '', '', '', '1', '2']);
    expect(parseParams('').votos).toEqual(['', '', '', '', '', '']);
    expect(parseParams('?v=' + 'x'.repeat(5000)).votos.every(v => v === '')).toBe(true);
  });
  it('sanitizeVoto respeita o número de dígitos do cargo', () => {
    expect(sanitizeVoto('1234', SLOTS[0])).toBe('1234');
    expect(sanitizeVoto('12345', SLOTS[0])).toBe('');
    expect(sanitizeVoto('12345', SLOTS[1])).toBe('12345');
  });
  it('buildQuery não vaza texto digitado e é reversível', () => {
    const q = buildQuery(['1234', 'axel', '', '', '13', '22'], 'c03');
    expect(q.get('v')).toBe('1234----13-22');
    expect(parseParams('?' + q).votos).toEqual(['1234', '', '', '', '13', '22']);
    expect(parseParams('?' + q).bg).toBe('c03');
  });
});

describe('frase do fundo', () => {
  it('campanha e compromissos', () => {
    expect(phraseText('vitor')).toBe('Pro Rio voltar a funcionar! Esse é o meu time:');
    expect(phraseText('c01')).toBe('Compromisso 1: Integração no transporte. Esse é o meu time:');
    expect(phraseText('c12')).toBe('Compromisso 12: Segurança Integrada. Esse é o meu time:');
  });
  it('12 compromissos, ids únicos, e o módulo espelha data/compromissos.json', () => {
    const json = JSON.parse(readFileSync(new URL('../data/compromissos.json', import.meta.url), 'utf8')).compromissos;
    expect(COMPROMISSOS).toHaveLength(12);
    expect(new Set(COMPROMISSOS.map(c => c.id)).size).toBe(12);
    expect(COMPROMISSOS).toEqual(json.map(c => ({ n: c.n, id: c.id, slug: c.slug, frente: c.frente, titulo: c.titulo, texto: c.texto })));
    expect(CAUSES).toHaveLength(12);
  });
  it('?f= aceita só os fundos existentes; ids antigos (jogos/causas) são ignorados', () => {
    expect(parseParams('?f=c07').bg).toBe('c07');
    expect(parseParams('?f=vitor').bg).toBe('vitor');
    for (const antigo of ['rpg', 'luta', 'saude', 'ambiente', 'c13', '<x>']) expect(parseParams('?f=' + antigo).bg).toBeNull(); // main.js usa 'vitor' quando null
  });
});

import { enderecoParaImagem } from '../src/site.js';
describe('endereço impresso na imagem', () => {
  it('CONFIG.SITE tem prioridade', () => { expect(enderecoParaImagem('vitorjunior.com.br/colinha', 'qualquer.host')).toBe('vitorjunior.com.br/colinha'); });
  it('domínio normal é usado, sem www', () => { expect(enderecoParaImagem('', 'www.exemplo.com.br')).toBe('exemplo.com.br'); });
  it('host de prévia (UUID), localhost e IP não são divulgados', () => {
    expect(enderecoParaImagem('', 'd3394f2c-f815-4719-af8c-6655e952aaee.claudeusercontent.com')).toBeNull();
    expect(enderecoParaImagem('', 'localhost:5173')).toBeNull();
    expect(enderecoParaImagem('', '192.168.0.10')).toBeNull();
    expect(enderecoParaImagem('', '')).toBeNull();
    expect(enderecoParaImagem('', 'a'.repeat(40) + '.com')).toBeNull();
  });
});

describe('estados vindos do campo `fora` do colinha.ai', () => {
  it('inapto e renuncia aparecem como "fora da urna" na imagem', () => {
    expect(status('inapto')).toMatchObject({ cls: 'bad', txt: 'Candidatura inapta', short: 'INAPTA' });
    expect(status('renuncia')).toMatchObject({ cls: 'bad', short: 'RENUNCIOU' });
  });
});
