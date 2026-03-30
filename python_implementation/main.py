import os
from file_handler import read_cv
from preprocessing import preprocess_text
from feature_extraction import extract_tfidf_features
from matcher import compute_similarity, rank_candidates
import ai_enhancement  # Optional AI features

def run_cv_screener(cv_folder, jd_text, use_ai=False):
    """
    Main function to run the CV screening and ranking system.
    """
    print("--- TalentScan CV Screener ---")
    
    # 1. Load CVs
    cv_files = [f for f in os.listdir(cv_folder) if f.endswith(('.pdf', '.docx', '.zip'))]
    cv_texts = []
    file_names = []
    
    for file_name in cv_files:
        try:
            results = read_cv(os.path.join(cv_folder, file_name))
            for name, text in results:
                cv_texts.append(text)
                file_names.append(name)
        except Exception as e:
            print(f"Error reading {file_name}: {e}")

    if not cv_texts:
        print("No valid CVs found.")
        return

    # 2. Preprocessing
    print("Preprocessing texts...")
    processed_jd = preprocess_text(jd_text)
    processed_cvs = [preprocess_text(text) for text in cv_texts]
    
    # 3. Feature Extraction (TF-IDF)
    print("Extracting features...")
    corpus = [processed_jd] + processed_cvs
    tfidf_matrix, vectorizer = extract_tfidf_features(corpus)
    
    # 4. Matching (Cosine Similarity)
    print("Computing similarity scores...")
    jd_vector = tfidf_matrix[0:1]
    cv_vectors = tfidf_matrix[1:]
    scores = compute_similarity(jd_vector, cv_vectors)
    
    # 5. Ranking
    ranked_results = rank_candidates(file_names, scores)
    
    # Output Results
    print("\n--- Ranking Results ---")
    for name, score in ranked_results:
        match_percentage = round(score * 100, 2)
        print(f"Candidate: {name} | Match Score: {match_percentage}%")
        
        # Optional AI enhancements
        if use_ai:
            print(f"  [AI Summary]: {ai_enhancement.get_ai_summary(cv_texts[file_names.index(name)])}")
            print(f"  [AI Explanation]: {ai_enhancement.explain_match_ai(cv_texts[file_names.index(name)], jd_text)}")
            print("-" * 30)

if __name__ == "__main__":
    # Example usage
    example_jd = "We are looking for a Python Developer with experience in Machine Learning and NLP."
    # Assuming 'cv_uploads' directory exists with some PDF/DOCX files
    # run_cv_screener("cv_uploads", example_jd, use_ai=True)
    print("System ready. Configure 'cv_uploads' directory and run with a job description.")
