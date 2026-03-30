from sklearn.feature_extraction.text import TfidfVectorizer

def extract_tfidf_features(corpus):
    """
    Extracts TF-IDF features from a corpus of documents.
    """
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(corpus)
    return tfidf_matrix, vectorizer
