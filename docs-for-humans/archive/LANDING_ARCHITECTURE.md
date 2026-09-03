# Landing Page Architecture

## 📁 Structure

```
src/
├── components/landing/
│   ├── Hero.tsx              # Hero section (2 variants: centered, split with books)
│   ├── FeaturesGrid.tsx       # 12-column feature grid layout
│   ├── PricingCard.tsx        # Single pricing card component
│   ├── PricingGrid.tsx        # 3-column pricing grid
│   ├── ComparisonTable.tsx    # Features comparison table
│   ├── CompareSlider.tsx      # Interactive before/after slider (client)
│   ├── CTA.tsx                # Call-to-action section
│   ├── Footer.tsx             # Footer with links
│   ├── SectionLabel.tsx       # Reusable section label
│   └── index.ts               # Barrel export
└── app/
    ├── page.tsx               # Home page (checks auth, shows landing or redirects)
    └── (landing)/
        ├── layout.tsx         # Landing layout with global styles & fonts
        ├── page.tsx           # Landing page (with Hero split variant)
        └── pricing/
            └── page.tsx       # Pricing page
```

## 🎨 Design System

**Colors:**
- Primary accent: `#B25032` (burnt orange)
- Hover accent: `#963F26` (darker orange)
- Background: `#F7F5F2` (light beige)
- Card: `#FFFFFF` (white)
- Text primary: `#1A1F2B` (dark gray)
- Text secondary: `#5E6771` (medium gray)

**Typography:**
- Headings: Lora (serif) - 400, -0.01em letter-spacing
- Body: Inter (sans-serif) - 400/500/600

## 🚀 Usage

### Main Landing Page (`/`)
```tsx
import { Hero, FeaturesGrid, CTA, Footer } from '@/components/landing';

export default function LandingPage() {
  return (
    <>
      <Hero variant="split" withBooks={true} />
      <FeaturesGrid />
      <CTA />
      <Footer />
    </>
  );
}
```

### Pricing Page (`/pricing`)
```tsx
import { SectionLabel, PricingGrid, ComparisonTable, Footer } from '@/components/landing';

export default function PricingPage() {
  return (
    <>
      <header>
        <SectionLabel>Investment in Wisdom</SectionLabel>
        <h1>A plan for every reader.</h1>
      </header>
      <PricingGrid />
      <ComparisonTable />
      <Footer />
    </>
  );
}
```

## 🔧 Component Details

### Hero
```tsx
<Hero 
  variant="centered" | "split"  // Default: centered
  withBooks={true}              // Show floating books (split only)
/>
```

**Variants:**
- `centered`: Center-aligned hero with CTA button
- `split`: Two-column layout with books on the right, text on the left

### CompareSlider (Client Component)
Interactive before/after slider with mouse/touch support. Shows English text vs Russian translation.

### PricingCard
```tsx
<PricingCard
  name="Scholar"
  price="12"
  period=" / month"
  features={['15 books per month', '...']}
  buttonText="Start 14-day Trial"
  buttonType="primary" | "outline"
  featured={true}  // Adds "Most Popular" badge and lifted effect
/>
```

## 🌐 Route Group Strategy

- **Route group `(landing)`**: Groups landing-related pages without affecting URL
  - Shares `layout.tsx` with global styles
  - Exports fonts for performance
  - `/` → landing home
  - `/pricing` → pricing page

- **Root `page.tsx`**: Entry point
  - Checks Supabase auth status
  - If authenticated: redirects to `/library`
  - If not: shows landing UI

## 🎯 Key Features

1. **Responsive Grid**: 12-column feature grid that can span 5, 7, or 12 columns
2. **Interactive Slider**: Draggable before/after comparison (mouse & touch)
3. **Dark Mode Ready**: All colors use CSS variables
4. **Accessible**: Semantic HTML, proper heading hierarchy
5. **Performance**: Minimal client-side interactivity (only CompareSlider is 'use client')
6. **TypeScript**: Fully typed components

## 📝 Customization

### Colors
Update CSS variables in `(landing)/layout.tsx`:
```tsx
--bg-page: '#F7F5F2';
--accent: '#B25032';
// ... etc
```

### Fonts
Google Fonts are imported in `(landing)/layout.tsx`:
```
Lora: 400, 500, 600, 700
Inter: 400, 500, 600
```

### Feature Cards
Edit sections in `FeaturesGrid.tsx` - each card is self-contained with its own styling.

### Pricing Plans
Update feature lists and prices in `PricingGrid.tsx` and comparison rows in `ComparisonTable.tsx`.

## 🔗 Related Files

- Design concepts (archived): `docs-for-humans/design_concepts/`
- Landing page original React demo: `docs-for-humans/design_concepts/landing_concept*.js`
- Pricing concept: `docs-for-humans/design_concepts/pricing_concept.js`
