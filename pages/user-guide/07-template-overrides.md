---
title: Template Overrides
header:
  title: Template Overrides
  description: Replace specific Jinja templates while keeping the rest of Webifier intact.
---

# Template Overrides

Template overrides are the first serious customization layer. They let you
change the HTML structure without writing Python.

Webifier looks for templates in your template directory before it uses the
built-in templates. If you create a file with the same relative path, your file
wins.

## Example

```text
templates/
  page.html
  section.html
  macros/
    nav.html
```

Then run:

```shell
webify --index index.yml --output webified --templates-dir templates
```

In this website, the repository root is used as the template directory, so
custom templates can also live directly beside the site source.

## What To Override

- `page.html` for the full page shell
- `content.html` for generated Markdown and notebook pages
- `section.html` for homepage sections
- `macros/nav.html` for navigation
- `macros/footer.html` for footer behavior
- `renderers/<name>.html` for a specific renderer

For the complete override model, see [Extension and Customization Guide](reference/04-extension-guide.html).
