# Firestore usage budget

Every Firestore read/write the app can make. Anything not listed here does not touch Firestore.

| When | Operation | Count | Controls |
|---|---|---|---|
| User picks a domain | `getDocs(questions where domain==X, limit 50)` | **1 query per domain per 12 h**, per browser | In-memory map + `localStorage` cache (survives reloads), in-flight de-duplication, 12 h TTL. An **empty or failed** result is cached too, so an empty collection is never re-queried. Schema-invalid docs are dropped. |
| Session ends, **only if "Save my progress" is ON** | `addDoc(users/{uid}/sessions)` | **1 per finished session** | Never the same session twice; 10 s minimum gap between writes; no answer text and no model prose in the document (scores, tiers, question ids/text only). Rules also require `saveProgress == true` (that check is billed as 1 extra read per write). |
| User flips the "Save my progress" switch | `updateDoc(users/{uid})` | 1 per flip (first ever ON = create + update = 2) | Only on an actual change; never on page load. |
| Sign-in on a browser with **no local profile** (new device / cleared storage) | `getDoc(users/{uid})` | **1 per such sign-in** | Skipped when the profile is already stored locally. Lets a returning user skip onboarding and restores their "Save my progress" flag. |
| User saves onboarding / "Your role and settings" | `updateDoc(users/{uid})` (first time: create) | 1 per save, **only if saving is ON** | Profile is always kept on the device; it reaches Firestore only for users who opted in. Turning saving ON later also writes the stored profile. |
| User opens **Your history** | `getDocs(users/{uid}/sessions orderBy startedAt desc limit 20)` | **1 query per open** (<= 20 doc reads) | Not run on load. Schema-invalid docs dropped. Empty when saving was never on. |
| Page load, reload, typing answers, scores, feedback, resume | **none** | 0 | Resume snapshot is `localStorage` only. Preference is read from `localStorage`, not Firestore. |

Rough worst case per user per day with saving ON: ~3 question queries (<= 150 doc reads) + a handful of session writes. Free tier (Spark) allows 50k reads / 20k writes per day.

Not covered: Firebase Auth and AI Logic quotas (separate). **Firestore rules were changed (profile fields, session field validation) and are NOT emulator-tested or deployed**: until `firebase deploy --only firestore:rules` is run against the project, writes and history reads will be denied.
