import google.generativeai as genai
import os
import json

# Configure Gemini API
# genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_ai_summary(cv_text):
    """Generates a short summary of the candidate using AI."""
    model = genai.GenerativeModel('gemini-pro')
    prompt = f"Provide a concise professional summary of this candidate's CV:\n\n{cv_text[:4000]}"
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"AI Summary Error: {str(e)}"

def extract_skills_ai(text):
    """Extracts key skills from text using AI."""
    model = genai.GenerativeModel('gemini-pro')
    prompt = f"Extract key professional skills from this text. Return as a comma-separated list:\n\n{text[:4000]}"
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"AI Skill Extraction Error: {str(e)}"

def explain_match_ai(cv_text, jd_text):
    """Explains why a CV matches a job description using AI."""
    model = genai.GenerativeModel('gemini-pro')
    prompt = f"Explain why this CV matches the job description. Highlight specific matched skills:\n\nCV: {cv_text[:2000]}\n\nJD: {jd_text[:2000]}"
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"AI Explanation Error: {str(e)}"
