import {
  ALLERGEN_IDS,
  type AllergenId,
  type Language,
} from "../src/lexicon/index";

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  ja: "Japanese",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  ko: "Korean",
  zh: "Chinese (Simplified)",
};
export const NATIVE_NAMES: Record<Language, string> = {
  en: "English",
  ja: "日本語",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  ko: "한국어",
  zh: "中文",
};
// Fixed, editable display copy; never generated at runtime. Order follows ALLERGEN_IDS.
const names: Record<Language, string[]> = {
  en: [
    "gluten",
    "crustaceans",
    "eggs",
    "fish",
    "peanuts",
    "soybeans",
    "milk",
    "tree nuts",
    "celery",
    "mustard",
    "sesame",
    "sulphites",
    "lupin",
    "molluscs",
    "wheat",
    "shrimp",
    "crab",
    "walnuts",
    "cashews",
    "buckwheat",
  ],
  fr: [
    "gluten",
    "crustacés",
    "œufs",
    "poisson",
    "arachides",
    "soja",
    "lait",
    "fruits à coque",
    "céleri",
    "moutarde",
    "sésame",
    "sulfites",
    "lupin",
    "mollusques",
    "blé",
    "crevettes",
    "crabe",
    "noix",
    "noix de cajou",
    "sarrasin",
  ],
  de: [
    "Gluten",
    "Krebstiere",
    "Eier",
    "Fisch",
    "Erdnüsse",
    "Sojabohnen",
    "Milch",
    "Schalenfrüchte",
    "Sellerie",
    "Senf",
    "Sesam",
    "Sulfite",
    "Lupinen",
    "Weichtiere",
    "Weizen",
    "Garnelen",
    "Krabben",
    "Walnüsse",
    "Cashewkerne",
    "Buchweizen",
  ],
  es: [
    "gluten",
    "crustáceos",
    "huevos",
    "pescado",
    "cacahuetes",
    "soja",
    "leche",
    "frutos de cáscara",
    "apio",
    "mostaza",
    "sésamo",
    "sulfitos",
    "altramuces",
    "moluscos",
    "trigo",
    "gambas",
    "cangrejo",
    "nueces",
    "anacardos",
    "trigo sarraceno",
  ],
  it: [
    "glutine",
    "crostacei",
    "uova",
    "pesce",
    "arachidi",
    "soia",
    "latte",
    "frutta a guscio",
    "sedano",
    "senape",
    "sesamo",
    "solfiti",
    "lupini",
    "molluschi",
    "grano",
    "gamberi",
    "granchio",
    "noci",
    "anacardi",
    "grano saraceno",
  ],
  ja: [
    "グルテン",
    "甲殻類",
    "卵",
    "魚",
    "落花生",
    "大豆",
    "乳",
    "木の実類",
    "セロリ",
    "マスタード",
    "ごま",
    "亜硫酸塩",
    "ルピナス",
    "軟体動物",
    "小麦",
    "えび",
    "かに",
    "くるみ",
    "カシューナッツ",
    "そば",
  ],
  ko: [
    "글루텐",
    "갑각류",
    "달걀",
    "생선",
    "땅콩",
    "대두",
    "우유",
    "견과류",
    "셀러리",
    "겨자",
    "참깨",
    "아황산염",
    "루핀",
    "연체동물",
    "밀",
    "새우",
    "게",
    "호두",
    "캐슈넛",
    "메밀",
  ],
  zh: [
    "麸质",
    "甲壳类",
    "鸡蛋",
    "鱼",
    "花生",
    "大豆",
    "牛奶",
    "树坚果",
    "芹菜",
    "芥末",
    "芝麻",
    "亚硫酸盐",
    "羽扇豆",
    "软体动物",
    "小麦",
    "虾",
    "蟹",
    "核桃",
    "腰果",
    "荞麦",
  ],
};
export const allergenName = (id: AllergenId, lang: Language = "en") =>
  names[lang][ALLERGEN_IDS.indexOf(id)];
export const displayName = (id: AllergenId) =>
  id === "peanuts"
    ? "Peanut"
    : allergenName(id).replace(/^./, (c) => c.toUpperCase());
export const CARD_COPY: Record<
  Language,
  { before: string; after: string; and: string }
> = {
  en: {
    before: "I am allergic to ",
    after: ". Does this product contain any of them?",
    and: " and ",
  },
  fr: {
    before: "Je suis allergique ",
    after: ". Ce produit en contient-il ?",
    and: " et ",
  },
  de: {
    before: "Ich bin allergisch gegen ",
    after: ". Enthält dieses Produkt etwas davon?",
    and: " und ",
  },
  es: {
    before: "Tengo alergia a estos alimentos: ",
    after: ". ¿Este producto contiene alguno de ellos?",
    and: " y ",
  },
  it: {
    before: "Ho un’allergia a questi alimenti: ",
    after: ". Questo prodotto ne contiene qualcuno?",
    and: " e ",
  },
  ja: {
    before: "私は",
    after: "のアレルギーがあります。この商品に含まれていますか？",
    and: "、",
  },
  ko: {
    before: "저는 다음 식품에 알레르기가 있습니다: ",
    after: ". 이 제품에 포함되어 있나요?",
    and: ", ",
  },
  zh: {
    before: "我对以下食物过敏：",
    after: "。这个产品含有这些食物吗？",
    and: "和",
  },
};
const frenchPrefixes = [
  "au ",
  "aux ",
  "aux ",
  "au ",
  "aux ",
  "au ",
  "au ",
  "aux ",
  "au ",
  "à la ",
  "au ",
  "aux ",
  "au ",
  "aux ",
  "au ",
  "aux ",
  "au ",
  "aux ",
  "aux ",
  "au ",
];
export const cardPrefix = (id: AllergenId, lang: Language) =>
  lang === "fr" ? frenchPrefixes[ALLERGEN_IDS.indexOf(id)] : "";
export const joiner = (index: number, count: number, lang: Language) =>
  index === 0
    ? ""
    : index === count - 1
      ? CARD_COPY[lang].and
      : lang === "ja" || lang === "zh"
        ? "、"
        : ", ";
export const DEFAULT_ALLERGENS: AllergenId[] = ["milk", "peanuts", "sesame"];
export const EXAMPLES = [
  {
    language: "fr" as Language,
    name: "Almond oat bites",
    text: "Ingrédients : avoine, amandes, lait. Peut contenir des arachides.",
    english: "Ingredients: oats, almonds, milk. May contain peanuts.",
  },
  {
    language: "de" as Language,
    name: "Almond oat bites",
    text: "Zutaten: Hafer, Mandeln, Milch. Kann Spuren von Erdnüssen enthalten.",
    english: "Ingredients: oats, almonds, milk. May contain peanuts.",
  },
  {
    language: "ja" as Language,
    name: "Rice crackers",
    text: "原材料：米、塩。",
    english: "Ingredients: rice, salt.",
  },
];
export const PROFILE_KEY = "may-contain.allergens.v1";
export function readProfile(): { allergens: AllergenId[]; saved: boolean } {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((id) => ALLERGEN_IDS.includes(id))
      )
        return { allergens: [...new Set(value)] as AllergenId[], saved: true };
    }
  } catch {
    /* Storage can be disabled; the app still works in memory. */
  }
  return { allergens: DEFAULT_ALLERGENS, saved: false };
}
