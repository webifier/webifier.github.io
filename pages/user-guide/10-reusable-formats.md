---
title: Reusable Website Formats
header:
  title: Reusable Website Formats
  description: Design template and renderer packs for resumes, academic profiles, courses, labs, and project galleries.
---

# Reusable Website Formats

The goal is that people can build reusable Webifier formats: resume sites,
academic profiles, lab pages, course pages, project galleries, notebook reports,
or any other static content structure.

A format should be installable with `pip`, ship its own templates and assets,
and expose one or more extensions.

## Example Consumer Config

```yaml
webifier:
  extensions:
    site:
      uses: webifier.standard

    resume:
      uses: webifier.resume

    publications:
      uses: my.academic.collection
      source: papers/

    projects:
      uses: my.academic.collection
      source: projects/
```

The local names `publications` and `projects` are two instances of the same
extension with different configuration.

## What A Format Can Provide

- Renderers for page-level or section-level YAML blocks
- Content renderers for files such as Markdown, notebooks, or custom exports
- Templates and static assets
- Themes and theme switchers
- Resolvers and file loaders
- Head, nav, footer, and build hooks

## Design A Good Format

- Keep the source folder predictable.
- Keep YAML keys boring and obvious.
- Use templates for layout.
- Use Python only for processing that would be painful in YAML.
- Include an example repository.
- Document the expected data shape before documenting internals.

For the lower-level extension model, see [Extension and Customization Guide](reference/04-extension-guide.html).
