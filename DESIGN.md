---
name: أكاديمية حبل الله القرآنية
description: A welcoming Quran academy with distinct adult, kids, and administrative experiences.
colors:
  emerald: "#1B4D3E"
  warm-gold: "#CFA767"
  page-light: "#f8faf7"
  card-light: "#ffffff"
  text-light: "#1f2a24"
  muted-light: "#4a5750"
  page-dark: "#0f1a16"
  card-dark: "#16261f"
  text-dark: "#e8f3ed"
  emerald-dark: "#4ead88"
  gold-dark: "#d4aa6e"
  admin-bg: "#0d1117"
  admin-surface: "#161b22"
  admin-surface-raised: "#1e2530"
  admin-border: "rgba(255,255,255,0.08)"
  admin-accent: "#4ead88"
  admin-accent-deep: "#2d8a68"
  admin-text: "#e6edf3"
  admin-muted: "#8b949e"
  admin-danger: "#f85149"
typography:
  headline:
    fontFamily: "Cairo, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 900
  admin-title:
    fontFamily: "Cairo, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 800
  body:
    fontFamily: "Cairo, sans-serif"
    fontSize: "1rem"
  admin-label:
    fontFamily: "Cairo, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
rounded:
  control: "8px"
  admin-card: "10px"
  modal: "16px"
  portal-card: "24px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
components:
  admin-button-primary:
    backgroundColor: "linear-gradient(135deg, #4ead88, #2d8a68)"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0.6rem 1.2rem"
  admin-button-ghost:
    backgroundColor: "rgba(255,255,255,0.06)"
    textColor: "{colors.admin-text}"
    rounded: "{rounded.control}"
    padding: "0.6rem 1.2rem"
  admin-input:
    backgroundColor: "{colors.admin-surface-raised}"
    textColor: "{colors.admin-text}"
    rounded: "{rounded.control}"
    padding: "0.65rem 0.85rem"
---

# Design System: أكاديمية حبل الله القرآنية

## Overview

**Creative North Star: "The Welcoming Quran Academy"**

A warm, trustworthy learning home expressed through Arabic typography, emerald, and warm gold. Adults receive a composed scholarly setting; children receive a brighter, playful treatment. Administration is a separate, task-oriented dark workspace, not a recolored marketing page.

This document captures the incumbent implementation, not a redesign. Sources are `src/index.css`, `src/components/Portals.jsx`, `src/pages/admin/AdminLayout.jsx`, and `src/pages/admin/admin-responsive.css`. Values are code-derived; rendered appearance has not yet been independently verified.

**Key Characteristics:**
- Cairo typography and RTL reading order throughout.
- Distinct adult, kids, and administrative treatments.
- Softly layered public pages and flatter, finely bordered admin panels.
- Rounded, reassuring controls.

## Colors

### Primary

Emerald carries adult brand identity, headings, and principal actions. Theme-aware public components use the existing `--t-*` properties; the dark theme switches to the brighter emerald-dark accent.

### Secondary

Warm gold carries the preserved academy logo and selected adult accents. The kids portal adds the existing Tailwind orange, sky, and amber colors; these are contextual accents, not replacements for the adult palette.

### Neutral

Light public pages use pale green-white backgrounds and white cards; dark public pages use green-black backgrounds. Admin uses its separate charcoal background, surface, and raised-surface tokens, with cool off-white text and muted gray supporting copy.

**The Separate Worlds Rule.** Preserve the distinction between theme-aware public tokens and the always-dark `--admin-*` workspace tokens.

## Typography

**Display and Body Font:** Cairo, sans-serif, loaded in weights 300–900. There is no observed second display family.

Public section headlines commonly use heavy, large Arabic type; portal cards use bold titles. Admin uses a more compact hierarchy: page titles at the admin-title role, supporting descriptions at 0.875rem, and semibold field labels at the admin-label role. Responsive admin inputs use 1rem text. Preserve Arabic shaping; email values use local LTR direction rather than changing the page direction.

## Layout

RTL is established on the document and body. Public portal sections use a centered 72rem maximum container, 24px horizontal padding, and a one-column layout becoming two columns at the medium breakpoint.

Desktop administration uses a 240px sidebar on the right and flexible main content; pages have a 1100px maximum width and 32px base padding. Below 1024px, navigation becomes a dismissible drawer. The responsive stylesheet adapts forms, tables, modals, and actions; preserve those existing overrides. Admin actions and fields have 44px minimum touch heights, and icon controls have 44px minimum width as well.

## Elevation & Depth

Public portal cards use soft shadows, rounded surfaces, and hover lift. Public navigation includes translucent backgrounds. Administration communicates ordinary panel depth with tonal layering and fine borders; strong shadows belong to modal and login surfaces rather than every control.

The implemented modal shadow is `0 24px 64px rgba(0,0,0,0.6)`; the login card uses the same geometry with opacity 0.5. Existing reveal motion uses `cubic-bezier(0.22,1,0.36,1)`. This is an inventory of incumbent effects, not an instruction to add decoration to new admin surfaces.

## Shapes

Controls use gently rounded corners, admin cards use the admin-card radius, modals use the modal radius, and public portal cards use the larger portal-card radius. Chips are pill-shaped. The gold logo and restrained geometric motifs are existing identity assets; preserve the logo rather than replacing it with an icon.

## Components

### Buttons

Rounded and reassuring. Admin primary buttons use the existing green diagonal gradient; ghost buttons use a faint white fill and border; danger buttons use the dedicated danger color. Hover slightly lifts enabled buttons and reduces opacity. Disabled buttons reduce opacity and do not lift. Keyboard focus uses the existing accent outline, offset by 3px.

### Inputs / Fields

Admin inputs use raised dark surfaces, fine borders, and control-radius corners. Focus changes the border to the admin accent; responsive overrides retain a visible keyboard outline. Select chevrons sit on the left in RTL. Labels remain visible above fields.

### Navigation

Admin navigation is a vertical icon-and-label list with muted default text, brighter hover text, and an emerald-tinted active background. The mobile drawer supports Escape, focus containment, and focus restoration. Preserve these behaviors alongside styling.

### Chips / Filters

Admin filter tabs use rounded segmented containers and emerald-tinted selected states. They scroll horizontally when needed rather than truncating Arabic labels.

### Cards / Containers

Admin statistics use bordered dark panels and compact centered values. Public portal cards are larger, more expressive surfaces; the adult card is emerald with gold action treatment, while the kids card uses playful accents. Do not import public-card decoration into routine admin tables.

## Do's and Don'ts

### Do:
- **Do** preserve RTL flow, Cairo typography, and the gold logo asset.
- **Do** use the existing theme-aware tokens on public pages and admin tokens in the workspace.
- **Do** retain responsive drawer, modal, keyboard-focus, and touch-target behavior.
- **Do** keep adult and kids identities visibly distinct.

### Don't:
- **Don't** treat the dark admin palette as the public dark theme.
- **Don't** introduce a second font family as though it were already part of the system.
- **Don't** turn observed marketing decoration into a requirement for operational screens.
