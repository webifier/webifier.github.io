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

The simplest way to think about configuration is:

- `config.webifier.extensions` tells Webifier which extension objects to load.
- Each named extension instance exports settings under its instance name.
- Page-local `config` overrides those settings for one rendered page.
- Keys outside `config` are page data. Some are consumed by enabled extensions;
  the rest render as visible content.

## Extensions

Most site behavior is enabled through named extension instances. The instance
name is local to your site; `uses` points to the installed extension. Any other
keys on that instance are that extension's site-level defaults.

```yaml
webifier:
  extensions:
    site:
      uses: webifier.standard

    markdown:
      uses: webifier.markdown
      toc: true

    search:
      uses: webifier.search
      content: true
      links: true

    theme:
      uses: webifier.theme
      default: system
      switcher: true

    notebook:
      uses: webifier.notebook
      colab: true
      toc: true

    analytics:
      uses: webifier.analytics.google
      measurement_id: G-XXXXXXXXXX
```

Webifier exports each extension instance's settings under the instance name in
the resolved config. For example, the `notebook` instance above becomes page
config like:

```yaml
notebook:
  colab: true
  toc: true
```

The extension can read the full page config, and its normal local namespace is
`config.<instance-name>`. If you name the instance `lab_notebooks`, then the
page-level override namespace is `config.lab_notebooks`. That makes instance
names meaningful and allows multiple instances of the same extension package.

This keeps the core simple: `config.webifier` tells Webifier what extension
objects to load, and the other top-level keys under `config` are the page
configuration those extensions consume.

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

## Site Config and Page Config

Webifier has two layers of configuration:

- **Site config** lives under the root page's reserved `config` key. It defines
  extension instances, site defaults, theme behavior, comments defaults, PDF
  defaults, notebook defaults, and anything else that should apply broadly.
- **Page config** also lives under a reserved `config` key, but inside one page,
  Markdown page preface, notebook first-cell page preface, or a PDF sibling
  `page.yml`. It overrides the site config for that one generated page.

The shape is intentionally the same in every page source:

```yaml
title: My Page
config:
  notebook:
    toc: true
    colab: false
  pdf:
    toc: false
    download: false
```

`config` is never rendered as content. It is consumed by Webifier and extensions.
Everything else that is not a reserved page key can still render as ordinary
content.

Extensions can also claim their own page keys. A key claimed by an extension is
removed before content sections render:

```yaml
title: Field Notes
config:
  webifier:
    extensions:
      weather:
        uses: example.weather

weather: cloudy

notes:
  label: Notes
  content: The notes section renders. The weather key is consumed by the extension.
```

Use `config` for settings that control extension behavior. Use extension-owned
page keys when the page data itself should be consumed as input to a feature.
Use ordinary free-form keys when you want visible sections.

For example, a Markdown page can put rendering controls and extra sections in
the same page preface:

```markdown
---
title: Experiment Notes
config:
  markdown:
    toc: true

authors:
  kind: people
  content:
    - name: Ada Lovelace
      role: Author
comments:
  kind: comments
  label: false
---

# Experiment Notes

The Markdown body renders first. The `authors` and `comments` sections render
after it.
```

The merge order is:

1. Extension defaults.
2. Site-level `config`.
3. Page-level `config`.

Later layers win. That means you can set `notebook.colab: true` globally and
turn it off for one notebook, set `notebook.toc: true` globally and disable it
for one notebook, or set `pdf.download: true` globally and hide the download
link for one PDF.

## Page-Local Extension Instances

A page can also use `config.webifier.extensions` to change extension instance
settings for that page before rendering starts. This is useful when a page needs
different defaults or wants to enable an extension that is not part of the root
site defaults.

```markdown
---
title: Local Notebook Page
config:
  webifier:
    extensions:
      notebook:
        colab: false
        toc: false
---
```

That page-local instance config is exported to `config.notebook` for that page.
If the site already configured the same extension and you want to discard those
site-level settings for one page, add `reset: true`:

```yaml
config:
  webifier:
    extensions:
      notebook:
        reset: true
        colab: false
        toc: false
```

Use page-local extension instances when you are changing how an extension is
configured. Use ordinary page sections when you are adding visible content:

```yaml
comments:
  kind: comments
  label: false
```

Other standard page behavior can be overridden the same way. For example,
bottom previous/home/next links are controlled by `page_navigation`:

```yaml
config:
  page_navigation:
    previous: false
    next:
      title: Extensions
      href: /pages/user-guide/extensions/
```

Set `page_navigation: false` to hide the bottom navigation on one page. See
[Navigation and Pages](03-navigation-and-pages.html) for the full syntax.

Page config applies to the generated page that declares it. Linked child pages
do not inherit that page's local settings; they either use the root site config
or define their own page preface / `page.yml`. This keeps each rendered page
predictable while still allowing the root config to provide broad defaults.

If a page reconfigures an extension instance that already exists in the root
config, `uses` can be omitted. If a page introduces a new extension instance,
`uses` is still required so Webifier knows what package to load.

Markdown page prefaces are read before Markdown links are processed. That means
a Markdown page can enable or reconfigure an extension before typed links in the
Markdown body are resolved.

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
