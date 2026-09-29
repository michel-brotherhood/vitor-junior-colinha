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
