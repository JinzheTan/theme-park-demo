# Design system

Wonderloop Park uses a unified "liquid glass" surface system with three depth tiers. Every visible element belongs to exactly one tier — no component declares its own gradient, blur, or border in isolation.

## Tokens

All design tokens are CSS custom properties on `:root` in [`styles/tokens.css`](../styles/tokens.css). Three glass tiers + one accent state + pill chassis + z-index contract + motion.

### Glass tiers

| Tier | Use | Blur | Border alpha | Shadow strength |
|---|---|---|---|---|
| `.glass.glass--depth-1` | Floating overlays — hover-card, floating-tool, minimap, action-bar, controls-popover | 20px / sat 1.30 | 0.62 | 0 14px 28px |
| `.glass.glass--depth-2` | Standard panels — sidebar panel, tool button, metric pill, list card | 24px / sat 1.35 | 0.70 | 0 22px 50px |
| `.glass.glass--depth-3` | Hero surfaces — viewport panel, vision card | 28px / sat 1.40 | 0.78 | 0 32px 70px |

The three tiers establish a clear depth language: lightest on top (floating), most opaque in the back (hero containers).

### Accent state

```css
.glass--active {
  border-color: var(--accent-border);     /* rgba(216,157,38,0.55) */
  background: var(--accent-bg), rgba(255,255,255,0.34);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.92), var(--accent-glow);
}
```

Applied additively. Used by:
- Selected tool button (`.tool-button.active.glass--active`)
- Current speed pill (`.pill--toggle.active.glass--active`)
- Current growth tier in goals (`.goal-item.current.glass--active`)
- Mobile tab active state

### Pill chassis

`.pill` provides a single rounded-pill chassis used by the action bar, speed segmented control, metric pills, and mobile tabs. Variants stretch it:

- `.pill--metric` — 58px tall, icon + 2 lines of text (used in the headline)
- `.pill--action` — standard size (Fit Park)
- `.pill--toggle` — slightly smaller font (segmented controls)
- `.pill--icon` — square 36×36 (the `?` controls launcher)
- `.pill-group` — wraps multiple `.pill--toggle` into a segmented control

## Z-index contract

Defined in tokens, four layers only:

| Variable | Value | Used for |
|---|---|---|
| `--z-canvas` | 1 | canvas itself |
| `--z-overlay-pinned` | 4 | action-bar, minimap, floating-tools, controls-launcher |
| `--z-overlay-hover` | 6 | hover-card (cursor-following) |
| `--z-modal` | 10 | reserved for future dialogs |

If a new overlay needs a different layer, **add a new token** rather than introducing arbitrary z-index numbers.

## Motion

```css
--ease-glass: cubic-bezier(0.22, 0.61, 0.36, 1);
--dur-fast: 140ms;
--dur-base: 220ms;
```

- Hover card uses `var(--dur-fast)` for snappy enter/exit.
- Controls popover uses `var(--dur-base)` because it's a less-frequent surface.
- All `.glass` surfaces share a transition on border/background/box-shadow/transform for consistent affordance under hover.

## Recipes

### Mounting a new panel

```html
<section class="panel glass glass--depth-2" data-tab-panel="rides">
  <div class="panel-heading">
    <p class="eyebrow">Live Ops</p>
    <h2>Ride Status</h2>
  </div>
  <div class="ride-status-list" id="rideStatusList"></div>
</section>
```

Three things to remember:
1. `data-tab-panel="<tab-id>"` controls mobile tab routing — must match an id in `src/ui/mobile-tabs.js`.
2. Use `.glass .glass--depth-N` instead of authoring a custom gradient.
3. Inside, use `.list-card.glass.glass--depth-2` for each row.

### Mounting a new pill / button

```html
<button class="pill pill--action glass glass--depth-1 glass-hoverable">
  Click me
</button>
```

`.glass-hoverable` adds the hover lift + focus ring used everywhere.

### Adding a list card

```html
<article class="ride-card list-card glass glass--depth-2">
  <strong>Title <span class="status-chip">OK</span></strong>
  <span>Description</span>
</article>
```

The chip color falls back to gold; add `.warn` for danger red.

## Anti-patterns

| Don't | Do |
|---|---|
| `background: linear-gradient(...); backdrop-filter: blur(20px)` inside a component | Use `.glass.glass--depth-N` |
| `border: 1px solid rgba(255,255,255,0.65)` (random alpha) | Pick a tier — the border alpha is fixed per tier |
| Different active highlight colors for different selectable widgets | Add `.glass--active` |
| `z-index: 99` because of a stacking bug | Pick one of `--z-overlay-pinned / hover / modal` |
| `transition: all 300ms ease` | Use `var(--dur-base) var(--ease-glass)` and name the specific properties |

## Responsive policy

Three breakpoints, defined once in [`styles/responsive.css`](../styles/responsive.css):

| Breakpoint | What changes |
|---|---|
| **≤ 1180px** | Sidebar drops below the viewport, sidebar uses a 2-col grid, headline metrics use 3 cols. |
| **≤ 760px** | Headline metrics 1–2 cols, viewport min-height 620px, mobile tab drawer activates (`.mobile-tabs` visible, sidebar shows one section at a time). |
| **≤ 520px** | Headline metrics fully stacked, floating tools narrower, minimap shrinks. |

The mobile tab drawer is the load-bearing simplification: instead of an endless scroll of panels, the user picks a tab and sees one focused view at a time.
