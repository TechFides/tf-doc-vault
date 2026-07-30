[← All guides](./README.md)

# Import from Confluence

Existing Confluence spaces can be migrated into any of the other use cases ([tech-docs](./tech-docs.md), [ana-docs](./ana-docs.md)) without manual copy-pasting.

## How it works

1. The command authenticates to the Confluence REST API using an Atlassian API token.
2. It fetches the entire page tree rooted at `--root-page-id`, recursively following child pages (paginated, with retry/backoff and a bounded concurrency pool).
3. Each page is converted from Confluence's ADF (Atlassian Document Format) to Markdown and written as a `.md` file with correct frontmatter (`title`, `status`,
   `updated_at`). Attachments are downloaded alongside into `public/images/`.
4. Inter-page links are rewritten to point to the generated `.md` files (links to pages outside the import stay as Confluence URLs).

```bash
export CONFLUENCE_USER_EMAIL=you@email.com
export CONFLUENCE_API_TOKEN=<token>   # Atlassian API token from Settings → Security → API tokens

pnpm exec tf-doc-vault import-confluence \
  --site=myorg.atlassian.net \
  --root-page-id=<id> \
  --output=./ana_docs_folder/docs/v1
```

## Options

| Option                | Default      | Description                                                                                     |
| --------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| `--site=<host>`       | _(required)_ | Confluence hostname, e.g. `myorg.atlassian.net`.                                                |
| `--root-page-id=<id>` | _(required)_ | ID of the root Confluence page to import. Found in the page URL: `.../pages/**123456789**/...`. |
| `--output=<dir>`      | _(required)_ | Output directory for generated Markdown files.                                                  |
| `--space=<KEY>`       | _(none)_     | Confluence space key, informational only and not used during import.                            |
| `--verbose`           | _(false)_    | List every page affected by a warning, instead of the grouped summary.                          |

## Next steps

After the import, clean up and validate before committing:

```bash
npm run docs:normalize   # canonical frontmatter field order
npm run docs:validate    # check frontmatter, links, images, markdown lint
```

Detailed page-authoring guide: [`boilerplate/import-confluence.md`](../boilerplate/import-confluence.md).

## Known limitations

The importer reports everything it skips in a grouped summary at the end of the run (use `--verbose` for the per-page list). Things to be aware of:

- **Dynamic Confluence macros** (`extension` nodes: table of contents, includes, drawio/gliffy diagrams, excerpts) can't become static Markdown and are dropped with a per-page warning.
- **Merged table cells** (colspan/rowspan) are flattened, because GFM tables can't represent them.
- **Anchors to sub-headings** within a linked page are dropped (the link still resolves to the page); Confluence "tiny links" (`/wiki/x/…`) are left as Confluence URLs.
- **External (URL) images** are turned into links rather than embedded.
- An **API token** is required for image downloads via the REST attachment endpoint; conversion of a single page can also be sanity-checked offline.

## Verifying a run

See [Testing → Confluence importer verification](./TESTING.md#confluence-importer-verification). In short: `pnpm test` covers the conversion against a committed fixture (no Confluence access needed); a live import against a real page is optional and needs credentials.

---

**See also:** [Editing &amp; publishing docs](./updating-docs.md)
