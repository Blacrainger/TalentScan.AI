import natural from 'natural';

const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const stopwords = new Set(natural.stopwords);

/**
 * Preprocesses text: lowercasing, tokenization, stopword removal, and stemming (as a proxy for lemmatization in JS).
 */
export function preprocessText(text: string): string {
  if (!text) return '';

  // Lowercasing
  const lowerText = text.toLowerCase();

  // Tokenization
  const tokens = tokenizer.tokenize(lowerText) || [];

  // Stopword removal and Stemming
  const processedTokens = tokens
    .filter(token => !stopwords.has(token) && token.length > 1)
    .map(token => stemmer.stem(token));

  return processedTokens.join(' ');
}
