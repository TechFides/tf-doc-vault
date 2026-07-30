# Guides

Task-focused guides for using `@techfides/tf-doc-vault`. New here? Start with the [project README](../README.md).

| Guide                                                   | What it covers                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Technical documentation (`tech-docs`)](./tech-docs.md) | Docs living inside a service repo, scaffolded via `setup --template=tech-docs`; building and publishing them is the service repo's own pipeline. |
| [Analytical documentation (`*_ana`)](./ana-docs.md)     | Standalone analysis docs scaffolded via `setup --template=ana-docs`, deployed to Cloud Run, including `nginx-auth` and syncing the boilerplate.  |
| [Import from Confluence](./confluence-import.md)        | Migrate a Confluence space into Markdown (`import-confluence`).                                                                                  |
| [Editing &amp; publishing docs](./updating-docs.md)     | The day-to-day edit → preview → validate → publish loop.                                                                                         |
| [Testing](./TESTING.md)                                 | How the package itself is tested (unit + smoke), incl. Confluence importer verification.                                                         |

Developing `tf-doc-vault` itself? See [CONTRIBUTING.md](../CONTRIBUTING.md). Rebranding for a non-TechFides project? See [BRANDING.md](../BRANDING.md).
