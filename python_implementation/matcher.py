from sklearn.metrics.pairwise import cosine_similarity

def compute_similarity(jd_vector, cv_vectors):
    """
    Computes cosine similarity between the job description and each CV.
    """
    # jd_vector is the first row, cv_vectors are the rest
    similarities = cosine_similarity(jd_vector, cv_vectors)
    return similarities[0]

def rank_candidates(file_names, scores):
    """
    Ranks candidates from highest to lowest score.
    """
    results = list(zip(file_names, scores))
    results.sort(key=lambda x: x[1], reverse=True)
    return results
