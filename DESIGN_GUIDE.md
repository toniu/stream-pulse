# 🎨 pyAux Web Interface - Visual Design Guide

## Colour Palette

### Primary Colours
- **Deep Black**: `#0a0a0a` - Main background
- **Neon Green**: `#00ff41` - Primary accent (Matrix-inspired)
- **Card Black**: `#151515` - Secondary background for cards
- **White**: `#ffffff` - Primary text

### Secondary Colours
- **Green Dim**: `#00cc33` - Hover states
- **Green Glow**: `rgba(0, 255, 65, 0.3)` - Shadow effects
- **Grey**: `#b3b3b3` - Secondary text
- **Dark Grey**: `#666666` - Tertiary text
- **Red**: `#ff4444` - Error messages

---

## Page Layouts

### Landing Page (index.html)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│         🎵 SPINNING VINYL LOGO                  │
│            pyAux (green text)                   │
│     Analyse and rate your Spotify playlists    │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ [Enter Spotify playlist URL...]           │ │
│  │               (glowing input)             │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│         [ Analyse Playlist ]                   │
│         (green glowing button)                 │
│                                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ 🎵   │  │ 🎸   │  │ ⭐   │  │ 📊   │      │
│  │Artist│  │Genre │  │Pop   │  │Smart │      │
│  │Div.  │  │Cohe. │  │Bal.  │  │Recs  │      │
│  └──────┘  └──────┘  └──────┘  └──────┘      │
│                                                 │
│  ╔════════════════════════════════════════╗    │
│  ║  Animated Equaliser Bars (background)  ║    │
│  ╚════════════════════════════════════════╝    │
└─────────────────────────────────────────────────┘
```

### Results Page (results.html)

```
┌─────────────────────────────────────────────────┐
│  [← Back]              pyAux                    │
│                                                 │
│  ═══════════════════════════════════════        │
│           My Awesome Playlist                   │
│              50 tracks analysed                 │
│  ═══════════════════════════════════════        │
│                                                 │
│           Overall Rating                        │
│              ╭─────╮                            │
│              │     │                            │
│              │ 87  │  (animated circle)         │
│              │/100 │                            │
│              ╰─────╯                            │
│                                                 │
│  ──────── Detailed Breakdown ────────          │
│                                                 │
│  Artist Diversity      [████████░░] 90%        │
│  Genre Cohesion        [███████░░░] 85%        │
│  Popularity Balance    [███████░░░] 80%        │
│  Playlist Length       [██████████] 100%       │
│                                                 │
│  ──────── Popular Genres ────────              │
│  ▪ Rap/Hip-Hop: 45%                            │
│  ▪ R&B/Soul: 30%                               │
│  ▪ Pop: 25%                                    │
│                                                 │
│  ──────── Playlist Tracks ────────             │
│          [Show All Tracks]                     │
│                                                 │
│  ──────── Recommended Tracks ────────          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Track 1  │ │ Track 2  │ │ Track 3  │      │
│  │ Artist   │ │ Artist   │ │ Artist   │      │
│  └──────────┘ └──────────┘ └──────────┘      │
│                                                 │
│      [ Analyse Another Playlist ]              │
└─────────────────────────────────────────────────┘
```

---

## Animation Descriptions

### 1. **Vinyl Logo Animation**
- **Element**: Circular logo in header
- **Effect**: Continuous 360° rotation
- **Duration**: 4 seconds per rotation
- **Timing**: Linear (constant speed)
- **Visual**: Black circle with green ring, small center dot

### 2. **Background Equaliser**
- **Element**: 8 vertical bars across screen
- **Effect**: Each bar pulses up/down independently
- **Duration**: 1.5 seconds per cycle
- **Stagger**: 0.1s delay between each bar
- **Colours**: Green gradient from solid to transparent
- **Opacity**: 10% (subtle, non-distracting)

### 3. **Input Field Glow**
- **Trigger**: Focus (when user clicks)
- **Effect**: Green border brightens, shadow appears
- **Duration**: 0.3 seconds
- **Colour**: `#00ff41` with `rgba(0, 255, 65, 0.3)` glow

### 4. **Button Hover Effect**
- **Trigger**: Mouse hover
- **Effects**:
  - Button lifts up (translateY: -2px)
  - Shadow expands beneath
  - Radial glow expands from center
- **Duration**: 0.3 seconds
- **Colour**: Green glow intensifies

### 5. **Loading Animation**
- **Elements**: 3 concentric spinning rings
- **Effect**: Each ring rotates independently
- **Duration**: 1.5 seconds per rotation
- **Stagger**: 0.5s delay between rings
- **Below rings**: 5 wave bars pulsing

### 6. **Results Circle Progress**
- **Element**: Large circular rating indicator
- **Effect**: Stroke draws from 0% to final percentage
- **Duration**: 2 seconds
- **Easing**: Ease-out (fast start, slow finish)
- **Colour**: Green stroke with glow effect

### 7. **Rating Bars**
- **Elements**: 4 horizontal bars
- **Effect**: Width animates from 0% to final value
- **Duration**: 1.5 seconds
- **Stagger**: Each bar starts 0.2s after previous
- **Colour**: Green gradient with glow shadow

### 8. **Card Hover**
- **Elements**: Feature cards, track items, recommendations
- **Effect**: 
  - Lift up 5px
  - Border glows green
  - Shadow appears beneath
- **Duration**: 0.3 seconds

### 9. **Page Load Fade-in**
- **Elements**: All cards on landing page
- **Effect**: Fade from transparent + slide up
- **Duration**: 0.5 seconds
- **Stagger**: 0.1s between each card

### 10. **Smooth Scrolling**
- **Trigger**: Clicking anchor links
- **Effect**: Smooth animated scroll to target
- **Duration**: Varies based on distance

---

## Typography Hierarchy

### Headings
- **H1 (Title)**: 3rem (48px), bold, 2px letter-spacing
- **H2 (Section)**: 2rem (32px), normal weight
- **H3 (Subsection)**: 1.5rem (24px), normal weight

### Body Text
- **Primary**: 1rem (16px), line-height 1.6
- **Secondary**: 0.9rem (14.4px)
- **Small**: 0.85rem (13.6px)

### Special Text
- **Button**: 1.1rem (17.6px), bold
- **Rating Numbers**: 3rem (48px), bold, green
- **Rating Suffix**: 1.5rem (24px), grey

---

## Responsive Breakpoints

### Desktop (1200px+)
- Full layout with all features
- Multi-column grids
- Large spacing

### Tablet (768px - 1199px)
- 2-column grids become 2-column
- Slightly reduced spacing
- Same features

### Mobile (< 768px)
- Single column layout
- Stacked navigation
- Reduced font sizes
- Smaller circle (200px vs 250px)
- Touch-friendly buttons

---

## Interactive States

### Input Field
- **Normal**: Grey border, black background
- **Focus**: Green glowing border, shadow
- **Invalid**: Red border with shake animation
- **Disabled**: 50% opacity, no interaction

### Buttons
- **Normal**: Green gradient background
- **Hover**: Lifts up, shadow expands, glow effect
- **Active**: Returns to flat (no lift)
- **Disabled**: 50% opacity, grey background

### Cards
- **Normal**: Dark background, subtle border
- **Hover**: Green border, lift effect, shadow

### Links
- **Normal**: Green text
- **Hover**: Brighter green, underline
- **Visited**: Same as normal (no distinction)

---

## Special Effects

### Glow Effect
- Used on: Logo, input focus, buttons, circles, bars
- Implementation: `box-shadow` with green `rgba`
- Intensity: Varies by element (10px - 30px blur)

### Glass Morphism
- Semi-transparent backgrounds
- Backdrop blur (subtle)
- Used on: Cards, overlays

### Gradient
- Direction: Usually 135deg (diagonal)
- Colours: Accent green to dim green
- Used on: Buttons, progress bars

### Shadow
- Colour: Black with low opacity
- Blur: 10-30px depending on elevation
- Used on: Cards, buttons, elevated elements

---

## Accessibility Features

### Keyboard Navigation
- All interactive elements focusable
- Tab order follows visual flow
- Enter key activates buttons
- Escape closes modals (if implemented)

### Screen Readers
- Semantic HTML (`<header>`, `<main>`, `<footer>`)
- Alt text on icons (emoji fallback)
- ARIA labels where needed
- Meaningful link text

### Colour Contrast
- Text on black: WCAG AAA compliant
- Green on black: WCAG AA compliant
- Button text: High contrast

### Motion
- Animations are subtle
- Can be disabled via CSS media query:
  ```css
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; }
  }
  ```

---

## Loading States

### Initial Page Load
1. Background equaliser fades in
2. Logo spins into view
3. Title fades in
4. Feature cards cascade in (staggered)

### Analysing Playlist
1. Hide input form
2. Show loading spinner (3 rings)
3. Show "Analysing..." text
4. Show wave animation below
5. Takes 10-30 seconds

### Loading Results
1. Show loading state initially
2. Fetch from sessionStorage
3. Fade in results container
4. Animate circle progress
5. Animate bars (staggered)
6. Populate lists

---

## Error States

### Invalid URL
- Red border on input
- Error message below in red box
- Shake animation
- Auto-hide after 5 seconds

### API Error
- Replace loading with error icon
- Show error message
- Provide "Try Again" button
- Suggest common fixes

### No Results
- Show warning icon
- Message: "No results found"
- Redirect to home button

---

## File Sizes

- **HTML (total)**: ~12KB
- **CSS**: 18KB
- **JavaScript**: 13KB
- **Total Page**: ~43KB (uncompressed)
- **Gzipped**: ~12KB estimated

Very lightweight and fast-loading! 🚀

---

## Browser Support

### Fully Supported
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Features Used
- CSS Grid
- CSS Flexbox
- CSS Custom Properties (variables)
- CSS Animations
- Fetch API
- SessionStorage
- ES6+ JavaScript

---

## Design Inspiration

The design is inspired by:
- **Matrix aesthetic** (green on black)
- **Music production software** (waveforms, equaliser)
- **Vinyl records** (logo spinning)
- **Spotify's brand** (music-focused)
- **Cyberpunk aesthetic** (neon glows)

---

*This visual guide helps understand the complete design system of pyAux!* 🎨
