# SPYDE — Design System & Visual Language

**Version:** 2.0 (Round 2 Production Build)
**Theme:** Slate & Emerald Trust (80% Serious / 20% Aesthetic)
**Core Philosophy:** SPYDE is the "Stripe Radar of UPI." It is B2B financial infrastructure. The design must project absolute cryptographic trust and precision, softened just enough by warm typography to feel welcoming to everyday UPI users. 

---

## 1. Color System (Slate & Emerald Trust)

We reject default neon "hacker" dark modes and aggressive alert colors. SPYDE relies on a muted, jewel-toned palette against a warm-slate canvas.

### 1.1 Canvas & Surfaces
*The app shell. Not pure black, but a deep, wealthy slate.*
- **Canvas Base** (`#13161A`): The absolute background of the app. Deep warm slate.
- **Surface Level 1** (`#1D2128`): Default card background. 
- **Surface Level 2** (`#272C35`): Elevated elements, modals, floating panels.
- **Hairline Border** (`#333A45`): 1px borders for all cards and table rows.

### 1.2 Typography Colors
*We do not use `#FFFFFF`. Pure white on dark slate is harsh. We use Warm Bone to provide the 20% "welcoming aesthetic."*
- **Text Primary (Warm Bone)** (`#F5F2E9`): All headings, primary body text, and active values.
- **Text Secondary (Sand)** (`#A1A1AA`): Subtitles, helper text, inactive states.
- **Text Muted** (`#71717A`): Disabled states, minor timestamps.

### 1.3 The Primary Brand Color
- **Muted Jade** (`#1A8276`): SPYDE’s primary brand color. Used for the main CTA pill buttons, active input borders, and "Safe" status indicators. 
- **Jade Press** (`#136359`): Pressed state for primary buttons.
- **Jade Wash** (`rgba(26, 130, 118, 0.15)`): 15% opacity background for soft tags and ambient background glows behind secure elements.

### 1.4 Semantic Risk Palette (CRITICAL)
*Fraud states must be clear but remain premium. No construction-zone yellow or blood red.*
- **PASS (0–49)** — **Emerald** (`#1A8276`): Matches the brand primary. Frictionless.
- **WARN (50–74)** — **Honey Amber** (`#D97706`): Warm, cautious gold.
- **CHALLENGE (75–89)** — **Terracotta** (`#C2410C`): Earthy, baked orange. Requires Liveness.
- **BLOCK (90–100)** — **Deep Ruby** (`#9F1239`): Authoritative, finite crimson.

---

## 2. Typography ("The Stripi Math")

SPYDE inherits its premium structural feel from thin, tightly tracked typography and strict rules around numeric data.

**Font Stack:** `Inter` (Google Fonts), fallback to `system-ui`.
**Global CSS Rule:** `font-feature-settings: "ss01";` (Uses the single-story 'a' for a more geometric, modern look).

### 2.1 The Typography Scale
| Token | Size | Weight | Tracking (Letter Spacing) | Usage |
|---|---|---|---|---|
| `display-xl` | 48px | **300 (Thin)** | -0.96px | Escrow countdowns, huge balances |
| `display-lg` | 32px | **300 (Thin)** | -0.64px | Screen headers, Payment amounts |
| `heading-md` | 20px | **300 (Thin)** | -0.20px | Card titles, Contact names |
| `body-md` | 15px | **300 (Thin)** | 0px | Default body text |
| `button-md` | 15px | 400 (Regular) | 0px | Button labels |
| `caption` | 13px | 400 (Regular) | 0.2px | Helper text, small UI labels |

### 2.2 Tabular Figures (Non-Negotiable)
**Rule:** *Any cell, span, or div containing a financial amount, a transaction ID, a risk score, a countdown timer, or a SHA-256 hash MUST use `font-feature-settings: "tnum" ;` (Tabular Numbers).*
This ensures numbers align perfectly in vertical stacks and visually signals to the user that this is a high-precision financial tool.

---

## 3. Shapes, Spacing & Elevation

- **Buttons & Tags:** ALWAYS Pill-shaped (`border-radius: 9999px`). Short, decisive, transactional padding (e.g., `8px 16px`).
- **Cards & Modals:** `12px` border radius (`rounded-xl`).
- **Viewports (Camera):** Circular or highly rounded (`rounded-3xl`) with 4px colored borders matching the risk state.
- **Elevation:** We do not use drop shadows. Elevation in dark mode is achieved via **ambient auras**. 
  - *Example:* The Liveness Camera viewport has a soft, blurred glow: `box-shadow: 0 0 40px rgba(26, 130, 118, 0.2);` (Emerald aura).

---

## 4. Component Specifications

### 4.1 Buttons
- **Primary Pill:** Background `Muted Jade`, Text `Canvas Base` (dark slate for contrast), Font `button-md`.
- **Secondary Pill:** Background `Surface Level 2`, Text `Warm Bone`, 1px `Hairline Border`.
- **Destructive Pill:** Background `Deep Ruby`, Text `Warm Bone`. (Used only for "Report QR" or "File Complaint").

### 4.2 Inputs
- **Base:** Background `Canvas Base`, 1px border `Hairline Border`, Text `Warm Bone`.
- **Focus:** Border transitions to `Muted Jade`.
- **VPA Input:** Must use `tnum` and slightly larger text (`18px` weight `300`) to ensure `@` handles are easily readable.

---

## 5. Feature-Specific Visual Guidelines

### 5.1 Payment Friction Engine (F1)
The risk score UI dictates the payment flow.

- **PASS (Green):** Silent/Seamless. A quick `Muted Jade` toast appears: *"Protected by SPYDE"*, then instantly transitions to the PIN pad.
- **WARN (Yellow):** A `Honey Amber` modal overlays the screen. Displays the community complaint count. The CTA to "Proceed Anyway" is a Secondary Pill (subtle friction).
- **CHALLENGE (Orange):** A `Terracotta` full-screen state. Shows the Risk Score Ring. CTA is Primary Pill: "Verify Receiver Identity".
- **BLOCK (Red):** A `Deep Ruby` full-screen block. The OTP/PIN entry is physically un-rendered from the DOM. CTA: "File a Complaint". 

### 5.2 Liveness Camera UI (F2)
*Designed to feel like a high-security vault door opening.*

- **Camera Viewport:** A perfect circle in the center of the screen.
- **Viewport Border:** Glows `Deep Ruby` if no face is detected. Pulses `Muted Jade` when a face is locked.
- **Blink Counter Badges:** Two small circles below the camera. Empty (`Surface Level 2`), filling with `Muted Jade` as blinks are registered.
- **Challenge Code:** Rendered large at the top using `display-lg`, `tnum`, and `tracking-[0.4em]` (e.g., `8  4  9  2`).
- **Escrow Timer:** Positioned subtly at the bottom in `Honey Amber`: *Escrow closes in: 09:42*.

### 5.3 QR Tamper Verdicts (F2)
*Relies heavily on the Semantic Risk Palette and Haversine distance math.*

- **VERIFIED:** Card gets a `Muted Jade` 15% wash background. Displays a `KYC VERIFIED` pill tag.
- **TAMPERED:** Card gets a `Deep Ruby` 15% wash. The text *"Mismatch: 842 km away"* is bolded in Ruby. The "Proceed to Pay" button is completely hidden.

### 5.4 Digital Evidence Certificate (F1/F2)
*Must look like a legally binding, immutable document.*

- **Layout:** A `Surface Level 1` card with a 1px `Hairline Border`. 
- **Header:** Features a small SPYDE shield icon and "Digital Evidence Certificate" in `heading-md`.
- **Cryptographic Proof Block:** A slightly darker inset box (`Canvas Base`). 
- **Hash Typography:** The SHA-256 hash and JWT signature MUST be displayed in a strictly monospace font (e.g., `JetBrains Mono` or `Roboto Mono` at 11px), breaking on any character, colored in `Sand` (`#A1A1AA`).
- **10-Second Face Viewer:** When the "View Confirmation" button is tapped, the screen goes 95% black. The image is rendered centrally with an overarching `Deep Ruby` countdown bar that shrinks linearly over 10 seconds. At 3 seconds, the image begins to CSS `blur()`. At 0 seconds, it vanishes.

### 5.5 Safe Circle (F1)
- **Standard Contact:** Avatar initials, Name (`heading-md`), and VPA (`caption`, `tnum`).
- **Anomaly Banner:** If `hasAnomaly === true` (10+ complaints), a `Honey Amber` banner is injected inside the contact card: *"⚠️ This account may be compromised."*

---

## 6. Motion & Interaction

- **Animations:** Governed by `framer-motion`.
- **Rule of Restraint:** We are a financial app. No bouncy springs, no playful scaling, no chaotic layout shifts.
- **Transitions:** Use smooth, linear crossfades (`duration: 0.2s, ease: "easeInOut"`).
- **Page Routing:** Slide-left for moving forward in a flow (e.g., VPA → PIN). Slide-right for moving back.
- **Liveness Bar:** The 0–100 score bar must fill fluidly using a tween curve, stopping exactly at the evaluated integer.

---

## 7. Do's and Don'ts for Frontend Devs

### 🟢 DO:
- **Do** format all Rupee amounts using `new Intl.NumberFormat('en-IN')` (e.g., `₹1,25,000.00`).
- **Do** use `balanceRupees` for UI display, never `balancePaisa` strings.
- **Do** apply `tnum` (tabular numbers) to every numeric element that updates dynamically.
- **Do** ensure all text has a minimum contrast ratio of 4.5:1 against the Slate canvas.

### 🔴 DON'T:
- **Don't** use pure `#FFFFFF` text anywhere. Stick to the Warm Bone (`#F5F2E9`) token.
- **Don't** bump font weights to 600 or 700 to create emphasis. Instead, use size scale or color to create hierarchy. The 300-weight (Thin) font is the brand's core identity.
- **Don't** use square or slightly-rounded buttons. All actionable buttons must be maximum-radius Pills.
- **Don't** cache the View-Once Face blob in the browser. It must be destroyed exactly at the 10-second mark.