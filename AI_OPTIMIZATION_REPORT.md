# AI Optimization Report

**Project:** ApparelFlow ERP - Cutting Operations & Gatekeeper Verification Terminal
**Candidate:** Maheesha Dewmini Thambawita

## 1. Tools & Prompting

I used **Claude (Anthropic)** as my AI assistant. I used it for:

- Planning the build order and the structure.
- Designing the Prisma schema and the seed data.
- Drafting the API routes (login, orders, counts, approve, reject, resubmit, sewing queue) and the pure business rules in `lib/gatekeeper.ts`.
- Drafting the Vitest suite for the five required rules.
- Debugging setup and deployment errors (Prisma, VS Code, Git, Vercel, Neon).

How I prompted: I ran every command myself, pasted the real terminal and log output back when something failed, and asked for explanations when I did not understand a step. 

## 2. Flawed / Broken AI Code and Instructions

1. **Invalid Prisma schema syntax.** The generated `schema.prisma` had the `generator` block on one line. `npx prisma db push` failed with error P1012 ("not a valid definition within a generator"). I read the error, found line 1 of the file, and rewrote the block over multiple lines. The command then succeeded.
2. **Type errors on `Response.json` in `lib/auth.ts`.** VS Code showed two red errors, "Property 'json' does not exist". The code was valid; VS Code was using its older bundled TypeScript instead of the project's version. I switched to the workspace TypeScript version, and the errors disappeared.
3. **Placeholder in the Git instructions.** The instructions contained `https://github.com/YOUR_USER/...`. I ran it as written, so `git push` failed with "Repository not found" and `git remote add` then said the remote already existed. I fixed it with `git remote set-url origin` and my real GitHub address, and the push succeeded.
4. **Deployment configuration mistakes.** The first Vercel deploy returned HTTP 500 with a blank body. The runtime logs showed `Environment variable not found: DATABASE_URL`. My variables were set up wrongly: I had pasted the `.env` lines with quote marks and a leftover `&channel_binding=require`, and I had entered the command `openssl rand -base64 48` as the JWT secret instead of the random output. I corrected both values, added them properly, redeployed, and the live login returned 200.
5. **Input rule not followed (decimals in fabric yards).** The AI-generated order form and API schema accepted decimal values for "Actual Fabric Used (yards)", although the assessment says inputs must strictly reject decimals. I found this when I checked the finished app against the PDF's input rules, before submitting.


## 3. Human Refactoring

- I reviewed each generated file before committing it and tested the behavior myself, for example logging in through `curl` against both `localhost` and the live URL, and creating an order to confirm that 50 garments with 2 cuffs each produced an expected count of 100.
- I fixed the configuration problems described above (Prisma schema layout, Git remote, TypeScript version, environment variables).
- I kept `.env`, cookie test files and editor settings out of Git by adding them to `.gitignore`, and I kept the committed `.env.example` free of real secrets.
- After re-reading the PDF's input rules against the finished app, I changed fabric yards to whole numbers only. I updated the form check in `Supervisor.tsx`, and the zod schemas in the create-order and resubmit routes (`.int()`), so the rule is enforced on the client and on the server. I also corrected the README.
- I added an optional approval note (`approval_note` column on `verification_logs`, a note field in the Verifier screen, and a "Verifier note" line in the Sewing queue), because the PDF says the sewing supervisor reviews the verifier's audit notes.

## 4. Defensive Architecture

- **Server-side RBAC:** every API route starts with `requireRole()`, which returns 401 when the user is not logged in and 403 for the wrong role. Hiding buttons in the UI is only cosmetic.
- **Server-side hard stop:** the approve endpoint recomputes each component's status from the stored counts and returns 422 if any component is RED, missing or uncounted. It never trusts flags sent from the browser.
- **Query isolation:** `GET /api/sewing/queue` has `where: { status: "VERIFIED" }` written into the database query and reads no URL parameters.
- **Authenticated context:** the verifier ID comes from the signed JWT cookie (HttpOnly), never from the request body, and timestamps come from the server and database.
- **Safe state transitions:** status changes use `updateMany` with the expected current status inside a transaction, so illegal or duplicate transitions change zero rows and return 409.
- **Immutable audit trail:** `verification_logs` rows can only be inserted. A Postgres trigger rejects UPDATE and DELETE.
- **Tests:** the Vitest suite checks the five required rules, plus the traffic-light and wastage calculations.