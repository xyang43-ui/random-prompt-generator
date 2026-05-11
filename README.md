# Random Untitled: Infinite Prompt Generator

A minimalist, highly interactive prompt generator inspired by the aesthetic of `2016.makemepulse.com`. This project focuses on a "Click & Hold" mechanic to generate random "Verb + Noun" combinations, set against a high-contrast, black-and-white, typography-driven UI.

## Core Experience

The generator is designed to be an immersive, sensory experience. Every interaction is tied to visual and auditory feedback.

### Interaction Guide

- **Generate New Prompt:** Click and **hold** anywhere on the screen. A progress bar at the bottom will fill as you hold. Once complete, a new prompt will be generated with a glitch transition.
- **Interactive Typography:** The prompt text reacts to your cursor's proximity, skewing and blurring as you move closer. During a "hold", the effect intensifies.
- **Background Particles:** Subtle particles follow your cursor, with their behavior and intensity changing when you hold.
- **Audio System:** 
    - Click the **MUSIC** button to open the BGM selection panel.
    - Choose from a curated list of ambient tracks.
    - Adjust the volume or use the mini-controls at the top to skip tracks.
    - A real-time visualizer reacts to the selected background music.
- **Archive Navigation:** 
    - Use the footer to navigate to the **ARCHIVE**.
    - The Archive uses an interactive **SVG Triangle**.
    - Click and **hold** on any side of the triangle (RANDOM PROMPT, PROMPT ABOUT RANDOMNESS, RANDOMNESS IN NATURE) to navigate to that section.

## Technical Details

- **Frontend:** React (Vite) + TypeScript
- **Styling:** Vanilla CSS (Minimalist B&W)
- **Animations:** Custom CSS Transitions, Framer Motion, and RequestAnimationFrame for high-performance interactive elements.
- **Audio:** Web Audio API with real-time AnalyserNode.

## Development

### Setup
```bash
cd frontend
npm install
```

### Run Locally
```bash
npm run dev
```

### Build
```bash
npm run build
```

---

*Part of the "Processing as a Methodology" project.*
