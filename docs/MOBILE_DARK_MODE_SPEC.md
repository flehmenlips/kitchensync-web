# KitchenSync Mobile App - Dark Mode Styling Specification

This document provides the complete dark mode design system used in the KitchenSync Admin Console web app. Use this specification to implement a matching dark mode option in the iOS mobile app.

---

## Design Philosophy

The KitchenSync console uses a **dark-first** design with a sophisticated, modern aesthetic inspired by Linear, Vercel, and Stripe. The color palette features:

- **Deep, rich backgrounds** (near-black with subtle blue undertones)
- **Cyan/teal primary accent** for interactive elements and highlights
- **Purple/magenta secondary accent** for special elements
- **High contrast text** for excellent readability
- **Subtle borders** that define structure without being harsh

---

## Color Palette (HSL Values)

### Core Colors

| Token | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| `background` | `240 10% 4%` | `#0a0a0c` | Main app background |
| `foreground` | `0 0% 95%` | `#f2f2f2` | Primary text color |
| `card` | `240 10% 6%` | `#0f0f12` | Card/panel backgrounds |
| `card-foreground` | `0 0% 95%` | `#f2f2f2` | Text on cards |

### Interactive Colors

| Token | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| `primary` | `180 100% 50%` | `#00ffff` | Primary buttons, links, active states |
| `primary-foreground` | `240 10% 4%` | `#0a0a0c` | Text on primary buttons |
| `accent` | `280 100% 70%` | `#d966ff` | Highlights, badges, special elements |
| `accent-foreground` | `0 0% 95%` | `#f2f2f2` | Text on accent elements |

### Secondary/Muted Colors

| Token | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| `secondary` | `240 10% 12%` | `#1a1a1f` | Secondary buttons, hover states |
| `secondary-foreground` | `0 0% 95%` | `#f2f2f2` | Text on secondary elements |
| `muted` | `240 10% 12%` | `#1a1a1f` | Muted backgrounds |
| `muted-foreground` | `240 5% 55%` | `#8a8a91` | Secondary text, placeholders |

### Utility Colors

| Token | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| `border` | `240 10% 15%` | `#232328` | Borders, dividers |
| `input` | `240 10% 15%` | `#232328` | Input field borders |
| `ring` | `180 100% 50%` | `#00ffff` | Focus rings |
| `destructive` | `0 62.8% 30.6%` | `#7f1d1d` | Error states, delete actions |
| `destructive-foreground` | `210 40% 98%` | `#f8fafc` | Text on destructive elements |

### Gradient Colors (Shimmer Effect)

| Token | HSL Value | Hex Equivalent |
|-------|-----------|----------------|
| `shimmer-start` | `180 100% 50%` | `#00ffff` |
| `shimmer-mid` | `280 100% 70%` | `#d966ff` |
| `shimmer-end` | `320 100% 60%` | `#ff3399` |

---

## Typography

### Font Family
- **Primary Font**: `Syne` (Google Fonts)
- **Fallback**: `sans-serif`
- **Import URL**: `https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap`

### Font Weights
| Weight | Usage |
|--------|-------|
| 400 | Body text |
| 500 | Medium emphasis |
| 600 | Semibold headings |
| 700 | Bold headings |
| 800 | Extra bold titles |

### Text Sizes (Reference)
| Size | Usage |
|------|-------|
| `xs` (12px) | Captions, labels, timestamps |
| `sm` (14px) | Secondary text, table content |
| `base` (16px) | Body text |
| `lg` (18px) | Subheadings |
| `xl` (20px) | Section headers |
| `2xl` (24px) | Card titles |
| `3xl` (30px) | Page titles |

---

## Component Styling Guide

### Cards
```
Background: card (#0f0f12)
Border: 1px solid border (#232328)
Border Radius: 8px (0.5rem)
Shadow: subtle shadow-sm
Text: card-foreground (#f2f2f2)
```

**iOS Implementation:**
```swift
backgroundColor: UIColor(hue: 240/360, saturation: 0.10, brightness: 0.06, alpha: 1.0)
layer.borderColor: UIColor(hue: 240/360, saturation: 0.10, brightness: 0.15, alpha: 1.0).cgColor
layer.borderWidth: 1.0
layer.cornerRadius: 8.0
```

### Buttons

#### Primary Button
```
Background: primary (#00ffff)
Text: primary-foreground (#0a0a0c)
Hover: primary/90 (90% opacity)
Border Radius: 6px
Padding: 10px vertical, 16px horizontal
```

#### Secondary Button
```
Background: secondary (#1a1a1f)
Text: secondary-foreground (#f2f2f2)
Hover: secondary/80 (80% opacity)
```

#### Ghost Button
```
Background: transparent
Text: muted-foreground (#8a8a91)
Hover Background: accent (#d966ff) at low opacity
Hover Text: accent-foreground (#f2f2f2)
```

#### Outline Button
```
Background: transparent
Border: 1px solid input (#232328)
Text: foreground (#f2f2f2)
Hover Background: accent at low opacity
```

#### Destructive Button
```
Background: destructive (#7f1d1d)
Text: destructive-foreground (#f8fafc)
Hover: destructive/90
```

### Input Fields
```
Background: background (#0a0a0c)
Border: 1px solid input (#232328)
Text: foreground (#f2f2f2)
Placeholder: muted-foreground (#8a8a91)
Focus Ring: 2px ring (#00ffff) with 2px offset
Border Radius: 6px
Height: 40px
Padding: 12px horizontal
```

### Badges

#### Default Badge
```
Background: primary (#00ffff)
Text: primary-foreground (#0a0a0c)
Border Radius: 9999px (full)
Padding: 2px vertical, 10px horizontal
Font Size: 12px
Font Weight: 600
```

#### Secondary Badge
```
Background: secondary (#1a1a1f)
Text: secondary-foreground (#f2f2f2)
```

#### Outline Badge
```
Background: transparent
Border: 1px solid border (#232328)
Text: foreground (#f2f2f2)
```

### Tables
```
Header Background: transparent
Header Text: muted-foreground (#8a8a91)
Row Border: 1px solid border (#232328)
Row Hover: muted/50 (muted at 50% opacity)
Selected Row: muted (#1a1a1f)
Cell Padding: 16px
```

### Navigation / Sidebar
```
Background: card (#0f0f12)
Border Right: 1px solid border (#232328)
```

#### Nav Item (Inactive)
```
Text: muted-foreground (#8a8a91)
Background: transparent
Hover Background: secondary/50
Hover Text: foreground (#f2f2f2)
```

#### Nav Item (Active)
```
Text: primary (#00ffff)
Background: primary/10 (primary at 10% opacity)
```

### Separators/Dividers
```
Color: border/50 (border at 50% opacity)
Height: 1px
```

### Modals/Dialogs
```
Overlay: background/80 (background at 80% opacity) with backdrop-blur
Content Background: card (#0f0f12)
Border: 1px solid border (#232328)
Border Radius: 12px
```

### Scroll Areas
```
Scrollbar Track: transparent
Scrollbar Thumb: muted (#1a1a1f)
Scrollbar Thumb Hover: secondary (#1a1a1f at higher opacity)
```

---

## Animation Specifications

### Accordion Animations
```
Duration: 200ms
Timing: ease-out
```

### Shimmer Sweep (Loading/Highlight Effect)
```css
@keyframes shimmer-sweep {
  0%   { background-position: -200% center; }
  50%  { background-position: 200% center; }
  100% { background-position: -200% center; }
}
Duration: 6s
Timing: ease-in-out
Iteration: infinite
```

### Glow Pulse
```css
@keyframes glow-pulse {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 0.8; }
}
Duration: 3s
Timing: ease-in-out
Iteration: infinite
```

### General Transitions
- Color transitions: 200ms
- Background transitions: 200ms
- Transform transitions: 300ms
- Layout transitions: 300ms

---

## Spacing System

Based on a 4px base unit:

| Token | Value |
|-------|-------|
| `0.5` | 2px |
| `1` | 4px |
| `1.5` | 6px |
| `2` | 8px |
| `2.5` | 10px |
| `3` | 12px |
| `4` | 16px |
| `5` | 20px |
| `6` | 24px |
| `8` | 32px |

### Common Spacing Usage
- Card padding: 24px (p-6)
- Button padding: 8px vertical, 16px horizontal
- Input padding: 12px horizontal
- Nav item padding: 10px vertical, 12px horizontal
- Section gaps: 16px-32px
- Page padding: 16px (mobile), 24px (tablet), 32px (desktop)

---

## Border Radius System

| Token | Value |
|-------|-------|
| `sm` | 4px |
| `md` | 6px |
| `lg` | 8px (default) |
| `xl` | 12px |
| `2xl` | 16px |
| `full` | 9999px |

### Usage
- Buttons: 6px
- Cards: 8px
- Inputs: 6px
- Badges: 9999px (full pill shape)
- Modals: 12px
- Avatar/Icon containers: 8px-12px

---

## iOS-Specific Implementation Notes

### Color Conversion
Convert HSL to UIColor:
```swift
// HSL: 180 100% 50% (Primary Cyan)
UIColor(hue: 180/360, saturation: 1.0, brightness: 1.0, alpha: 1.0)

// HSL: 240 10% 4% (Background)
// Note: For low saturation colors, convert to RGB first
// RGB: #0a0a0c
UIColor(red: 10/255, green: 10/255, blue: 12/255, alpha: 1.0)
```

### Dark Mode Toggle
Implement using `UIUserInterfaceStyle`:
```swift
override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
    super.traitCollectionDidChange(previousTraitCollection)
    if traitCollection.userInterfaceStyle == .dark {
        // Apply dark mode colors
    }
}
```

### System Integration
- Respect system dark mode preference by default
- Provide manual toggle in settings
- Persist user preference in UserDefaults

### Safe Areas
- Respect safe areas for notched devices
- Apply background color to safe area insets

---

## Color Constants (Swift)

```swift
struct KitchenSyncColors {
    // Backgrounds
    static let background = UIColor(red: 10/255, green: 10/255, blue: 12/255, alpha: 1.0)
    static let card = UIColor(red: 15/255, green: 15/255, blue: 18/255, alpha: 1.0)
    static let secondary = UIColor(red: 26/255, green: 26/255, blue: 31/255, alpha: 1.0)
    static let muted = UIColor(red: 26/255, green: 26/255, blue: 31/255, alpha: 1.0)

    // Text
    static let foreground = UIColor(red: 242/255, green: 242/255, blue: 242/255, alpha: 1.0)
    static let mutedForeground = UIColor(red: 138/255, green: 138/255, blue: 145/255, alpha: 1.0)

    // Accents
    static let primary = UIColor(red: 0/255, green: 255/255, blue: 255/255, alpha: 1.0) // Cyan
    static let primaryForeground = UIColor(red: 10/255, green: 10/255, blue: 12/255, alpha: 1.0)
    static let accent = UIColor(red: 217/255, green: 102/255, blue: 255/255, alpha: 1.0) // Purple

    // Utility
    static let border = UIColor(red: 35/255, green: 35/255, blue: 40/255, alpha: 1.0)
    static let destructive = UIColor(red: 127/255, green: 29/255, blue: 29/255, alpha: 1.0)
    static let ring = UIColor(red: 0/255, green: 255/255, blue: 255/255, alpha: 1.0)

    // Gradient
    static let shimmerStart = UIColor(red: 0/255, green: 255/255, blue: 255/255, alpha: 1.0)
    static let shimmerMid = UIColor(red: 217/255, green: 102/255, blue: 255/255, alpha: 1.0)
    static let shimmerEnd = UIColor(red: 255/255, green: 51/255, blue: 153/255, alpha: 1.0)
}
```

---

## React Native / Expo Implementation

If the mobile app uses React Native:

```typescript
export const darkTheme = {
  colors: {
    background: 'hsl(240, 10%, 4%)',      // #0a0a0c
    foreground: 'hsl(0, 0%, 95%)',        // #f2f2f2
    card: 'hsl(240, 10%, 6%)',            // #0f0f12
    cardForeground: 'hsl(0, 0%, 95%)',    // #f2f2f2
    primary: 'hsl(180, 100%, 50%)',       // #00ffff
    primaryForeground: 'hsl(240, 10%, 4%)', // #0a0a0c
    secondary: 'hsl(240, 10%, 12%)',      // #1a1a1f
    secondaryForeground: 'hsl(0, 0%, 95%)', // #f2f2f2
    muted: 'hsl(240, 10%, 12%)',          // #1a1a1f
    mutedForeground: 'hsl(240, 5%, 55%)', // #8a8a91
    accent: 'hsl(280, 100%, 70%)',        // #d966ff
    accentForeground: 'hsl(0, 0%, 95%)', // #f2f2f2
    destructive: 'hsl(0, 62.8%, 30.6%)', // #7f1d1d
    destructiveForeground: 'hsl(210, 40%, 98%)', // #f8fafc
    border: 'hsl(240, 10%, 15%)',         // #232328
    input: 'hsl(240, 10%, 15%)',          // #232328
    ring: 'hsl(180, 100%, 50%)',          // #00ffff
  },
  spacing: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    '2xl': 32,
  },
  borderRadius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    full: 9999,
  },
  fontFamily: {
    sans: 'Syne',
    fallback: 'System',
  },
};
```

---

## Visual Reference Summary

The overall aesthetic is:
- **Dark and sophisticated** - not pitch black, but deep blue-tinged dark
- **High contrast text** - white/near-white text for readability
- **Cyan/teal accents** - primary interactive elements pop with bright cyan
- **Purple highlights** - secondary accent for special elements
- **Subtle borders** - visible but not harsh, defining structure
- **Clean, modern typography** - Syne font gives a contemporary feel
- **Smooth animations** - subtle transitions enhance the premium feel

This design system creates a cohesive, professional look suitable for a modern culinary/social platform.
