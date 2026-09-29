import { describe, it, expect } from 'vitest';
import { parseCsv, candidatosDeCsv, validar } from '../scripts/lib/tse.mjs';

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
