# Meu Time na Urna · Vitor Júnior 1200

Ferramenta para montar uma colinha eleitoral (1º turno, 4 de outubro de 2026): a pessoa informa candidaturas, escolhe um fundo e compartilha, baixa, imprime ou copia o link. O campo de **Deputado Federal** vem fixo em **Vitor Júnior · 1200 · PDT** (RJ). Estrutura e comportamento portados, em módulos ES, de um HTML de referência enviado pelo mantenedor; o site original **não** foi acessado.

> **Base de candidaturas: completa para o RJ + Presidência**, importada do arquivo oficial do TSE (`consulta_cand_2026.zip`, gerado em 28/09/2026 19:31) — 1.188 deputados estaduais, 793 federais, 17 senadores, 9 governadores e 14 presidentes. A **situação** (deferido, indeferido, etc.) vem do colinha.ai (site de terceiros), porque a coluna de situação do arquivo em massa do TSE vem como `#NE`. O aviso de "base incompleta" só aparece se `_meta.completo` for `false`.

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
| `src/bgui.js`, `src/backgrounds.js` | Etapa 2: abas (Fundo, Causa) e fundos em canvas |
| `src/render.js` | Desenho da colinha 1080×1920 (mesma fonte para prévia, PNG, compartilhar e impressão) |
| `src/actions.js` | Compartilhar, baixar, imprimir, copiar link |
| `scripts/atualizar-dados.mjs`, `scripts/lib/tse.mjs`, `scripts/lib/zip.mjs` | Importador (zip do TSE, leitor de zip sem dependências) |
| `scripts/diagnostico-fontes.mjs`, `scripts/inspecionar-zip-tse.mjs` | Só leitura: mostram o que cada fonte responde |
| `.github/workflows/atualizar-dados.yml` | Atualização da base fora do ambiente bloqueado |
| `src/site.js` | Endereço do rodapé da imagem (ignora hosts de prévia/UUID) |
| `data/fixos.json` | Registro fixo (1200) mesclado em toda importação |

## Dados

**Formato** de `data/candidatos.json` (gerado pelo importador):

```json
{ "_meta": { "completo": true, "fonte": "TSE, consulta_cand_2026.zip …", "tseGeradoEm": "28/09/2026 19:31:25",
             "situacao": "colinha.ai", "situacaoAtualizadaEm": "…", "geradoEm": "ISO-8601" },
  "RJ/6": { "candidatos": [ { "id": 190002539652, "numero": "1200", "nomeUrna": "VITOR JUNIOR",
            "nomeCompleto": "JOSE VITOR VIEIRA BISSONHO JUNIOR", "partido": { "sigla": "PDT" },
            "nomeColigacao": "PARTIDO ISOLADO", "descricaoSituacao": "DEFERIDO", "foto": "opcional" } ] },
  "RJ/7": {…}, "RJ/5": {…}, "RJ/3": {…}, "BR/1": {…} }
```
Chaves = `UE/código do cargo TSE` (7 dep. estadual, 6 dep. federal, 5 senador, 3 governador, 1 presidente). `id` = `SQ_CANDIDATO` do TSE. Fotos em `data/fotos/<id>.jpg`; `foto` (opcional) aponta para um arquivo local e tem prioridade; sem foto, silhueta.

**Atualizar a base** (recomendado: pelo GitHub Actions, que tem acesso de rede a essas fontes):

- GitHub → *Actions* → **Atualizar dados** → *Run workflow* (marque **gravar** para fazer o commit). Roda também todo dia às 08:17 UTC. Só grava se os testes e a validação (mínimos por cargo, esquema, candidato fixo presente) passarem.
- Localmente: `npm run atualizar-dados` (= `--tse-zip --fotos`). Outros modos: `--tse-zip --sem-situacao`, `--csv <arquivos>`, `--colinha-ai`, `--dry-run`, `--permitir-vazio`.

**O que foi verificado por execução** (GitHub Actions, 29/09/2026):

| Fonte | Resultado |
|---|---|
| `cdn.tse.jus.br/.../consulta_cand_2026.zip` | 200 com `fetch` simples; `curl` recebe 403 (bloqueio por assinatura do cliente). Traz `consulta_cand_2026_<UF>.csv` (latin1, `;`, 50 colunas) |
| Situação no CSV do TSE | `#NE` em todas as linhas → **não serve** para deferido/indeferido |
| `colinha.ai/api/v1/candidatos` | 200, mesmos registros e mesmos totais do TSE (mesmo `SQ`); `julg` = situação; `fora` = "renuncia"/"inapto" |
| `divulgacandcontas.tse.jus.br/.../eleicao/ordinarias` | 200 no diagnóstico simples, mas 403 na rota de listagem para clientes automáticos → não usado |
| Fotos | `assets.colinha.ai/candidatos/fotos/2026/<SQ>.jpeg`, 200 (foto oficial de urna republicada) |

O importador cruza pelo `SQ`, confere os totais entre as duas fontes e registra em `_meta` de onde veio cada informação. Se o colinha.ai falhar, a base sai **sem situação** (nunca com valor inventado). Situações vistas: DEFERIDO, DEFERIDO EM PRAZO RECURSAL OU COM RECURSO, INDEFERIDO EM PRAZO RECURSAL OU COM RECURSO, PENDENTE DE JULGAMENTO, inapto, renuncia.

**Limites que continuam valendo:** a situação depende de um terceiro (colinha.ai) e muda até a eleição; as fotos são copiadas do mesmo terceiro (são as fotos oficiais de urna, mas confirme o direito de uso antes de redistribuir); o rodapé diz "atualizados periodicamente", o que só vale com o workflow diário ativo.

## Comportamento

- Deputado federal fixo em 1200: campo `disabled`, sem botão de limpar, selo "Número fixo desta colinha"; o link e a URL nunca o sobrescrevem. Cartão e imagem omitem o que estiver vazio (sem nome completo, sem selo de situação).
- Busca por número (prefixo) ou nome (sem acento/caixa), legenda de 2 dígitos para deputados, mesma candidatura não pode ocupar as duas vagas de senador.
- Rodapé da página e da imagem exportada: logo do PDT e "Iniciativa de Vitor Júnior 1200 (PDT) · CNPJ 68.441.810/0001-17" (`CONFIG.CNPJ`/`ASSINATURA_*` em `src/config.js`).
- Fundos: **Fundo** (3 estampas enviadas pela campanha: **Laranja** (padrão), **Azul** e **Colorido**; imagens em `public/img/fundo-*.webp`, originais desktop/mobile em `assets/originais/fundos/`) e **Causa** = os **12 compromissos** de https://deputadovitorjunior.com.br/12-compromissos (títulos e textos literais em `data/compromissos.json`, lidos em 29/09/2026 pelo workflow de inspeção; espelhados em `src/compromissos.js`, e um teste garante que os dois são idênticos). Frase na imagem: "Compromisso N: Título. Esse é o meu time:". "Estilo de jogo" foi removido; links antigos `?f=rpg` etc. voltam ao fundo Laranja.
- Fundos dos compromissos **desenhados em código** (grade laranja + ícone-herói por tema, sem texto). A geração por IA foi tentada e **não foi possível** (plano gratuito do gerador de imagens recusou a chamada). Para usar imagens próprias/IA: coloque `public/img/compromissos/c01.webp … c12.webp` (1080×1920, sem texto) e ligue `IMAGENS_COMPROMISSOS` em `src/config.js`; elas substituem o desenho automaticamente.
- Link: `?v=<df>-<de>-<s1>-<s2>-<go>-<pr>&f=<fundo>`. Só números entram no link; `f` é validado. **Sem persistência local**: recarregar sem o `?v=` zera os campos.
- Nenhum dado pessoal é coletado, armazenado ou enviado; sem métricas nem cookies.

## Layout e usabilidade (auditoria)

- Três faixas: coluna única até 719 px (prévia ao final, barra fixa "Ver prévia / Compartilhar" enquanto ela não está na tela, link "Voltar aos campos"), duas colunas com prévia de 300 px de 720 a 919 px e prévia de 380 px a partir de 920 px.
- A altura da prévia acompanha a janela (`--acoes` em `public/styles.css`), então os quatro botões cabem em notebooks de 720 px.
- Contraste da imagem exportada: cada texto é medido pixel a pixel contra o que está atrás dele nos 15 fundos (teste e2e, mínimo 4,5:1). Linhas vazias usam o mesmo vidro das preenchidas; o selo de candidatura irregular é `#FF93A0`; "Esse é o meu time:" nunca é partido entre linhas.
- Celular deitado (altura < 500 px): a barra fixa com Compartilhar fica sempre visível. A aba (Fundo/Causa) que contém o fundo escolhido ganha um ponto.
- Impressão em 9 cm de largura (a referência usa 8 cm) e textos mínimos maiores na imagem, para o CNPJ e os rótulos ficarem legíveis no papel.
- `--faint` com contraste ≥ 4,5:1; alvos de toque ≥ 44 px; o × nativo do `type=search` fica oculto.
- Sem a pasta `logos/`, o app não pede logos (`CONFIG.LOGOS_DISPONIVEIS = false`) e usa a pílula "NN · SIGLA".
- `og:image` e o ícone usam caminho relativo; defina URLs absolutas no deploy para as redes sociais.

## Diferenças em relação ao HTML de referência

- Fonte pixel Silkscreen (OFL) no lugar de `CutePixel.ttf` (licença não verificada); Rajdhani self-hosted.
- Fotos oficiais de urna (2.020 candidaturas) e situações reais; sem logos de partidos (pílula "NN · SIGLA"), sem rota `/tse` (`CONFIG.USAR_PROXY_TSE = false`).
- Aviso de base incompleta, ARIA combobox/listbox, região `aria-live`, `aria-label` descritivo no canvas.
- Impressão a 9 cm em vez de 8 cm. Link saneado; retry de carregamento funcional; exportar/imprimir aguarda o desenho pendente.

## Pendências

- Confirmar direito de uso das fotos de urna copiadas do colinha.ai.
- Definir `CONFIG.SITE` (endereço final) antes do deploy; sem ele, a imagem omite a linha "Monte a sua".
