# Production runbook

Status against the AGENTS.md §9 release checklist, as of 2026-11-07. Update this table when an item changes.

| # | Item | Status |
|---|---|---|
| 1 | Engine DoD passed **and the user said "engine approved"** | Tests + live golden set (21 cases, `docs/engine-report.md`) are in place. **Approval not given yet.** |
| 2 | `npm run check` (tsc + tests + static build) | Green (162 tests). |
| 2b | Firestore rules emulator tests | **Missing.** Needs `@firebase/rules-unit-testing` (dev dependency, needs approval) and the Firebase CLI + Java, none of which exist on the dev machine yet. |
| 3 | App Check enforced, reCAPTCHA key set, tokenless request verified rejected | **Not done.** `NEXT_PUBLIC_APPCHECK_SITE_KEY` is empty in `.env.local`; the app runs without App Check until it is set. Console steps below. |
| 4 | Rules deployed and tested; no public write paths | Rules written and owner-only; **not deployed, not emulator-tested.** |
| 5 | Model ID verified on deploy date; Spark quota checked | `gemini-3.5-flash-lite` answered live calls on 2026-11-07. Re-check the official Firebase model list on the deploy day. |
| 6 | Budget alert; per-user rate limit reviewed | **Not done** (console). |
| 7 | Disclosure, consent, distress screens manually exercised | **Not done** (needs a browser session). Distress message deliberately has no helpline numbers: none have been verified. Add verified local numbers before launch. |
| 8 | No secrets in repo or bundle | Clean after removing a live Gemini key from `.env.example` (never committed; no git history yet). **Rotate that key.** Bundle scanned: no Gemini key, no App Check debug token code. |
| 9 | Mobile viewport checked | **Not done** (manual). |
| 10 | Known limitations shown in About/Privacy | Done; text updated for opt-in saving, history and the role sent to Gemini. |

## Known accepted risk
`npm audit --omit=dev` reports 4 high findings, all via `@grpc/grpc-js` (server-side advisories). Verified that no `grpc` code is in the static bundle (`grep` of `out/`), so it does not reach the browser. The suggested "fix" is a downgrade to firebase 9.14 and is not applied. Re-check after Firebase SDK updates.

## One-time Firebase console setup
1. **Auth**: enable Email/Password. Add the Hosting domain to authorised domains.
2. **App Check**: register the web app with reCAPTCHA v3, put the site key in `NEXT_PUBLIC_APPCHECK_SITE_KEY`, then **enforce** it for Firebase AI Logic, Firestore and Authentication. Leave it in monitor mode until a real build has run once, then enforce.
3. **AI Logic**: enable the Gemini Developer API backend; set a per-user rate limit (the default is generous).
4. **Billing**: set a budget alert. Check Spark quotas (Firestore, Hosting, AI Logic).
5. **Firestore**: create the database (production mode).

## Release steps
```bash
cp .env.example .env.local        # fill NEXT_PUBLIC_* incl. APPCHECK_SITE_KEY; leave APPCHECK_DEBUG=false
cp .firebaserc.example .firebaserc # set the real project id
npm run check                     # tsc + tests + static export to out/
grep -rF "AIza" out | head        # only the public Firebase web key may appear
firebase deploy --only firestore:rules   # BEFORE hosting, or saves/history are denied
firebase deploy --only hosting
```

## Post-deploy smoke test (on the live URL)
1. Register, complete onboarding, accept the AI notice.
2. Pick a domain, answer 3 questions, read the feedback, say "end": summary and breakdown appear.
3. Turn on **Save my progress**, finish a session, open **Your history**: the session is listed.
4. In a private window with App Check enforced, confirm a request without a token is rejected (browser devtools: Firestore/AI calls fail with `appCheck/...` or 403).
5. Try "ask me about SQL", "harder", "easier", "switch to business", and a distress phrase (session must pause).
6. Phone-width layout.
