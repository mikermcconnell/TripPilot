# TripPilot Design System & Style Guide

> A comprehensive guide to the TripPilot visual language and UI patterns.

---

## Brand Identity

**TripPilot** is a friendly, approachable travel companion. The design language emphasizes:

- **Playful Depth**: 3D button effects create a tactile, game-like feel
- **Activity Coding**: Distinct colors instantly identify activity types
- **Warmth**: Rounded corners and soft shadows feel inviting
- **Clarity**: Strong visual hierarchy guides users effortlessly

---

## Color Palette

### Primary Brand Color (Blue)

The primary blue is used for CTAs, active states, and brand elements.

| Token | Hex | Usage |
|-------|-----|-------|
| `blue-500` | `#3b82f6` | Primary buttons, active states, links |
| `blue-600` | `#2563eb` | Hover states |
| `blue-700` | `#1d4ed8` | 3D button bottom borders, pressed states |
| `blue-100` | `#dbeafe` | Focus rings, subtle backgrounds |
| `blue-50` | `#eff6ff` | Hover backgrounds, light accents |

### Activity Type Colors

Each activity type has a signature color for instant recognition:

| Activity | Icon Color | Tailwind Class | Hex |
|----------|------------|----------------|-----|
| Food | Orange | `text-orange-500` | `#f97316` |
| Lodging | Indigo | `text-indigo-500` | `#6366f1` |
| Activity/Explore | Emerald | `text-emerald-500` | `#10b981` |
| Travel | Slate | `text-slate-500` | `#64748b` |

### Neutral Palette (Slate)

| Token | Hex | Usage |
|-------|-----|-------|
| `slate-50` | `#f8fafc` | Page background |
| `slate-100` | `#f1f5f9` | Card alt backgrounds, input backgrounds |
| `slate-200` | `#e2e8f0` | Borders, dividers |
| `slate-400` | `#94a3b8` | Placeholder text, secondary icons |
| `slate-500` | `#64748b` | Secondary text |
| `slate-700` | `#334155` | Headings |
| `slate-800` | `#1e293b` | Primary text |

---

## Typography

**Font Family**: Nunito (Google Fonts)

### Font Weights

| Weight | Class | Usage |
|--------|-------|-------|
| 400 | `font-normal` | Body text (rarely used) |
| 600 | `font-semibold` | Emphasized body text |
| 700 | `font-bold` | Subheadings, labels |
| 800 | `font-extrabold` | Section headers, day numbers |
| 900 | `font-black` | Hero stats, large numbers |

### Text Styles

```html
<!-- Page Title -->
<h1 class="text-2xl font-extrabold text-slate-700">Trip to Paris</h1>

<!-- Section Header (UPPERCASE) -->
<h2 class="text-sm font-extrabold text-slate-700 uppercase tracking-wider">
  Your Journey
</h2>

<!-- Card Title -->
<h3 class="text-lg font-extrabold text-slate-700">Day 1</h3>

<!-- Body Text -->
<p class="text-base font-medium text-slate-600">Description here</p>

<!-- Secondary/Muted Text -->
<span class="text-sm font-bold text-slate-400">10:00 AM</span>

<!-- Micro Labels -->
<span class="text-xs font-bold text-slate-400 uppercase tracking-wide">
  3 Stops
</span>
```

---

## Component Patterns

### 3D Buttons (Signature Style)

The signature TripPilot button with depth effect:

```html
<!-- Primary 3D Button -->
<button class="btn-press flex items-center gap-2 px-4 py-2
  bg-blue-500 hover:bg-blue-400 text-white
  border-b-4 border-blue-700
  font-bold text-sm rounded-xl transition-all">
  Accept
</button>

<!-- Secondary 3D Button -->
<button class="btn-press flex items-center gap-2 px-4 py-2
  bg-white hover:bg-slate-50 text-slate-600
  border-2 border-slate-200 border-b-4 border-b-slate-300
  font-bold text-sm rounded-xl transition-all">
  Cancel
</button>

<!-- Danger 3D Button -->
<button class="btn-press px-4 py-2
  bg-red-500 hover:bg-red-400 text-white
  border-b-4 border-red-700
  font-bold rounded-xl transition-all">
  Delete
</button>
```

**Press Effect**: The `btn-press` class removes bottom border and translates down on `:active`.

### Cards

```html
<!-- Base Card -->
<div class="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
  Content
</div>

<!-- Interactive Card (clickable) -->
<div class="bg-white border-2 border-slate-200 rounded-2xl p-4
  cursor-pointer transition-all duration-200
  hover:border-blue-400 hover:ring-4 hover:ring-blue-50">
  Content
</div>

<!-- Active Card -->
<div class="bg-white border-2 border-blue-400 rounded-2xl p-4
  ring-4 ring-blue-100/50">
  Content
</div>
```

### Day Number Badge

The prominent day indicator with 3D effect:

```html
<!-- Active Day -->
<div class="w-12 h-12 rounded-2xl border-b-4 flex items-center justify-center
  font-black text-lg bg-blue-500 border-blue-700 text-white">
  1
</div>

<!-- Inactive Day -->
<div class="w-12 h-12 rounded-2xl border-b-4 flex items-center justify-center
  font-black text-lg bg-slate-200 border-slate-300 text-slate-500">
  2
</div>
```

### Activity Cards

```html
<div class="relative group bg-slate-50 border-2 border-slate-100 rounded-xl p-3
  transition-all duration-200
  hover:border-blue-400 hover:bg-blue-50/50 hover:scale-[1.02]">

  <div class="flex items-start gap-4">
    <!-- Icon Container -->
    <div class="mt-1 bg-white p-2 rounded-xl border-2 border-slate-100 shadow-sm">
      <Coffee class="w-5 h-5 text-orange-500" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <h4 class="text-base font-bold text-slate-700">Breakfast at Café</h4>
      <div class="flex items-center gap-3 mt-2">
        <span class="flex items-center text-xs font-bold text-slate-500
          bg-slate-200/50 px-2 py-1 rounded-lg">
          <Clock class="w-3.5 h-3.5 mr-1" />
          9:00 AM
        </span>
      </div>
    </div>
  </div>

  <!-- Delete Button (appears on hover) -->
  <button class="absolute -top-2 -right-2 bg-red-100 hover:bg-red-500
    text-red-500 hover:text-white border-2 border-red-200 rounded-lg p-1.5
    opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
    <Trash2 size={14} />
  </button>
</div>
```

### View Switcher (Pill Tabs)

```html
<div class="flex bg-slate-100 p-1 rounded-xl border-2 border-slate-200">
  <!-- Active Tab -->
  <button class="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold
    bg-white text-slate-800 shadow-sm ring-1 ring-slate-200">
    <MapIcon class="w-4 h-4" />
    Overview
  </button>

  <!-- Inactive Tab -->
  <button class="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold
    text-slate-400 hover:text-slate-600 transition-all">
    <Calendar class="w-4 h-4" />
    Day Plan
  </button>
</div>
```

### Chat Bubble

```html
<!-- User Message -->
<div class="max-w-[85%] px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed
  bg-blue-500 text-white rounded-br-none border-b-4 border-blue-700 shadow-sm">
  Plan a 3-day trip to Tokyo
</div>

<!-- AI Response -->
<div class="max-w-[85%] px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed
  bg-white text-slate-600 border-2 border-slate-200 rounded-bl-none shadow-sm">
  Here's a suggested itinerary...
</div>
```

### Badge/Chip

```html
<!-- Neutral Badge -->
<span class="inline-flex items-center gap-1.5 px-2.5 py-1
  bg-slate-100 text-slate-600 rounded-lg text-xs font-bold
  uppercase tracking-wide border border-slate-200">
  3 Days
</span>

<!-- Primary Badge -->
<span class="inline-flex items-center gap-1.5 px-2.5 py-1
  bg-blue-50 text-blue-600 rounded-lg text-xs font-bold
  border border-blue-100">
  <MapPin class="w-3 h-3" />
  Paris
</span>

<!-- Success Badge -->
<span class="inline-flex items-center gap-1.5 px-3 py-1
  bg-green-50 text-green-500 rounded-full text-xs font-bold
  border border-green-100">
  <Check class="w-3.5 h-3.5" />
  Added!
</span>
```

### Input Fields

```html
<input
  type="text"
  placeholder="Plan a trip..."
  class="w-full pl-5 pr-12 py-3.5 bg-slate-100 border-2 border-transparent
    focus:bg-white focus:border-blue-400 rounded-2xl text-slate-700 font-medium
    placeholder:text-slate-400 focus:outline-none transition-all"
/>
```

### Status Indicators

```html
<!-- Online Status -->
<div class="w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>

<!-- Loading Status -->
<div class="w-3 h-3 rounded-full bg-amber-400 border-2 border-white"></div>
```

---

## Spacing Guidelines

| Size | Tailwind | Pixels | Usage |
|------|----------|--------|-------|
| xs | `p-2` | 8px | Icon padding |
| sm | `p-3` | 12px | Activity card padding |
| md | `p-4` | 16px | Card padding |
| lg | `p-5` | 20px | Section padding |
| xl | `p-6` | 24px | Container padding |

### Gap System

| Size | Class | Usage |
|------|-------|-------|
| Tight | `gap-2` | Icon + text inline |
| Normal | `gap-3` | Form elements |
| Comfortable | `gap-4` | Card elements |
| Spacious | `gap-6` | Between sections |

---

## Border Radius

| Size | Class | Usage |
|------|-------|-------|
| Small | `rounded-lg` (8px) | Badges, small buttons |
| Medium | `rounded-xl` (12px) | Buttons, inputs, icon containers |
| Large | `rounded-2xl` (16px) | Cards, modals, day badges |
| XL | `rounded-3xl` (24px) | Chat panel |

---

## Shadows

| Name | Class | Usage |
|------|-------|-------|
| Card | `shadow-sm` | Cards, activity items |
| Dropdown | `shadow-lg` | Dropdowns, popovers |
| Modal | `shadow-2xl` | Chat panel, modals |

---

## Animations

### Fade In (cards, modals)
```html
<div class="animate-in">Content</div>
```

### Slide Up (chat panel, toasts)
```html
<div class="animate-slide-up">Content</div>
```

### Hover Lift (interactive cards)
```html
<div class="hover:translate-y-[-2px] transition-transform duration-200">
  Lifts on hover
</div>
```

### Scale on Hover (activity cards)
```html
<div class="hover:scale-[1.02] transition-all duration-200">
  Grows slightly on hover
</div>
```

---

## Icon Sizes

| Size | Class | Usage |
|------|-------|-------|
| XS | `w-3 h-3` / `w-3.5 h-3.5` | Inline with text |
| SM | `w-4 h-4` | Tab icons, badges |
| MD | `w-5 h-5` | Activity icons, buttons |
| LG | `w-6 h-6` | Header icons, close buttons |
| XL | `w-8 h-8` | Chat FAB icon |

---

## Z-Index Scale

| Layer | z-index | Usage |
|-------|---------|-------|
| Content | 0-10 | Normal content |
| Sidebar | 10 | Left panel |
| Header | 40 | Fixed header |
| Chat | 50 | Chat panel |
| Modal | 50+ | Modals, overlays |

---

## Responsive Breakpoints

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Mobile-First Patterns

```html
<!-- Hide on mobile, show on desktop -->
<span class="hidden md:block">Desktop only</span>

<!-- Full width on mobile, fixed on desktop -->
<div class="w-full md:w-[480px]">Sidebar</div>

<!-- Stack on mobile, row on desktop -->
<div class="flex flex-col md:flex-row gap-4">Items</div>
```

---

## Accessibility Guidelines

1. **Touch Targets**: Minimum 44x44px for touch interactions
2. **Color Contrast**: All text meets WCAG AA standards
3. **Focus States**: Use `focus:ring-2 focus:ring-blue-400` for keyboard navigation
4. **Semantic HTML**: Use proper heading hierarchy and ARIA labels

---

## File Structure

```
src/styles/
├── design-tokens.ts    # TypeScript constants for all design tokens
├── STYLE_GUIDE.md      # This documentation
└── (index.css)         # Global CSS with component classes
```

---

## Quick Reference

### Most Used Classes

```css
/* Text */
font-bold text-slate-700       /* Headings */
font-medium text-slate-600     /* Body */
font-bold text-slate-400       /* Muted */
text-xs uppercase tracking-wider /* Labels */

/* Containers */
bg-white border-2 border-slate-200 rounded-2xl p-4

/* Interactive */
transition-all duration-200 cursor-pointer
hover:border-blue-400 hover:ring-4 hover:ring-blue-50

/* 3D Effect */
border-b-4 border-blue-700
```
