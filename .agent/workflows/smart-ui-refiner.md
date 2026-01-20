---
description: Advanced UI Analyzer & Refiner. Analyzes UI components, critiques design choices, and implements best-practice improvements. Works with Vue, React, TS, Tailwind, and fallback CSS.
---

# Smart UI Refiner

Use this workflow when the user asks to "fix UI", "improve design", or change a UI component. This workflow emphasizes **analysis before action** to ensure high-quality, professional results. If a reference image is provided, prioritize visual fidelity to the image.

## Phase 1: Context & Deep Analysis (Do this FIRST)

Before writing any code, you must deeply understand the current component.

1.  **Read the Component**: Read the entire component file and any directly related styles.
2.  **Identify the Stack & Resources**:
    *   Is it **Vue**? (Check for `<template>`, `<script setup>`)
    *   Is it **React**? (Check for `jsx`, `tsx`, hooks)
    *   Is it **TypeScript**? (Look for `lang="ts"` or `.tsx`)
    *   **Tailwind Config**: Check `tailwind.config.js` or `globals.css` for custom tokens (colors, fonts). Don't guess; look for defined themes.
    *   **Icon Library**: Check `package.json` or imports to find the existing icon set (Lucide, Heroicons, etc.). Do not introduce a new library.
3.  **Reference Image Audit (If Provided)**:
    *   Identify layout, spacing rhythm, typography, colors, elevation, and interactive states from the image.
    *   Extract primary measurements (e.g., card radius, gaps, padding) and translate them into Tailwind or CSS tokens.
    *   Flag any complex visuals (gradients, patterns, shadows) that need careful replication.
4.  **Visual Audit (Mental Simulation)**:
    *   Imagine how this code renders.
    *   Check **Spacing**: Is it consistent? (e.g., mixing `p-2` and `p-5` randomly?)
    *   Check **Colors**: Are hardcoded hex values used instead of theme tokens (e.g., `#3b82f6` vs `bg-blue-500`)?
    *   Check **Responsiveness**: Are there `md:`, `lg:` prefixes? If not, it is likely broken on mobile.

## Phase 2: Design Critique & Strategy

Don't just blindly follow the user's instruction. **Improve it.**

*   **Critique**: If the user asks for "Make the button red", ask yourself: *Is red the semantic error color? Should it be a soft red background or a solid red?*
*   **Accessibility Check**:
    *   Are clickable elements using `<button>` or `<a>`?
    *   Do images have `alt` text?
    *   Is text contrast sufficient?
    *   Are focus styles visible?
*   **Refinement Plan**:
    *   Proposed updated design (describe in text).
    *   List specific Tailwind classes to add/remove (or CSS rules if Tailwind is not used).
    *   If a reference image exists, explicitly list the image features you will match.
    *   If the UI belongs to an existing product/system, preserve its visual language (colors, typography, spacing scale, and component patterns).

## Phase 3: Implementation Rules

### Universal Rules (All Frameworks)
*   **No Magic Numbers**: Avoid `width: 350px`. Use relative units/Tailwind classes (`w-full`, `max-w-md`).
*   **Semantic HTML**: Use `<header>`, `<main>`, `<footer>`, `<section>` where appropriate.
*   **Mobile-First**: Write base classes for mobile, then `md:` for desktop.
*   **Consistency**: Keep typography, spacing, radius, and shadow consistent across the component.
*   **System Alignment**: When modifying an existing UI, match the system's tokens, spacing scale, and component conventions before introducing new styles.
*   **Responsive First**: Ensure layout adapts cleanly to small screens before adding large-screen enhancements.
*   **Interaction Feedback**: Interactive elements (anything clickable) MUST have `cursor: pointer` and clear visual feedback (hover opacity/color, active scale).

### Vue.js Specifics
*   **Composition API**: Prefer `<script setup>`.
*   **Slots**: Use slots for reusable content containers.
*   **Props**: Define typed props.
*   **Events**: Use `defineEmits` types.

### React/TSX Specifics
*   **Semantic Elements**: Prefer native elements before adding div wrappers.
*   **Props**: Type props explicitly and keep components pure.

### Tailwind CSS Specifics
*   **Ordering**: Layout (`flex`) -> Spacing (`p-4`) -> Sizing (`w-full`) -> Typography (`text-lg`) -> Visuals (`bg-white`, `shadow`).
*   **Tokens**: Use project config colors (e.g., `bg-primary`) over arbitrary values (`bg-[#123456]`).
*   **Effects**: Prefer `transition duration-200` on interactive elements; use `transition-all` only when needed.
*   **Pseudo-states**: Define `hover`, `active`, and `focus-visible` for interactive elements.
*   **Fallback**: If Tailwind is not used, add minimal, scoped CSS to match the intended design.

## Phase 4: Execution & Verification

1.  **Apply Changes**: Update the component and related styles using available editing tools.
2.  **Logic Preservation**: Ensure all original event handlers (`@click`, `onClick`), inputs, and state logic are preserved exactly.
3.  **Self-Correction**:
    *   *Did I accidentally delete a closing div?*
    *   *Did I break the build?*
3.  **Verify**: If possible, request a screenshot or ask the user to verify the visual output.
4.  **Defer Unnecessary Changes**: If the user asked for a small tweak, avoid unrelated refactors.

---

## Example Prompt for Agent
"Run the Smart UI Refiner on `src/components/Button.vue`. The user wants to make it `pop` more. There is a reference image."

**Agent Action:**
1. Read `Button.vue`.
2. Notice it is a flat gray button.
3. **Critique**: `Pop` implies elevation or vibrancy.
4. **Plan**: Add `shadow-md`, change bg to primary color, add `hover:shadow-lg`, add `active:scale-95` for tactile feel, and match corner radius from the image.
5. **Code**: Apply Tailwind classes (or CSS fallback if not using Tailwind).
