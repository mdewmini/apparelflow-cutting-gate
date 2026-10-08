# ApparelFlow ERP - Cutting Operations & Gatekeeper Verification Terminal

Software Engineering Intern practical challenge for Webtezza (Pvt) Ltd.
Next.js 14 (App Router, TypeScript), Prisma, PostgreSQL (Neon), JWT cookie auth, Vitest.

**Live URL:** https://apparelflow-cutting-gate-sigma.vercel.app
**Repository:** https://github.com/mdewmini/apparelflow-cutting-gate

## Demo credentials

Password for all accounts: `Passw0rd!`

| Role | Email |
|---|---|
| Cutting Supervisor (`cutting_supervisor`) | supervisor@apparelflow.test |
| Cutting Verifier (`cutting_verifier`) | verifier@apparelflow.test |
| Sewing Supervisor (`sewing_supervisor`) | sewing@apparelflow.test |

The login page has one-click buttons that fill these in. Use "Switch role / Log out" to change persona.

## Architecture

Security lives on the server. Disabled buttons and hidden panels in the UI are cosmetic only.

- `lib/gatekeeper.ts` holds the pure business rules: traffic-light flags, the component multiplier, fabric wastage % and `canApprove`.
- `requireRole()` in `lib/auth.ts` guards every API route. It returns **401** when not logged in and **403** for the wrong role.
- **Hard stop:** the approve endpoint recomputes everything from stored counts and returns **422** if any component is RED (shortage), missing or uncounted. Client-sent flags are never trusted.
- **Query isolation:** `GET /api/sewing/queue` hard-codes `where: { status: "VERIFIED" }` and reads no URL parameters.
- **Identity:** the verifier ID and timestamps come from the signed JWT (HttpOnly cookie) and the database clock, never from the request body.
- **Immutable audit trail:** `verification_logs` rows are written once (verifier ID, timestamp, per-component variances, wastage %). A Postgres trigger blocks UPDATE and DELETE.
- **Safe transitions:** status changes use `updateMany({ where: { id, status } })` inside transactions, so illegal or double transitions affect zero rows and return 409.

## State machine

```
PENDING_VERIFICATION -> VERIFIED -> sewing started
PENDING_VERIFICATION -> REJECTED -> (supervisor re-cuts and resubmits) -> PENDING_VERIFICATION
```

Rejection requires a reason note. Only VERIFIED orders appear in the Sewing Queue.

## Database schema

| Table | Purpose |
|---|---|
| `users` | Accounts with a hashed password and one of the 3 roles |
| `recipes` | Garment recipes: code, name, category, standard fabric yards, wastage cap |
| `recipe_components` | Cut parts per recipe and pieces per garment |
| `cutting_orders` | Orders: recipe, target quantity, fabric roll, fabric used, status, creator |
| `verification_items` | Expected and actual count per component, with GREEN / YELLOW / RED status |
| `verification_logs` | Append-only decisions: verifier, APPROVED or REJECTED, note, wastage %, variances |

See `prisma/schema.prisma` for the full definitions.

## Business rules

- Expected components = target quantity x pieces per garment.
- GREEN: actual equals expected. YELLOW: actual is above expected (batch may proceed). RED: actual is below expected (approval blocked).
- Fabric wastage % = ((actual fabric - expected fabric) / expected fabric) x 100, where expected fabric = target quantity x standard yards.
- Quantities, counts and fabric yards accept whole numbers only. Negatives, decimals, text and empty values are rejected on the client and on the server.
## Run locally

```bash
npm install
cp .env.example .env     # then fill in DATABASE_URL and JWT_SECRET
npx prisma db push
npm run db:seed
npm run dev              # http://localhost:3000
npm test
```

## Deploy (Neon + Vercel)

1. Create a Neon project and copy the connection string (pooling off, ending in `?sslmode=require`).
2. Locally, put it in `.env`, then run `npx prisma db push` and `npm run db:seed` to prepare the cloud database.
3. Push the repo to GitHub.
4. In Vercel, import the repository and set the environment variables `DATABASE_URL` and `JWT_SECRET`.
5. Deploy, then open the live URL and sign in with the demo credentials.