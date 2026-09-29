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
  FIXOS: { 6: '1200' },
  ASSINATURA_SITE: 'Iniciativa de Vitor Júnior 1200 (PDT), candidato a deputado federal pelo RJ',
  // Endereço impresso no fim da imagem. Vazio = usa o endereço em que o app está publicado.
  SITE: '',
  FUNDO_VITOR: base + 'public/img/fundo-vitor.webp',
  LOGOS: base + 'logos/'
};
