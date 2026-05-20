# FlashQuest — Project Memory

## Overview
**FlashQuest** is a retro pixel RPG-themed interactive flashcard web app for studying.

## Stack
- **Framework:** React JSX (single file: `flashcards.jsx`)
- **AI API:** OpenRouter — `openrouter/owl-alpha` (free model)
- **CDN test setup:** `index.html` (loads `flashcards.jsx` via Babel standalone with module transform)

## Features

### UI / Theme
- 🎮 Press Start 2P pixel font, NES-style double borders, CRT scanline overlay, starfield background
- 📱 Fully responsive — works on desktop and mobile (iPhone tested at 375px)
- ⚙ Settings panel (gear icon) — API key input, sound controls, model info
- 🔊 Sound mute toggle in header with dynamic icon (🔇/🔉/🔊)
- 📊 Session history — "Last Session" summary card on home screen (deck name, stats, date)
- 📦 Saved AI decks — up to 10 auto-saved to localStorage, shown as clickable buttons on home

### Sound Engine (Web Audio API, zero files)
- Suspense loop — tense 8-bit melody while question is displayed
- Reveal fanfare — ascending arpeggio when card is flipped
- Ambient reading music — calm RPG chord loop while answer is shown
- Victory fanfare — 8-bit win jingle on "Got It ✔"
- Miss buzzer — descending fail sound on "Review Again ✗"
- Countdown ticks — urgent in last 2 seconds (matches visual red state)
- Mute toggle + volume slider (0–100%) persisted to localStorage (`fq_muted`, `fq_volume`)

### Study Flow
- ⏱ **8-second** auto-reveal countdown with pixelated progress bar (changes color: green → orange → red)
  - **8–6s:** Green bar, white text, normal tick
  - **5–3s:** Orange bar, gold text, normal tick
  - **2–0s:** Red bar (urgent), red pulsing text, urgent high-pitch tick
- ✦ AI deck generator — type any topic, pick difficulty level, get 8 AI-generated cards (teacher mode only now)
- 🎓 Difficulty selector for AI: high school (📘), college (📗), expert (📕)
- 🔄 `seed=${Date.now()}` in AI prompt ensures unique questions every generation, with explicit instruction to vary topics/angles
- 🧠 `max_tokens: 700` — plenty for 8 cards (~250–400 tokens needed), avoids OpenRouter free tier limit (max 988)
- ✔ Got It / Review Again marking per card
- 🔁 Retry missed cards at end of session
- 🏆 Results screen with mastery score bar, emoji rating, and stats
- ✋ Swipe gesture on mobile — swipe right = Got It, swipe left = Review Again (with visual glow feedback)
  - Y-axis tracking prevents vertical scrolling from triggering horizontal swipe (ratio: 1.5× horizontal > vertical)
  - 80px activation threshold
  - `suppressClickRef` prevents post-swipe click from auto-flipping next card
- 🎹 Keyboard shortcuts: `SPACE` flip, `ENTER`/`→` got it, `←` review
- 💾 Sessions saved to localStorage (`fq_sessions`) — deck name, known/review counts, date, percentage

### Mobile Optimization
- 📱 **Touch device detection** — `isTouch` state (via `ontouchstart` / `maxTouchPoints`) swaps hints for mobile vs desktop
- 🃏 **Responsive card height** — `clamp(260px, 44vh, 380px)` scales on small screens (iPhone: ~357px, smaller phones: 260px min)
- 👍 **Touch target sizes** — `min-height: 44px` on mark buttons and results buttons for easy tapping
- 🚫 **Tap highlight removed** — `-webkit-tap-highlight-color: transparent` on all interactive elements
- 👆 **Touch-action** — `touch-action: manipulation` on card-scene prevents double-tap zoom, improves swipe responsiveness
- 💬 **Contextual hints** — Shows `▶ TAP TO REVEAL ◀` and `⇆ TAP card to flip · ← swipe review · → swipe got it` on touch devices (vs keyboard shortcut hints on desktop)

### Layout / Card Position
- Card stays in **exact same vertical position** whether flipped or not
- Countdown timer + reveal button both remain in DOM with `visibility: hidden` when flipped — preserves layout space
- `.card-scene.flipped { margin-bottom: 100px }` — generous breathing room between card bottom and mark buttons when flipped

#### Teacher Dashboard
- 👨‍🏫 **Separate teacher mode** at `/teacher` URL path — no links or hints visible on student mode (`/`)
- ✦ **AI Deck Generator** at the top of teacher dashboard — topic input, GO button, difficulty selector (high school/college/expert)
- 📊 **Quick Stats** — total sessions, cards studied, average score across all sessions
- 📋 **Saved Decks manager** — view all AI-generated decks with STUDY and DELETE buttons
- 📊 **Session History table** — date, deck name, score (color-coded), known/review counts
- 📈 **Per-Deck Progress** — aggregate stats per deck: number of sessions, average score, best score
- 💾 **Data Management**:
  - 📥 **Export all data** — downloads `flashquest-data-*.json` with saved decks + session history
  - 📤 **Import data** — upload a previously exported JSON file to restore data
  - ⚠ **Clear all data** — wipes localStorage and resets all state
- 🛡️ **Confirmation modal** for destructive actions (delete deck / clear all data) with CANCEL / CONFIRM
- 🔄 **Navigation**: Teacher can study decks from dashboard → study screen → results → back to dashboard
  - Header shows `◀ DASHBOARD` when on student/study/results screens
  - Header shows `👤 STUDENT VIEW` when on dashboard (switches to student home)

#### Student Mode
- 🎓 **Student mode** is the default at `/` — clean study-only interface
- 📋 **Only saved decks** are shown (decks created by teacher via AI generator)
- ❌ No preset decks (removed Math, World History, English)
- ❌ No AI deck generator — students cannot create decks
- ❌ No teacher links or hints visible
- ✏️ Hero subtitle: "Pick a deck to study."

## Persistence (localStorage)
- `fq_api_key` — OpenRouter API key
- `fq_muted` / `fq_volume` — sound preferences
- `fq_saved_decks` — AI-generated decks (name, cards, difficulty, date)
- `fq_sessions` — study session history (up to 20 entries)

## Bugs Fixed

### 1. Auto-flip didn't work after countdown expired
**Cause:** `setFlipped(true)` was called inside `setCountdown(prev => ...)` functional updater. React doesn't guarantee other `setState` calls inside an updater will flush before the next render.
**Fix:** Moved auto-flip logic into a `useEffect` watching `countdown === 0`.

### 2. Keyboard/touch handlers saw stale `flipped` state
**Cause:** Event handlers captured `flipped` at registration time (stale closure).
**Fix:** Introduced `flippedRef`, `resultsRef`, `idxRef`, `cardsRef`, `deckNameRef` — refs kept in sync with state via `useEffect`.

### 3. Mark buttons hidden behind the 3D card
**Cause:** `transform-style: preserve-3d` card rendered on top of buttons due to stacking context bleed.
**Fix:** Added `position: relative; z-index: 10` to `.mark-row` and `.reveal-btn-wrap`.

### 4. Enter key auto-advanced to next card without revealing answer
**Cause:** Hidden mark buttons retained keyboard focus and fired on Enter.
**Fix:** Added `visibility: hidden` to `.mark-row` and `visibility: visible` to `.mark-row.visible` — removed from tab order when hidden.

### 5. doFlip() race condition with flippedRef
**Cause:** `doFlip()` called `setFlipped(true)` but `flippedRef.current` was only updated later by a `useEffect`. Arrow keys pressed immediately after flip saw `flippedRef.current = false`.
**Fix:** Set `flippedRef.current = true` synchronously alongside `setFlipped(true)` in both `doFlip()` and the auto-flip effect.

### 6. Stale closure in handleMark for deckName
**Cause:** `handleMark` was a `useCallback` without `deckName` in deps, so saved sessions always had an empty deck name.
**Fix:** Added `deckNameRef` synced via `useEffect`, read `deckNameRef.current` inside the timeout callback.

### 7. Flipped card overlapped with mark buttons
**Cause:** When flipped, the countdown and reveal button were conditionally removed from DOM (`{!flipped && ...}`), so the card moved up into the space and got too close to the buttons below.
**Fix:** Kept countdown and reveal button in DOM with `visibility: hidden` when flipped — card stays in same position. Added `.card-scene.flipped { margin-bottom: 100px }` for extra space.

## Test Setup
- `index.html` loads `flashcards.jsx` at runtime via Babel standalone + CDN React
- No build tools required — run `python -m http.server 3000` and open `http://localhost:3000`
- Patches module imports (`import` → React destructuring, `export default` → global assignment)
- Stays in sync with `flashcards.jsx` automatically (no copy-paste needed)
