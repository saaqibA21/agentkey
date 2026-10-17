# Design System — AgentIdentity

## Stack
- framework: Next.js 16 (App Router) + React 19
- styling: Tailwind CSS v4 + Design Tokens
- components: Custom atomic design system (`web/components/ui.tsx`)
- icons: Inline semantic SVG icons with zero runtime overhead
- font: Inter / UI Sans + Cascadia / JetBrains Mono

## Theme & Aesthetic
- Style: **Dark Pro & High-Fidelity Modern Dashboard**
- Surfaces: Deep layered zinc with subtle borders (`border-white/10`, `border-black/10`), frosted glass (`backdrop-blur-md`)
- Accents: 
  - Teal/Emerald (`#14b8a6` / `#0f766e`): Multi-channel connectivity & verified status
  - Indigo/Purple (`#8b5cf6` / `#6366f1`): Sovereign Owner Identity & cryptographic signatures
  - Amber (`#f59e0b`): HITL approvals & security guardrails
- Typography: Fluid, tight headings (`tracking-tight leading-tight`), high readability monospace for API tokens & OTPs

## Tokens
- `--bg`: `#0a0b0d` (Dark Pro base) / `#fafaf9` (Clean Light)
- `--surface`: `#121316` (Raised surface) / `#ffffff`
- `--surface-raised`: `#18191e` (Modal & hover surface)
- `--line`: `rgba(255, 255, 255, 0.08)` / `rgba(0, 0, 0, 0.08)`
- `--ink`: `#f3f4f6` / `#111827`
- `--muted`: `#9ca3af` / `#6b7280`
- `--accent`: `#14b8a6` (Teal)
- `--accent-purple`: `#8b5cf6` (Owner Identity)

## Components Inventory
- `web/components/ui.tsx`:
  - `Card`, `PageHeader`, `Badge`, `StatCard`, `Code`, `Empty`, `inputClass`, `btnSecondary`
- `web/components/site.tsx`:
  - `Logo`, `SiteNav`, `SiteFooter`
- `web/components/client.tsx`:
  - `CopyButton`, `ActionForm`, `AutoRefresh`

## Decisions
- 2026-10-17: Applied `ui-skill` systemic UI overhaul to AgentIdentity. Rebranded from raw starter template to premium multi-channel identity operating system. Added Admin Console, Owner-Delegated Identity badges, and high-fidelity navigation.
