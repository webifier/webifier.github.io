---
title: Using the Default Site
header:
  title: Using the Default Site
  description: Create a useful Webifier site before writing custom templates or Python.
---

# Using the Default Site

The fastest way to use Webifier is to let the default renderer do the work. You
create an `index.yml`, point it at content, and let Webifier build the page,
copy assets, and generate linked content pages.

For the first-principles version of this idea, start with
[YAML Pages and Sections](index=pages/user-guide/tutorials/01-yaml-pages-and-sections.yml).

## Minimal Shape

```yaml
title: My Project

config:
  webifier:
    extensions:
      site:
        uses: webifier.standard
      markdown:
        uses: webifier.markdown
      notebook:
        uses: webifier.notebook

header:
  title: My Project
  description: Notes, notebooks, and results from the project.

intro:
  label: Overview
  body: |
    # Welcome

    This site is generated from files already in the repository.

docs:
  label: Pages
  body: |
    - [Project Notes](md=pages/notes.md)
    - [Experiment Notebook](md=pages/experiment.ipynb)
```

The root YAML file becomes the home page. Each top-level key after `title`,
`header`, `nav`, `meta`, and `config` becomes a section rendered by the default
section renderer.

## What You Get By Default

- A homepage assembled from YAML sections
- Markdown rendering for text blocks
- Generated pages for linked Markdown and notebook files
- Asset copying for local images and files
- Search index generation
- Navigation, comments, analytics, and theme support when configured

## When To Stay With Defaults

Stay with the default renderer when the goal is to publish clearly, not design a
bespoke frontend. It is a good fit for personal notes, project documentation,
course pages, experiment logs, small reports, and notebook collections.

Next: [Render and Automate](02-render-and-automate.html).

For the complete syntax reference, see [YAML Syntax Specification](reference/01-yaml-syntax.html).
