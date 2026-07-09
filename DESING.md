---
name: Elite Performance Framework
colors:
  surface: '#f8f9ff'
  surface-dim: '#d8dae0'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3fa'
  surface-container: '#ecedf4'
  surface-container-high: '#e7e8ef'
  surface-container-highest: '#e1e2e9'
  on-surface: '#191c20'
  on-surface-variant: '#414751'
  inverse-surface: '#2e3036'
  inverse-on-surface: '#eff0f7'
  outline: '#727782'
  outline-variant: '#c1c7d2'
  surface-tint: '#0f60a8'
  primary: '#0f60a8'
  on-primary: '#ffffff'
  primary-container: '#64a1ee'
  on-primary-container: '#003666'
  inverse-primary: '#a4c9ff'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e4e2e1'
  on-secondary-container: '#656464'
  tertiary: '#7b5900'
  on-tertiary: '#ffffff'
  tertiary-container: '#ca9619'
  on-tertiary-container: '#473200'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#a4c9ff'
  on-primary-fixed: '#001c39'
  on-primary-fixed-variant: '#004883'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#ffdea4'
  tertiary-fixed-dim: '#f7bd42'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4200'
  background: '#f8f9ff'
  on-background: '#191c20'
  surface-variant: '#e1e2e9'
typography:
  h1:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  h1-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.02em
  h2:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '300'
    lineHeight: 24px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '300'
    lineHeight: 20px
  label-caps:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered to project professional authority, athletic dynamism, and unwavering reliability. Built for an online personal training consultancy, the aesthetic balances the grit of physical training with the precision of digital health tracking. 

The style is **Modern Minimalist with High-Performance Accents**. It utilizes expansive white space to denote clarity of instruction, while employing bold, heavy typography and vibrant blue accents to trigger an emotional response of "Confidence" and "Action." The interface should feel like a premium fitness tool—sturdy, responsive, and clear of distractions. 

Key attributes:
- **Professionalism:** Clean surfaces and structured layouts.
- **Energy:** Strategic use of high-contrast action colors.
- **Clarity:** Generous breathing room between data points and instructions.

## Colors

The palette is anchored by a deep grayscale foundation ("Strength") and a bright, supportive blue ("Confidence"). 

- **Primary & Action:** Use #64A1EE for supportive brand elements and #1E6FD9 for high-priority interactive components like primary buttons and active states.
- **Neutrals:** #424242 serves as the primary text color and secondary brand anchor, providing a grounded contrast against the #F7FAFD background.
- **Semantic Logic:** A four-tier status system (Low to Urgent) provides immediate visual feedback for workout intensity, priority tasks, or health metrics.
- **Application:** Use the background color to define large structural areas, while the white surface color is reserved for content cards and interactive modules to create a clear "layered" hierarchy.

## Typography

The typographic system focuses on high-impact hierarchy. **Montserrat** (substituted for Poppins for a sharper, more athletic geometric feel) provides a heavy, authoritative presence for headlines. **Be Vietnam Pro** is used for body copy to ensure maximum legibility during workouts, utilizing a "Light" weight to contrast against the bold headlines.

- **Headlines:** Set in ExtraBold with tight letter-spacing to evoke strength.
- **Body:** Set in Light weight (300) for a clean, modern editorial look.
- **Labels:** Use uppercase with increased letter-spacing for utility text, such as exercise categories or timestamps.

## Layout & Spacing

This design system uses a **Fluid Grid** model with a base 4px rhythm. The layout philosophy emphasizes "generous spacing" to prevent the interface from feeling cluttered during high-stress activities (like a training session).

- **Desktop:** 12-column grid with 24px gutters. Max width is capped at 1200px to maintain readability.
- **Mobile:** Single column with 16px side margins. 
- **Vertical Rhythm:** Elements are grouped using a "Stack" logic (8px/16px/32px) to clearly separate distinct training blocks or data sets.
- **Touch Targets:** All interactive elements maintain a minimum height of 48px to ensure ease of use for athletes with sweaty or moving hands.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and tonal layering. The goal is to make the interface feel tactile and layered without using outdated skeuomorphism.

- **Base Layer:** The background (#F7FAFD) is the furthest plane.
- **Surface Layer:** White (#FFFFFF) cards sit atop the background with a soft, diffused shadow (0px 4px 20px rgba(0, 0, 0, 0.05)).
- **Interactive Elevation:** On hover or active states, primary buttons and cards increase their shadow spread slightly to indicate "lift."
- **Focus States:** Use a 2px solid ring of the Primary Blue (#64A1EE) for accessibility on inputs and buttons.

## Shapes

The shape language is "Extra Rounded" to provide a friendly, modern feel that balances the "hard" nature of the workout content.

- **Standard Elements:** Use `rounded-lg` (16px) for standard buttons and inputs.
- **Containers:** Use `rounded-xl` (24px) for cards, modals, and primary layout containers.
- **Visual Contrast:** The circular "MC" logo acts as a recurring motif; use circular avatars and icons to echo this brand symbol.

## Components

### Buttons
- **Primary:** Background #1E6FD9, Text #FFFFFF, Bold Montserrat. Large padding (16px 32px).
- **Secondary:** Background #F7FAFD, Border 1px #64A1EE, Text #424242.
- **Shape:** Rounded-lg (16px) or fully pill-shaped for CTAs.

### Cards
- **Workout Card:** White background, 24px corner radius, soft shadow. Use a vertical accent bar on the left edge colored by the "Status" tokens to indicate priority/intensity.

### Input Fields
- **Design:** Soft gray border (1px), white background, 16px corner radius. Labels sit above the field in `label-caps` style.

### Chips & Badges
- **Status Badges:** Small, subtle background tint (10% opacity of status color) with high-contrast text of the same hue. Used for "Low", "Medium", and "High" workout tags.

### Icons
- **Style:** Lucide icons, 2px stroke weight. Use #424242 for general utility and #64A1EE for active navigation items.

### Lists
- **Exercise Lists:** Clean, borderless rows with a thin #F0F4F8 separator. Each row should have a minimum height of 64px to ensure tap accuracy.
