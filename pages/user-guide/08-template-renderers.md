---
title: Template-Only Renderers
header:
  title: Template-Only Renderers
  description: Create new section types with only a Jinja template and a kind name.
---

# Template-Only Renderers

A renderer does not always need Python. If all you need is a new way to display
structured data, create a Jinja template under `renderers/` and use its filename
as the `kind`.

## Gallery Example

```text
templates/
  renderers/
    gallery.html
```

```yaml
projects:
  label: Projects
  kind: gallery
  items:
    - title: Search Demo
      image: assets/search.png
      href: https://example.com/search
    - title: Notebook Report
      image: assets/report.png
      href: md=pages/report.md
```

Webifier resolves `kind: gallery` by looking for
`renderers/gallery.html` in the template search path.

## Why This Matters

This is the small version of a reusable website format. A resume site, academic
profile, course page, or project gallery can start as a set of template-only
renderers with documented data shapes.

When the data needs transformation, API calls, validation, or file discovery,
move to Python renderers or resolvers.

For deeper detail, see [Renderer / Kind System](reference/03-renderers.html).
