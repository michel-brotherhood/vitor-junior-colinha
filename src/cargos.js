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

export const GAMES = [
  { id: 'rpg', label: 'RPG', frase: 'RPG' },
  { id: 'rts', label: 'RTS', frase: 'RTS' },
  { id: 'fps', label: 'FPS', frase: 'FPS' },
  { id: 'luta', label: 'Luta', frase: 'luta' },
  { id: 'corrida', label: 'Corrida', frase: 'corrida' },
  { id: 'plataforma', label: 'Plataforma', frase: 'plataforma' },
  { id: 'puzzle', label: 'Puzzle', frase: 'puzzle' },
  { id: 'moba', label: 'MOBA', frase: 'MOBA' }
];
export const CAUSES = [
  { id: 'educacao', label: 'Educação', frase: 'a Educação' },
  { id: 'ciencia', label: 'Ciência', frase: 'a Ciência' },
  { id: 'saude', label: 'Saúde', frase: 'a Saúde' },
  { id: 'seguranca', label: 'Segurança', frase: 'a Segurança' },
  { id: 'cultura', label: 'Cultura', frase: 'a Cultura' },
  { id: 'ambiente', label: 'Meio Ambiente', frase: 'o Meio Ambiente' },
  { id: 'esporte', label: 'Esporte', frase: 'o Esporte' },
  { id: 'tecnologia', label: 'Tecnologia', frase: 'a Tecnologia' }
];
export const CAMPAIGN = [
  { id: 'vitor', label: 'Pro Rio', frase: 'Pro Rio voltar a funcionar!' }
];
export const ALLBG = Object.fromEntries([
  ...CAMPAIGN.map(c => [c.id, { ...c, kind: 'campaign' }]),
  ...GAMES.map(g => [g.id, { ...g, kind: 'game' }]),
  ...CAUSES.map(c => [c.id, { ...c, kind: 'cause' }])
]);

export function phraseText(bgId) {
  const b = ALLBG[bgId];
  if (b.kind === 'campaign') return `${b.frase} Esse é o meu time:`;
  if (b.kind === 'game') return `Sou fã de ${b.frase} e vou entrar no jogo com esse time:`;
  return `Para defender ${b.frase}, meu time é esse:`;
}
