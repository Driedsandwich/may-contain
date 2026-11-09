import { createWorker, type ImageLike, type WorkerOptions } from 'tesseract.js';
export const OCR_LANGUAGES = { en: 'eng', ja: 'jpn', fr: 'fra', de: 'deu', es: 'spa', it: 'ita', ko: 'kor', zh: 'chi_sim' } as const;
export interface OcrDraft {
  originalText: string; editableText: string; confidence: number;
  confidenceScale: '0-100'; requiresHumanReview: true; languageModels: string[];
  notice: string;
}
/** Browser-only OCR. Images are processed by a local web worker; models may be downloaded. */
export async function readIngredientsPhoto(image: ImageLike, languages: (keyof typeof OCR_LANGUAGES)[] = ['en'], options: Partial<WorkerOptions> = {}): Promise<OcrDraft> {
  if (typeof window === 'undefined') throw new Error('readIngredientsPhoto requires a browser.');
  if (!languages.length || languages.some(l => !(l in OCR_LANGUAGES))) throw new Error('Choose supported OCR languages.');
  const models = [...new Set(languages.map(l => OCR_LANGUAGES[l]))];
  const worker = await createWorker(models, 1, options);
  try {
    const { data } = await worker.recognize(image);
    return { originalText: data.text, editableText: data.text, confidence: data.confidence, confidenceScale: '0-100', requiresHumanReview: true, languageModels: models,
      notice: 'Review and correct all text against the package before checking. OCR confidence is not a probability that an allergen is absent.' };
  } finally { await worker.terminate(); }
}
