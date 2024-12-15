// types.ts
export type SupportedLanguage = 'en' | 'es' | 'de' | 'fr';

// Interfaces for content structure
export interface GamingContext {
  before: string[];
  after: string[];
}

export interface CommunityTerms {
  symbols: string[];
  culture: string[];
  emoji_patterns: string[];
}

export interface KeywordStructure {
  specific_terms: Record<SupportedLanguage, string[]>;
  supporting_terms: Record<SupportedLanguage, string[]>;
  microlabels: string[];
  hashtags: string[];
  community: CommunityTerms;
  specific_regex: RegExp[];
  supporting_regex: RegExp[];
  microlabels_regex: RegExp[];
}

export type GamingContexts = Record<SupportedLanguage, GamingContext>;

// Helper function to create word boundary regex
function createWordRegex(word: string): RegExp {
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escapedWord}\\b`, 'i');
}

// Helper function to convert array of words to array of regexes
function createRegexArray(words: string[]): RegExp[] {
  return words.map(createWordRegex);
}

// Términos específicos que DEBEN estar presentes
const specific_terms: Record<SupportedLanguage, string[]> = {
  en: [
    'asexual', 'ace', 'acespec', 'asexuality', 'demisexual',
    'graysexual', 'greysexual', 'aspec', 'acespectrum',
    'aromantic', 'aro', 'arro', 'arospec', 'aromanticism',
    'demiromantic', 'grayromantic', 'greyromantic', 'arospectrum',
    'aroace', 'acearo', 'aaro', 'aace'
  ],
  es: [
    'asexual', 'ace', 'acespec', 'asexualidad', 'demisexual',
    'grisexual', 'graysexual', 'greysexual', 'espectro asexual',
    'aspec', 'espectro ace', 'acespectro', 'aromático', 'aromántica',
    'aro', 'arro', 'arospec', 'arromántico', 'arromántique',
    'demiromático', 'demiromática', 'griromático', 'griromática',
    'grisromático', 'grisromántique', 'espectro aromático',
    'espectro aro', 'arospectro', 'aroace', 'acearo', 'aaro',
    'aace', 'arro ace', 'ace arro'
  ],
  de: [
    'asexuell', 'ace', 'acespec', 'asexualität', 'demisexuell',
    'grausexuell', 'aspektrum', 'aromantisch', 'aro', 'arospec',
    'demiromantisch', 'grauromantisch', 'arospektrum', 'aroace',
    'acearo', 'aaro', 'aace'
  ],
  fr: [
    'asexuel', 'asexuelle', 'ace', 'acespec', 'asexualité',
    'demisexuel', 'demisexuelle', 'grisexuel', 'grisexuelle',
    'aromantique', 'aro', 'arospec', 'aromanticism',
    'demiromantique', 'grayromantic', 'greyromantic',
    'arospectrum', 'aroace', 'acearo', 'aaro', 'aace'
  ]
};

// Términos de apoyo que dan contexto pero no son suficientes por sí solos
const supporting_terms: Record<SupportedLanguage, string[]> = {
  en: [
    'lgbtqia', 'queer', 'pride', 'identity', 'orientation',
    'spectrum', 'community', 'representation'
  ],
  es: [
    'lgbtqia', 'queer', 'orgullo', 'identidad', 'orientación',
    'espectro', 'comunidad', 'representación'
  ],
  de: [
    'lgbtqia', 'queer', 'stolz', 'identität', 'orientierung',
    'spektrum', 'gemeinschaft', 'repräsentation'
  ],
  fr: [
    'lgbtqia', 'queer', 'fierté', 'identité', 'orientation',
    'spectre', 'communauté', 'représentation'
  ]
};

const microlabels = [
  'aroace', 'aromantic asexual', 'aro ace', 'aro/ace',
  'aroacespec', 'aroace-spec', 'aroaceflux', 'aroace flux',
  'aceflux', 'acefluido', 'acefluid', 'aceflux',
  'acespike', 'aceflor', 'aceflower'
];

// Data structures
export const keywords: KeywordStructure = {
  specific_terms,
  supporting_terms,
  specific_regex: createRegexArray(Object.values(specific_terms).flat()),
  supporting_regex: createRegexArray(Object.values(supporting_terms).flat()),
  microlabels_regex: createRegexArray(microlabels),
  microlabels,
  hashtags: [
    '#aroace', '#aroacespec', '#aroaceflux', '#aromantic_asexual',
    '#aroacecommunity', '#asexual', '#asexualidad', '#asexualität',
    '#asexualité', '#aromantic', '#aromántica', '#aromantisch',
    '#aromantique', '#homoromantico', '#birromantico', '#heteroromantico'
  ],
  community: {
    symbols: [
      '💜', '🤍', '💚', '🖤', '🧡',
      'black ring', 'white ring', 'ace ring',
      'schwarzer ring', 'weißer ring'
    ],
    culture: [
      'dragon ace', 'cake ace', 'garlic bread',
      'ace space', 'espacio ace', 'espace ace', 'ace-raum'
    ],
    emoji_patterns: [
      '🖤💜🤍', '💜🤍💚', '🤍💚🖤', '💚🖤🧡',
      '🐉 ace', '🍰 ace', '💍 ace',
      '💜🤍', '🤍💚', '💚🖤', '🖤🧡'
    ]
  }
};

// Gaming contexts data
export const gamingContexts: GamingContexts = {
  en: {
    before: [
      'poker',
      'tennis',
      'playing',
      'played',
      'got',
      'got an',
      'dealt',
      'dealt an',
    ],
    after: [
      'card',
      'cards',
      'serve',
      'player',
      'game',
      'pilot',
      'of spades',
      'of hearts',
      'of diamonds',
      'of clubs',
      'in poker',
      'in tennis',
    ],
  },
  es: {
    before: [
      'poker',
      'tenis',
      'jugando',
      'jugué',
      'saqué',
      'saqué un',
      'tengo',
      'tengo un',
    ],
    after: [
      'carta',
      'cartas',
      'servicio',
      'jugador',
      'juego',
      'piloto',
      'de espadas',
      'de corazones',
      'de diamantes',
      'de tréboles',
    ],
  },
  de: {
    before: ['poker', 'tennis', 'spielen', 'gespielt', 'habe', 'habe ein'],
    after: [
      'karte',
      'karten',
      'aufschlag',
      'spieler',
      'spiel',
      'pilot',
      'pik',
      'herz',
      'karo',
      'kreuz',
    ],
  },
  fr: {
    before: ['poker', 'tennis', 'jouer', 'joué', 'avoir', 'avoir un'],
    after: [
      'carte',
      'cartes',
      'service',
      'joueur',
      'jeu',
      'pilote',
      'pique',
      'coeur',
      'carreau',
      'trèfle',
    ],
  },
};
