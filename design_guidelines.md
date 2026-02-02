# Docker Android - Design Guidelines

## Brand Identity
**Purpose**: Docker container management on Android devices via QEMU/Alpine Linux VM. Users control containers, view logs, access web apps, and manage Docker resources directly from their mobile device.

**Aesthetic Direction**: Clean Watercolor - soft, textured, calm, and approachable. This aesthetic balances technical complexity with warmth through muted watercolor accents and gentle motion. The design feels tactile and human, not sterile.

**Memorable Element**: Soft mauve purple accent color with calm, drifting animations rather than sharp snaps. All interactions use gentle spring animations.

---

## Navigation Architecture

**Root Navigation**: Bottom Tab Navigator (4 tabs)
- **Home** - VM status, Docker daemon health, quick stats, recent containers
- **Containers** - List/manage all containers with swipe actions
- **Images** - Browse/pull Docker images
- **Settings** - App configuration, QEMU controls

**Modal Stacks**:
- Container Detail (from Containers tab or Home)
- WebView (from container port links)
- Terminal (from container actions)
- Create Container (modal form)

---

## Design Tokens

### Colors
```
bg.canvas: #F6F4F1 (app background - light mode)
bg.surface: #FFFFFF (card backgrounds)
bg.soft: #EEEAE5 (section backgrounds)

text.primary: #2E2E2E
text.secondary: #6B6B6B
text.muted: #9A9A9A

accent.mauve: #7A6EAA (primary actions, active states)
accent.olive: #8A8C68 (images, secondary actions)
accent.terracotta: #C47A5A (terminal, tertiary)
accent.mint: #A7C4B8 (decorative)

state.success: #7FAF9B (running containers)
state.warning: #E1B07E (paused/starting)
state.error: #D17C7C (stopped/error)
```

### Typography
- **Heading Font**: Fraunces (serif, for h1-h3)
- **Body Font**: Inter (sans-serif, for body, small, caption)
- **Sizes**: h1: 48px, h2: 32px, h3: 24px, h4: 20px, body: 16px, small: 14px, caption: 12px
- **Weights**: Regular 400, Medium 500, Semibold 600

### Spacing & Radius
- **Space**: xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 40px
- **Radius**: sm: 8px, md: 16px, lg: 24px, pill: 999px

### Shadows
- **Soft**: `0 4px 12px rgba(0,0,0,0.06)` (cards, elevated elements)
- **Hover**: `0 6px 20px rgba(0,0,0,0.08)` (pressed state on Android)

### Motion
- **Duration**: Fast 120ms, Normal 280ms, Slow 500ms
- **Transforms**: Scale Soft: 0.98 (pressed state)
- **Easing**: Standard cubic-bezier(0.4, 0.0, 0.2, 1)

---

## Component Specifications

### Cards
- Background: backgroundDefault (#FFFFFF light / #252423 dark)
- Padding: 16px
- Radius: 24px (lg)
- Shadow: soft
- Press animation: scale to 0.98 with 120ms timing

### Status Badge
- Pill radius with dot indicator
- Colors mapped to state tokens
- Font: caption size with medium weight

### Container Card
- Swipe gesture reveals action buttons (left swipe)
- Actions: Start/Stop (context-aware), Remove
- Shows: name, image, status badge, ports, uptime
- Swipe hint chevron on right edge

### Image Card  
- Swipe gesture for remove action
- Shows: name, tag badge, size, created date
- Icon with olive accent background

### Buttons
- Height: 44px
- Radius: md (16px)
- Primary: accent.mauve
- Secondary: accent.olive
- Destructive: state.error
- Press: scale 0.98

### FAB (Floating Action Button)
- Size: 56x56
- Radius: 28 (circular)
- Shadow: hover
- Position: bottom-right, above tab bar

### Settings Row
- Icon in rounded square container
- Toggle switch or chevron for navigation
- Destructive variant in error color

---

## Screen Guidelines

### Safe Area Handling
- Top padding: headerHeight + Spacing.md for transparent headers
- Bottom padding: tabBarHeight + Spacing.xl for tab screens
- Modal screens: insets.bottom for home indicator

### Empty States
- Centered layout with large icon (48px in 100px container)
- Icon container: accent.mauve + 15% opacity background
- Title + description + optional action button
- Max description width: 280px

### Loading States
- Spinning loader icon in accent.mauve
- Optional message below spinner

---

## Swipe Gestures (Critical Feature)

All list cards support horizontal swipe gestures:
- **Swipe threshold**: 60-80px to reveal actions
- **Action width**: 70-80px per action button
- **Haptic feedback**: Light on swipe reveal, Medium on action tap
- **Spring animation**: damping 20 on release
- **Visual hint**: subtle chevron-left icon on card edge

Container cards: Start/Stop + Remove
Image cards: Remove only

---

## Dark Mode

All colors have dark mode variants:
- Background: #1A1918 (root), #252423 (default), #302F2D (secondary)
- Text: #F6F4F1 (primary), #B8B5B0 (secondary), #8A8785 (muted)
- Accent colors remain similar but slightly lighter for visibility
