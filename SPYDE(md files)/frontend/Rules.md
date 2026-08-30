# 📏 RULES.md — SPYDE Coding Conventions & Team Workflow

> **These rules are non-negotiable.** Every commit, every PR, every AI-assisted suggestion must comply. When your AI suggests something that violates a rule here, override it.

---

## 🎯 Table of Contents

1. [Universal Rules (All Developers)](#1-universal-rules-all-developers)
2. [TypeScript Rules](#2-typescript-rules)
3. [Backend Rules (B1 + B2)](#3-backend-rules-b1--b2)
4. [Frontend Rules (F1 + F2)](#4-frontend-rules-f1--f2)
5. [Security Rules (Everyone)](#5-security-rules-everyone)
6. [Git & Branching Workflow](#6-git--branching-workflow)
7. [Pull Request Rules](#7-pull-request-rules)
8. [Commit Message Convention](#8-commit-message-convention)
9. [File & Folder Naming](#9-file--folder-naming)
10. [Code Formatting](#10-code-formatting)
11. [Testing Rules](#11-testing-rules)
12. [AI Assistant Guardrails](#12-ai-assistant-guardrails)
13. [Documentation Rules](#13-documentation-rules)
14. [Communication Protocol](#14-communication-protocol)
15. [Definition of Done](#15-definition-of-done)

---

## 1. Universal Rules (All Developers)

### 🟢 MUST DO
- ✅ Read your `TRACKER_XX.md` before every coding session
- ✅ Update your tracker's progress checklist daily
- ✅ Log blockers, decisions, and questions in `LEARNING_NOTES.md`
- ✅ Use **strict TypeScript** — no `any`, no `@ts-ignore` without justification
- ✅ Write complete, copy-paste ready code — never `// TODO` or `// placeholder`
- ✅ Every file must compile with zero errors and zero warnings
- ✅ Ask a teammate before modifying files owned by another domain
- ✅ Test your changes locally before pushing

### 🔴 MUST NOT DO
- ❌ Never commit `.env` files (only `.env.example`)
- ❌ Never commit `node_modules/`, `dist/`, or `.next/`
- ❌ Never disable ESLint/TypeScript rules globally
- ❌ Never hardcode secrets, API keys, or credentials
- ❌ Never push directly to `main` branch
- ❌ Never merge your own PR without a review
- ❌ Never modify files outside your scope without team approval
- ❌ Never install a new dependency without discussing with the team

---

## 2. TypeScript Rules

### Strict Mode Configuration
Both `client/tsconfig.json` and `server/tsconfig.json` MUST have:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
Type Rules
TypeScript

// ❌ WRONG
function process(data: any) { ... }
const user: any = fetchUser();

// ✅ CORRECT
function process(data: PaymentRequest): PaymentResponse { ... }
const user: User = fetchUser();

// ❌ WRONG — never use non-null assertion carelessly
const name = user!.name;

// ✅ CORRECT — narrow with checks
if (!user) throw new Error('User required');
const name = user.name;
When any is Acceptable (rare)
Third-party libraries without types (must add // eslint-disable-next-line with reason)
Never in your own business logic
Prefer interface for Objects, type for Unions
TypeScript

// ✅ CORRECT
interface User {
  id: string;
  phone: string;
}

type Verdict = 'PASS' | 'WARN' | 'BLOCK';
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };
Always Export Types Explicitly
TypeScript

// ❌ WRONG
export const evaluateRisk = (req: RiskEvaluationRequest) => { ... };

// ✅ CORRECT
export type RiskEvaluationRequest = { ... };
export type RiskEvaluationResult = { ... };
export function evaluateRisk(req: RiskEvaluationRequest): Promise<RiskEvaluationResult> { ... }
3. Backend Rules (B1 + B2)
Zod for ALL External Inputs
Every request body, query param, and header MUST be validated with Zod.

TypeScript

// ❌ WRONG
router.post('/payment', async (req, res) => {
  const { amount, receiverVPA } = req.body;
  // ... use directly (unsafe!)
});

// ✅ CORRECT
const initiatePaymentSchema = z.object({
  receiverVPA: z.string().regex(/^[a-z0-9.\-_]+@[a-z]+$/),
  amount: z.number().positive().max(500000),
});

router.post('/payment', async (req, res) => {
  const parsed = initiatePaymentSchema.parse(req.body); // throws on invalid
  const { amount, receiverVPA } = parsed;
  // ... safe to use
});
Every Route Wrapped in Try/Catch (via asyncHandler)
Create a shared helper:

TypeScript

// server/src/utils/asyncHandler.ts
export const asyncHandler = (fn: RequestHandler) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
Use everywhere:

TypeScript

router.get('/me', authenticateToken, asyncHandler(async (req, res) => { ... }));
Consistent API Response Format
Every endpoint returns:

TypeScript

// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERR_CODE_UPPERCASE",       // Optional
  "details": { ... }                   // Optional (e.g., Zod errors)
}
Database Access — Prisma Only
❌ No raw SQL queries
❌ No direct pg client usage
✅ Use the shared Prisma instance from server/src/db/prisma.ts
✅ Use transactions (prisma.$transaction) for multi-write operations
✅ Always use select or include explicitly — never return full user objects
TypeScript

// ❌ WRONG — leaks sensitive fields
const user = await prisma.user.findUnique({ where: { id } });
res.json({ success: true, data: user });

// ✅ CORRECT — explicit selection
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, phone: true, kycStatus: true }
});
Environment Variables
✅ Access ONLY via the validated env object from server/src/config/env.ts
❌ Never process.env.SOMETHING directly in business logic
TypeScript

// ❌ WRONG
const secret = process.env.JWT_ACCESS_SECRET;

// ✅ CORRECT
import { env } from '../config/env.js';
const secret = env.JWT_ACCESS_SECRET;
Logging
Use console.log prefixed with emoji categories (for now — swap for pino later):
🛡️ = Security/Auth
⚡ = Performance
🔥 = Errors
📱 = Mock external services (OTP, SMS)
✅ = Success
⚠️ = Warnings
Never log secrets, tokens, PINs, or raw OTPs in production mode
OTPs only logged when env.NODE_ENV === 'development'
Performance Requirements
Endpoint Category	Max Response Time
Auth (login, refresh)	< 300ms
Safe Circle pre-check	< 10ms
Risk Engine evaluation	< 200ms
QR verification	< 300ms
Certificate generation	< 500ms
Liveness session start	< 100ms
Log any request exceeding threshold with ⚠️ SLOW prefix.

4. Frontend Rules (F1 + F2)
React & Component Rules
✅ Functional components only — no class components
✅ Named exports for components: export const Button: React.FC<Props> = () => {}
✅ One component per file (except tightly coupled sub-components)
✅ Props always typed with interface ComponentNameProps
❌ No inline anonymous default exports for components
TypeScript

// ❌ WRONG
export default function() { return <div>...</div>; }

// ✅ CORRECT
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, variant = 'primary' }) => {
  return <button onClick={onClick}>{label}</button>;
};
State Management
✅ Zustand only for global state
✅ useState + useReducer for local component state
❌ No Redux, no MobX, no React Context for global state (Context OK for theming only)
✅ One Zustand store per domain (authStore, paymentStore, safeCircleStore, livenessStore)
API Calls — Central Client Only
All HTTP requests go through client/src/lib/apiClient.ts:

TypeScript

// ❌ WRONG
const res = await fetch('/api/auth/login', { ... });

// ✅ CORRECT
import { apiClient } from '@/lib/apiClient';
const { data } = await apiClient.post('/auth/login', payload);
The apiClient handles:

Base URL from env
Auth header injection
JWT refresh on 401
Error normalization
Request/response typing
Styling — Tailwind Only
✅ Tailwind utility classes on JSX
✅ clsx + tailwind-merge for conditional classes
❌ No CSS Modules, no styled-components, no inline style (except dynamic values)
❌ No custom CSS files (except index.css for base + Tailwind directives)
TypeScript

// ✅ CORRECT
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

<button 
  className={twMerge(clsx(
    'px-4 py-2 rounded-lg font-medium',
    variant === 'danger' && 'bg-spyde-danger text-white',
    disabled && 'opacity-50 cursor-not-allowed'
  ))}
>
Colors — Use Palette Only
✅ Use spyde-* colors from tailwind.config.js (defined in DESIGN.md)
❌ Never use raw hex codes in JSX
❌ Never use Tailwind default colors like text-red-500 — use text-spyde-danger
TypeScript

// ❌ WRONG
<div className="bg-[#EF4444] text-red-500">

// ✅ CORRECT
<div className="bg-spyde-danger text-spyde-text">
Icons — Lucide Only
✅ lucide-react for all icons
❌ No FontAwesome, no Material Icons, no custom SVG icons unless approved
Animations — Framer Motion Only
✅ All transitions, page changes, and micro-interactions via Framer Motion
❌ No CSS animations for interactive elements (OK for pure decoration like animate-pulse)
Responsive Design
✅ Mobile-first — start with default (base) styles, add sm:, md:, lg: breakpoints
✅ Test at: 375px (iPhone SE), 768px (tablet), 1440px (desktop)
❌ Never fixed pixel widths for containers
Sensitive Data Display
✅ Always mask account numbers: ••••••••4521
✅ Always mask phone numbers in lists: +91 ••••• 56789
❌ Never show full account number, full OTP, or PIN in plaintext (even in dev)
Loading & Error States
✅ Every async operation shows a loading state (skeleton, spinner, or button loader)
✅ Every fetch failure shows a toast or error banner
✅ Every list has an empty state UI
5. Security Rules (Everyone)
🚨 Absolute Prohibitions
❌ Never commit real API keys, DB passwords, or secrets
❌ Never disable JWT verification, even temporarily
❌ Never log OTPs, PINs, JWT tokens, or refresh tokens
❌ Never send encryption keys to the server (view-once face flow)
❌ Never render or persist face images unencrypted
❌ Never accept client-provided risk scores (server always evaluates)
❌ Never trust the Origin header alone for auth (use JWT)
❌ Never expose internal error stack traces to the client in production
Password / OTP Rules
OTPs: 5 digits, 60s TTL, 3 verification attempts max, then Redis lockout for 5 min
JWT access token: 15 minutes expiry
JWT refresh token: 7 days expiry, single-use rotation (blacklist on refresh)
All tokens stored in httpOnly, secure, sameSite=strict cookies
CORS Rules
Whitelist only CLIENT_ORIGIN from env
credentials: true for cookie auth
Never use origin: '*' with credentials
File Uploads
Max size: 5 MB per file
Allowed types: image/jpeg, image/png, image/webp only
Scan magic bytes, not just MIME type
Store in isolated bucket (never in DB blob columns)
Encryption Standards
Face data: AES-256-GCM, key generated client-side, never touches server
JWT signing: RS256 (asymmetric) with rotating keys, NOT HS256
Passwords (if added later): bcrypt with cost factor ≥ 12
Payload hashing: SHA-256, canonical JSON (sorted keys, no whitespace)
6. Git & Branching Workflow
Branch Structure
text

main              ← Production-ready code, protected, requires PR approval
├── develop       ← Integration branch, all feature branches merge here
    ├── feat/b1-auth-otp-flow
    ├── feat/b1-risk-engine-algorithmic
    ├── feat/b2-liveness-session-api
    ├── feat/b2-qr-verification
    ├── feat/f1-auth-screens
    ├── feat/f1-payment-flow-state
    ├── feat/f2-liveness-camera
    ├── feat/f2-qr-scanner
    ├── fix/xxx-description
    └── docs/update-schema
Branch Naming Convention
Format: <type>/<dev-code>-<short-description-kebab-case>

Type	When to Use
feat/	New feature
fix/	Bug fix
refactor/	Code restructuring, no behavior change
docs/	Documentation only
chore/	Tooling, deps, configs
perf/	Performance improvement
Examples:

text

feat/b1-safe-circle-crud
fix/b2-liveness-challenge-expiry
docs/f1-update-design-tokens
Daily Workflow
Bash

# 1. Start your day
git checkout develop
git pull origin develop

# 2. Create your feature branch
git checkout -b feat/b1-auth-otp-flow

# 3. Code, commit often
git add .
git commit -m "feat(auth): implement OTP generation with Redis TTL"

# 4. Keep your branch fresh with develop (rebase, don't merge)
git fetch origin
git rebase origin/develop

# 5. Push and open PR
git push origin feat/b1-auth-otp-flow
# → Open PR on GitHub targeting `develop`
Never Do This
❌ git push --force on shared branches
❌ git commit -am without reviewing diff first
❌ Merge develop into your feature branch (rebase instead)
❌ Long-lived branches (max 3 days without rebase)
7. Pull Request Rules
PR Title Format
Same as commit convention:

text

feat(auth): add OTP verification endpoint with rate limiting
fix(risk-engine): correct duplicate detection window from 15m to 10m
docs(schema): update SafeCircle model relations
PR Description Template
Every PR MUST include:

Markdown

## What
Brief description of the change (2-3 sentences).

## Why
The problem this solves or the feature this enables.

## How
Key implementation decisions (bullet points).

## Scope
- [ ] Files modified are within my domain (per TRACKER_XX.md)
- [ ] No cross-domain changes without team discussion

## Testing
How you tested this manually. Screenshots for UI changes.

## Docs Updated
- [ ] Updated relevant .md file(s): `_______`
- [ ] Not applicable

## Checklist
- [ ] TypeScript compiles with zero errors
- [ ] ESLint passes with zero warnings
- [ ] All Zod schemas exported (if backend)
- [ ] All props typed (if frontend)
- [ ] Tested happy path
- [ ] Tested error path
- [ ] Coordinated with dependent devs
PR Review Rules
Every PR requires at least 1 approval from a teammate before merge
Cross-domain PRs (e.g., F1 touching backend types) require approval from that domain's owner
Reviewer must:
Actually pull and run the branch locally (for non-trivial changes)
Check TypeScript compiles
Verify tracker checklist alignment
Test at least one scenario
Author must:
Address every comment (either fix or reply why not)
Never merge with unresolved conversations
PR Size Guidelines
✅ Ideal: < 300 lines changed
⚠️ Acceptable: 300–800 lines
❌ Too big: > 800 lines — break into multiple PRs
8. Commit Message Convention
Follow Conventional Commits strictly:

text

<type>(<scope>): <subject>

<body — optional, wrap at 72 chars>

<footer — optional, reference issues>
Types
Type	Use
feat	New feature
fix	Bug fix
docs	Documentation only
style	Formatting, no code change
refactor	Code restructure, no behavior change
perf	Performance improvement
test	Adding tests
chore	Tooling, dependencies
Scopes
auth, risk-engine, safe-circle, liveness, qr, certificate, complaint, payment, wallet, ui, db, deps, docs

Examples
text

feat(auth): add refresh token rotation with Redis blacklist
fix(risk-engine): correct time-decay formula for complaints > 180 days
perf(safe-circle): cache whitelist in Redis with 5min TTL
docs(api): document /api/liveness/session/submit response schema
chore(deps): upgrade prisma to 5.19.1
refactor(payment): extract PIN validation into separate service
Rules
Subject line: max 72 chars, lowercase, no period at end
Use imperative mood: "add" not "added" or "adds"
Body explains why, not what (the diff shows what)
Reference issues: Closes #42 or Refs #17 in footer
9. File & Folder Naming
Files
Type	Convention	Example
React components	PascalCase	LivenessCamera.tsx, PaymentPinPad.tsx
Non-component TS	camelCase	apiClient.ts, cryptoUtils.ts
Zustand stores	camelCase + Store	authStore.ts, paymentStore.ts
Service modules	camelCase + .service.ts	risk.service.ts, certificate.service.ts
Route files	camelCase + .routes.ts	auth.routes.ts
Schema files	camelCase + .schema.ts	payment.schema.ts
Type files	camelCase or index.ts	payment.types.ts, types/index.ts
Tests	*.test.ts or *.spec.ts	risk.service.test.ts
Docs	UPPERCASE.md	README.md, RISK_ENGINE.md
Folders
Always lowercase, kebab-case for multi-word: safe-circle/, view-once/
Group by domain, not by type: components/liveness/ not components/cameras/
Import Aliases (Frontend)
Configure in vite.config.ts:

TypeScript

resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  }
}
Use:

TypeScript

// ✅ CORRECT
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';

// ❌ WRONG
import { Button } from '../../../components/common/Button';
10. Code Formatting
Prettier Configuration
Both client/ and server/ share this .prettierrc:

JSON

{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
ESLint
Extends eslint:recommended + @typescript-eslint/recommended
Frontend adds plugin:react/recommended + plugin:react-hooks/recommended
Warnings = errors in CI
Import Order
Node built-ins (fs, path)
External packages (react, express)
Internal aliases (@/lib/...)
Relative imports (./utils)
Types (import type { ... })
Example:

TypeScript

import { readFile } from 'node:fs/promises';

import express from 'express';
import { z } from 'zod';

import { prisma } from '@/db/prisma';
import { authenticateToken } from '@/middleware/auth';

import { validatePayload } from './helpers';

import type { PaymentRequest } from '@/types';
11. Testing Rules
Minimum Coverage (Aspirational — build as you go)
Backend services: critical business logic (risk engine, safe circle, certificate signing)
Frontend: key user flows (auth, payment state machine)
Testing Stack
Backend: Vitest + Supertest
Frontend: Vitest + React Testing Library
Configure once, everyone uses same setup
Manual Testing Checklist
Before every PR, manually verify:

✅ Happy path works end-to-end
✅ Error path shows user-friendly message
✅ Loading states appear
✅ Works on mobile viewport (375px)
✅ Refresh doesn't break state
✅ Logout clears all cached data
12. AI Assistant Guardrails
This section applies to every AI tool you use (Cursor, Copilot, Claude, ChatGPT).

System Prompt Template
Configure your AI with this system prompt:

text

You are assisting Dev [B1/B2/F1/F2] on the SPYDE project — a UPI fraud prevention 
middleware. You must follow these strict rules:

1. SCOPE: Only suggest code within my domain as defined in TRACKER_[XX].md.
   If asked about another dev's scope, respond: "That's outside my scope — 
   coordinate with Dev [Y]."

2. DOCS: Only reference these MD files: [list from tracker].
   Never invent facts. If unsure, ask me to confirm from the docs.

3. CONTRACTS: Never invent API endpoints not in API_EXAMPLES.md.
   Never invent DB tables not in SCHEMA.md.
   Always use exact JSON contracts as documented.

4. RULES: Follow every rule in RULES.md. If your suggestion violates a rule,
   flag it explicitly and offer a compliant alternative.

5. STACK: Only use approved libraries:
   - Backend: Express, Prisma, Zod, jsonwebtoken, Upstash Redis
   - Frontend: React 18, Vite, Zustand, Tailwind, Framer Motion, 
     Lucide, face-api.js, onnxruntime-web, html5-qrcode
   Never suggest alternatives without asking.

6. QUALITY: Write complete, copy-paste ready TypeScript.
   No placeholders. No TODOs. No 'any' types.
   Every function has explicit input/output types.

7. UNCERTAINTY: If context is missing, say "I need to see [file]" 
   instead of guessing.
Verification Habits
✅ Cross-check every AI suggestion against the relevant MD file
✅ Reject any code that uses libraries not on the approved list
✅ Reject any endpoint calls not in API_EXAMPLES.md
✅ Reject any DB queries touching tables not in your ownership
✅ If AI hallucinates a function signature, correct it explicitly in next prompt
Red Flags — AI is Hallucinating
🚩 Suggests importing from packages not in package.json
🚩 Uses field names that don't match the schema
🚩 Invents endpoint URLs
🚩 Adds TODO or // implement later comments
🚩 Suggests deprecated syntax (class components, componentDidMount)
🚩 Uses any type without explanation
13. Documentation Rules
When to Update Docs
Change	Docs to Update
New API endpoint	API_EXAMPLES.md
DB schema change	SCHEMA.md (mirror schema.prisma)
Risk formula change	RISK_ENGINE.md
New UI component	DESIGN.md (add to component gallery)
New user flow	APPFLOW.md
Architecture decision	LEARNING_NOTES.md
Personal progress	TRACKER_XX.md
Doc Update Rule
A code change that changes behavior REQUIRES a doc update in the same PR.

If a reviewer sees behavior changes without doc updates, they must reject the PR.

Doc Style
Use headings (#, ##, ###) consistently
Use tables for structured data
Use fenced code blocks with language tags (```typescript)
Use diagrams (ASCII or Mermaid) for flows
Use emoji sparingly, purposefully (✅ ❌ ⚠️ 🚨)
14. Communication Protocol
Daily Standup (15 min max)
Each dev answers in Slack/Discord thread:

Yesterday: What did I complete?
Today: What am I working on?
Blockers: Who do I need help from?
Async Communication Rules
Slack/Discord thread per PR for review discussion
Issue tracker for bugs (use GitHub Issues with labels: bug, enhancement, blocker)
LEARNING_NOTES.md for architectural decisions worth preserving
TRACKER_XX.md for personal daily log
When to Escalate
Escalate to team lead if:

Blocked > 4 hours on the same issue
Discovered a security vulnerability
Cross-domain change needed (touching another dev's files)
API contract change needed
Timeline slip > 1 day
Cross-Domain Coordination Rules
If B1 needs to change something F1 depends on:

B1 opens a "Contract Change" discussion in team channel
F1 acknowledges + agrees on new contract shape
B1 updates API_EXAMPLES.md first
B1 ships backend change
F1 updates client to consume new contract
Both mark coordination as done in respective trackers
15. Definition of Done
A task is DONE only when ALL of these are true:

For Backend Tasks
 Code compiles with zero TypeScript errors
 Zero ESLint warnings
 Zod schemas defined and exported
 Endpoint added to API_EXAMPLES.md with request/response
 Manually tested with Postman/Thunder Client
 Response time within performance budget
 Error paths tested (400, 401, 500)
 Prisma migrations committed (if schema changed)
 SCHEMA.md updated (if schema changed)
 TRACKER_XX.md checkbox ticked
 PR opened, reviewed, approved, merged
For Frontend Tasks
 Code compiles with zero TypeScript errors
 Zero ESLint warnings
 Zero console errors/warnings in browser
 Component props typed
 Loading state implemented
 Error state implemented
 Empty state implemented (if list)
 Responsive at 375px, 768px, 1440px
 Animations smooth (60fps)
 Manually tested in Chrome + Firefox
 Screenshots added to PR
 DESIGN.md updated (if new pattern)
 TRACKER_XX.md checkbox ticked
 PR opened, reviewed, approved, merged
🚨 Rule Violation Consequences
Severity	Example	Action
Minor	Formatting off, missing comment	Reviewer asks for fix in PR
Moderate	any type used, missing loading state	PR rejected until fixed
Major	Hardcoded secret, disabled TypeScript strict	PR rejected + team discussion
Critical	Commit .env, push to main, expose PII	Immediate revert + retro
✅ Final Reminders
🎯 Read your tracker before every session.
📝 Update docs in the same PR as code changes.
🔒 Never trust user input — validate with Zod.
🎨 Never hardcode colors — use the palette.
🚀 Ship small, ship often, merge daily.
🤝 Coordinate before touching another dev's domain.
🧠 Question every AI suggestion against these rules.
These rules are living. If a rule feels wrong or blocks legitimate work, open a discussion in the team channel. Rules can evolve — but only through consensus, never silently.

🛡️ SPYDE — Discipline is what makes fraud prevention actually work.