# Observed evaluation

Run: 2026-11-09T00:47:30.371Z. End: 2026-11-09T00:52:27.922Z.

**90 unique products measured**, from 12 search requests. Target: approximately 100; no synthetic or duplicated products fill missing quotas. Selected top-scanned OFF search pages with nonempty ingredient text and nonempty allergens_tags. One language per barcode. Language is the OFF field label, not verified language detection.

Reference: Open Food Facts contributors (ODbL 1.0). **allergens_tags are community-entered and/or derived annotations and can be wrong or incomplete.** Agreement with them is not clinical validation. OFF's own taxonomy/parser overlaps the dictionary source, so this benchmark is not independent and may overestimate performance. Empty tags were excluded, creating positive-label selection bias.

Only exact OFF category tags are compared. contains is positive; may_contain and not_found are negative for this experiment. Precaution and negation behavior is tested separately with synthetic text. Precision = TP/(TP+FP), recall = TP/(TP+FN); zero denominators are N/A. No threshold tuning was performed on these rows.

## Per allergen

| Group | Products | TP | FP | FN | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| gluten | 90 | 34 | 0 | 4 | 1.000 | 0.895 |
| crustaceans | 90 | 1 | 0 | 0 | 1.000 | 1.000 |
| eggs | 90 | 8 | 3 | 1 | 0.727 | 0.889 |
| fish | 90 | 0 | 1 | 0 | 0.000 | N/A |
| peanuts | 90 | 5 | 2 | 1 | 0.714 | 0.833 |
| soybeans | 90 | 16 | 5 | 11 | 0.762 | 0.593 |
| milk | 90 | 30 | 7 | 5 | 0.811 | 0.857 |
| nuts | 90 | 19 | 4 | 5 | 0.826 | 0.792 |
| celery | 90 | 2 | 0 | 1 | 1.000 | 0.667 |
| mustard | 90 | 0 | 1 | 1 | 0.000 | 0.000 |
| sesame | 90 | 2 | 1 | 2 | 0.667 | 0.500 |
| sulphites | 90 | 0 | 0 | 1 | N/A | 0.000 |
| lupin | 90 | 0 | 1 | 0 | 0.000 | N/A |
| molluscs | 90 | 1 | 0 | 0 | 1.000 | 1.000 |
| wheat | 0 | N/A | N/A | N/A | N/A | N/A |
| shrimp | 0 | N/A | N/A | N/A | N/A | N/A |
| crab | 0 | N/A | N/A | N/A | N/A | N/A |
| walnut | 0 | N/A | N/A | N/A | N/A | N/A |
| cashew | 0 | N/A | N/A | N/A | N/A | N/A |
| buckwheat | 0 | N/A | N/A | N/A | N/A | N/A |

Wheat, shrimp, crab, walnut, cashew and buckwheat are not scored: the standard OFF reference categories do not provide reliable separate labels for these subtypes/Japanese-only categories. Parent tags must not be treated as proof of a particular subtype.

## By language (micro-average over 14 comparable categories)

| Group | Products | TP | FP | FN | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| en | 20 | 21 | 8 | 11 | 0.724 | 0.656 |
| ja | 10 | 11 | 0 | 10 | 1.000 | 0.524 |
| fr | 20 | 28 | 8 | 1 | 0.778 | 0.966 |
| de | 15 | 22 | 0 | 1 | 1.000 | 0.957 |
| es | 10 | 11 | 1 | 1 | 0.917 | 0.917 |
| it | 10 | 15 | 2 | 5 | 0.882 | 0.750 |
| ko | 5 | 10 | 6 | 3 | 0.625 | 0.769 |
| zh | 0 | 0 | 0 | 0 | N/A | N/A |

## Per language and allergen

| Group | Products | TP | FP | FN | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| en / gluten | 20 | 9 | 0 | 1 | 1.000 | 0.900 |
| en / crustaceans | 20 | 0 | 0 | 0 | N/A | N/A |
| en / eggs | 20 | 1 | 2 | 1 | 0.333 | 0.500 |
| en / fish | 20 | 0 | 0 | 0 | N/A | N/A |
| en / peanuts | 20 | 2 | 0 | 0 | 1.000 | 1.000 |
| en / soybeans | 20 | 0 | 1 | 4 | 0.000 | 0.000 |
| en / milk | 20 | 5 | 1 | 3 | 0.833 | 0.625 |
| en / nuts | 20 | 2 | 1 | 2 | 0.667 | 0.500 |
| en / celery | 20 | 0 | 0 | 0 | N/A | N/A |
| en / mustard | 20 | 0 | 1 | 0 | 0.000 | N/A |
| en / sesame | 20 | 2 | 1 | 0 | 0.667 | 1.000 |
| en / sulphites | 20 | 0 | 0 | 0 | N/A | N/A |
| en / lupin | 20 | 0 | 1 | 0 | 0.000 | N/A |
| en / molluscs | 20 | 0 | 0 | 0 | N/A | N/A |
| ja / gluten | 10 | 3 | 0 | 3 | 1.000 | 0.500 |
| ja / crustaceans | 10 | 0 | 0 | 0 | N/A | N/A |
| ja / eggs | 10 | 1 | 0 | 0 | 1.000 | 1.000 |
| ja / fish | 10 | 0 | 0 | 0 | N/A | N/A |
| ja / peanuts | 10 | 0 | 0 | 0 | N/A | N/A |
| ja / soybeans | 10 | 4 | 0 | 2 | 1.000 | 0.667 |
| ja / milk | 10 | 3 | 0 | 2 | 1.000 | 0.600 |
| ja / nuts | 10 | 0 | 0 | 1 | N/A | 0.000 |
| ja / celery | 10 | 0 | 0 | 0 | N/A | N/A |
| ja / mustard | 10 | 0 | 0 | 1 | N/A | 0.000 |
| ja / sesame | 10 | 0 | 0 | 1 | N/A | 0.000 |
| ja / sulphites | 10 | 0 | 0 | 0 | N/A | N/A |
| ja / lupin | 10 | 0 | 0 | 0 | N/A | N/A |
| ja / molluscs | 10 | 0 | 0 | 0 | N/A | N/A |
| fr / gluten | 20 | 9 | 0 | 0 | 1.000 | 1.000 |
| fr / crustaceans | 20 | 0 | 0 | 0 | N/A | N/A |
| fr / eggs | 20 | 2 | 1 | 0 | 0.667 | 1.000 |
| fr / fish | 20 | 0 | 1 | 0 | 0.000 | N/A |
| fr / peanuts | 20 | 1 | 1 | 0 | 0.500 | 1.000 |
| fr / soybeans | 20 | 2 | 1 | 1 | 0.667 | 0.667 |
| fr / milk | 20 | 8 | 2 | 0 | 0.800 | 1.000 |
| fr / nuts | 20 | 5 | 2 | 0 | 0.714 | 1.000 |
| fr / celery | 20 | 1 | 0 | 0 | 1.000 | 1.000 |
| fr / mustard | 20 | 0 | 0 | 0 | N/A | N/A |
| fr / sesame | 20 | 0 | 0 | 0 | N/A | N/A |
| fr / sulphites | 20 | 0 | 0 | 0 | N/A | N/A |
| fr / lupin | 20 | 0 | 0 | 0 | N/A | N/A |
| fr / molluscs | 20 | 0 | 0 | 0 | N/A | N/A |
| de / gluten | 15 | 5 | 0 | 0 | 1.000 | 1.000 |
| de / crustaceans | 15 | 0 | 0 | 0 | N/A | N/A |
| de / eggs | 15 | 3 | 0 | 0 | 1.000 | 1.000 |
| de / fish | 15 | 0 | 0 | 0 | N/A | N/A |
| de / peanuts | 15 | 1 | 0 | 0 | 1.000 | 1.000 |
| de / soybeans | 15 | 3 | 0 | 1 | 1.000 | 0.750 |
| de / milk | 15 | 4 | 0 | 0 | 1.000 | 1.000 |
| de / nuts | 15 | 6 | 0 | 0 | 1.000 | 1.000 |
| de / celery | 15 | 0 | 0 | 0 | N/A | N/A |
| de / mustard | 15 | 0 | 0 | 0 | N/A | N/A |
| de / sesame | 15 | 0 | 0 | 0 | N/A | N/A |
| de / sulphites | 15 | 0 | 0 | 0 | N/A | N/A |
| de / lupin | 15 | 0 | 0 | 0 | N/A | N/A |
| de / molluscs | 15 | 0 | 0 | 0 | N/A | N/A |
| es / gluten | 10 | 2 | 0 | 0 | 1.000 | 1.000 |
| es / crustaceans | 10 | 0 | 0 | 0 | N/A | N/A |
| es / eggs | 10 | 0 | 0 | 0 | N/A | N/A |
| es / fish | 10 | 0 | 0 | 0 | N/A | N/A |
| es / peanuts | 10 | 0 | 0 | 0 | N/A | N/A |
| es / soybeans | 10 | 4 | 0 | 1 | 1.000 | 0.800 |
| es / milk | 10 | 2 | 1 | 0 | 0.667 | 1.000 |
| es / nuts | 10 | 2 | 0 | 0 | 1.000 | 1.000 |
| es / celery | 10 | 1 | 0 | 0 | 1.000 | 1.000 |
| es / mustard | 10 | 0 | 0 | 0 | N/A | N/A |
| es / sesame | 10 | 0 | 0 | 0 | N/A | N/A |
| es / sulphites | 10 | 0 | 0 | 0 | N/A | N/A |
| es / lupin | 10 | 0 | 0 | 0 | N/A | N/A |
| es / molluscs | 10 | 0 | 0 | 0 | N/A | N/A |
| it / gluten | 10 | 3 | 0 | 0 | 1.000 | 1.000 |
| it / crustaceans | 10 | 0 | 0 | 0 | N/A | N/A |
| it / eggs | 10 | 0 | 0 | 0 | N/A | N/A |
| it / fish | 10 | 0 | 0 | 0 | N/A | N/A |
| it / peanuts | 10 | 1 | 0 | 1 | 1.000 | 0.500 |
| it / soybeans | 10 | 2 | 1 | 1 | 0.667 | 0.667 |
| it / milk | 10 | 6 | 1 | 0 | 0.857 | 1.000 |
| it / nuts | 10 | 3 | 0 | 2 | 1.000 | 0.600 |
| it / celery | 10 | 0 | 0 | 0 | N/A | N/A |
| it / mustard | 10 | 0 | 0 | 0 | N/A | N/A |
| it / sesame | 10 | 0 | 0 | 0 | N/A | N/A |
| it / sulphites | 10 | 0 | 0 | 1 | N/A | 0.000 |
| it / lupin | 10 | 0 | 0 | 0 | N/A | N/A |
| it / molluscs | 10 | 0 | 0 | 0 | N/A | N/A |
| ko / gluten | 5 | 3 | 0 | 0 | 1.000 | 1.000 |
| ko / crustaceans | 5 | 1 | 0 | 0 | 1.000 | 1.000 |
| ko / eggs | 5 | 1 | 0 | 0 | 1.000 | 1.000 |
| ko / fish | 5 | 0 | 0 | 0 | N/A | N/A |
| ko / peanuts | 5 | 0 | 1 | 0 | 0.000 | N/A |
| ko / soybeans | 5 | 1 | 2 | 1 | 0.333 | 0.500 |
| ko / milk | 5 | 2 | 2 | 0 | 0.500 | 1.000 |
| ko / nuts | 5 | 1 | 1 | 0 | 0.500 | 1.000 |
| ko / celery | 5 | 0 | 0 | 1 | N/A | 0.000 |
| ko / mustard | 5 | 0 | 0 | 0 | N/A | N/A |
| ko / sesame | 5 | 0 | 0 | 1 | N/A | 0.000 |
| ko / sulphites | 5 | 0 | 0 | 0 | N/A | N/A |
| ko / lupin | 5 | 0 | 0 | 0 | N/A | N/A |
| ko / molluscs | 5 | 1 | 0 | 0 | 1.000 | 1.000 |
| zh / gluten | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / crustaceans | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / eggs | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / fish | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / peanuts | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / soybeans | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / milk | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / nuts | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / celery | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / mustard | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / sesame | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / sulphites | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / lupin | 0 | 0 | 0 | 0 | N/A | N/A |
| zh / molluscs | 0 | 0 | 0 | 0 | N/A | N/A |

## Acquisition log

| Language | Page | Returned products | Error |
|---|---:|---:|---|
| en | 1 | 100 |  |
| ja | 1 | 0 | Open Food Facts returned HTTP 503. |
| ja | 1 | 100 |  |
| fr | 1 | 100 |  |
| de | 1 | 100 |  |
| es | 1 | 0 | Open Food Facts returned HTTP 503. |
| es | 1 | 100 |  |
| it | 1 | 100 |  |
| ko | 1 | 0 | Open Food Facts returned HTTP 503. |
| ko | 1 | 100 |  |
| zh | 1 | 0 | Open Food Facts returned HTTP 503. |
| zh | 1 | 0 | Open Food Facts returned HTTP 503. |

No product-level data are distributed. Temporary API responses are removed in finally, even on failure. Re-running may select different products as OFF changes. Only aggregate counts and a SHA-256 of the measured corpus remain.

Corpus SHA-256: `939e1f6140e8cdfd5e7e321155e8cd8f56964013b712adb23f17952d4f900f75`.
