---
name: High-Performance Dark Mode
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#303030'
  tertiary-container: '#e4e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
typography:
  display-timer:
    fontFamily: Montserrat
    fontSize: 84px
    fontWeight: '700'
    lineHeight: 84px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  touch-target-min: 48px
  container-padding: 20px
  stack-gap: 16px
  section-gap: 32px
---

## Brand & Style
The design system is engineered for high-intensity athletic environments. It prioritizes peak focus and physiological ease-of-use. By utilizing a "Dark Mode First" philosophy, the interface minimizes eye strain in dimly lit gyms and preserves battery life on OLED mobile devices during long workouts.

The aesthetic is **High-Performance Minimalism**. It strips away non-essential decorations to highlight biometric data and instructional content. The emotional response is one of discipline, precision, and energy—evoked through the tension between a void-like deep black background and high-visibility "Electric Lime" accents. The UI must feel robust and "engineered," favoring clarity over ornament to ensure usability when the user is under physical exertion.

## Colors
The palette is optimized for extreme contrast and visual hierarchy:
- **Primary (Electric Lime):** Used exclusively for critical Actions (CTAs), active states, and progress indicators. Its high luminance ensures it "pops" against the black void.
- **Neutral (Deep Black):** The base layer (#000000) to ensure true black on OLED screens.
- **Surface Tiers:** Secondary (#1A1A1A) and Tertiary (#262626) grays are used to create depth for cards and input fields, providing enough separation from the background without losing the dark aesthetic.
- **Typography:** Pure White for primary information; Zinc/Gray for secondary labels to maintain a clear information architecture.

## Typography
Typography is the core of this design system's utility. 
- **Montserrat** is used for headlines and numbers to provide a bold, geometric, and "sporty" feel. 
- **Inter** handles all body copy and metadata, chosen for its exceptional legibility and neutral tone.
- **Timers & Metrics:** For all numerical data, use `tabular-nums` CSS settings to prevent layout jitter as numbers change.
- **Scale:** Sizes are intentionally larger than standard apps to account for movement and arm's-length viewing during exercise.

## Layout & Spacing
The layout follows a **Fluid Grid** with a maximum content width of 600px (optimized for PWA/Mobile-first). 
- **Touch-First Philosophy:** All interactive elements (buttons, toggles, list items) must adhere to a minimum height of 48px to allow for easy interaction with sweaty or shaky hands.
- **Margins:** A consistent 20px horizontal margin is applied to the screen edges to prevent content from hitting the bezel.
- **Rhythm:** An 8px linear scale governs all padding and margins, ensuring a tight, structured relationship between elements. 
- **Reflow:** On desktop views, the interface centers itself to maintain the focus-driven column characteristic of mobile fitness apps.

## Elevation & Depth
In this design system, depth is communicated through **Tonal Layering** and **Soft Shadows**:
- **Background (Level 0):** Pure #000000.
- **Surface (Level 1):** Card containers use #1A1A1A with a 1px subtle border of #262626 to define edges without excessive contrast.
- **Raised (Level 2):** Floating elements or active modals use #262626 with a soft, diffused black shadow (0px 8px 24px rgba(0,0,0,0.5)) to create a sense of physical layering.
- **Depth via Blur:** When modals are active, a heavy backdrop blur (20px) is applied to the background to maintain focus on the active task.

## Shapes
The shape language is **Subtle and Technical**. 
- Elements use a `0.25rem` (4px) base radius. This provides a modern feel that is "softer" than brutalism but maintains the aggressive, professional edge associated with gym equipment and high-end watches.
- **Progress Bars:** Should use fully rounded (pill) ends to differentiate data visualization from interactive containers.
- **Cards:** Always use the `rounded-lg` (8px) tokens to create a clear container distinction.

## Components
- **Primary Action Button:** High-visibility Electric Lime background with black bold text. No shadows; the color provides the "lift." Large padding (16px vertical).
- **Exercise Cards:** Dark gray surface (#1A1A1A). Title in White, secondary stats in Zinc. Include a large, accessible "Check" or "Start" icon in the primary color.
- **Circular Timer:** A thin, neutral gray track with a thick Electric Lime progress stroke. The time remains centered in the Montserrat Display-Timer style.
- **Linear Progress Indicators:** 8px height tracks. The "unfilled" portion should be #262626 and the "filled" portion the primary accent color.
- **Input Fields:** Bottom-aligned border or fully enclosed dark gray box. Focus state is indicated by a 2px primary color border.
- **Chips/Labels:** Small, pill-shaped indicators for "Rest," "Set," or "Warm-up" using secondary gray backgrounds with white text to avoid competing with main CTAs.