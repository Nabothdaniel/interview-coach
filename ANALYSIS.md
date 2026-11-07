# IJIPB — Project Analysis & Build Base

**Project:** Development of an Intelligent Job Interview Preparation Bot Using NLP and Conversational AI (IJIPB)
**Student:** Adio Igyogo Emmanuel, FT22BCMP0757, BSc Computer Science, Nasarawa State University, Keffi
**Supervisor:** Dr. A. S. Abdullahi · **HOD:** Dr. Binyamin A. Ajayi
**Source:** `ADIO IGYOGO EMMANUEL project 1-3.docx` (Chapters 1–3, 5 figures, no code existed at time of analysis)
**Analysis date:** 2026-11-06

---

## 1. What the thesis commits to (requirements extracted)

### 1.1 Functional (from Fig 3.1 use cases + Ch.3)
| ID | Requirement | Source |
|---|---|---|
| F1 | Register / Login | Fig 3.1 |
| F2 | Select interview domain: **IT, Business Administration, General Graduate Roles** | §1.5, Fig 3.1 |
| F3 | Start interview session; bot asks questions from a repository | Fig 3.1, §3.3 |
| F4 | User answers in **text** (no voice/video) | §1.5 |
| F5 | Each answer evaluated: intent, entities, relevance, sentiment/tone | §3.3.3 |
| F6 | Adaptive feedback on 4 dimensions: Content Relevance, Communication Clarity, Confidence & Professional Tone, Targeted Improvement Recommendations | §2.2, §3.3 |
| F7 | Session summary at end | Fig 3.3 |
| F8 | Track progress across sessions (adjust difficulty/focus) | Fig 3.1, §2.2 |
| F9 | Admin: system config & user reports | Fig 3.1, Fig 3.4 |
| F10 | Multi-turn context kept (frame/slot based) | §2.6, §3.3 |
| F11 | Responsive, usable on mobile/low-resource devices | §3.3 |
| F12 | Question bank 500+ questions, each with benchmark answer + evaluative criteria, domain, difficulty | §1.5, §3.3, §3.3.2 |

### 1.2 Pipeline the thesis defines (§3.3.3, Fig 3.3)
1 Pre-process → 2 Intent (6 classes) → 3 NER (5 custom types) → 4 Semantic similarity (High ≥0.75 / Moderate 0.50–0.74 / Low <0.50) → 5 Sentiment/tone (VADER compound + confidence cues) → 6 Dialogue state update → 7 Multi-dim feedback → loop until session complete → summary.

Six intents: Direct Answer, Partial Answer, Clarification Request, Off-Topic Response, Session Control Command, Greeting/Closing.
Five entity types: SKILL, TECHNOLOGY, COMPANY, ROLE, ACHIEVEMENT.

### 1.3 Non-functional / evaluation targets (§3.5)
- Intent accuracy ≥ 90% (640-utterance held-out set); NER F1 ≥ 0.85; similarity correlation r ≥ 0.75 on 100 expert-rated items.
- Latency: < 2,000 ms single user; < 5,000 ms at 30 concurrent users.
- SUS > 68. Pre/post study: 60 students, paired t-test, Cohen's d.
- Ethics (§3.6): AI disclosure at start of **each** session; no PII beyond need; histories **not retained unless user opts in**; psychologically safe language; **distress escalation pathway**; fairness across dialect / non-native English.

---

## 2. Decision taken (user, 2026-11-06)

**Engine = Google Gemini via Firebase AI Logic. Backend = none (no server of our own). Hosting/Auth/DB = Firebase.**

This **replaces** the thesis stack (Rasa, fine-tuned BERT, spaCy trf, sentence-transformers, Flask, SQLite). Consequences are in §6 — the written thesis will not match the built system unless it is amended.

### Verified facts (official Firebase docs, fetched 2026-11-06)
- Firebase AI Logic's **Gemini Developer API** backend is available on the **free Spark plan** and Blaze. (The Vertex/"Agent Platform" backend needs Blaze.)
- **App Check enforcement became mandatory on 2 Nov 2026**; requests without a valid token are blocked. Can only be delayed (via Firebase) until 21 Jan 2027. → App Check is **not optional**.
- Default per-user limit 100 req/min (adjustable).
- Current stable general models: `gemini-3.8-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`. `gemini-2.5-*` is "limited to previously active projects" and retiring → **do not use**. `gemini-3.6/3.7-flash` deprecated on the Agent Platform.
- Web SDK: `import { getAI, getGenerativeModel } from 'firebase/ai'`.

### NOT verified (must be checked in the Firebase console before relying on it)
- Free-tier quota (RPM/RPD) of `gemini-3.8-flash` vs `gemini-3.5-flash-lite` on Spark. Unknown.
- Whether Firebase AI Logic exposes an **embeddings** endpoint. Not confirmed → engine does **not** depend on it.
- The `gemini-3.8-flash` ID was cross-confirmed only from the Firebase models page; re-check the live list at build time. The model ID is a single config constant.

---

## 3. Engine Identification (gate before any UI)

The "engine" is everything that can run and be tested **without a browser UI**. UI work is blocked until the Engine Definition of Done (AGENTS.md §2) passes.

### 3.1 Engine modules (`src/engine/`, pure TypeScript, no DOM, no Firebase imports)
| Module | Responsibility | Uses Gemini? |
|---|---|---|
| `dialogue/` | Deterministic **frame/slot state machine**: `domain, difficulty, questionIndex, asked[], answers[], status`. States: `IDLE → DISCLOSURE → DOMAIN_SELECT → ASKING → AWAITING_ANSWER → EVALUATING → FEEDBACK → (next ASKING | SUMMARY) → CLOSED`. Handles Session Control commands (skip, repeat, end, change domain) without calling the LLM. | No |
| `intent/` | Cheap local pre-router for Greeting/Closing/Session Control (regex/keyword). Everything else is classified by the evaluator call. | Partly |
| `evaluator/` | **One** Gemini call per answer returning a schema-validated JSON (§3.2). | Yes |
| `sentiment/` | VADER compound score computed **locally** (`vader-sentiment`, npm) → combined with Gemini's confidence cues. Keeps the thesis's VADER claim real. | No |
| `feedback/` | Turns evaluator JSON + VADER into the 4-dimension feedback object; template text + Gemini-written recommendation. Applies safety/tone rules. | Yes (text) |
| `questions/` | Question repository types, loader, selector (domain, difficulty, no repeats, adaptive by prior score). | No |
| `progress/` | Per-session score aggregation + cross-session trend (only if user opted in). | No |
| `safety/` | Distress detection → escalation message; prompt-injection guard on user answers; AI-disclosure text. | Partly |
| `ports/` | Interfaces: `LlmPort`, `StorePort`, `ClockPort`. Firebase and test fakes implement these. | — |

### 3.2 Evaluator contract (single structured call, `responseSchema`)
```
{
  intent: "direct_answer"|"partial_answer"|"clarification_request"|"off_topic"|"session_control"|"greeting_closing",
  entities: { SKILL[], TECHNOLOGY[], COMPANY[], ROLE[], ACHIEVEMENT[] },
  relevance: { score: 0..1, tier: "high"|"moderate"|"low", missingPoints[] },
  clarity:   { score: 0..1, notes },
  tone:      { confidence: 0..1, professionalism: 0..1, enthusiasm: 0..1 },
  feedback:  { strengths[], improvements[], suggestedAnswerHint },
  flags:     { distress: boolean, injectionAttempt: boolean }
}
```
- `tier` is **recomputed locally** from `score` using the thesis thresholds (≥0.75 / 0.50–0.74 / <0.50); the model's tier is ignored. Never trust the model for deterministic rules.
- Output validated with a runtime schema (zod). Invalid → retry once → degrade gracefully (neutral feedback, no crash, nothing silently scored).
- Temperature low (≈0.2) for scoring determinism.

### 3.3 Thesis-pipeline mapping (honest)
| Thesis step | Built as | Faithful? |
|---|---|---|
| Pre-processing (tokenise, stopwords, lemma) | Trim/normalise only; Gemini does not need stemmed input | Deviation — amend text |
| BERT intent (6 classes) | Local router + Gemini classification, same 6 labels | Same labels, different method |
| spaCy NER (5 custom types) | Gemini structured extraction, same 5 types | Same types, different method |
| MiniLM cosine similarity | **LLM-judged relevance vs benchmark answer** (0–1), same thresholds | Different method; still evaluable vs expert ratings |
| VADER | `vader-sentiment` locally | Faithful |
| TED/Rule policy (Rasa) | Deterministic state machine | Rule Policy equivalent; no learned policy |
| SQLite | Firestore | Deviation |
| Flask | None (Firebase Hosting static + client SDK) | Deviation |

---

## 4. Target architecture (no server)

```
Browser (Next.js static export, App Router + React + TS, Firebase Hosting from `out/`)
 ├─ src/engine/*          pure logic (tested in Node)
 ├─ adapters/firebase/    LlmPort → firebase/ai (Gemini), StorePort → Firestore
 ├─ Firebase Auth         email/password + Google
 ├─ App Check             reCAPTCHA (v3/Enterprise) — mandatory
 └─ Firestore             questions, sessions (opt-in), users, rubric
Gemini ← Firebase AI Logic proxy (API key never in the client bundle)
```

### Firestore collections
- `questions/{id}`: `domain, difficulty(1-3), text, benchmarkAnswer, keyPoints[], keywords[], source, reviewed:boolean`
- `users/{uid}`: `displayName, saveProgress:boolean (default false), createdAt`
- `users/{uid}/sessions/{id}`: written **only if** `saveProgress==true`; scores + summary, **no raw answer text unless user opts in**
- `config/app`: admin-editable (model id, thresholds, feature flags)
- Admin = Firestore rules allow-list on `uid` in a `admins/{uid}` doc, created with a local admin-SDK script (never from client).

### Known limitations of "no server" (accepted, must be documented)
1. **Benchmark answers are readable by clients** (they must be sent to Gemini from the browser). A determined user can read them. Acceptable for a prep tool; not for graded assessment.
2. **Scoring runs client-side** → a user can tamper with their own scores. Rules can only validate shape/ranges. Acceptable; scores are for self-coaching only. **Study data for the pre/post experiment must NOT come from these client-written scores** — use blind human evaluators as the thesis already says.
3. App Check + per-user quota are the only abuse controls; set a Google Cloud budget alert.
4. Student answers are sent to Google → consent notice required (see AGENTS.md §6).

---

## 5. Build plan to "online today" (engine-first)

| Phase | Output | Gate |
|---|---|---|
| 0. Console setup (user) | Firebase project, Auth, Firestore, AI Logic (Gemini Developer API), App Check provider, Hosting | Checklist §7 |
| 1. Engine core | `ports`, state machine, selector, safety, vader, zod schemas + Vitest | all green |
| 2. Evaluator | Gemini adapter, prompt, schema, retries; **live smoke test** over golden set (≥20 answers: strong/weak/off-topic/distress/injection) | Engine DoD (AGENTS.md §2) |
| 3. Data | Seed question bank (domain-balanced), importer script, `reviewed:false` flag | Schema-valid, no dupes |
| 4. **UI (only now)** | Chat screen, domain select, disclosure, summary, progress, minimal admin | UI never contains logic |
| 5. Rules + deploy | Firestore rules + emulator tests, App Check enforced, `firebase deploy` | Release checklist AGENTS.md §9 |

Scope cuts if time runs out (in this order): admin screen → cross-session progress charts → Google sign-in (keep email) → question count below 500. **Never cut:** disclosure, distress path, App Check, rules, schema validation.

---

## 6. Problems found in the thesis document (fix before submission / defence)

### 6.1 Mismatch with the new build (must amend)
- Abstract, §1.1, §1.5, §2.2, §2.6, §3.2–3.4, Fig 3.2/3.3: describe Rasa, BERT, spaCy, MiniLM, Flask, SQLite. Build uses Gemini + Firebase.
- §2.3.3 and §2.6 argue **against** proprietary APIs/LLMs ("lighter-weight, fine-tuned transformer… privacy implications"). The new design contradicts that argument; the rationale must be rewritten (free tier, no-server deployment, data-handling mitigations).
- §3.3.3 intent training details (3,200 utterances, 5 epochs, AdamW 2e-5) and §3.5 intent/NER metrics (640 held-out, NER F1 ≥ 0.85) **describe training that will not happen**. Evaluation metrics must be redefined (e.g., Gemini intent accuracy on a labelled test set; relevance score vs expert ratings; entity F1 on annotated set).
- "Fine-tuned language model" in feedback generation (§3.3) → prompted, not fine-tuned.

### 6.2 Internal inconsistencies
- §3.3.2 says intent classifier has **4** labels; §3.3.3 says **6**. Pick one (engine uses 6).
- §3.3.1 claims benchmarks "validated by HR professionals" — no evidence yet. The seed bank ships `reviewed:false`; do not claim validation until done.
- Declaration says "our research work" (singular author).
- Abstract promises "over 500" questions; §1.5 says "at least 500".
- Date on cover: **JULY, 2026**; today is Nov 2026.

### 6.3 Figure defects
- **Fig 2.1:** "Feedback Output" label overlaps the "Adaptive Feedback" title; 4th bullet (Targeted Improvement Recommendations) is cut off by the bottom box.
- **Fig 3.1:** Admin actor's two lines end at the boundary and connect to **no use case**; no admin use cases drawn.
- **Fig 3.2:** "Sentiment" sits outside the NLP box (4th item spilled out).
- **Fig 3.4:** "Feedback & Evaluation" arrow points to the **Question Database**, not the user; there is no system→user feedback flow. DFD is wrong as drawn.

### 6.4 Citation problems (examiners check these)
- "Liu et al. (2016)" (BLEU/ROUGE correlation) → reference list has *Liu & Lane (2016)* on joint intent/slot filling. Wrong paper.
- "Liu et al. (2019)" cited for "BERT >95% intent accuracy" → that reference is **RoBERTa**; claim not supported by it.
- "Gao et al. (2021)" cited for transformer tutoring assessment → reference is about **medical code assignment**.
- "Bunk et al. (2020)" is DIET, cited for TED policy and latency targets; TED is a different paper.
- "Reimers & Gurevych (2020)" is the multilingual distillation paper; the MiniLM/SBERT basis is Reimers & Gurevych (2019).
- "Madmehr & Bruckman (2020)" is described in §2.3.2 as having built a rule-based bot, but the listed title is a **qualitative study of user expectations**.
- Several references (Adewumi et al. 2022 "Journal of Artificial Intelligence Research and Applications", Luzardo et al. 2020 EDM, Madmehr & Bruckman, Tseng & Levy, Brown & Anderson) could not be checked here and should be **verified to exist** by the student/supervisor before defence.
- Reference list is not alphabetical.

I have not altered the .docx. These are for the student to fix with the supervisor.

---

## 7. User-side checklist (cannot be done by Claude)

1. `npm i -g firebase-tools` then `! firebase login` (run in the prompt so output lands in session). Firebase CLI is **not installed** on this machine (Node v22.22.2 / npm 10.9.7 are).
2. Create Firebase project; add Web app; copy config (public, safe to commit).
3. Console → Build → **AI Logic** → enable with **Gemini Developer API**. Check quota for the chosen model.
4. Console → **App Check** → register web app (reCAPTCHA v3 or Enterprise); give me the **site key** (public). Add `localhost` debug token for dev.
5. Enable **Auth** (Email/Password, Google). Create **Firestore** (production mode). Enable **Hosting**.
6. Set a Google Cloud **budget alert**.
7. Create `.env.local` with a Gemini key **only** if running the live smoke test locally; never commit.

---

## 8. Open questions for the student
- Who is the real admin and what do they need (reports on what)?
- Is cross-session progress required for the defence demo, or only a single-session summary?
- Is the pre/post study going ahead? (Ethics approval + 60 participants.) The software cannot and must not produce that data.
