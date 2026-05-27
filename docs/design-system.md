# Cyber-Glow Design System & Theme Guidelines

This document defines the color palette, typography, container shapes, animations, and interactive effects for the **planohi-app-v4** Neon Modern theme.

---

## 1. Color Palette

The color system uses a deep, dark base to maximize the contrast of vibrant neon accents:

| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Dark Base (Bg)** | `#070708` | Primary application canvas background |
| **Dark Surface** | `#121214` | Card, container, and sidebar background |
| **Neon Purple** | `#a855f7` | Primary brand accent (active links, main buttons) |
| **Neon Cyan** | `#06b6d4` | Secondary brand accent (indicators, hover highlights) |
| **Border Dark** | `#27272a` | Default subtle borders |
| **Text Primary** | `#f4f4f5` | High-contrast body text and labels |
| **Text Muted** | `#a1a1aa` | Low-contrast descriptions and timestamps |

---

## 2. Typography

We use Google Fonts to project a sleek, technical appearance:

- **Headings & Titles**: `Space Grotesk` (futuristic, geometric sans-serif).
- **Body Text**: `Outfit` or `Inter` (neutral, clean, readable).
- **Numbers, Data, & Code**: `JetBrains Mono` (monospace system feel).

### Google Font Import Link (HTML/CSS)
```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&family=Outfit:wght@300;400;500;600&display=swap');
```

---

## 3. CSS Variables Setup (`index.css` or `globals.css`)

```css
:root {
  --bg-dark: #070708;
  --bg-surface: #121214;
  --text-primary: #f4f4f5;
  --text-muted: #a1a1aa;
  
  --neon-purple: #a855f7;
  --neon-cyan: #06b6d4;
  --border-subtle: rgba(255, 255, 255, 0.08);
  
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'Outfit', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

body {
  background-color: var(--bg-dark);
  color: var(--text-primary);
  font-family: var(--font-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}

.mono-text {
  font-family: var(--font-mono);
}
```

---

## 4. Neon-Gradient Cards with Cursor Tracking

Cards use a dark gradient surface that reveals a neon radial glow centered under the user's cursor when hovered.

### React Component Implementation Template
To implement cursor tracking in a card component:

```tsx
"use client";

import React, { useRef } from 'react';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlowCard: React.FC<GlowCardProps> = ({ children, className = "" }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { left, top } = cardRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`glow-card ${className}`}
    >
      <div className="glow-card-content">
        {children}
      </div>
    </div>
  );
};
```

### Accompanying CSS Styles
```css
.glow-card {
  position: relative;
  border-radius: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s;
}

/* Cursor Glow Overlay */
.glow-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.5s ease;
  background: radial-gradient(
    600px circle at var(--mouse-x, 0px) var(--mouse-y, 0px),
    rgba(168, 85, 247, 0.15) 0%,   /* Purple core */
    rgba(6, 182, 212, 0.05) 50%,   /* Cyan tail */
    transparent 100%
  );
  z-index: 1;
}

/* Hover Effects */
.glow-card:hover {
  transform: translateY(-2px) scale(1.02);
  border-color: rgba(6, 182, 212, 0.4); /* Cyan highlight border */
  box-shadow: 0 10px 30px -15px rgba(168, 85, 247, 0.3); /* Purple ambient glow shadow */
}

.glow-card:hover::before {
  opacity: 1;
}

.glow-card-content {
  position: relative;
  z-index: 2;
  padding: 24px;
}
```

---

## 5. UI Element Standards

### Glow Buttons
Buttons use a neon solid color with an ambient glow shadow. To maintain proper accessibility and contrast guidelines, bright background variants (like secondary cyan) use a dark text color:

```css
/* Primary Button (Neon Purple) */
.btn-primary {
  background: var(--neon-purple);
  color: #ffffff;
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.35);
}
.btn-primary:hover {
  background: #b55fe6;
  box-shadow: 0 0 22px rgba(168, 85, 247, 0.65);
}

/* Secondary Button (Neon Cyan) */
.btn-secondary {
  background: var(--neon-cyan);
  color: #070708; /* Dark Base background for maximum readability */
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.35);
}
.btn-secondary:hover {
  background: #22d3ee; /* slightly brighter hover state */
  box-shadow: 0 0 22px rgba(6, 182, 212, 0.65);
}
```

---

## 6. Theme Accessibility & Contrast Rules

- **Dark-Only Specification**: The application operates exclusively in Dark Mode to sustain a high-tech cyberpunk visual identity. Do not write dynamic light-mode variables or contrast-toggling themes.
- **Neon Color Usage Boundaries (WCAG 2.1)**:
  - **No Neon Body Text**: Never use raw bright neon variables (`--neon-cyan` or `--neon-purple`) for small paragraph elements or descriptive text. This causes heavy eye strain and fails WCAG contrast limits on dark backgrounds.
  - **High Contrast Content**: Main page titles, body copy, and form labels must use high-contrast white/light gray (`#f4f4f5` or `#ffffff`).
  - **Neon Limits**: Restrict pure neon colors to borders, small state indicators, focus fields, active navigations, and cursor-following box shadows.
```
