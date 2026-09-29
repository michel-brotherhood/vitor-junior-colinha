# Meu Time na Urna · Vitor Júnior 1200

Ferramenta para montar uma colinha eleitoral (1º turno, 4 de outubro de 2026): a pessoa informa candidaturas, escolhe um fundo e compartilha, baixa, imprime ou copia o link. O campo de **Deputado Federal** vem fixo em **Vitor Júnior · 1200 · PDT** (RJ). Estrutura e comportamento portados, em módulos ES, de um HTML de referência enviado pelo mantenedor; o site original **não** foi acessado.

> **Estado dos dados: INCOMPLETO.** `data/candidatos.json` traz **apenas** o registro fixo do Vitor Júnior, montado a partir do material de campanha (nome de urna, número e partido). Não é uma base do TSE: **nome completo e situação da candidatura estão em branco** até uma importação real. Buscar outros números/nomes não encontra nada, e o app mostra um aviso permanente enquanto `_meta.completo` for `false`.

## Rodar

Requer Node 20+ (testado com 22). Sem build.

```bash
npm install          # só devDependencies (Vitest, Playwright, fontes)
npm run dev          # http://localhost:5173/  (servidor estático, sem dependências)
npm test             # testes unitários (Vitest)
npm run e2e          # testes de navegador (Playwright + Chromium)
```

Se o Playwright não achar o Chromium: `CHROMIUM_PATH=/caminho/chrome npm run e2e`.
Para publicar, copie `index.html`, `public/`, `src/` e `data/` para qualquer hospedagem estática (caminhos relativos à pasta da página). `CONFIG.SITE` (em `src/config.js`) define o endereço impresso na imagem; vazio, usa o endereço onde o app estiver publicado.

## Estrutura

| Caminho | Papel |
|---|---|
| `index.html`, `public/styles.css` | Markup e CSS (acento laranja `--accent`) |
| `public/img/` | `vitor-junior.jpg` (foto), `fundo-vitor.webp` (fundo 1080×1920), `pdt-branco.png` (logo do partido, branco), `social-share.webp` |
| `assets/originais/` | Arquivos originais recebidos (fundo, perfil, retrato 1400², zip de referência) |
| `src/search.js` | Lógica pura: normalização, situação, índice, sugestões, resolução, parâmetros do link |
| `src/dataStore.js` | Única camada que conhece `data/candidatos.json` e as URLs de foto |
| `src/slots.js` | Etapa 1: campos, sugestões (ARIA combobox), cartões |
| `src/bgui.js`, `src/backgrounds.js` | Etapa 2: abas (Campanha, Estilo de jogo, Causa) e fundos em canvas |
| `src/render.js` | Desenho da colinha 1080×1920 (mesma fonte para prévia, PNG, compartilhar e impressão) |
| `src/actions.js` | Compartilhar, baixar, imprimir, copiar link |
| `scripts/atualizar-dados.mjs`, `scripts/lib/tse.mjs` | Importador da base |
| `data/fixos.json` | Registro fixo (1200) mesclado em toda importação |

## Dados

**Formato** de `data/candidatos.json`:

```json
{ "_meta": { "completo": true, "fonte": "…", "geradoEm": "ISO-8601" },
  "RJ/6": { "candidatos": [ { "id": 1, "numero": "1200", "nomeUrna": "…", "nomeCompleto": "…",
            "partido": { "sigla": "PDT" }, "nomeColigacao": "", "descricaoSituacao": "Deferido", "foto": "opcional" } ] },
  "RJ/7": {…}, "RJ/5": {…}, "RJ/3": {…}, "BR/1": {…} }
```
Chaves = `UE/código do cargo TSE` (7 dep. estadual, 6 dep. federal, 5 senador, 3 governador, 1 presidente). `foto` é um caminho relativo opcional; sem ele, tenta `data/fotos/<id>.jpg`; sem foto, silhueta.

**Importar a base** (numa máquina com acesso à fonte). Todos os modos mesclam `data/fixos.json`, validam o esquema e **não** alteram a base se algo falhar (`--dry-run` simula):

```bash
# a) TSE, Dados Abertos: baixe consulta_cand_2026_RJ.csv e o arquivo nacional, depois
npm run atualizar-dados -- --csv consulta_cand_2026_RJ.csv --csv consulta_cand_2026_BRASIL.csv
# b) TSE, DivulgaCandContas (rotas e id da eleição precisam ser conferidos por você)
npm run atualizar-dados -- --api --eleicao <id> --fotos
# c) colinha.ai: site de terceiros que republica os dados do TSE (contrato copiado do sync.php do zip recebido)
npm run atualizar-dados -- --colinha-ai
```

**O que não foi verificado:** os hosts do TSE **e** `colinha.ai`/`assets.colinha.ai` responderam 403 no ambiente de desenvolvimento. Nenhuma das três rotas de importação foi executada contra dados reais: layout do CSV 2026, rotas da API e id de eleição `20322002026` (herdado da referência) seguem não conferidos, e o contrato do colinha.ai vem só da leitura do `sync.php`. Os parsers foram testados com dados sintéticos. Prefira os modos a/b (fonte oficial); o modo c depende de um terceiro.

O rodapé mantém o texto "atualizados periodicamente"; isso só é verdade se alguém rodar o importador periodicamente.

## Comportamento

- Deputado federal fixo em 1200: campo `disabled`, sem botão de limpar, selo "Número fixo desta colinha"; o link e a URL nunca o sobrescrevem. Cartão e imagem omitem o que estiver vazio (sem nome completo, sem selo de situação).
- Busca por número (prefixo) ou nome (sem acento/caixa), legenda de 2 dígitos para deputados, mesma candidatura não pode ocupar as duas vagas de senador.
- Rodapé da página e da imagem exportada: logo do PDT e "Iniciativa de Vitor Júnior 1200 (PDT) · CNPJ 68.441.810/0001-17" (`CONFIG.CNPJ`/`ASSINATURA_*` em `src/config.js`).
- Fundos: **Campanha** (padrão, arte laranja do candidato), 8 estilos de jogo e 8 causas.
- Link: `?v=<df>-<de>-<s1>-<s2>-<go>-<pr>&f=<fundo>`. Só números entram no link; `f` é validado. **Sem persistência local**: recarregar sem o `?v=` zera os campos.
- Nenhum dado pessoal é coletado, armazenado ou enviado; sem métricas nem cookies.

## Diferenças em relação ao HTML de referência

- Fonte pixel Silkscreen (OFL) no lugar de `CutePixel.ttf` (licença não verificada); Rajdhani self-hosted.
- Sem logos de partidos (pílula "NN · SIGLA"), sem rota `/tse` (`CONFIG.USAR_PROXY_TSE = false`).
- Aviso de base incompleta, ARIA combobox/listbox, região `aria-live`, `aria-label` descritivo no canvas.
- Link saneado; retry de carregamento funcional; exportar/imprimir aguarda o desenho pendente.

## Pendências

- Nome completo e situação no TSE do candidato (vêm da importação).
- Frase da aba Campanha ("Pro Rio voltar a funcionar! Esse é o meu time:", do material de campanha): confirmar.
- Acesso de rede à fonte de dados para rodar o importador.
