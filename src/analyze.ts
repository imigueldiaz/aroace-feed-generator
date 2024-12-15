import { Record } from './lexicon/types/app/bsky/feed/post'
import * as francAll from 'franc'
const franc = francAll.franc

import { analyzeContent, SupportedLanguage, keywords, KeywordStructure } from './filters'
import dotenv from 'dotenv'
import { logger } from './logger'

dotenv.config()

export function analyzePost(record: Record): boolean {
  if (process.env.DEBUG === 'true') {
    logger.debug('\n=== Starting Post Analysis ===');
    logger.debug('Post text:', record.text);
  }
  
  if (!record.text) {
    if (process.env.DEBUG === 'true') {
      logger.debug('❌ No text found in post');
    }
    return false;
  }
  
  // Detect language if not specified
  let postLang: string = 'und';
  if (!record.langs || record.langs.length === 0) {
    postLang = franc(record.text);
    if (process.env.DEBUG === 'true') {
      logger.debug('🔍 Detected language (franc):', postLang);
    }
  } else {
    postLang = record.langs[0];
    if (process.env.DEBUG === 'true') {
      logger.debug('📝 Specified language:', postLang);
    }
  }

  // Map detected language to supported language
  const languageMapping: { [key: string]: SupportedLanguage } = {
    'eng': 'en',
    'spa': 'es',
    'deu': 'de',
    'fra': 'fr',
    'en': 'en',
    'es': 'es',
    'de': 'de',
    'fr': 'fr',
    'und': 'en' // Default to English if language is undetermined
  };

  // Si el idioma no está en el mapping, intentamos con inglés y español
  const supportedLang: SupportedLanguage = languageMapping[postLang] || 'en';
  const fallbackLangs: SupportedLanguage[] = ['en', 'es'];
  
  if (process.env.DEBUG === 'true') {
    logger.debug('🌍 Primary language:', supportedLang);
    logger.debug('🌍 Will also check:', fallbackLangs.join(', '));
  }

  // Check if the post is in one of the allowed languages
  const allowedLangs = process.env.ACCEPTED_LANGS?.toLowerCase().split(',') || [];
  if (process.env.DEBUG === 'true') {
    logger.debug('✅ Allowed languages:', allowedLangs);
  }

  // Analyze content for sensitive content
  const analysis = analyzeContent(record.text, supportedLang);
  if (analysis.sensitiveTerms.length > 0) {
    if (process.env.DEBUG === 'true') {
      logger.debug('❌ Found sensitive content:', analysis.sensitiveTerms);
    }
    return false;
  }

  // Check if the post is spam
  if (analysis.hasSpam) {
    if (process.env.DEBUG === 'true') {
      logger.debug('❌ Post detected as spam');
    }
    return false;
  }

  // Check if it's just a list of hashtags
  const hashtagCount = (record.text.match(/#/g) || []).length;
  const wordCount = record.text.split(/\s+/).length;
  if (hashtagCount > wordCount * 0.5) {
    if (process.env.DEBUG === 'true') {
      logger.debug('❌ Post contains too many hashtags');
    }
    return false;
  }

  const postText = record.text.toLowerCase();

  // Check specific terms in primary and fallback languages
  let hasSpecificTerms = false;
  const checkedLanguages = [supportedLang, ...fallbackLangs];

  for (const lang of checkedLanguages) {
    const found = keywords.specific_terms[lang].some(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      const termFound = regex.test(postText);
      if (termFound && process.env.DEBUG === 'true') {
        logger.debug(`✨ Found specific aroace term (${lang}):`, term);
      }
      return termFound;
    });

    if (found) {
      hasSpecificTerms = true;
      break;
    }
  }

  if (!hasSpecificTerms) {
    if (process.env.DEBUG === 'true') {
      logger.debug('❌ No specific aroace terms found in any language');
    }
    return false;
  }

  // Check supporting terms in primary and fallback languages
  let hasSupportingTerms = false;
  for (const lang of checkedLanguages) {
    const found = keywords.supporting_terms[lang].some(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      const termFound = regex.test(postText);
      if (termFound && process.env.DEBUG === 'true') {
        logger.debug(`✨ Found supporting term (${lang}):`, term);
      }
      return termFound;
    });

    if (found) {
      hasSupportingTerms = true;
      break;
    }
  }

  // Check for microlabels
  const hasMicrolabels = keywords.microlabels_regex.some(regex => {
    const found = regex.test(postText);
    if (found && process.env.DEBUG === 'true') {
      logger.debug('✨ Found microlabel:', regex.source);
    }
    return found;
  });

  // Check for hashtags
  const hasHashtags = keywords.hashtags.some(tag => {
    const found = postText.includes(tag.toLowerCase());
    if (found && process.env.DEBUG === 'true') {
      logger.debug('✨ Found hashtag:', tag);
    }
    return found;
  });

  // Check for community terms
  const hasCommunitySymbols = keywords.community.symbols.some(symbol => {
    const found = postText.includes(symbol.toLowerCase());
    if (found && process.env.DEBUG === 'true') {
      logger.debug('✨ Found community symbol:', symbol);
    }
    return found;
  });

  const hasCultureTerms = keywords.community.culture.some(term => {
    const found = postText.includes(term.toLowerCase());
    if (found && process.env.DEBUG === 'true') {
      logger.debug('✨ Found culture term:', term);
    }
    return found;
  });

  const hasEmojiPatterns = keywords.community.emoji_patterns.some(pattern => {
    const found = postText.includes(pattern);
    if (found && process.env.DEBUG === 'true') {
      logger.debug('✨ Found emoji pattern:', pattern);
    }
    return found;
  });

  // El post debe tener al menos un término específico y un elemento adicional de contexto
  const hasAdditionalContext = hasSupportingTerms || hasMicrolabels || hasHashtags || 
                             hasCommunitySymbols || hasCultureTerms || hasEmojiPatterns;

  if (process.env.DEBUG === 'true') {
    logger.debug('=== Analysis Results ===');
    logger.debug('Has specific terms:', hasSpecificTerms);
    logger.debug('Has supporting terms:', hasSupportingTerms);
    logger.debug('Has microlabels:', hasMicrolabels);
    logger.debug('Has hashtags:', hasHashtags);
    logger.debug('Has community symbols:', hasCommunitySymbols);
    logger.debug('Has culture terms:', hasCultureTerms);
    logger.debug('Has emoji patterns:', hasEmojiPatterns);
    logger.debug('Has additional context:', hasAdditionalContext);
  }

  return hasSpecificTerms && hasAdditionalContext;
}