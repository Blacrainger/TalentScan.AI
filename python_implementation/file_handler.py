import PyPDF2
import docx
import os
import zipfile
import io

def extract_text_from_pdf(file_content):
    """Extracts text from a PDF file content."""
    text = ""
    reader = PyPDF2.PdfReader(io.BytesIO(file_content))
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def extract_text_from_docx(file_content):
    """Extracts text from a DOCX file content."""
    doc = docx.Document(io.BytesIO(file_content))
    text = "\n".join([para.text for para in doc.paragraphs])
    return text

def read_cv(file_path):
    """Reads a CV file based on its extension or extracts from ZIP."""
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".zip":
        extracted_texts = []
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            for member in zip_ref.namelist():
                if member.endswith(('.pdf', '.docx')):
                    content = zip_ref.read(member)
                    if member.endswith('.pdf'):
                        text = extract_text_from_pdf(content)
                    else:
                        text = extract_text_from_docx(content)
                    extracted_texts.append((member, text))
        return extracted_texts
    
    with open(file_path, "rb") as f:
        content = f.read()
        if ext == ".pdf":
            return [(file_path, extract_text_from_pdf(content))]
        elif ext == ".docx":
            return [(file_path, extract_text_from_docx(content))]
        else:
            raise ValueError(f"Unsupported file format: {ext}")
