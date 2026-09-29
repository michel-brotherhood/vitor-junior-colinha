# Meu Time na Urna

Ferramenta para montar uma colinha eleitoral (1º turno, 4 de outubro de 2026): o usuário informa candidaturas, escolhe um fundo temático e compartilha, baixa, imprime ou copia o link. Recriação, em módulos ES, do HTML salvo de `https://filhomarcio.com.br/colinha/` (arquivo enviado pelo mantenedor; o site em si **não** foi acessado).

> **Estado dos dados: INCOMPLETO.** `data/candidatos.json` traz **apenas** o registro fixo 65021 (Márcio Filho, extraído do HTML de referência). Buscar outros números/nomes não encontra nada até a base do TSE ser importada (veja "Dados"). O app mostra um aviso permanente enquanto `_meta.completo` for `false`.

## Rodar

Requer Node 20+ (testado com 22). Sem build.

```bash
npm install          # só devDependencies (Vitest, Playwright, fontes)
npm run dev          # http://localhost:5173/  (servidor estático, sem dependências)
npm test             # testes unitários (Vitest)
npm run e2e          # testes de navegador (Playwright + Chromium)
```

Se o Playwright não achar o Chromium: `CHROMIUM_PATH=/caminho/chrome npm run e2e`.
Para publicar, copie `index.html`, `public/`, `src/` e `data/` para qualquer hospedagem estática (os caminhos são relativos à pasta da página). Ajuste `CONFIG.SITE` em `src/config.js` para o endereço que deve aparecer no rodapé da imagem.

## Estrutura

| Caminho | Papel |
|---|---|
| `index.html`, `public/styles.css` | Markup e CSS (tokens e layout da referência) |
| `src/search.js` | Lógica pura: normalização, situação, índice, sugestões, resolução, parâmetros do link |
| `src/dataStore.js` | Única camada que conhece `data/candidatos.json` e as URLs de foto |
| `src/slots.js` | Etapa 1: campos, sugestões (ARIA combobox), cartões |
| `src/bgui.js`, `src/backgrounds.js` | Etapa 2: abas e 16 fundos desenhados em canvas (portados da referência) |
| `src/render.js` | Desenho da colinha 1080×1920 — mesma fonte para prévia, PNG, compartilhamento e impressão |
| `src/actions.js` | Compartilhar, baixar, imprimir, copiar link |
| `scripts/atualizar-dados.mjs`, `scripts/lib/tse.mjs` | Importador da base (CSV dos Dados Abertos ou API) |
| `tests/`, `e2e/` | Unitários e ponta a ponta |

## Dados

**Formato** (`data/candidatos.json`, inferido do código da referência):

```json
{ "_meta": { "completo": true, "fonte": "…", "geradoEm": "ISO-8601" },
  "RJ/7": { "candidatos": [ { "id": 1, "numero": "65021", "nomeUrna": "…", "nomeCompleto": "…",
            "partido": { "sigla": "PCDOB" }, "nomeColigacao": "", "descricaoSituacao": "Deferido" } ] },
  "RJ/6": {…}, "RJ/5": {…}, "RJ/3": {…}, "BR/1": {…} }
```
Chaves = `UE/código do cargo TSE` (7 dep. estadual, 6 dep. federal, 5 senador, 3 governador, 1 presidente). Fotos opcionais em `data/fotos/<id>.jpg`; sem foto o app usa silhueta.

**Importar a base oficial** (rode numa máquina com acesso ao TSE):

```bash
# a) Dados Abertos: baixe consulta_cand_2026_RJ.csv e o arquivo nacional, depois
npm run atualizar-dados -- --csv consulta_cand_2026_RJ.csv --csv consulta_cand_2026_BRASIL.csv
# b) DivulgaCandContas (rotas e id da eleição precisam ser conferidos por você)
npm run atualizar-dados -- --api --eleicao <id> --fotos
```
O script valida o esquema e **não** altera a base se algo falhar (`--dry-run` para simular). Grava `_meta.fonte` e `_meta.geradoEm` — é essa data que vale como "data da base".

**O que não foi verificado:** os hosts do TSE estavam bloqueados no ambiente de desenvolvimento, então nem o layout real do CSV 2026, nem as rotas da API, nem o id de eleição `20322002026` herdado da referência foram testados contra o TSE. O parser foi testado apenas com CSV sintético. A regra de situação (`descricaoSituacao` → rótulos/cores) replica a da referência.

O rodapé mantém o texto da referência ("atualizados periodicamente"); isso só é verdade se alguém rodar o importador periodicamente.

## Comportamento (herdado da referência)

- Deputado estadual fixo em 65021: campo `disabled`, sem botão de limpar, selo "Número fixo desta colinha"; o link e a URL nunca o sobrescrevem.
- Busca por número (prefixo) ou nome (sem acento/caixa), legenda de 2 dígitos para deputados, mesma candidatura não pode ocupar as duas vagas de senador.
- Link: `?v=<df>-<de>-<s1>-<s2>-<go>-<pr>&f=<fundo>`. **Não há persistência local** (como na referência): recarregar sem o `?v=` zera os campos.
- Nenhum dado pessoal é coletado, armazenado ou enviado; não há métricas nem cookies.

## Diferenças em relação à referência

- Fonte pixel: Silkscreen (OFL) no lugar de `CutePixel.ttf` (licença não verificada); Rajdhani self-hosted em vez do Google Fonts.
- Sem logos de partidos (usa a pílula "NN · SIGLA", como a referência faz quando falta o PNG), sem fotos e sem a rota `/tse` (`CONFIG.USAR_PROXY_TSE = false`).
- Aviso de base incompleta e ARIA combobox/listbox nas sugestões, região `aria-live`, `aria-label` descritivo no canvas.
- O link só carrega números (texto digitado, HTML e valores longos viram campo vazio); `f` é validado contra a lista de fundos.
- Falha de carregamento agora permite "Tentar de novo" de verdade (a referência cacheava a promessa rejeitada).
- Exportar/imprimir espera o desenho pendente terminar.

## Limitações conhecidas

Dados (acima); nenhuma foto; Web Share com arquivo depende do navegador (fallback: baixar); impressão usa a imagem em 8 cm de largura, como a referência.
