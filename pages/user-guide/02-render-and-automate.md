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
        uses: webifier/build@v1.0.1
        with:
          baseurl: ''
          index: index.yml
          publish_dir: webified
          templates_dir: .

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./webified
```

If your site is published under a project path such as
`https://username.github.io/project-name/`, set `--baseurl '/project-name'`
instead of `''`.

## What Automation Gives You

Git tracks the source content. GitHub Actions notices a push. Webifier renders
the website. GitHub Pages serves the generated static files.

That means publishing becomes part of the same workflow you already use for the
project:

1. Add or edit content.
2. Commit the change.
3. Push to GitHub.
4. Let the action rebuild the website.

Next: [Navigation and Pages](03-navigation-and-pages.html).
