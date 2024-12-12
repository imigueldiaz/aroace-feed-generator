import { Record } from './lexicon/types/app/bsky/feed/post'
// Cambiar la importación de franc
import * as francAll from 'franc'
const franc = francAll.franc

import { analyzeContent, SupportedLanguage, keywords } from './filters'
import dotenv from 'dotenv'

dotenv.config()

export function analyzePost(record: Record): boolean {
  if(!record.text) return false
  
  let postLang: string = 'und'
  
  if(!record.langs || record.langs.length === 0) {
    postLang = franc(record.text)
  }
  
  // Check if the post is in one of the allowed languages
  const allowedLangs = process.env.ALLOWED_LANGS?.toLowerCase().split(',') || []
  if(!record.langs?.some(lang => allowedLangs.includes(lang.toLowerCase()))) 
    return false
  
  postLang = record.langs[0]
  
  // Check if the post contains aroace keywords
  const postText: string = record.text.toLowerCase()
  
  // Check language-specific keywords
  const langKeywords = keywords[postLang as SupportedLanguage]
  if (Array.isArray(langKeywords) && !langKeywords.some(word => postText.includes(word.toLowerCase()))) {
    return false
  }

  // Check for community terms
  const communityTerms = keywords.community[postLang as SupportedLanguage]
  if (!Array.isArray(communityTerms) || !communityTerms.some(word => postText.includes(word.toLowerCase()))) {
    return false
  }

  // Check for microlabels
  if (!keywords.microlabels.some(word => postText.includes(word.toLowerCase()))) {
    return false
  }

  // Check for hashtags
  if (!keywords.hashtags.some(tag => postText.includes(tag.toLowerCase()))) {
    return false
  }

  // Check if the post contains sensitive content
  const sensitiveContent = analyzeContent(postText, postLang as SupportedLanguage)
  if(sensitiveContent.hasSpam || sensitiveContent.sensitiveTerms.length > 0 || sensitiveContent.isGamingContext) 
    return false
  
  return true
}