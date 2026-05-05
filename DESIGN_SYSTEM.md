# Street Insights Design System

## Overview

This design system ensures consistency, accessibility, and scalability across Street Insights. It defines typography, colors, spacing, components, and patterns used throughout the application.

---

## Typography

### Font Families

```css
/* Primary: Interface text */
font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;

/* Monospace: Numbers, tickers, technical data */
font-family: ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace;
```

### Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| **h1** | 2.5rem (40px) | 700 | 1.2 | Page titles |
| **h2** | 1.75rem (28px) | 600 | 1.3 | Section headers |
| **h3** | 1.25rem (20px) | 600 | 1.4 | Card titles |
| **h4** | 1rem (16px) | 600 | 1.5 | Subsection headers |
| **body** | 0.875rem (14px) | 400 | 1.6 | Default text |
| **small** | 0.75rem (12px) | 400 | 1.5 | Captions, metadata |
| **xs** | 0.625rem (10px) | 500 | 1.4 | Labels, badges |

### Utility Classes

```tsx
// Headings
className="text-2xl font-bold"       // h1
className="text-xl font-semibold"    // h2
className="text-lg font-semibold"    // h3
className="text-base font-semibold"  // h4

// Body text
className="text-sm"                  // Default
className="text-xs"                  // Small text
className="text-xs uppercase tracking-wider font-semibold" // Label

// Monospace
className="font-mono font-bold"      // Tickers, prices
className="font-mono text-sm"        // Technical data
```

---

## Colors

### Semantic Colors

#### Sentiment (Financial Data)
```tsx
// Bullish/Positive
text-green-500 / bg-green-500       // #22c55e
text-green-500/10                   // 10% opacity background

// Bearish/Negative
text-red-500 / bg-red-500           // #ef4444
text-red-500/10

// Neutral
text-gray-500 / bg-gray-500         // #6b7280
text-gray-500/10

// Hold/Mixed
text-yellow-500 / bg-yellow-500     // #eab308
text-yellow-500/10
```

#### AI Features (Purple accent)
```tsx
text-purple-500 / bg-purple-500     // #a855f7
text-purple-500/10                  // Backgrounds
border-purple-500/20                // Borders
```

#### UI States
```tsx
// Primary actions
bg-primary text-primary-foreground
bg-primary/10                       // Subtle highlight

// Destructive
bg-destructive text-destructive-foreground
text-destructive

// Muted (secondary text)
text-muted-foreground               // hsl(215 15% 55%)

// Accent (hover states, backgrounds)
bg-accent text-accent-foreground
hover:bg-accent
```

### Color Usage Guidelines

**DO:**
- Use green/red consistently for bullish/bearish sentiment
- Use purple for AI-specific features to differentiate from sentiment
- Use `text-muted-foreground` for secondary text, timestamps, metadata
- Use `bg-accent` for hover states and subtle backgrounds

**DON'T:**
- Mix sentiment colors with non-financial UI elements
- Use red/green for generic success/error (use `bg-primary` or `bg-destructive`)
- Override semantic colors without good reason

---

## Spacing

### Scale (Tailwind units)

| Size | Pixels | Usage |
|------|--------|-------|
| **1** | 4px | Tight spacing (icon gaps, badge padding) |
| **2** | 8px | Small gaps (inline elements) |
| **3** | 12px | Default inline spacing |
| **4** | 16px | Card padding, default gaps |
| **5** | 20px | Section padding |
| **6** | 24px | Large gaps between sections |
| **8** | 32px | Extra large gaps |
| **10** | 40px | Major section breaks |
| **12** | 48px | Page-level spacing |

### Spacing Guidelines

**Card Padding:**
```tsx
// Compact cards (stats, mini widgets)
className="p-4"

// Standard cards (content sections)
className="p-5" // or "p-6" for more breathing room

// Large cards (feature highlights)
className="p-8"
```

**Grid Gaps:**
```tsx
// Tight grids (stats, badges)
className="gap-2"

// Standard grids (cards, sections)
className="gap-4" // mobile
className="gap-5" // desktop

// Loose grids (major sections)
className="gap-6" // mobile
className="gap-8" // desktop
```

**Vertical Rhythm (section spacing):**
```tsx
// Between cards/sections
className="space-y-5"  // Default
className="space-y-6"  // More breathing room
className="space-y-8"  // Major sections

// Within cards
className="space-y-3"  // Default
className="space-y-4"  // More room
```

---

## Components

### Cards

```tsx
// Standard card
<div className="bg-card rounded-lg border shadow-sm">
  <div className="px-5 py-4 border-b bg-accent/30">
    <h2 className="text-base font-bold">Title</h2>
  </div>
  <div className="p-5">
    {/* Content */}
  </div>
</div>

// Compact card (no header)
<div className="bg-card rounded-lg border p-4">
  {/* Content */}
</div>

// Interactive card (hover state)
<button className="bg-card rounded-lg border p-4 hover:shadow-md hover:border-primary/20 transition-all">
  {/* Content */}
</button>
```

### Buttons

```tsx
// Primary action
<button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors">
  Primary
</button>

// Secondary action
<button className="px-4 py-2 bg-accent text-foreground rounded-lg font-medium text-sm hover:bg-accent/80 transition-colors">
  Secondary
</button>

// Destructive
<button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium text-sm hover:bg-destructive/90 transition-colors">
  Delete
</button>

// Ghost (minimal)
<button className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
  Cancel
</button>
```

### Badges

```tsx
// Status badge
<span className="text-xs px-2 py-0.5 rounded bg-accent text-muted-foreground uppercase tracking-wider font-semibold">
  Tech
</span>

// Sentiment badge
<span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-500 font-semibold">
  Bullish
</span>

// Count badge
<span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
  3
</span>
```

### Input Fields

```tsx
// Standard input
<input
  type="text"
  className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
  placeholder="Search..."
/>

// With label
<div className="space-y-1">
  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
    Email
  </label>
  <input
    type="email"
    className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
  />
</div>
```

---

## Animations & Transitions

### Standard Transitions

```tsx
// Default (most interactions)
className="transition-colors duration-200"

// Hover states
className="hover:bg-accent transition-colors"

// Complex animations
className="transition-all duration-200"

// Smooth transforms
className="transition-transform duration-300 ease-out"
```

### Micro-interactions

```tsx
// Button press
className="active:scale-95 transition-transform"

// Hover lift
className="hover:-translate-y-0.5 hover:shadow-lg transition-all"

// Pulse (loading states)
className="animate-pulse"
```

### Guidelines

**DO:**
- Keep transitions fast (200-300ms)
- Use `transition-colors` for most hover states
- Add feedback for all interactive elements

**DON'T:**
- Overuse complex animations (slow UI feel)
- Animate layout shifts (causes jank)
- Use animations longer than 500ms (feels sluggish)

---

## Responsive Design

### Breakpoints

```tsx
// Mobile-first approach
className="..."                     // Base (mobile, 0-639px)
className="sm:..."                  // Small (≥640px)
className="md:..."                  // Medium (≥768px)
className="lg:..."                  // Large (≥1024px)
className="xl:..."                  // Extra large (≥1280px)
```

### Common Patterns

```tsx
// Grid: 1 col mobile, 2-3 cols desktop
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Hide on mobile, show on desktop
className="hidden lg:block"

// Show on mobile, hide on desktop
className="lg:hidden"

// Padding: smaller mobile, larger desktop
className="p-4 lg:p-6"

// Text: smaller mobile, larger desktop
className="text-sm lg:text-base"
```

---

## Accessibility

### Focus States

```tsx
// Always include focus styles
className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"

// For dark backgrounds
className="focus:ring-offset-background"
```

### ARIA Labels

```tsx
// Buttons without visible text
<button aria-label="Close modal">
  <X className="h-4 w-4" />
</button>

// Icon-only nav items
<a href="/dashboard" aria-label="Go to dashboard">
  <LayoutDashboard className="h-5 w-5" />
</a>
```

### Color Contrast

- **Minimum contrast ratio:** 4.5:1 for normal text, 3:1 for large text
- **Test:** Use browser devtools or WebAIM Contrast Checker
- **Muted text:** Use `text-muted-foreground` (pre-tested for accessibility)

---

## Layout Patterns

### Dashboard Grid

```tsx
// Stats row (2 cols mobile, 4 cols desktop)
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Stat cards */}
</div>

// Content sections (1 col mobile, 2-3 cols desktop)
<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
  {/* Section cards */}
</div>

// Full-width sections with spacing
<div className="space-y-6">
  {/* Full-width cards */}
</div>
```

### Content Container

```tsx
// Standard page content
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>

// Narrow content (forms, articles)
<div className="max-w-2xl mx-auto px-4">
  {/* Content */}
</div>
```

---

## Implementation Checklist

When building new components:

- [ ] Use semantic HTML (`<button>` not `<div>`)
- [ ] Add proper ARIA labels for screen readers
- [ ] Include focus states for keyboard navigation
- [ ] Test on mobile (375px width minimum)
- [ ] Use design tokens (no hard-coded colors/spacing)
- [ ] Add hover/active states for interactive elements
- [ ] Check color contrast (4.5:1 minimum)
- [ ] Use consistent spacing (gap-4, gap-5, gap-6)
- [ ] Test with keyboard only (Tab, Enter, Esc)
- [ ] Add loading/empty states

---

## File Structure

```
src/
├── components/
│   ├── ui/                    # Reusable primitives (Button, Input, Badge)
│   ├── dashboard/             # Dashboard-specific components
│   ├── charts/                # Chart components
│   └── [feature]/             # Feature-specific components
├── lib/
│   ├── utils.ts               # Utility functions (cn, formatters)
│   └── constants.ts           # Design tokens, constants
└── styles/
    └── globals.css            # Global styles, CSS variables
```

---

## References

- **Tailwind Docs:** https://tailwindcss.com/docs
- **Shadcn/UI:** https://ui.shadcn.com (component patterns)
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **Color Contrast Checker:** https://webaim.org/resources/contrastchecker/

---

## Changelog

- **2026-05-05:** Initial design system document created
- Added typography scale, color semantics, spacing guidelines
- Defined component patterns (cards, buttons, badges)
- Documented responsive patterns and accessibility requirements
