import * as _pdf from 'pdf-parse';
import * as _mammoth from 'mammoth';

const pdf = (_pdf as any).default || _pdf;
const mammoth = (_mammoth as any).default || _mammoth;

/**
 * Handles reading text from PDF and DOCX files.
 */
export async function extractTextFromFile(buffer: Buffer, originalName: string): Promise<string> {
  const extension = originalName.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') {
    const data = await pdf(buffer);
    return data.text;
  } else if (extension === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else {
    throw new Error(`Unsupported file extension: .${extension}. Only .pdf and .docx are supported.`);
  }
}
