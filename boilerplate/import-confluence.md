# Migrating documentation from Confluence

The `import-confluence` subcommand downloads a Confluence page tree and converts it into VitePress-compatible Markdown files.

## Usage

```bash
export CONFLUENCE_USER_EMAIL=you@email.com
export CONFLUENCE_API_TOKEN=<token>          # Atlassian API token (Settings → Security → API tokens)

tf-doc-vault import-confluence \
  --site=myorg.atlassian.net \
  --root-page-id=<id> \
  --output=./docs/v1
```

`--output` is required and names the target directory. The paths below are relative to this documentation folder; when it sits in a subfolder of a larger repository, prefix them with that folder.

You'll find the root page ID in the Confluence page URL: `.../pages/**1184333837**/...`

## What the importer does

- Downloads the root page and all descendants recursively
- Converts ADF (Atlassian Document Format) → Markdown
- Preserves the hierarchy: pages with children → subfolder + `index.md`; leaves → `.md`
- Slugifies file names (lowercase, no diacritics, no `[SERVICE_ID]` prefixes)
- Downloads image attachments into `docs/public/images/`
- Rewrites internal Confluence links to relative MD paths
- Generates frontmatter: `title`, `status: review`, `updated_at`, `order` (position among Confluence siblings)
- **Idempotent:** an existing file with `status: published` keeps its status

## Output structure

```
docs/v1/
  index.md                              ← root page
  authentication-authorization/
    index.md                            ← section with direct children
    login.md
    logout.md
  architecture/
    index.md                            ← section with subgroups
    modules/
      index.md                          ← group (has children of its own)
      auth-module.md
      api-module.md
    deployment.md
```

The `section/group/page` layout is what the sidebar generator reads, so an
imported tree needs no manual sidebar configuration.

## After the import

```bash
pnpm docs:dev        # visual check at http://localhost:5173
pnpm docs:validate   # frontmatter, broken links, lint
```

Go through the generated files and:

1. Set `status: published` on pages that are complete
2. Manually fill in or fix content where the conversion lost formatting (tables, panels, inline images)
3. Optionally rename files/folders to match the project convention
