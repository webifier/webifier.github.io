---
title: Tiny Markdown Example
config:
  markdown:
    toc: true
---

# Tiny Markdown Example

This file is rendered by linking to it with `md=...`.

Markdown files can carry a YAML page preface for page-level controls, then
normal Markdown content below it.

## Discovery

- Webifier discovers the link.
- Webifier creates a sibling HTML page.
- The generated page shares the site shell, theme, navigation, and footer.

## Page Controls

The page preface at the top of this file sets `config.markdown.toc: true`,
so the generated page gets a collapsible table of contents when enough headings
are present.

## Content

The rest of the file is normal Markdown. You can use headings, lists, links,
tables, math, code blocks, and inline HTML when you need it.
