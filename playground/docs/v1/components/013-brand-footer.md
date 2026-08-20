---
title: BrandFooter
status: published
updated_at: 2026-08-13
order: 14
---

Scroll to the bottom of this page. The website link and the email address there are
`BrandFooter`, mounted into the `layout-bottom` slot.

It renders only when `branding.footer` is configured, so a fresh scaffold does not carry an
empty node on every page. Two switches turn it off: leave `branding.footer` out of
`makeConfig()`, or force it off in the theme with `createTheme({ brandFooter: false })`.

## Configuration

```ts
makeConfig({
  configDir: import.meta.dirname,
  project: "playground",
  branding: {
    footer: {
      websiteUrl: "https://techfides.cz",
      email: "info@techfides.cz",
    },
  },
});
```

| Field          | Default                   | Effect                     |
| -------------- | ------------------------- | -------------------------- |
| `websiteUrl`   | —                         | Link, opened in a new tab. |
| `websiteLabel` | host name of `websiteUrl` | The link's text.           |
| `email`        | —                         | `mailto:` link.            |
| `address`      | —                         | Plain text, no link.       |

Every field is optional. Supply one and you get one item; supply three and the separators
appear between them. This site sets `websiteUrl` and `email` and no `address`, which is why
the footer below shows two items and a single separator.

## The separators

The dots between the items are `aria-hidden`, so a screen reader reads two pieces of
information rather than "bullet" between them. Below 639px they are hidden and the items
stack instead.
