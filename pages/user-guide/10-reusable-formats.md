---
title: Custom Extensions and Reusable Formats
header:
  title: Custom Extensions and Reusable Formats
  description: Install, configure, automate, and eventually publish your own Webifier extension package.
---

# Custom Extensions and Reusable Formats

Webifier sites become reusable when repeated rendering logic moves into
extensions. A resume renderer, course-site format, academic profile, lab page,
project gallery, changelog block, related-posts engine, or custom notebook
wrapper can live in a Python package and be reused across repositories.

The consumer workflow is always the same:

| Step | What changes |
|---|---|
| Install | Put the extension package in your Python environment. |
| Configure | Add a named instance under `config.webifier.extensions`. |
| Use | Write the YAML/page syntax that extension documents. |
| Automate | Install the same package in GitHub Actions before `webify` runs. |

## Use An Extension

Install the extension locally:

```shell
pip install my-webifier-extension
```

Enable it in your root config:

```yaml
config:
  webifier:
    extensions:
      site:
        uses: webifier.standard
      markdown:
        uses: webifier.markdown

      related_posts:
        uses: my.related_posts
        source: posts/
        limit: 4
```

The local key `related_posts` is the instance name. It also becomes the page
config namespace for page-level overrides:

```markdown
---
title: A Project Note
config:
  related_posts:
    limit: 2
---
```

If the same extension is useful twice, instantiate it twice:

```yaml
config:
  webifier:
    extensions:
      related_research:
        uses: my.related_posts
        source: research/
        title: Related research

      related_projects:
        uses: my.related_posts
        source: projects/
        title: Related projects
```

Each instance has its own name, settings, and page config namespace.

## Update GitHub Actions

Your deployed site needs the same extensions available in the action
environment. With the Webifier action, use `extra-packages`:

```yaml
- name: Webify
  uses: webifier/build@v1.0.5
  with:
    baseurl: ""
    index: index.yml
    publish_dir: webified
    templates_dir: .
    extra-packages: my-webifier-extension
```

For a GitHub-hosted extension package:

```yaml
extra-packages: "my-webifier-extension @ git+https://github.com/me/my-webifier-extension.git"
```

For multiple packages, use one requirement per line:

```yaml
extra-packages: |
  my-extension
  another-extension
```

If you call the CLI directly instead of the action, install your extension
before running `webify`:

```yaml
- name: Install Webifier and extensions
  run: pip install webifier my-webifier-extension

- name: Build site
  run: webify --repo-full-name "${{ github.repository }}" --baseurl "" --index index.yml --output webified
```

## Author A Small Extension

An extension is a Python package that exposes an entry point in the
`webifier.extensions` group. A minimal package can register only one renderer,
hook, page key, resolver, or template directory.

`pyproject.toml`:

```toml
[project]
name = "my-webifier-extension"
version = "0.1.0"
dependencies = ["webifier"]

[project.entry-points."webifier.extensions"]
"my.related_posts" = "my_webifier_extension.extension:RelatedPostsExtension"
```

`my_webifier_extension/extension.py`:

```python
from webifier.core.extensions import Extension


class RelatedPostsExtension(Extension):
    id = "my.related_posts"
    default_config = {
        "limit": 3,
    }

    def register(self, ctx):
        super().register(ctx)
        ctx.add_hook("head", self.render_head)

    def render_head(self, builder, *, config=None, instance_name="", **_):
        settings = (config or {}).get(instance_name, {})
        if not settings.get("enabled", True):
            return ""
        return '<meta name="related-posts" content="enabled">'
```

This is intentionally small. Real extensions usually add one or more of these:

| Extension feature | Use it when |
|---|---|
| `renderers` | You want a new `kind` for a page or section. |
| `content_renderers` | You want linked files to generate pages. |
| `template_dirs` | You ship Jinja templates with the package. |
| `assets` | You ship CSS, JavaScript, images, or fonts. |
| `hooks` | You need head injection, build-time output, or page-aware behavior. |
| `page_keys` / `ctx.consume_page_key` | You want custom top-level page keys that do not render as sections. |
| `resolvers` | You want custom `${resolver:...}` values. |

## Design The Format

A good reusable format should make the source repo easier to read:

| Principle | Practical version |
|---|---|
| Keep source obvious | Use boring YAML keys and predictable folder names. |
| Document the consumer syntax first | Show the page YAML before implementation internals. |
| Keep config names meaningful | Instance names such as `publications`, `projects`, or `related_posts` become page config namespaces. |
| Use templates for layout | Reach for Python when data processing is actually needed. |
| Ship assets with the package | Do not make users copy CSS/JS by hand. |
| Include examples | A tiny working site is better than a long abstract explanation. |

For the full lower-level API, see the
[Extension and Customization Guide](reference/04-extension-guide.html).
