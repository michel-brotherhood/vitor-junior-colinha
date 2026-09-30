import { describe, it, expect } from 'vitest';
import { parseCsv, candidatosDeCsv, validar, urlFotoTse, ehJpeg } from '../scripts/lib/tse.mjs';

// CSV SINTÉTICO no layout consulta_cand (colunas reduzidas). Nomes fictícios.
const csv = [
  '"ANO_ELEICAO";"SG_UF";"DS_CARGO";"NR_CANDIDATO";"NM_URNA_CANDIDATO";"NM_CANDIDATO";"SG_PARTIDO";"DS_DETALHE_SITUACAO_CAND";"SQ_CANDIDATO";"NM_COLIGACAO"',
  '"2026";"RJ";"DEPUTADO ESTADUAL";"99001";"TESTE ""ASPAS""";"TESTE UM; COM PONTO E VÍRGULA";"XX";"DEFERIDO";"1001";"COL A"',
  '"2026";"SP";"DEPUTADO ESTADUAL";"99002";"FORA DO RJ";"FORA";"XX";"DEFERIDO";"1002";""',
  '"2022";"RJ";"DEPUTADO ESTADUAL";"99003";"ANO ERRADO";"ANO";"XX";"DEFERIDO";"1003";""',
  '"2026";"BR";"PRESIDENTE";"99";"TESTE PRES";"TESTE PRESIDENTE";"YY";"PENDENTE DE JULGAMENTO";"1004";""',
  '"2026";"RJ";"VEREADOR";"12345";"NAO ENTRA";"NAO";"XX";"DEFERIDO";"1005";""'
].join('\r\n');

describe('importação do CSV do TSE', () => {
  it('parseia aspas e separador dentro do campo', () => {
    const r = parseCsv(csv);
    expect(r[1][4]).toBe('TESTE "ASPAS"');
    expect(r[1][5]).toBe('TESTE UM; COM PONTO E VÍRGULA');
  });
  it('filtra ano, UF e cargo', () => {
    const d = candidatosDeCsv(csv);
    expect(d['RJ/7'].candidatos.map(c => c.id)).toEqual([1001]);
    expect(d['BR/1'].candidatos[0]).toMatchObject({ numero: '99', descricaoSituacao: 'PENDENTE DE JULGAMENTO' });
    expect(d['RJ/6'].candidatos).toEqual([]);
  });
  it('falha claramente se o layout mudar', () => {
    expect(() => candidatosDeCsv('"A";"B"\n"1";"2"')).toThrow(/Coluna ausente/);
  });
  it('validar recusa base vazia (a menos que permitido)', () => {
    const d = candidatosDeCsv(csv);
    expect(validar(d).length).toBeGreaterThan(0);
    expect(validar(d, { permitirVazio: true })).toEqual([]);
  });
});

import { candidatoDeColinhaAi, listarColinhaAi, mesclarFixos } from '../scripts/lib/tse.mjs';

// Payload SINTÉTICO no formato descrito pelo sync.php do zip (nomes fictícios; formato real não verificado).
describe('colinha.ai (contrato do sync.php)', () => {
  it('mapeia campos e dá prioridade a `fora` sobre `julg`', () => {
    expect(candidatoDeColinhaAi({ sq: '77', nome: 'TESTE UM', num: '99010', sigla: 'XX', julg: 'DEFERIDO' }))
      .toMatchObject({ id: 77, numero: '99010', nomeUrna: 'TESTE UM', partido: { sigla: 'XX' }, descricaoSituacao: 'DEFERIDO', nomeCompleto: '' });
    expect(candidatoDeColinhaAi({ sq: 1, nome: 'A', num: '1', sigla: 'X', julg: 'DEFERIDO', fora: 'RENUNCIA' }).descricaoSituacao).toBe('RENUNCIA');
    expect(candidatoDeColinhaAi({ sq: 1, nome: 'A', num: '1', sigla: 'X', situacaoTse: 'Apto' }).descricaoSituacao).toBe('Apto');
  });
  it('pagina até `total` e filtra por cargoId', async () => {
    const paginas = { 0: { total: 3, candidatos: [{ sq: 1, nome: 'A', num: '11', sigla: 'X', cargoId: 3 }, { sq: 2, nome: 'B', num: '12', sigla: 'X', cargoId: 3 }] },
                      2: { total: 3, candidatos: [{ sq: 3, nome: 'C', num: '13', sigla: 'X', cargoId: 3 }] } };
    const chamadas = [];
    const pega = async url => { chamadas.push(url); return paginas[new URL(url).searchParams.get('offset')]; };
    const r = await listarColinhaAi(pega, 'https://exemplo.invalido/api', { cargo: 3, uf: 'RJ' });
    expect(r.map(c => c.numero)).toEqual(['11', '12', '13']);
    expect(chamadas).toHaveLength(2);
  });
});

describe('registros fixos', () => {
  const fixo = { cargo: 'RJ/6', registro: { id: 'fixo', numero: '1200', nomeUrna: 'VITOR JUNIOR', nomeCompleto: '', partido: { sigla: 'PDT' }, foto: 'public/img/vitor-junior.jpg' } };
  it('insere o fixo quando a fonte não o traz', () => {
    const d = { 'RJ/6': { candidatos: [{ id: 5, numero: '1234', nomeUrna: 'OUTRO', partido: { sigla: 'XX' } }] } };
    expect(mesclarFixos(d, [fixo])).toHaveLength(1);
    expect(d['RJ/6'].candidatos.map(c => c.numero)).toEqual(['1234', '1200']);
  });
  it('mantém os dados da fonte e acrescenta só a foto', () => {
    const d = { 'RJ/6': { candidatos: [{ id: 9, numero: '1200', nomeUrna: 'NOME DA FONTE', nomeCompleto: 'NOME COMPLETO DA FONTE', partido: { sigla: 'PDT' }, descricaoSituacao: 'Deferido' }] } };
    expect(mesclarFixos(d, [fixo])).toEqual([]);
    expect(d['RJ/6'].candidatos).toHaveLength(1);
    expect(d['RJ/6'].candidatos[0]).toMatchObject({ id: 9, nomeUrna: 'NOME DA FONTE', descricaoSituacao: 'Deferido', foto: 'public/img/vitor-junior.jpg' });
  });
});

import { readFileSync } from 'node:fs';
import { listarZip, lerEntrada } from '../scripts/lib/zip.mjs';

describe('leitor de zip', () => {
  const buf = readFileSync(new URL('./fixtures/sintetico.zip', import.meta.url));
  it('lista e lê entradas deflate e stored', () => {
    const itens = listarZip(buf);
    expect(itens.map(i => i.nome).sort()).toEqual(['a.csv', 'b.txt']);
    expect(lerEntrada(buf, itens.find(i => i.nome === 'a.csv')).toString()).toBe('"COL";"X"\r\n"1";"2"\r\n');
    expect(lerEntrada(buf, itens.find(i => i.nome === 'b.txt')).toString()).toBe('texto sem compressao');
  });
  it('rejeita arquivo que não é zip', () => {
    expect(() => listarZip(Buffer.from('isto não é um zip, é só texto comprido o bastante para a busca'))).toThrow(/inválido/);
  });
});

import { dadosDeZipTse, juntarSituacao, validarVolume, limpo, MINIMOS, CHAVES } from '../scripts/lib/tse.mjs';

describe('zip oficial do TSE (fixture SINTÉTICA no layout real: latin1, ";", 13 das 50 colunas)', () => {
  const buf = readFileSync(new URL('./fixtures/consulta-sintetico.zip', import.meta.url));
  const { dados, geradoEm } = dadosDeZipTse(buf, { listarZip, lerEntrada });
  it('separa RJ (3,5,6,7) e presidente; ignora suplentes, vices e outras UFs', () => {
    expect(dados['RJ/6'].candidatos.map(c => c.id)).toEqual([1001, 1002]);
    expect(dados['RJ/7'].candidatos.map(c => c.numero)).toEqual(['99010']);
    expect(dados['RJ/5'].candidatos).toHaveLength(1);
    expect(dados['RJ/3'].candidatos).toHaveLength(1);
    expect(dados['BR/1'].candidatos.map(c => c.nomeUrna)).toEqual(['TESTE PRES']);
  });
  it('decodifica latin1 e usa NM_CANDIDATO como nome completo', () => {
    const c = dados['RJ/6'].candidatos[1];
    expect(c.nomeUrna).toBe('TESTE JOSÉ');
    expect(c.nomeCompleto).toBe('JOSÉ TESTE HOMÔNIMO');
  });
  it('marcadores "#NE", "#NULO" e "NÃO DIVULGÁVEL" viram vazio (nunca chegam ao app)', () => {
    for (const k of CHAVES) for (const c of dados[k].candidatos) { expect(c.descricaoSituacao).toBe(''); expect(c.nomeColigacao).not.toMatch(/^#/); }
    expect(limpo('#NE')).toBe(''); expect(limpo('NÃO DIVULGÁVEL')).toBe(''); expect(limpo('-4')).toBe(''); expect(limpo(' DEFERIDO ')).toBe('DEFERIDO');
  });
  it('registra a data de geração do arquivo', () => { expect(geradoEm).toBe('28/09/2026 19:31:25'); });
  it('erra com mensagem clara se faltar um arquivo', () => {
    expect(() => dadosDeZipTse(buf, { listarZip, lerEntrada, ufs: ['ZZ'] })).toThrow(/consulta_cand_2026_ZZ\.csv não encontrado/);
  });
  it('volume: fixture pequena reprova o piso; base "cheia" passa', () => {
    expect(validarVolume(dados).length).toBe(CHAVES.length);
    const cheia = Object.fromEntries(CHAVES.map(k => [k, { candidatos: Array.from({ length: MINIMOS[k] }, (_, i) => ({ id: i })) }]));
    expect(validarVolume(cheia)).toEqual([]);
  });
});

describe('situação vinda de outra fonte (cruzada por SQ)', () => {
  const base = () => ({ ...Object.fromEntries(CHAVES.map(k => [k, { candidatos: [] }])), 'RJ/6': { candidatos: [
    { id: 1, numero: '1', descricaoSituacao: '' }, { id: 2, numero: '2', descricaoSituacao: 'JÁ VEIO' }, { id: 3, numero: '3', descricaoSituacao: '' }] } });
  it('preenche vazios, respeita o que já existe e conta divergências', () => {
    const d = base();
    const st = juntarSituacao(d, [{ id: 1, descricaoSituacao: 'DEFERIDO' }, { id: 2, descricaoSituacao: 'INDEFERIDO' }, { id: 99, descricaoSituacao: 'DEFERIDO' }]);
    expect(d['RJ/6'].candidatos.map(c => c.descricaoSituacao)).toEqual(['DEFERIDO', 'JÁ VEIO', '']);
    expect(st).toEqual({ juntados: 1, semSituacao: 1, soNaFonteExtra: 1 });
  });
});

describe('foto direto do TSE', () => {
  it('monta a URL do DivulgaCandContas com a UE certa', () => {
    expect(urlFotoTse(190002554324, 'RJ/6')).toBe('https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/20322002026/190002554324/RJ');
    expect(urlFotoTse('190000000001', 'BR/1')).toBe('https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/20322002026/190000000001/BR');
  });
  it('só aceita JPEG de verdade (HTML de erro com status 200 é rejeitado)', () => {
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(600)]);
    expect(ehJpeg(jpeg)).toBe(true);
    expect(ehJpeg(Buffer.from('<!DOCTYPE html>'.padEnd(800, ' ')))).toBe(false);
    expect(ehJpeg(Buffer.from([0xff, 0xd8, 0xff]))).toBe(false); // pequeno demais
    expect(ehJpeg(null)).toBeFalsy();
  });
});
