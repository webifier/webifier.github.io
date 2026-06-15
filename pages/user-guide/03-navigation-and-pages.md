---
title: Navigation and Pages
header:
  title: Navigation and Pages
  description: Wire the site together with navigation links and content-page links.
---

# Navigation and Pages

Webifier separates two ideas:

- The navigation bar is a site-level map.
- Content links decide which Markdown, notebook, HTML, or PDF files become pages.

## Navigation

A common pattern is to keep navigation in a separate file and patch it into
`index.yml`:

```yaml
# index.yml
nav:
  patch: configurations/nav.yml
```

```yaml
# configurations/nav.yml
brand:
  text: My Project
  link: /

content:
  - text: Docs
    link: /pages/user-guide/
  - text: GitHub
    link: https://github.com/me/project
```

The brand link usually takes people home, so you do not need a separate Home
item unless your site wants one.

## Generated Content Pages

Use `md=...` links when you want Webifier to render a source file as a page:

```markdown
- [Project Notes](md=pages/notes.md)
- [Notebook](md=pages/notebook.ipynb)
- [Reference](md=pages/reference.md)
```

Those links are rewritten to generated `.html` pages in the output. This keeps
the source easy to read while still producing a complete static website.

## Plain Links

Use normal links when the target already exists or should not be rendered by
Webifier:

```markdown
- [GitHub](https://github.com/me/project)
- [Raw PDF](/assets/report.pdf)
```

For the detailed page and link behavior, see [YAML Syntax Specification](reference/01-yaml-syntax.html)
and [Processing Pipeline](reference/05-processing-pipeline.html).
