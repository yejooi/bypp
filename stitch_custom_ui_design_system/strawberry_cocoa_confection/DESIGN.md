---
name: Strawberry Cocoa Confection
colors:
  surface: '#fff8f6'
  surface-dim: '#f8d1cb'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0ee'
  surface-container: '#ffe9e5'
  surface-container-high: '#ffe2dd'
  surface-container-highest: '#ffdad4'
  on-surface: '#2b1613'
  on-surface-variant: '#584045'
  inverse-surface: '#422a26'
  inverse-on-surface: '#ffedea'
  outline: '#8c7075'
  outline-variant: '#e0bec3'
  surface-tint: '#b32053'
  primary: '#b32053'
  on-primary: '#ffffff'
  primary-container: '#ff5c8a'
  on-primary-container: '#640028'
  inverse-primary: '#ffb1c0'
  secondary: '#75584d'
  on-secondary: '#ffffff'
  secondary-container: '#fed7ca'
  on-secondary-container: '#795c51'
  tertiary: '#a92f5c'
  on-tertiary: '#ffffff'
  tertiary-container: '#f26895'
  on-tertiary-container: '#64002e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9df'
  primary-fixed-dim: '#ffb1c0'
  on-primary-fixed: '#3f0017'
  on-primary-fixed-variant: '#90003d'
  secondary-fixed: '#ffdbce'
  secondary-fixed-dim: '#e4beb2'
  on-secondary-fixed: '#2b160f'
  on-secondary-fixed-variant: '#5b4137'
  tertiary-fixed: '#ffd9e1'
  tertiary-fixed-dim: '#ffb1c5'
  on-tertiary-fixed: '#3f001a'
  on-tertiary-fixed-variant: '#891345'
  background: '#fff8f6'
  on-background: '#2b1613'
  surface-variant: '#ffdad4'
typography:
  headline-xl:
    fontFamily: Epilogue
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Epilogue
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Epilogue
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Epilogue
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: 0em
  headline-md:
    fontFamily: Epilogue
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Epilogue
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.03em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system channels a nostalgic, cozy confectionery identity reminiscent of classic Japanese parlor sweets, retro patisseries, and tactile lifestyle casual games. The emotional palette evokes gentle indulgence, warmth, and joyful comfort.

### Visual Style & Aesthetic
The system relies on a warm, tactile 2D retro aesthetic. Instead of sterile high-gloss surfaces or aggressive neo-brutalism, it uses:
- Creamy, layered paper-and-wafer textures.
- Solid outlines in deep molten cocoa tones.
- Soft, pillowy dimensionality with distinct tactile drop-shadows (hard offset shadows, zero blur).
- Playful retro polka dot micropatterns suspended on velvety milk-cream backgrounds.
- Confection-inspired details: scallop framing, thick button presses, and pill badges.

## Colors

The palette derives strictly from strawberries, milk chocolate, and whipped sweet cream, steering clear of cool greys, sterile whites, or bright yellow tones.

### Palette Architecture
- **Primary (`#FF5C8A`) & Accent Strawberry (`#FF729F`):** Vivid strawberry candy glazes. Used for high-emphasis call-to-actions, active indicators, interactive states, and playful badge highlights.
- **Secondary Milk Chocolate (`#8D6E63`) & Cocoa Midtone (`#6D4C41`):** Rich, mellow chocolate layers. Serves as secondary interactive elements, outline strokes, structured tabs, and auxiliary buttons.
- **Warm Milk Wafers (`#D7CCC8` & `#EFEBE9`):** Card fills, table alternating stripes, chip containers, and panel backplates.
- **Text & Outlines (`#3E2723` & `#4E342E`):** Deep dark roasted cacao. Used for typography and 2-3px structural borders, replacing standard pitch-black.
- **Base Background (`#FAF6F0` to `#FFF9F5`):** Sweet warm ivory/milky cream treated with a subtle SVG or CSS radial-gradient polka dot pattern in `#EFEBE9` (4px dots spaced at 24px intervals).

## Typography

The typography pairs the plump, distinctive geometry of **Epilogue** for display titles with the warm, open proportions of **Plus Jakarta Sans** for body and UI elements.

- **Headlines:** Set in `Epilogue` (Weights 700 to 800). The tight curves and robust letterforms impart a retro editorial feel reminiscent of vintage sweet packaging and cozy bakery menus.
- **Body & Labels:** Handled by `Plus Jakarta Sans`. Its rounded terminals ensure seamless readability in prolonged reading tasks while maintaining the cheerful, approachable spirit of the design system.
- **Hierarchy Rules:** Large headlines must always be rendered in deep cacao (`#3E2723`). Pink accents in headlines are reserved solely for isolated highlight words or decorative prefixes.

## Layout & Spacing

The layout is built on a responsive 12-column grid system that prioritizes generous, comfortable breathing space over cramped information density.

### Responsive Grid
- **Desktop (1024px+):** 12 columns, `gutter: 1.25rem` (20px), outer canvas `margin: 2rem` (32px), max content constraint of 1200px centered.
- **Tablet (768px – 1023px):** 8 columns, `gutter: 1rem` (16px), outer canvas `margin: 1.5rem` (24px).
- **Mobile (< 768px):** 4 columns, `gutter: 0.75rem` (12px), outer canvas `margin: 1rem` (16px).

### Spacing Principles
Padding inside interactive cards, banners, and modals must skew toward comfortable and roomy (`space-lg` to `space-xl`). Elements should evoke plush, cushion-like blocks rather than razor-thin modules.

## Elevation & Depth

To sustain the 2D cozy retro atmosphere, realistic, blurry ambient drop shadows are eliminated. Depth is expressed through tactile **cel-shading** and physical offsets.

### Tactile Drop-Shadows (The "Wafer Offset")
- **Default Raised Surface:** A solid 2.5px border colored in `#3E2723` paired with an offset drop shadow: `box-shadow: 0px 4px 0px #6D4C41`.
- **Primary Action (Interactive):** `box-shadow: 0px 4px 0px #3E2723`. On `:hover`, the element translates up by 1px (`transform: translateY(-1px)`) with shadow expanding to `0px 5px 0px #3E2723`. On `:active`, the element translates down by 3px (`transform: translateY(3px)`) while shadow collapses to `0px 1px 0px #3E2723`.
- **Modals and Overlays:** Defined by an outer border in `#3E2723` and a 6px hard shadow: `box-shadow: 0px 8px 0px #4E342E`.
- **Inner Recesses (Fields, Troughs, Inputs):** Inset shadows simulate sunken trays: `box-shadow: inset 0px 2px 4px rgba(62, 39, 35, 0.08)`.

## Shapes

The design system embraces high roundedness (Level 3 - Pill Shaped) to reflect the smooth edges of confections, rolled cocoa biscuits, and candy pastilles.

- **Pill Elements:** Buttons, search bars, filter tags, and status badges use fully rounded caps (`border-radius: 9999px`).
- **Cards & Dialogs:** Large containers employ oversized corner roundings (`border-radius: 1.5rem` to `2rem`).
- **Surface Trims:** Card edges occasionally feature scalloped or perforated borders for festive accents, framed with crisp 2px cocoa outlines.

## Components

### Buttons
- **Primary Button:** Pill-shaped (`border-radius: 9999px`), background in `#FF5C8A`, text in white (`#FFFFFF`), border `2px solid #3E2723`, tactile shadow `0px 4px 0px #3E2723`.
- **Secondary Button:** Pill-shaped, background in `#EFEBE9`, text in `#3E2723`, border `2px solid #6D4C41`, tactile shadow `0px 4px 0px #6D4C41`. On hover, background shifts to `#D7CCC8`.
- **Ghost/Tertiary Button:** Transparent background, text in `#FF5C8A`, hover state activates a translucent milky pink fill (`rgba(255, 114, 159, 0.15)`).

### Chips & Badges
- Compact pill tokens. Backgrounds are assigned to `#D7CCC8` or `#FF729F` (with white text), enclosed by a 1.5px border in `#4E342E`. Ideal for categorizing pastry types, inventory, and status indicators.

### Cards
- Fills are rendered in soft ivory (`#FFF9F5`) or warm cream wafer (`#EFEBE9`).
- Borders are set to `2px solid #6D4C41` with a `4px` solid cocoa offset shadow.
- Header bars within cards can feature an alternating candy-stripe or solid `#FF729F` top edge ribbon.

### Input Fields
- Form elements use pill or soft 1rem rounded profiles with a recessed inset shadow.
- Background: `#FFFFFF` or pale milk cream `#FAF6F0`.
- Border: `2px solid #D7CCC8`. On focus, border snaps to `2px solid #FF5C8A` with a soft outer ring in `#FF729F` at 25% opacity. Text color is strictly `#3E2723`, with placeholder text in `#8D6E63`.

### Checkboxes & Radios
- **Checkbox:** Squircle-shaped (`border-radius: 8px`), `2px solid #3E2723`, background `#FAF6F0`. When checked, fills with `#FF5C8A` and reveals a chunky cream checkmark.
- **Radio:** Circular, `2px solid #3E2723`. When active, displays a centered `#FF5C8A` inner candy drop dot.

### Lists & Dividers
- Lists sit within wafer containers with item separators formed by dotted cocoa borders (`1.5px dotted #D7CCC8`).
- Hovering over a list row triggers an ivory-pink wash (`#FFF0F4`).