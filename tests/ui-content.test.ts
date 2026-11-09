import { expect, it } from "vitest";
import { ALLERGEN_IDS, LANGUAGES } from "../src/lexicon/index.js";
import { checkIngredients } from "../src/match.js";
import {
  allergenName,
  CARD_COPY,
  cardPrefix,
  DEFAULT_ALLERGENS,
  EXAMPLES,
  joiner,
} from "../web/content.js";
it("provides explicit, nonempty names and fixed templates for every supported selection", () => {
  for (const language of LANGUAGES) {
    expect(CARD_COPY[language].before).toBeTruthy();
    expect(CARD_COPY[language].after).toBeTruthy();
    for (const id of ALLERGEN_IDS)
      expect(allergenName(id, language)).toBeTruthy();
    expect(
      new Set(ALLERGEN_IDS.map((id) => allergenName(id, language))).size,
    ).toBe(ALLERGEN_IDS.length);
  }
});
it("the French card uses the requested sentence for the demo selection", () => {
  const sentence =
    CARD_COPY.fr.before +
    DEFAULT_ALLERGENS.map(
      (id, i) =>
        joiner(i, 3, "fr") + cardPrefix(id, "fr") + allergenName(id, "fr"),
    ).join("") +
    CARD_COPY.fr.after;
  expect(sentence).toBe(
    "Je suis allergique au lait, aux arachides et au sésame. Ce produit en contient-il ?",
  );
});
it("example translations preserve per-allergen states and original evidence is sliceable", () => {
  for (const example of EXAMPLES) {
    const original = checkIngredients(example.text, ALLERGEN_IDS);
    const translated = checkIngredients(example.english, ALLERGEN_IDS);
    expect(original.results.map((r) => r.status)).toEqual(
      translated.results.map((r) => r.status),
    );
    for (const result of original.results)
      for (const evidence of result.matches)
        expect(example.text.slice(evidence.start, evidence.end)).toBe(
          evidence.text,
        );
  }
});
