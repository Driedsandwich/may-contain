import data from './data.json' with { type: 'json' };
export const LANGUAGES = ['en', 'ja', 'fr', 'de', 'es', 'it', 'ko', 'zh'] as const;
export type Language = typeof LANGUAGES[number];
export const ALLERGEN_IDS = ['gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs', 'wheat', 'shrimp', 'crab', 'walnut', 'cashew', 'buckwheat'] as const;
export type AllergenId = typeof ALLERGEN_IDS[number];
export interface Term { text: string; language: Language; source: string; sourceEntry: string; license: string }
export interface Regulation { status: 'mandatory' | 'recommended' | 'partial' | 'not_listed'; source: string; note: string; asOf: string }
export interface Allergen { id: AllergenId; terms: Term[]; regulations: Record<'EU' | 'US' | 'JP', Regulation> }
export const lexicon = data as Allergen[];
export const REGULATORY_SETS = {
  EU: ALLERGEN_IDS.slice(0, 14),
  US: ['milk', 'eggs', 'fish', 'crustaceans', 'nuts', 'peanuts', 'wheat', 'soybeans', 'sesame'],
  JP: ['shrimp', 'cashew', 'crab', 'walnut', 'wheat', 'buckwheat', 'eggs', 'milk', 'peanuts'],
} as const;
