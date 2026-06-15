---
title: Architecture Overview
header:
  title: Architecture Overview
  description: The core ideas and extension model behind Webifier.
---

# Webifier Architecture Overview

## Vision

Webifier is a static site generator that turns repository files into complete
HTML websites. Users define their site structure in `.yml` files, write content
in Markdown, notebooks, HTML, or other static files, and Webifier handles the
rendering, asset management, search indexing, and output.

The architecture is built on three small core mechanisms:

| Axis | Mechanism | Purpose |
|------|-----------|---------|
| **Value** | `${resolver:arg \| transform}` | Compute, load, and transform values |
| **Node** | `kind: name` | Control how a YAML block is processed and rendered |
| **Template** | `template: path` | Use a specific template file for one node |
Everything else — labels, navigation, headers, styles, search, analytics, and
themes — comes from enabled extensions.

---

## Design Principles

1. **The filesystem is the API.**
   Users customize by placing files in conventional locations (templates, assets).
   No Python required for 90% of use cases.

2. **Zero hardcoded content keys.**
   The framework knows `kind`, `template`, `patch` (with `@location` and `!modifier`), `defaults`, and `${}`. That's it.
   Keys like `label`, `title`, `nav`, `header` are renderer-specific — defined
   and documented by each renderer, not by the framework.

3. **Composition over configuration.**
   Sites are composed from small files (`${load:}`, `${glob:}`), not configured
   in one giant YAML. Resolvers and pipes make composition powerful.

4. **Progressive complexity.**
   Simple sites enable the first-party extensions and write content. Advanced
   users add resolvers, renderers, themes, and full Python extension packages.

---

## System Components

```
webifier/
  core/                        # Framework — minimal, stable
    base.py                    # RendererModule ABC, NodeContext
    registry.py                # Kind registry + resolution
    resolvers.py               # ${} resolver engine + pipe chain
    loader.py                  # YAML loading, patch, defaults, ${} expansion
    builder.py                 # Thin dispatch: load → resolve → render
    html.py                    # BeautifulSoup HTML post-processing
    markdown.py                # Markdown → HTML conversion
    io.py                      # File I/O utilities

  interface/                   # User-facing entry points
    cli.py                     # CLI (webify command)

extensions/
  webifier_extensions/
    standard/                  # Default page/section/content shell
    markdown/                  # Markdown rendering and content pages
    notebook/                  # Jupyter notebook conversion
    search/                    # Search index generation
    theme/                     # Light/dark/system theme plumbing
    analytics/google/          # Google tag head injection
    comments/                  # Comment renderer
    people/                    # People card renderer
    chapters/                  # Accordion/chapter renderer
    resume/                    # Resume experience renderer
```

---

## Extension Points Summary

| I want to… | What I do | Python? |
|---|---|---|
| Change how people cards look | Drop `templates/renderers/people.html` in my repo | No |
| Create a "gallery" section type | Create `templates/renderers/gallery.html`, use `kind: gallery` | No |
| Give one page its own layout | Write a template, use `template: templates/landing.html` | No |
| Override the page layout | Drop `templates/page.html` in my repo | No |
| Add search, theme, notebooks, comments | Enable the matching extension under `webifier.extensions` | No |
| Add a custom value resolver | Write an extension that registers a resolver | Yes |
| Custom data processing + rendering | Write a `RendererModule` subclass and expose it from an extension | Yes |
| Share a reusable renderer | Publish a pip package with a `webifier.extensions` entry point | Yes |

---

## Related Documents

- [01-yaml-syntax.md](01-yaml-syntax.html) — Complete YAML syntax specification
- [02-resolvers.md](02-resolvers.html) — Resolver system (`${}` and pipes)
- [03-renderers.md](03-renderers.html) — Renderer / kind system
- [04-extension-guide.md](04-extension-guide.html) — User extension and customization guide
- [05-processing-pipeline.md](05-processing-pipeline.html) — Full processing pipeline
