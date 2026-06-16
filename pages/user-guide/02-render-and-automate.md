---
title: Render and Automate
header:
  title: Render and Automate
  description: Run Webifier locally, then let GitHub Actions rebuild the site whenever content changes.
---

# Render and Automate

Webifier is most useful when rendering is boring. You should be able to add a
Markdown file, update a notebook, commit, push, and let the website rebuild
without turning publishing into a separate task.

## Run Locally

Install Webifier in the Python environment you use for the project:

```shell
pip install webifier
```

Installing `webifier` also installs the first-party extension package. If your
site uses third-party or project-specific extensions, install those into the
same environment:

```shell
pip install webifier my-webifier-extension
```

From the repository root, run:

```shell
webify --index index.yml --output webified --baseurl ''
```

Useful options:

- `--index` points at the root YAML file.
- `--output` chooses the generated site directory.
- `--baseurl` should usually be `''` for a `username.github.io` or organization site.
- `--templates-dir` points at local template overrides.
- `--repo-full-name` enables repository-aware links such as notebook Colab URLs.

To preview the generated files quickly:

```shell
python -m http.server 4173 --directory webified
```

Then open `http://localhost:4173/`.

## Extension Dependencies

Webifier is extension-dependent by design. Your root page config declares which
extension instances are active:

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
```

That config is enough only if the Python package providing `my.related_posts`
is installed. Local builds, GitHub Actions, and any other build environment
need the same packages available before `webify` runs.

## Automate With GitHub Actions

Add a workflow such as `.github/workflows/webifier.yml`:

```yaml
name: Webify and Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Webify
        uses: webifier/build@v1.0.5
        with:
          baseurl: ''
          index: index.yml
          publish_dir: webified
          templates_dir: .
          # Optional: install custom extension packages before rendering.
          # extra-packages: my-webifier-extension

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./webified
```

If your site is published under a project path such as
`https://username.github.io/project-name/`, set `--baseurl '/project-name'`
instead of `''`.

For a custom extension package from GitHub:

```yaml
extra-packages: "my-webifier-extension @ git+https://github.com/me/my-webifier-extension.git"
```

For more than one package, use a YAML block with one requirement per line:

```yaml
extra-packages: |
  my-webifier-extension
  another-extension
```

If you call `webify` directly instead of using the action, add the extension to
the install step:

```yaml
- name: Install Webifier and extensions
  run: pip install webifier my-webifier-extension
```

## What Automation Gives You

Git tracks the source content. GitHub Actions notices a push. Webifier renders
the website. GitHub Pages serves the generated static files.

That means publishing becomes part of the same workflow you already use for the
project:

1. Add or edit content.
2. Commit the change.
3. Push to GitHub.
4. Let the action rebuild the website.

## Summary

| Where | What to remember |
|---|---|
| `pip install webifier` | Installs core Webifier and first-party extensions. |
| custom extensions | Install them wherever `webify` runs. |
| `config.webifier.extensions` | Declares the extension instances the site uses. |
| Webifier action | Use `extra-packages` for third-party or project-specific extensions. |
| direct CLI workflow | Install custom packages before calling `webify`. |

Next: [Navigation and Pages](03-navigation-and-pages.html).
