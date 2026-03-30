import natural from 'natural';

/**
 * Extracts TF-IDF features from a corpus of documents.
 */
export function extractTfIdfFeatures(documents: string[]): natural.TfIdf {
  const tfidf = new natural.TfIdf();
  
  documents.forEach(doc => {
    tfidf.addDocument(doc);
  });

  return tfidf;
}

/**
 * Converts a document into a vector based on the TF-IDF model.
 */
export function getTfIdfVector(tfidf: natural.TfIdf, docIndex: number): Record<string, number> {
  const vector: Record<string, number> = {};
  tfidf.listTerms(docIndex).forEach(item => {
    vector[item.term] = item.tfidf;
  });
  return vector;
}
