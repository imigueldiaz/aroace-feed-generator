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
  [key: string]: string[] | CommunityTerms | string[];
  microlabels: string[];
  hashtags: string[];
  community: CommunityTerms;
}

export interface GamingContexts {
  [key: string]: GamingContext;
}

// Data structures
export const keywords: KeywordStructure = {
  // Language-specific terms
  en: [
    'asexual',
    'ace',
    'acespec',
    'asexuality',
    'demisexual',
    'graysexual',
    'greysexual',
    'aspec',
    'acespectrum',
    'aromantic',
    'aro',
    'arro',
    'arospec',
    'aromanticism',
    'demiromantic',
    'grayromantic',
    'greyromantic',
    'arospectrum',
    'aroace',
    'acearo',
    'aaro',
    'aace',
    'lgbtqia',
    'queer',
    'pride',
    'identity',
    'orientation'
  ],
  es: [
    'asexual',
    'ace',
    'acespec',
    'asexualidad',
    'demisexual',
    'grisexual',
    'graysexual',
    'greysexual',
    'espectro asexual',
    'aspec',
    'espectro ace',
    'acespectro',
    'aromático',
    'aromántica',
    'aro',
    'arro',
    'arospec',
    'arromántico',
    'arromántique',
    'demiromático',
    'demiromática',
    'griromático',
    'griromática',
    'grisromático',
    'grisromántique',
    'espectro aromático',
    'espectro aro',
    'arospectro',
    'aroace',
    'acearo',
    'aaro',
    'aace',
    'arro ace',
    'ace arro',
    'lgbtqia',
    'queer',
    'orgullo',
    'identidad',
    'orientación'
  ],
  de: [
    'asexuell',
    'ace',
    'acespec',
    'asexualität',
    'demisexuell',
    'grausexuell',
    'aspektrum',
    'aromantisch',
    'aro',
    'arospec',
    'demiromantisch',
    'grauromantisch',
    'arospektrum',
    'aroace',
    'acearo',
    'aaro',
    'aace',
    'lgbtqia',
    'queer',
    'stolz',
    'identität',
    'orientierung'
  ],
  fr: [
    'asexuel',
    'asexuelle',
    'ace',
    'acespec',
    'asexualité',
    'demisexuel',
    'demisexuelle',
    'grisexuel',
    'grisexuelle',
    'aromantique',
    'aro',
    'arospec',
    'aromanticism',
    'demiromantique',
    'grayromantic',
    'greyromantic',
    'arospectrum',
    'aroace',
    'acearo',
    'aaro',
    'aace',
    'lgbtqia',
    'queer',
    'fierté',
    'identité',
    'orientation'
  ],
  // Common structure
  microlabels: [
    'aroace',
    'aromantic asexual',
    'aro ace',
    'aro/ace',
    'aroacespec',
    'aroace-spec',
    'aroaceflux',
    'aroace flux',
    'aceflux',
    'acefluido',
    'acefluid',
    'aceflux',
    'acespike',
    'aceflor',
    'aceflower'
  ],
  hashtags: [
    '#aroace',
    '#aroacespec',
    '#aroaceflux',
    '#aromantic_asexual',
    '#aroacecommunity',
    '#asexual',
    '#asexualidad',
    '#asexualität',
    '#asexualité',
    '#aromantic',
    '#aromántique',
    '#aromantisch',
    '#aromantique',
    '#homoromantico',
    '#birromantico',
    '#heteroromantico'
  ],
  community: {
    symbols: [
      '💜',
      '🤍',
      '💚',
      '🖤',
      '🧡',
      'black ring',
      'white ring',
      'ace ring',
      'schwarzer ring',
      'weißer ring'
    ],
    culture: [
      'dragon ace',
      'cake ace',
      'garlic bread',
      'ace space',
      'espacio ace',
      'espace ace',
      'ace-raum',
      'pride',
      'identity',
      'orientation',
      'spectrum',
      'community'
    ],
    emoji_patterns: [
      '🖤💜🤍',
      '💜🤍💚',
      '🤍💚🖤',
      '💚🖤🧡',
      '🐉 ace',
      '🍰 ace',
      '💍 ace',
      '💜🤍',
      '🤍💚',
      '💚🖤',
      '🖤🧡'
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
