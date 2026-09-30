import { COMPROMISSOS } from './compromissos.js';

// Códigos de cargo do TSE usados pela referência.
export const CARGOS = {
  1: { nome: 'Presidente', dig: 2 },
  3: { nome: 'Governador', dig: 2 },
  5: { nome: 'Senador', dig: 3 },
  6: { nome: 'Deputado Federal', dig: 4, legenda: true },
  7: { nome: 'Deputado Estadual', dig: 5, legenda: true }
};

// Ordem em que a urna pede.
export const SLOTS = [
  { key: 'df', cargo: 6, ue: 'RJ', label: 'Deputado Federal' },
  { key: 'de', cargo: 7, ue: 'RJ', label: 'Deputado Estadual' },
  { key: 's1', cargo: 5, ue: 'RJ', label: 'Senador · 1ª vaga' },
  { key: 's2', cargo: 5, ue: 'RJ', label: 'Senador · 2ª vaga' },
  { key: 'go', cargo: 3, ue: 'RJ', label: 'Governador' },
  { key: 'pr', cargo: 1, ue: 'BR', label: 'Presidente' }
];

// Aba "Fundo": três estampas, mesma frase da campanha.
const FRASE = 'Pro Rio voltar a funcionar!';
export const FUNDOS = [
  { id: 'vitor', label: 'Laranja', frase: FRASE },
  { id: 'azul', label: 'Azul', frase: FRASE },
  { id: 'colorido', label: 'Colorido', frase: FRASE }
];
// Aba "Causa": os 12 compromissos (textos em src/compromissos.js).
export const CAUSES = COMPROMISSOS.map(c => ({ id: c.id, label: `${c.n}. ${c.titulo}`, n: c.n, titulo: c.titulo, texto: c.texto, frente: c.frente }));
export const ALLBG = Object.fromEntries([
  ...FUNDOS.map(c => [c.id, { ...c, kind: 'fundo' }]),
  ...CAUSES.map(c => [c.id, { ...c, kind: 'cause' }])
]);

export function phraseText(bgId) {
  const b = ALLBG[bgId];
  if (b.kind === 'fundo') return `${b.frase} Esse é o meu time:`;
  return `Compromisso ${b.n}: ${b.titulo}. Esse é o meu time:`;
}
