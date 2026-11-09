import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ALLERGEN_IDS,
  LANGUAGES,
  type AllergenId,
  type Language,
} from "../src/lexicon/index";
import {
  checkIngredients,
  SAFETY_NOTICE,
  type CheckResult,
  type Evidence,
} from "../src/match";
import { lookupBarcode, type Product } from "../src/off";
import {
  allergenName,
  CARD_COPY,
  cardPrefix,
  DEFAULT_ALLERGENS,
  displayName,
  EXAMPLES,
  joiner,
  LANGUAGE_NAMES,
  NATIVE_NAMES,
  PROFILE_KEY,
  readProfile,
} from "./content";

type IconName =
  | "chat"
  | "expand"
  | "arrow"
  | "scan"
  | "photo"
  | "text"
  | "close"
  | "lock"
  | "info"
  | "layers"
  | "check"
  | "edit";
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    chat: (
      <path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Z" />
    ),
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 16l8-8m-5 0h5v5" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    scan: (
      <>
        <path d="M7 3H3v4m14-4h4v4M3 17v4h4m14-4v4h-4M7 7v10m3-10v10m4-10v10m3-10v10" />
      </>
    ),
    photo: (
      <>
        <path d="M3 7h5l2-3h4l2 3h5v13H3Z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    text: <path d="M4 4h16M12 4v16m-4 0h8M4 4v3m16-3v3" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10v1" />
      </>
    ),
    layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />,
    check: <path d="m5 12 4 4L19 6" />,
    edit: <path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
function SafetyNotice() {
  return (
    <aside className="safety">
      <Icon name="info" size={24} />
      <p>{SAFETY_NOTICE}</p>
    </aside>
  );
}
function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      queueMicrotask(() => returnFocus.current?.focus());
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "dialog full-card" : "dialog"}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-heading">
        <span className="eyebrow">{title}</span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          autoFocus
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
      <SafetyNotice />
    </dialog>
  );
}
function StaffWords({
  selected,
  language,
}: {
  selected: AllergenId[];
  language: Language;
}) {
  if (!selected.length)
    return <>Choose your allergens to make your staff card.</>;
  return (
    <>
      {CARD_COPY[language].before}
      {selected.map((id, index) => (
        <Fragment key={id}>
          {joiner(index, selected.length, language)}
          {cardPrefix(id, language)}
          <strong>{allergenName(id, language)}</strong>
        </Fragment>
      ))}
      {CARD_COPY[language].after}
    </>
  );
}
const statusLabels = {
  contains: "Contains",
  may_contain: "May contain",
  not_found: "Not found in this text",
};
const statusSymbols = { contains: "●", may_contain: "▲", not_found: "−" };
function Highlight({ text, result }: { text: string; result: CheckResult }) {
  const evidence = result.results.flatMap((r) => r.matches);
  const bounds = [
    ...new Set([0, text.length, ...evidence.flatMap((m) => [m.start, m.end])]),
  ].sort((a, b) => a - b);
  return (
    <>
      {bounds.slice(0, -1).map((start, i) => {
        const end = bounds[i + 1];
        const matches = evidence.filter(
          (m) => m.start <= start && m.end >= end,
        );
        const strongest =
          matches.find((m) => m.status === "contains") ?? matches[0];
        return strongest ? (
          <mark
            key={start}
            className={strongest.status}
            title={`${matches.map((m) => displayName(m.allergen)).join(", ")} · ${statusLabels[strongest.status]}`}
          >
            {text.slice(start, end)}
          </mark>
        ) : (
          <Fragment key={start}>{text.slice(start, end)}</Fragment>
        );
      })}
    </>
  );
}
function Pouch({ rice }: { rice: boolean }) {
  return (
    <svg
      className="pouch"
      viewBox="0 0 140 180"
      role="img"
      aria-label={`Illustration of fictional ${rice ? "rice crackers" : "almond oat bites"}`}
    >
      <defs>
        <linearGradient id="paper" x1="0" x2="1">
          <stop stopColor="#E8DCC5" />
          <stop offset=".35" stopColor="#F8F0DE" />
          <stop offset="1" stopColor="#DDD0B7" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="169" rx="49" ry="5" fill="#292524" opacity=".08" />
      <path
        d="M23 12Q70 7 117 12l-5 34 6 111q0 12-48 12t-48-12l6-111Z"
        fill="url(#paper)"
        stroke="#D9CCB4"
      />
      <path
        d="M26 20h88M27 25h86M29 38q41 6 82 0M31 47l-4 106m82-106 4 106"
        stroke="#C5B89E"
        opacity=".5"
        fill="none"
      />
      <text
        x="70"
        y="64"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontSize="7"
        fill="#776448"
        letterSpacing="2"
      >
        THE LITTLE PANTRY
      </text>
      <text
        x="70"
        y="87"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="17"
        fill="#43382B"
      >
        {rice ? "Rice" : "Almond"}
      </text>
      <text
        x="70"
        y="106"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="17"
        fill="#43382B"
      >
        {rice ? "crackers" : "oat bites"}
      </text>
      {[
        { x: 53, y: 134 },
        { x: 82, y: 140 },
        { x: 73, y: 123 },
      ].map((p, i) => (
        <g key={i} transform={`translate(${p.x},${p.y})`}>
          <circle r="14" fill={rice ? "#E9D5A6" : "#BF8542"} stroke="#A9753E" />
          {[-7, 0, 7].map((v, j) => (
            <g key={j}>
              <ellipse
                cx={v}
                cy={-5 + j * 2}
                rx="3"
                ry="6"
                transform={`rotate(${j * 40})`}
                fill="#EED4A0"
                stroke="#BA8B52"
                strokeWidth=".7"
              />
              <ellipse cx={v} cy="7" rx="4" ry="2" fill="#E5BF83" />
            </g>
          ))}
        </g>
      ))}
      <text
        x="70"
        y="160"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontSize="6"
        letterSpacing="1.4"
        fill="#776448"
      >
        FICTIONAL PRODUCT
      </text>
    </svg>
  );
}
interface CheckedLabel {
  text: string;
  language: Language;
  name: string;
  origin: "example" | "text" | "photo" | "off";
  english?: string;
  product?: Product;
  fetchedAt?: string;
}
interface BarcodeDetectorInstance {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}
const detectorConstructor = () =>
  (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;

export default function App() {
  const [profile] = useState(readProfile);
  const [selected, setSelected] = useState<AllergenId[]>(profile.allergens);
  const [saved, setSaved] = useState(profile.saved);
  const [profileEdited, setProfileEdited] = useState(profile.saved);
  const [profileOpen, setProfileOpen] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const [language, setLanguage] = useState<Language>("fr");
  const [full, setFull] = useState(false);
  const [tab, setTab] = useState<"text" | "barcode" | "photo">("text");
  const [draft, setDraft] = useState("");
  const [inputLanguage, setInputLanguage] = useState<string>("en");
  const [barcode, setBarcode] = useState("");
  const [busy, setBusy] = useState<"lookup" | "ocr" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [draftOrigin, setDraftOrigin] = useState<"text" | "photo" | "off">(
    "text",
  );
  const [receipt, setReceipt] = useState<{
    product: Product;
    fetchedAt: string;
  } | null>(null);
  const [checked, setChecked] = useState<CheckedLabel | null>({
    ...EXAMPLES[0],
    origin: "example",
  });
  const [camera, setCamera] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraSession = useRef(0);
  const resultRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLElement>(null);
  const result = useMemo(
    () =>
      checked && selected.length
        ? checkIngredients(checked.text, selected)
        : null,
    [checked, selected],
  );
  const englishResult = useMemo(
    () =>
      checked?.english && selected.length
        ? checkIngredients(checked.english, selected)
        : null,
    [checked, selected],
  );
  useEffect(() => {
    if (!full) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let entered = Boolean(document.fullscreenElement);
    const changed = () => {
      if (document.fullscreenElement) entered = true;
      else if (entered) setFull(false);
    };
    document.addEventListener("fullscreenchange", changed);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("fullscreenchange", changed);
    };
  }, [full]);
  useEffect(
    () => () => {
      cameraSession.current++;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(() => {
    if (!camera || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {
      stopCamera();
      setError("The camera could not start. Enter the barcode number instead.");
    });
  }, [camera]);
  function changeAllergens(next: AllergenId[]) {
    setSelected(next);
    setProfileEdited(true);
    setStorageMessage("");
    if (saved) {
      try {
        if (next.length)
          localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
        else {
          localStorage.removeItem(PROFILE_KEY);
          setSaved(false);
        }
      } catch {
        setSaved(false);
        setStorageMessage(
          "Storage is unavailable. Your selection is kept in this tab only.",
        );
      }
    }
  }
  function toggleSave() {
    try {
      if (saved) localStorage.removeItem(PROFILE_KEY);
      else localStorage.setItem(PROFILE_KEY, JSON.stringify(selected));
      setSaved(!saved);
      setStorageMessage(
        saved
          ? "Saved selection removed from this device."
          : "Only your allergen selection is saved on this device.",
      );
    } catch {
      setStorageMessage(
        "Storage is unavailable. You can still use this tab without saving.",
      );
    }
  }
  function clearProfile() {
    try {
      localStorage.removeItem(PROFILE_KEY);
      setStorageMessage(
        "Saved allergens deleted. Your selection is now empty.",
      );
    } catch {
      setStorageMessage(
        "Browser storage is blocked. Clear this site’s storage in browser settings to remove a previous save.",
      );
    }
    setSelected([]);
    setSaved(false);
    setProfileEdited(true);
  }
  function example(index: number) {
    setChecked({ ...EXAMPLES[index], origin: "example" });
    setLanguage(EXAMPLES[index].language);
    setError("");
    setMessage("");
    if (!selected.length) {
      setSelected(DEFAULT_ALLERGENS);
      setProfileEdited(false);
    }
  }
  function editDraft(value: string) {
    setDraft(value);
    setChecked(null);
    setReviewed(false);
    setError("");
  }
  function switchTab(next: typeof tab) {
    setTab(next);
    setError("");
    setMessage("");
  }
  function checkDraft() {
    setError("");
    if (!selected.length) {
      setError("Choose at least one allergen before checking.");
      setProfileOpen(true);
      return;
    }
    if (!LANGUAGES.includes(inputLanguage as Language)) {
      setError(
        "This language is not supported. No text check has been made. Ask staff using your card.",
      );
      setChecked(null);
      return;
    }
    if (!draft.trim() || !/\p{L}/u.test(draft)) {
      setError(
        "No readable ingredient text yet. Paste the label or try a clearer photo.",
      );
      setChecked(null);
      return;
    }
    if (draftOrigin === "photo" && !reviewed) {
      setError(
        "Review and correct the photo text, then confirm it against the package.",
      );
      return;
    }
    try {
      checkIngredients(draft, selected);
      const next: CheckedLabel = {
        text: draft,
        language: inputLanguage as Language,
        name:
          receipt?.product.name ||
          (draftOrigin === "photo"
            ? "Your label photo"
            : "Your ingredient text"),
        origin: draftOrigin,
        ...(receipt ?? {}),
      };
      // OFF language fields may describe different package variants; do not present them as a verified translation.
      setChecked(next);
      setMessage("Text check complete. Review the evidence below.");
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        resultRef.current?.focus({ preventScroll: true });
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "This text could not be checked.",
      );
    }
  }
  async function lookup(value = barcode) {
    setError("");
    setMessage("");
    setChecked(null);
    setReceipt(null);
    setDraft("");
    setReviewed(false);
    if (!/^\d{8,14}$/.test(value)) {
      setError("Enter 8–14 digits, including any leading zeros.");
      return;
    }
    setBusy("lookup");
    try {
      const product = await lookupBarcode(value);
      if (!product) {
        setError(
          "Product not found in Open Food Facts. Try a label photo or paste the ingredients.",
        );
        return;
      }
      const fetchedAt = new Date().toISOString();
      setReceipt({ product, fetchedAt });
      setDraftOrigin("off");
      const primary = product.primaryLanguage;
      const known = LANGUAGES.includes(primary as Language)
        ? (primary as Language)
        : null;
      const fallback = LANGUAGES.find((l) => product.ingredientsByLanguage[l]);
      const lang = known ?? fallback;
      const text =
        (lang && product.ingredientsByLanguage[lang]) ||
        (known ? product.ingredientsText : null);
      if (!text) {
        setError(
          product.ingredientsText
            ? "The product’s ingredient language is unknown or unsupported. Paste text in a supported language or ask staff."
            : "Product found, but ingredient text is missing. Take a label photo or paste the ingredients.",
        );
        return;
      }
      setDraft(text);
      setInputLanguage(lang!);
      setMessage(
        "Product found. Check the text and language against your package, then select “Check this text”.",
      );
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : "Lookup failed."} You can still paste ingredients and check them on this device.`,
      );
    } finally {
      setBusy(null);
    }
  }
  async function readPhoto(file?: File) {
    if (!file) return;
    setError("");
    setMessage("");
    setChecked(null);
    setReceipt(null);
    setDraft("");
    setReviewed(false);
    setDraftOrigin("photo");
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file of the ingredient label.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("This image is over 20 MB. Choose a smaller photo.");
      return;
    }
    if (!LANGUAGES.includes(inputLanguage as Language)) {
      setError("Choose a supported label language before reading the photo.");
      return;
    }
    setBusy("ocr");
    try {
      const { readIngredientsPhoto } = await import("../src/ocr");
      const output = await readIngredientsPhoto(file, [
        inputLanguage as Language,
      ]);
      if (!output.editableText.trim() || !/\p{L}/u.test(output.editableText)) {
        setError(
          "No readable text was found. Retake a sharp, well-lit photo or paste the ingredients.",
        );
        return;
      }
      setDraft(output.editableText);
      setMessage(
        `Photo read on this device. OCR confidence: ${Math.round(output.confidence)}/100, not a safety score. Review every word against the package.`,
      );
    } catch {
      setError(
        "The photo could not be read. OCR may need an internet connection to download language files. Try a clearer photo or paste the ingredients.",
      );
    } finally {
      setBusy(null);
    }
  }
  function stopCamera() {
    cameraSession.current++;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamera(false);
    setCameraStarting(false);
  }
  async function startCamera() {
    const Detector = detectorConstructor();
    setError("");
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera barcode scanning is unavailable in this browser. Enter the printed number instead.",
      );
      return;
    }
    const session = ++cameraSession.current;
    setCameraStarting(true);
    try {
      const supported = Detector.getSupportedFormats
        ? await Detector.getSupportedFormats()
        : ["ean_13", "ean_8", "upc_a", "upc_e"];
      const formats = supported.filter((f) =>
        ["ean_13", "ean_8", "upc_a", "upc_e"].includes(f),
      );
      if (!formats.length) throw new Error("Unsupported barcode formats");
      const detector = new Detector({ formats });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (session !== cameraSession.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setCamera(true);
      setCameraStarting(false);
      const scan = async () => {
        if (session !== cameraSession.current) return;
        try {
          if (
            videoRef.current?.readyState &&
            videoRef.current.readyState >= 2
          ) {
            const found = await detector.detect(videoRef.current);
            if (session !== cameraSession.current) return;
            const code = found.find((item) => /^\d{8,14}$/.test(item.rawValue));
            if (code) {
              stopCamera();
              setBarcode(code.rawValue);
              setMessage(
                "Barcode captured. Select “Look up product” to send this number to Open Food Facts.",
              );
              return;
            }
          }
          window.setTimeout(scan, 300);
        } catch {
          stopCamera();
          setError(
            "The barcode could not be read. Enter the printed number instead.",
          );
        }
      };
      void scan();
    } catch {
      if (session === cameraSession.current) {
        stopCamera();
        setError(
          "Camera access is unavailable or was denied. Enter the barcode number instead.",
        );
      }
    }
  }
  function showFull() {
    setFull(true);
    document.documentElement.requestFullscreen?.().catch(() => {
      /* The large dialog also works without the fullscreen API. */
    });
  }
  function closeFull() {
    setFull(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  function focusInputs() {
    inputRef.current?.scrollIntoView({ behavior: "smooth" });
    inputRef.current?.focus({ preventScroll: true });
  }
  const evidenceText = (match: Evidence) => match.caution?.text ?? match.text;

  return (
    <>
      <a className="skip-link" href="#label-input">
        Skip to label input
      </a>
      <header className="header">
        <a className="brand" href="#" aria-label="May Contain home">
          <span className="brand-icon">
            m<span>c</span>
          </span>
          may contain<span className="brand-dot">.</span>
        </a>
        <span className="prototype">Prototype</span>
        <span className="header-note">
          A little clarity, wherever you shop.
        </span>
        <a className="agent-link" href="#agents">
          For AI agents <span aria-hidden="true">↗</span>
        </a>
      </header>
      <main>
        <section className="start-strip" aria-label="Getting started">
          <div>
            <span className="eyebrow">A pocket companion for food labels</span>
            <p>Start with your allergens. Try an example, or check a label.</p>
            <small className="start-privacy">
              Free. Photos stay on your device; only barcode numbers go to Open
              Food Facts.
            </small>
          </div>
          <div className="start-actions">
            <button
              className="try-example"
              disabled={!!busy}
              onClick={() => example(0)}
            >
              Try example text
            </button>
            <button className="primary" onClick={focusInputs}>
              Check a label <Icon name="arrow" />
            </button>
          </div>
        </section>
        <section className="profile-strip" aria-label="Your allergens">
          <div className="profile-label">
            <Icon name="lock" size={16} />
            <span>
              {saved
                ? "Saved on this device"
                : profileEdited
                  ? "Your allergens · this tab"
                  : "Example profile"}
            </span>
          </div>
          <div className="allergen-pills">
            {selected.length ? (
              selected.map((id) => (
                <span className="pill" key={id}>
                  {displayName(id)}
                </span>
              ))
            ) : (
              <span>No allergens selected</span>
            )}
          </div>
          <button className="edit-profile" onClick={() => setProfileOpen(true)}>
            <Icon name="edit" size={16} /> Edit allergens
          </button>
        </section>
        <section className="staff-section" aria-labelledby="staff-heading">
          <div className="section-caption">
            <span>01 / THE CONVERSATION</span>
            <span>YOUR WORDS, IN THEIR LANGUAGE</span>
          </div>
          <div className="staff-card">
            <div className="staff-top">
              <h1 id="staff-heading">
                <Icon name="chat" size={25} /> Show this to staff
              </h1>
              <span className="pill language-pill">
                {LANGUAGE_NAMES[language]}
              </span>
              <span className="card-corner" aria-hidden="true">
                ↗
              </span>
            </div>
            <p className="staff-words" lang={selected.length ? language : "en"}>
              <StaffWords selected={selected} language={language} />
            </p>
            {selected.length > 0 && language !== "en" && (
              <p className="staff-meaning">
                <StaffWords selected={selected} language="en" />
              </p>
            )}
            <div className="staff-card-bottom">
              <span className="tiny-dot" /> A question to start a conversation.
            </div>
          </div>
          <div className="language-controls">
            <div className="quick-languages" aria-label="Staff card language">
              {(["fr", "de", "ja"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  lang={lang}
                  aria-pressed={language === lang}
                  onClick={() => setLanguage(lang)}
                >
                  {NATIVE_NAMES[lang]}
                </button>
              ))}
            </div>
            <label className="more-language">
              <span className="sr-only">All staff card languages</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {NATIVE_NAMES[lang]}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="fullscreen-button"
              aria-label="Show full screen"
              onClick={showFull}
              disabled={!selected.length}
            >
              <Icon name="expand" />
              <span>Show full screen</span>
            </button>
          </div>
        </section>
        <section
          className="results-section"
          aria-labelledby="result-heading"
          ref={resultRef}
          tabIndex={-1}
        >
          <div className="section-caption">
            <span id="result-heading">02 / THE LABEL CHECK</span>
            <span>TEXT EVIDENCE, NOT A SAFETY VERDICT</span>
          </div>
          {checked && result ? (
            <div className="result-card">
              <div className="product-summary">
                {checked.origin === "example" ? (
                  <div className="product-image">
                    <Pouch rice={checked.name === "Rice crackers"} />
                  </div>
                ) : (
                  <div className="source-icon">
                    <Icon
                      name={
                        checked.origin === "off"
                          ? "scan"
                          : checked.origin === "photo"
                            ? "photo"
                            : "text"
                      }
                      size={36}
                    />
                  </div>
                )}
                <div className="product-details">
                  <span className="eyebrow">
                    {checked.origin === "example"
                      ? "Example text · fictional product"
                      : checked.origin === "off"
                        ? "Open Food Facts · text reviewed by you"
                        : checked.origin === "photo"
                          ? "On-device OCR · reviewed by you"
                          : "Text supplied by you"}
                  </span>
                  <h2>{checked.name}</h2>
                  <dl className="status-list">
                    {result.results.map((row) => (
                      <div className="status-row" key={row.allergen}>
                        <dt>{displayName(row.allergen)}</dt>
                        <dd className={`status-badge ${row.status}`}>
                          <span aria-hidden="true">
                            {statusSymbols[row.status]}
                          </span>
                          {statusLabels[row.status]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
              <div className="result-detail">
                <div className="text-pair">
                  <div>
                    <h3>
                      Original <span>({LANGUAGE_NAMES[checked.language]})</span>
                    </h3>
                    <p lang={checked.language}>
                      <Highlight text={checked.text} result={result} />
                    </p>
                  </div>
                  <div>
                    <h3>
                      English{" "}
                      <span>
                        {checked.english
                          ? "(example translation)"
                          : checked.language === "en"
                            ? "(original)"
                            : "(translation)"}
                      </span>
                    </h3>
                    {checked.english && englishResult ? (
                      <p>
                        <Highlight
                          text={checked.english}
                          result={englishResult}
                        />
                      </p>
                    ) : checked.language === "en" ? (
                      <p>
                        <Highlight text={checked.text} result={result} />
                      </p>
                    ) : (
                      <p className="translation-unavailable">
                        No verified English translation is available. Use the
                        original label and your staff card.
                      </p>
                    )}
                  </div>
                </div>
                <div className="explanation">
                  <h3>What the text tells us</h3>
                  {result.results.map((row) => (
                    <p key={row.allergen}>
                      <strong>{displayName(row.allergen)}:</strong>{" "}
                      {row.status === "not_found"
                        ? "not found in this text. Only the supplied words were checked."
                        : row.matches.map((match, index) => (
                            <Fragment key={`${match.start}-${index}`}>
                              {index > 0 ? "; " : ""}
                              {match.status === "contains"
                                ? "ingredient wording"
                                : "precautionary wording"}{" "}
                              —{" "}
                              <q lang={checked.language}>
                                {evidenceText(match)}
                              </q>
                            </Fragment>
                          ))}
                    </p>
                  ))}
                </div>
                <div className="source-line">
                  <Icon name="layers" size={18} />
                  <div>
                    {checked.origin === "example" ? (
                      <>
                        Demo data <span>· Fixed example translation</span>
                      </>
                    ) : checked.origin === "off" ? (
                      <>
                        <a
                          href={checked.product!.source}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Product data from Open Food Facts (ODbL)
                        </a>
                        <small>
                          Retrieved{" "}
                          <time dateTime={checked.fetchedAt}>
                            {new Date(checked.fetchedAt!).toLocaleString()}
                          </time>{" "}
                          · Barcode {checked.product!.barcode}
                        </small>
                      </>
                    ) : checked.origin === "photo" ? (
                      "On-device OCR · Your corrected text"
                    ) : (
                      "On-device matching · Your text"
                    )}
                  </div>
                  <a className="mcp-chip" href="#agents">
                    MCP tool <span aria-hidden="true">↗</span>
                  </a>
                </div>
                {checked.product && (
                  <details className="off-tags">
                    <summary>
                      Database tags (separate from text evidence)
                    </summary>
                    <p>
                      Allergens:{" "}
                      {checked.product.allergensTags?.join(", ") ||
                        (checked.product.allergensTags
                          ? "No tags listed"
                          : "Not provided")}
                    </p>
                    <p>
                      Traces:{" "}
                      {checked.product.tracesTags?.join(", ") ||
                        (checked.product.tracesTags
                          ? "No tags listed"
                          : "Not provided")}
                    </p>
                    <p>
                      Community data may describe a different package. Tags are
                      not merged into the text check.
                    </p>
                  </details>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-result">
              <Icon name="text" size={28} />
              <div>
                <h2>
                  {selected.length
                    ? "Ready for a new label"
                    : "Choose your allergens first"}
                </h2>
                <p>
                  {selected.length
                    ? "Check the ingredient text below to see the words behind each result."
                    : "Your staff card and results will use only the allergens you select."}
                </p>
              </div>
            </div>
          )}
        </section>
        <SafetyNotice />
        <section
          className="input-section"
          id="label-input"
          ref={inputRef}
          tabIndex={-1}
          aria-labelledby="input-heading"
        >
          <div className="input-intro">
            <span className="eyebrow">03 / NEXT, YOUR LABEL</span>
            <h2 id="input-heading">
              A closer look at
              <br className="desktop-break" /> what’s inside.
            </h2>
            <p>
              Read a barcode, take a label photo,
              <br className="desktop-break" /> or bring your own text.
            </p>
            <div className="privacy-note">
              <Icon name="lock" size={18} />
              <p>
                Free to use. Photos stay on your device. Only barcode numbers go
                to Open Food Facts.
              </p>
            </div>
            <div className="examples">
              <span className="eyebrow">JUST EXPLORING? TRY EXAMPLE TEXT</span>
              <div>
                {EXAMPLES.map((item, index) => (
                  <button
                    key={item.language}
                    disabled={!!busy}
                    onClick={() => example(index)}
                  >
                    {LANGUAGE_NAMES[item.language]}{" "}
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
              <small>Fictional labels. No real product data.</small>
            </div>
          </div>
          <div className="input-card">
            <div
              className="input-tabs"
              role="group"
              aria-label="Choose an input method"
            >
              {(
                [
                  { id: "text", label: "Paste text", icon: "text" },
                  { id: "barcode", label: "Barcode", icon: "scan" },
                  { id: "photo", label: "Label photo", icon: "photo" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  disabled={!!busy}
                  aria-pressed={tab === item.id}
                  onClick={() => switchTab(item.id)}
                >
                  <Icon name={item.icon} size={19} />
                  {item.label}
                </button>
              ))}
            </div>
            {tab === "barcode" && (
              <div className="barcode-input">
                <label htmlFor="barcode">Barcode number</label>
                <div className="barcode-row">
                  <input
                    id="barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    inputMode="numeric"
                    pattern="[0-9]{8,14}"
                    maxLength={14}
                    placeholder="e.g. 3017620422003"
                    disabled={!!busy}
                  />
                  <button
                    className="icon-button"
                    aria-label="Scan barcode with camera"
                    disabled={!!busy || cameraStarting}
                    onClick={startCamera}
                  >
                    <Icon name="scan" />
                  </button>
                </div>
                <p className="field-help">
                  Keep the leading zeros. Camera scanning depends on your
                  browser; typing always works.
                </p>
                <button
                  className="primary lookup"
                  disabled={!!busy}
                  onClick={() => lookup()}
                >
                  {busy === "lookup" ? "Looking up…" : "Look up product"}
                  <Icon name="arrow" />
                </button>
                {cameraStarting && (
                  <button className="text-button" onClick={stopCamera}>
                    Cancel camera request
                  </button>
                )}
              </div>
            )}
            {(tab !== "barcode" || draft) && (
              <>
                <div className="field-heading">
                  <label htmlFor="input-language">Label language</label>
                  <select
                    id="input-language"
                    value={inputLanguage}
                    disabled={!!busy}
                    onChange={(e) => {
                      setInputLanguage(e.target.value);
                      setReviewed(false);
                      setChecked(null);
                    }}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {LANGUAGE_NAMES[lang]}
                      </option>
                    ))}
                    <option value="unsupported">Other / unknown</option>
                  </select>
                </div>
                {tab === "photo" && (
                  <>
                    <label className={`photo-drop ${busy ? "is-busy" : ""}`}>
                      <Icon name="photo" size={28} />
                      <strong>
                        {busy === "ocr"
                          ? "Reading on this device…"
                          : "Choose a label photo"}
                      </strong>
                      <span>
                        A clear, close-up image works best · up to 20 MB
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={!!busy}
                        aria-label="Choose a label photo"
                        onChange={(e) => {
                          void readPhoto(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <p className="field-help">
                      OCR runs locally. The first use downloads reading tools
                      and language files.
                    </p>
                  </>
                )}
                {(tab !== "photo" || draft) && (
                  <>
                    <label className="text-label" htmlFor="ingredients">
                      {draftOrigin === "photo"
                        ? "Review and correct the extracted text"
                        : "Ingredient text"}
                      <span>Include “may contain” statements</span>
                    </label>
                    <textarea
                      id="ingredients"
                      value={draft}
                      maxLength={50000}
                      rows={5}
                      disabled={!!busy}
                      placeholder="Ingredients: … May contain …"
                      onChange={(e) => {
                        editDraft(e.target.value);
                        if (tab === "text") {
                          setDraftOrigin("text");
                          setReceipt(null);
                        }
                      }}
                    />
                    {draftOrigin === "photo" && (
                      <label className="review-check">
                        <input
                          type="checkbox"
                          checked={reviewed}
                          onChange={(e) => setReviewed(e.target.checked)}
                        />
                        I checked and corrected this text against the package.
                      </label>
                    )}
                    <div className="check-row">
                      <span>
                        Only your selected allergens
                        <br />
                        will be checked.
                      </span>
                      <button
                        className="primary"
                        disabled={
                          !!busy ||
                          !draft.trim() ||
                          (draftOrigin === "photo" && !reviewed)
                        }
                        onClick={checkDraft}
                      >
                        Check this text <Icon name="arrow" />
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
            {busy && (
              <p className="processing" role="status">
                <span className="spinner" />
                {busy === "ocr"
                  ? "Reading the image locally. This can take a minute."
                  : "Contacting Open Food Facts…"}
              </p>
            )}
            {error && (
              <div className="error-message" role="alert">
                <Icon name="info" />
                <p>{error}</p>
              </div>
            )}
            {message && (
              <p className="feedback" role="status">
                {message}
              </p>
            )}
            {receipt && !draft && (
              <p className="field-help">
                <a href={receipt.product.source}>
                  Product data from Open Food Facts (ODbL)
                </a>{" "}
                · Retrieved {new Date(receipt.fetchedAt).toLocaleString()}
              </p>
            )}
          </div>
        </section>
        <div className="under-the-label">
          <div>
            <Icon name="info" size={20} />
            <p>
              <strong>A word match, with limits.</strong> This tool matches
              dictionary terms and precautionary phrases. It can miss allergens,
              misread context, or use incomplete product data.{" "}
              <a href="./eval/RESULTS.md" target="_blank" rel="noreferrer">
                See measured results & limitations ↗
              </a>
            </p>
          </div>
          <details id="agents">
            <summary>
              <Icon name="layers" />
              For AI agents
              <span className="summary-end">Same core. Two tools. +</span>
            </summary>
            <div className="agent-content">
              <p>
                The UI and the local MCP server use the same dictionary and{" "}
                <code>checkIngredients</code> function. No additional AI verdict
                is added.
              </p>
              <dl>
                <dt>
                  <code>check_ingredients</code>
                </dt>
                <dd>
                  Accepts ingredient text and allergen IDs; returns per-allergen
                  states, original-text evidence, UTF-16 offsets, warnings and
                  the safety notice.
                </dd>
                <dt>
                  <code>lookup_barcode</code>
                </dt>
                <dd>
                  Looks up a barcode in Open Food Facts; returns available
                  ingredient text, separate allergen/trace tags and attribution.
                  It does not check or translate the label.
                </dd>
              </dl>
              <pre>
                {JSON.stringify(
                  {
                    text: EXAMPLES[0].text,
                    allergens: ["milk", "peanuts", "sesame"],
                  },
                  null,
                  2,
                )}
              </pre>
              <p>
                Example result states: <code>milk: contains</code>,{" "}
                <code>peanuts: may_contain</code>,{" "}
                <code>sesame: not_found</code>. Show evidence and the safety
                notice alongside them.
              </p>
              <p>
                Read-only stdio tools, run locally. There is no hosted MCP
                service or photo-upload endpoint. A separately configured remote
                client may transmit text and allergen selections.
              </p>
              <a
                href="https://github.com/driedsandwich/may-contain#ai-agents--mcp"
                target="_blank"
                rel="noreferrer"
              >
                README: MCP setup example ↗
              </a>
            </div>
          </details>
        </div>
        <footer>
          <div className="footer-brand">
            may contain<span>.</span>
            <small>Made for the moments between languages.</small>
          </div>
          <div>
            <a
              href="https://world.openfoodfacts.org"
              target="_blank"
              rel="noreferrer"
            >
              Product data from Open Food Facts (ODbL)
            </a>
            <span>DSH Hacks V2 · AI × Healthcare</span>
            <span>Prototype · Fixed staff-card phrases</span>
            <a href="./card-review.md" target="_blank" rel="noreferrer">
              Translation review notes ↗
            </a>
          </div>
        </footer>
      </main>
      {profileOpen && (
        <Dialog title="Your allergens" onClose={() => setProfileOpen(false)}>
          <h2>Make this card yours.</h2>
          <p>
            Select what you need to check. Broad groups and individual foods are
            listed separately.
          </p>
          <div className="allergen-picker">
            {ALLERGEN_IDS.map((id) => (
              <label
                key={id}
                className={selected.includes(id) ? "selected" : ""}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(id)}
                  onChange={() =>
                    changeAllergens(
                      selected.includes(id)
                        ? selected.filter((a) => a !== id)
                        : [...selected, id],
                    )
                  }
                />
                {displayName(id)}
              </label>
            ))}
          </div>
          <label className="save-option">
            <input
              type="checkbox"
              checked={saved}
              disabled={!selected.length}
              onChange={toggleSave}
            />
            <span>
              Remember my allergens on this device
              <small>
                Optional. No account, no server. Labels and photos are never
                saved.
              </small>
            </span>
          </label>
          <div className="dialog-actions">
            <button className="text-button" onClick={clearProfile}>
              Clear & delete saved allergens
            </button>
            <button className="primary" onClick={() => setProfileOpen(false)}>
              Done <Icon name="check" />
            </button>
          </div>
          {storageMessage && (
            <p role="status" className="feedback">
              {storageMessage}
            </p>
          )}
        </Dialog>
      )}
      {full && (
        <Dialog
          title={`Show this to staff · ${LANGUAGE_NAMES[language]}`}
          onClose={closeFull}
          wide
        >
          <p className="staff-words" lang={language}>
            <StaffWords selected={selected} language={language} />
          </p>
          {language !== "en" && (
            <p className="staff-meaning">
              <StaffWords selected={selected} language="en" />
            </p>
          )}
          <p className="fullscreen-tip">
            Turn your phone sideways for a larger card.
          </p>
        </Dialog>
      )}
      {camera && (
        <Dialog title="Scan barcode" onClose={stopCamera}>
          <h2>Find the printed barcode.</h2>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-label="Live camera preview"
          />
          <p>
            Hold steady in good light. Only the captured number will be used,
            after you select “Look up product”.
          </p>
          <button className="secondary" onClick={stopCamera}>
            Enter the number instead
          </button>
        </Dialog>
      )}
    </>
  );
}
