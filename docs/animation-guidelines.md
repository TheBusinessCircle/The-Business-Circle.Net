# Animation Guidelines

Use animation to improve clarity, hierarchy, and confidence. If motion does not help the user understand what changed, do not add it.

## Default: Framer Motion

Use `framer-motion` for React UI animation and state-driven transitions:

- Cards and selection states
- Modals and overlays
- Page and section transitions
- Staggered copy or text reveals
- Button hover and tap feedback
- Simple entrance and exit animation

Framer Motion should be the first choice for components that already live inside React state and render cycles.

## Advanced: GSAP

Use `gsap` only when Framer Motion would become awkward or imprecise:

- Complex multi-step timelines
- Scroll-triggered scenes
- Orbit and ring systems
- Hero sequences
- Advanced layered background motion
- Cinematic sequences that need tight sequencing control

If GSAP is used, keep it isolated to the motion-heavy part of the experience rather than spreading it across ordinary UI components.

## BCN Rules Overlay Pattern

The first-login BCN Rules overlay is the reference pattern:

- Framer Motion handles the overlay fade, card entrance, staggered copy, trust-point reveal, CTA interaction, and exit before routing.
- GSAP handles only the orbit and background beam motion.
- Reduced motion disables continuous motion and falls back to simple fades.

## Restraint

- Premium should feel calm, not busy.
- Prefer one clear motion idea over multiple competing effects.
- Dark navy, royal blue, glass, and controlled pacing should stay consistent with the BCN visual tone.
