---
description: Advanced UI Analyzer & Refiner. Analyzes UI components, critiques design choices, and implements best-practice improvements. Specialized for Tailwind CSS & Vue.
---

# Smart UI Refiner

Use this workflow when the user asks to "fix UI", "improve design", or updates a component. This workflow emphasizes **analysis before action** to ensure high-quality, professional results.

## Phase 1: Context & Deep Analysis (Do this FIRST)

Before writing any code, you must deeply understand the current component.

1.  **Read the Component**: Use `view_file` to read the entire component file.
2.  **Identify the Stack**:
    *   Is it **Vue**? (Check for `<template>`, `<script setup>`)
    *   Is it **React**? (Check for `jsx`, `tsx`, hooks)
    *   Is it using **Tailwind**? (Check for class names like `flex`, `p-4`, `text-blue-500`)
3.  **Visual Audit (Mental Simulation)**:
    *   Imagine how this code renders.
    *   Check **Spacing**: Is it consistent? (e.g., mixing `p-2` and `p-5` randomly?)
    *   Check **Colors**: Are hardcoded hex values used instead of theme tokens (e.g., `#3b82f6` vs `bg-blue-500`)?
    *   Check **Responsiveness**: Are there `md:`, `lg:` prefixes? If not, it's likely broken on mobile.

## Phase 2: Design Critique & Strategy

Don't just blindly follow the user's instruction. **Improve it.**

*   **Critique**: If the user asks for "Make the button red", ask yourself: *Is red the semantic error color? Should it be a soft red background or a solid red?*
*   **Accessibiliy Check**:
    *   Are clickable elements using `<button>` or `<a>`?
    *   Do images have `alt` text?
    *   Is text contrast sufficient?
*   **Refinement Plan**:
    *   Proposed updated design (describe in text).
    *   List specific Tailwind classes to add/remove.

## Phase 3: Implementation Rules

### 🌐 Universal Rules (All Frameworks)
*   **No Magic Numbers**: Avoid `width: 350px`. Use relative units/Tailwind classes (`w-full`, `max-w-md`).
*   **Semantic HTML**: Use `<header>`, `<main>`, `<footer>`, `<section>` where appropriate.
*   **Mobile-First**: Write base classes for mobile, then `md:` for desktop.

### 🍃 Vue.js Specifics
*   **Composition API**: Prefer `<script setup>`.
*   **Slots**: Use slots for reusable content containers.
*   **Props**: Define typed props.
*   **Events**: Use `defineEmits` types.

### 💨 Tailwind CSS Specifics
*   **Ordering**: Layout (`flex`) -> Spacing (`p-4`) -> Sizing (`w-full`) -> Typography (`text-lg`) -> Visuals (`bg-white`, `shadow`).
*   **Tokens**: Use project config colors (e.g., `bg-primary`) over arbitrary values (`bg-[#123456]`).
*   **Effects**: Always add `transition-all duration-200` to interactive elements.
*   **Pseudo-states**: Always define `:hover`, `:active`, and `:focus-visible`.

## Phase 4: Execution & Verification

1.  **Apply Changes**: Use `replace_file_content` (or `multi_replace...` for complex edits).
2.  **Self-Correction**:
    *   *Did I accidentally delete a closing div?*
    *   *Did I break the build?*
3.  **Verify**: If possible, request a screenshot or ask the user to verify the visual output.

---

## Example Prompt for Agent
"Run the Smart UI Refiner on `src/components/Button.vue`. The user wants to make it 'pop' more."

**Agent Action:**
1. Read `Button.vue`.
2. Notice it's a flat gray button.
3. **Critique**: "Pop" implies elevation or vibrancy.
4. **Plan**: Add `shadow-md`, change bg to primary color, add `hover:shadow-lg`, add `active:scale-95` for tactile feel.
5. **Code**: Apply Tailwind classes.
