---
title: Configuration Basics
header:
  title: Configuration Basics
  description: Keep site settings small, explicit, and easy to patch into the root page.
---

# Configuration Basics

Configuration usually lives under a small folder such as `configurations/` and
gets patched into `index.yml`.

```yaml
meta:
  patch: configurations/meta.yml

nav:
  patch: configurations/nav.yml

config:
  patch: configurations/config.yml
```

## Extensions

Most site behavior is enabled through named extension instances. The instance
name is local to your site; `uses` points to the installed extension.

```yaml
webifier:
  extensions:
    site:
      uses: webifier.standard

    markdown:
      uses: webifier.markdown

    search:
      uses: webifier.search
      content: true
      links: true

    theme:
      uses: webifier.theme
      default: system
      switcher: true

    analytics:
      uses: webifier.analytics.google
      measurement_id: G-XXXXXXXXXX
```

YAML order is load order. If a later extension intentionally replaces a
renderer, content handler, or other named registration from an earlier extension,
mark that instance explicitly:

```yaml
webifier:
  extensions:
    custom_site:
      uses: my_site.standard
      override: true
```

## Defaults

Renderer defaults let you change what Webifier uses when a node does not define
`kind`:

```yaml
defaults:
  page: page
  section: section
  markdown: markdown
  links: links
```

The `webifier.standard` extension provides these defaults. Override them only
when you want a different site shell or node model.

## Common First-Party Extensions

```yaml
webifier:
  extensions:
    site:
      uses: webifier.standard
    markdown:
      uses: webifier.markdown
    notebook:
      uses: webifier.notebook
    search:
      uses: webifier.search
    theme:
      uses: webifier.theme
    comments:
      uses: webifier.comments
      repo: owner/comments
    analytics:
      uses: webifier.analytics.google
      measurement_id: G-XXXXXXXXXX
```

For the full reference, see [YAML Syntax Specification](reference/01-yaml-syntax.html)
and [Extension and Customization Guide](reference/04-extension-guide.html).
