# UI and Styling in Storefront Next

This document describes the complete UI and styling approach for the template storefront: Tailwind CSS, shadcn/ui, design tokens, and related development practices.

## Tailwind CSS (v4)

The project uses **Tailwind CSS v4** with a utility-first approach.

### Rules

- Use **Tailwind utility classes** in component JSX for layout, spacing, typography, and colors.
- Use the **`cn()` utility** for conditional or combined class names: `import { cn } from '@/lib/utils'`. Example: `cn('rounded p-4', isActive && 'ring-2')`.
- Follow **mobile-first** responsive patterns using breakpoint prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`.
- **Do not use inline styles** (`style={{ ... }}`) for styling.
- **Do not use CSS modules** (`.module.css`) or separate CSS files for component-level styles.
- **Global and theme styles** belong in `src/app.css` only.

### Design Tokens

Colors and theme values are defined as CSS variables (design tokens). Use semantic token-based classes instead of hard-coded colors:

- Backgrounds: `bg-background`, `bg-muted`, `bg-card`
- Text: `text-foreground`, `text-muted-foreground`, `text-primary`
- Borders: `border-border`
- Interactive: `bg-primary`, `text-primary-foreground`, `hover:bg-primary/90`

Avoid raw color utilities (e.g. `bg-[#hex]`) so the app stays consistent with the theme and supports dark mode.

### Responsive Design

Use breakpoints consistently:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

---

## shadcn/ui

Presentational UI components are built on **Radix UI primitives** with **shadcn/ui** as the styling layer. They live in `src/components/ui/`.

### Adding Components

Add new components only via the official CLI so they are ejected with the correct config and Tailwind setup:

```bash
npx shadcn@latest add <component-name>
```

This ejects the component into `src/components/ui/` with the right dependencies and styles.

### Rules

- **Do** add and customize shadcn components by editing the files in `src/components/ui/`.
- **Do not** create custom components inside `src/components/ui/`; keep that directory for ejected shadcn components only.
- **Do not** manually copy components from the shadcn docs; always use the CLI so configuration (e.g. `components.json`) stays in sync.

Keeping `src/components/ui/` limited to ejected shadcn components makes upgrades and maintenance predictable. For custom UI, use `src/components/` (or another feature directory) and compose or wrap shadcn components as needed.

See [src/components/ui/README.md](../src/components/ui/README.md) for more detail.

---

## Component Library and Icons

- **Radix UI**: Use Radix primitives for accessible behavior (focus, keyboard, ARIA).
- **Icons**: Use **Lucide React** and **React Simple Icons** for iconography.

---

## Dark Mode

Dark mode is supported via CSS variables and the `.dark` class on a parent (e.g. root). Theme variables switch automatically:

```tsx
<div className="bg-background text-foreground border-border">
  <button className="bg-primary text-primary-foreground">Click me</button>
</div>
```

No extra class changes are needed for dark mode when using design tokens.

---

## Accessibility and Design System

- Use **semantic HTML** (`<button>`, `<nav>`, `<main>`, etc.) and appropriate **ARIA** where needed.
- Ensure **keyboard navigation** and visible **focus states** for interactive elements.
- Aim for **WCAG** compliance (contrast, focus order, labels).
- Keep **spacing and typography** consistent with the design system defined in `app.css` and Tailwind config.

---

## Summary

Quick reference:

| Do | Don't |
|----|--------|
| Tailwind utility classes | Inline styles, CSS modules, component-level `.css` files |
| `cn()` for conditional classes | Manual string concatenation for `className` |
| Design tokens (`bg-background`, `text-muted-foreground`) | Hard-coded colors |
| `npx shadcn@latest add <name>` | Manually copying or creating components in `src/components/ui/` |
| Global/theme styles in `src/app.css` | Scattered or duplicate global CSS |

For a short checklist, see the styling section in the Storefront Next development guidelines (e.g. the `storefront_next_development_guidelines` tool).
