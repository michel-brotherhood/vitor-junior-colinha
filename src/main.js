import { S } from './state.js';
import { ALLBG } from './cargos.js';
import { parseParams } from './search.js';
import { setRenderHooks } from './render.js';
import { setTab, buildBgs, initTabs } from './bgui.js';
import { carregar, initRetry } from './slots.js';
import { initActions } from './actions.js';
import { updatePhrase } from './bgui.js';

// Link: ?v=<df>-<de>-<s1>-<s2>-<go>-<pr>&f=<fundo>. Parâmetros são validados em parseParams.
const { bg, votos } = parseParams(location.search);
if (bg) { S.bg = bg; S.tab = ALLBG[bg].kind; }

setRenderHooks({ onFontsReady: buildBgs });
initTabs(); initRetry(); initActions();
setTab(S.tab); updatePhrase();
carregar(votos);
