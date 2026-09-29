// Configuração do app. Os caminhos são relativos à pasta da página, como na referência,
// para funcionar em qualquer subcaminho de hospedagem.
const base = location.pathname.replace(/[^/]*$/, '');

export const CONFIG = {
  // Atalho para a API do TSE (só fotos). Desativado por padrão: a rota /tse não faz parte deste repositório.
  API: base + 'tse',
  USAR_PROXY_TSE: false,
  DADOS: base + 'data/candidatos.json',
  FOTOS: base + 'data/fotos/',
  ANO: 2026,
  ELEICAO: 20322002026, // valor herdado da referência; não verificado contra o TSE
  // Números fixos por cargo: { codigoDoCargo: numero }
  FIXOS: { 7: '65021' },
  ASSINATURA_SITE: 'Iniciativa de Márcio Filho 65021 (PCdoB), candidato a deputado estadual pelo RJ · CNPJ 68.472.044/0001-58',
  // Endereço impresso no fim da imagem. Ajuste para o domínio onde este app for publicado.
  SITE: 'www.filhomarcio.com.br/colinha',
  LOGOS: base + 'logos/'
};
