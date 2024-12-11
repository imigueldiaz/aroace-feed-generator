// content-filters.ts
import { SupportedLanguage, gamingContexts } from './content-types';

// Spam detection patterns
export const spamPatterns: Record<SupportedLanguage, RegExp> = {
  en: /\b(buy|sell|discount|offer|promo|click|win|sale|deal)\b/gi,
  es: /\b(comprar|vender|descuento|oferta|promo|clic|ganar|venta|promoción)\b/gi,
  de: /\b(kaufen|verkaufen|rabatt|angebot|promo|klicken|gewinnen|verkauf)\b/gi,
  fr: /\b(acheter|vendre|réduction|offre|promo|cliquer|gagner|vente|promotion)\b/gi,
};

// Sensitive content definition
const SENSITIVE_CONTENT: Record<SupportedLanguage, string[]> = {
  en: [
    // Explicit content
    'nsfw',
    'explicit',
    'xxx',
    'porn',
    // Potentially harmful terms for the aroace community
    'broken',
    'fix you',
    'not human',
    'robot',
    'emotionless',
    "just haven't found",
    "haven't met",
    "haven't found",
    'will change',
    'phase',
    'grow out',
    'get over it',
    'everyone feels',
    'everyone experiences',
    'normal people',
    'conversion therapy',
    'cure',
    'treatment',
    'heal',
    // Violence or disturbing content
    'suicide',
    'death',
    'kill',
    'die',
    'blood',
    'trigger warning',
  ],
  es: [
    'nsfw',
    'explícito',
    'xxx',
    'porno',
    'roto',
    'arreglarte',
    'no humano',
    'robot',
    'sin emociones',
    'no has encontrado',
    'no has conocido',
    'cambiará',
    'fase',
    'superarás',
    'todo el mundo siente',
    'todo el mundo experimenta',
    'gente normal',
    'terapia de conversión',
    'cura',
    'tratamiento',
    'sanar',
    'suicidio',
    'muerte',
    'matar',
    'morir',
    'sangre',
    'aviso de contenido sensible',
  ],
  de: [
    'nsfw',
    'explizit',
    'xxx',
    'porno',
    'kaputt',
    'reparieren',
    'nicht menschlich',
    'roboter',
    'emotionslos',
    'noch nicht gefunden',
    'noch nicht getroffen',
    'wird sich ändern',
    'phase',
    'wächst sich aus',
    'jeder fühlt',
    'jeder erlebt',
    'normale menschen',
    'konversionstherapie',
    'heilung',
    'behandlung',
    'heilen',
    'selbstmord',
    'tod',
    'töten',
    'sterben',
    'blut',
    'triggerwarnung',
  ],
  fr: [
    'nsfw',
    'explicite',
    'xxx',
    'porno',
    'cassé',
    'réparer',
    'pas humain',
    'robot',
    'sans émotions',
    "n'as pas trouvé",
    "n'as pas rencontré",
    'changera',
    'phase',
    'passera',
    'tout le monde ressent',
    'tout le monde expérimente',
    'gens normaux',
    'thérapie de conversion',
    'guérison',
    'traitement',
    'guérir',
    'suicide',
    'mort',
    'tuer',
    'mourir',
    'sang',
    'avertissement de contenu',
  ],
};

/**
 * Function to detect gaming context in text
 * @param text - The text to analyze
 * @param language - The language of the text (defaults to 'en')
 * @returns boolean indicating if gaming context was detected
 */
export function hasGamingContext(text: string, language: SupportedLanguage = 'en'): boolean {
  text = text.toLowerCase();

  // Check for gaming context words before "ace"
  const beforeWords = gamingContexts[language]?.before || gamingContexts.en.before;
  const hasBeforeContext = beforeWords.some((word) => {
    const beforeAce = text.indexOf('ace');
    if (beforeAce === -1) return false;
    const beforeText = text.substring(0, beforeAce).toLowerCase();
    return beforeText.includes(word.toLowerCase());
  });

  // Check for gaming context words after "ace"
  const afterWords = gamingContexts[language]?.after || gamingContexts.en.after;
  const hasAfterContext = afterWords.some((word) => {
    const aceIndex = text.indexOf('ace');
    if (aceIndex === -1) return false;
    const afterAce = aceIndex + 3;
    const afterText = text.substring(afterAce).toLowerCase();
    return afterText.includes(word.toLowerCase());
  });

  return hasBeforeContext || hasAfterContext;
}

/**
 * Get sensitive terms for a specific language
 * @param language - The language to get sensitive terms for
 * @returns Array of sensitive terms for the specified language
 */
export function getSensitiveTerms(language: SupportedLanguage): string[] {
  return SENSITIVE_CONTENT[language] || SENSITIVE_CONTENT.en;
}

/**
 * Check if text contains spam patterns
 * @param text - The text to analyze
 * @param language - The language of the text
 * @returns boolean indicating if spam was detected
 */
export function containsSpam(text: string, language: SupportedLanguage = 'en'): boolean {
  return spamPatterns[language].test(text);
}

/**
 * Check if text contains sensitive content
 * @param text - The text to analyze
 * @param language - The language of the text
 * @returns Array of found sensitive terms, empty if none found
 */
export function detectSensitiveContent(text: string, language: SupportedLanguage = 'en'): string[] {
  const sensitiveTerms = getSensitiveTerms(language);
  const lowerText = text.toLowerCase();
  
  return sensitiveTerms.filter(term => lowerText.includes(term.toLowerCase()));
}

/**
 * Full content analysis
 * @param text - The text to analyze
 * @param language - The language of the text
 * @returns Object with analysis results
 */
export interface ContentAnalysis {
  hasSpam: boolean;
  sensitiveTerms: string[];
  isGamingContext: boolean;
}

export function analyzeContent(text: string, language: SupportedLanguage = 'en'): ContentAnalysis {
  return {
    hasSpam: containsSpam(text, language),
    sensitiveTerms: detectSensitiveContent(text, language),
    isGamingContext: hasGamingContext(text, language)
  };
}
