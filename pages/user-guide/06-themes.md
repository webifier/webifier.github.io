---
title: Themes and Styles
header:
  title: Themes and Styles
  description: Adjust the default look with CSS first, then reach for templates when structure needs to change.
---

# Themes and Styles

The default theme is intentionally practical. It tries to make project content
readable without asking you to design a full site. When you want more control,
start with CSS and theme settings.

## Built-In Theme Switcher

```yaml
theme:
  switcher: true
  default: system
```

The built-in switcher cycles between system, light, and dark mode. Webifier sets
theme attributes on the root document so CSS can respond to them:

```css
:root[data-bs-theme="dark"] {
  --my-surface: #111418;
}
```

## Custom Theme CSS

You can add custom theme styles from your repository:

```yaml
theme:
  switcher: true
  default: system
  themes:
    - name: academic
      label: Academic
      css: assets/css/themes/academic.css
```

This gives future template or theme packs a clean place to attach their own
styling.

## When CSS Is Not Enough

Use CSS when the structure is right and the visual language needs adjustment.
Use template overrides when the HTML structure itself needs to change.

Next: [Template Overrides](07-template-overrides.html).
