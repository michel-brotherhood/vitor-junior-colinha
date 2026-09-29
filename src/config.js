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
  CNPJ: '68.441.810/0001-17',
  ASSINATURA_SITE: 'Iniciativa de Vitor Júnior 1200 (PDT), candidato a deputado federal pelo RJ · CNPJ 68.441.810/0001-17',
  // Linha curta impressa no rodapé da imagem.
  ASSINATURA_IMAGEM: 'Iniciativa de Vitor Júnior 1200 (PDT) · CNPJ 68.441.810/0001-17',
  // Endereço impresso no fim da imagem. Vazio = usa o endereço em que o app está publicado.
  SITE: '',
  LOGO_RODAPE: base + 'public/img/pdt-branco.png', // logo branco do PDT, para fundos escuros
  FUNDO_VITOR: base + 'public/img/fundo-vitor.webp',
  LOGOS: base + 'logos/',
  // Imagens prontas (ex.: geradas por IA) que substituem o fundo desenhado em código: public/img/compromissos/c01.webp … c12.webp. Ligar só quando os arquivos existirem (evita 12 x 404).
  IMAGENS_COMPROMISSOS: false,
  LOGOS_DISPONIVEIS: false // sem a pasta logos/, evita 404 por candidato e usa a pílula "NN · SIGLA"
};
