// Endereço impresso em "Monte a sua: …" no rodapé da imagem.
// Usa CONFIG.SITE quando definido. Sem ele, só usa o endereço da página se parecer um domínio de verdade:
// hosts de prévia/teste (UUID, localhost, IP) fariam a imagem divulgar um endereço que ninguém deve digitar.
export function enderecoParaImagem(siteConfig, host) {
  const s = String(siteConfig || '').trim();
  if (s) return s;
  const h = String(host || '').trim().toLowerCase().replace(/^www\./, '');
  if (!h || h.length > 32) return null;
  if (/^(localhost|127\.|0\.0\.0\.0|\[)/.test(h) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(h)) return null;
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/.test(h) || /[0-9a-f]{16,}/.test(h)) return null;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h)) return null;
  return h;
}
