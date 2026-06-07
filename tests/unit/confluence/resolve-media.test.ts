import { describe, test, expect } from "vitest";
import {
  parseMediaRefs,
  buildAttachmentIndex,
  resolveMediaInMarkdown,
} from "../../../src/confluence/resolve-media.js";
import { type Attachment } from "../../../src/confluence/types.js";

function att(
  title: string,
  fileId?: string,
  mediaType = "image/png",
): Attachment {
  return {
    id: `att-${title}`,
    title,
    metadata: { mediaType },
    extensions: fileId ? { fileId } : undefined,
    _links: { download: `/download/attachments/1/${title}` },
  };
}

describe("parseMediaRefs", () => {
  test("collects every adf:media reference", () => {
    const md = "![a.png](adf:media:id-1)\n\ntext\n\n![b.png](adf:media:id-2)";
    expect(parseMediaRefs(md)).toEqual([
      { alt: "a.png", id: "id-1" },
      { alt: "b.png", id: "id-2" },
    ]);
  });

  test("no references → empty", () => {
    expect(parseMediaRefs("plain text")).toEqual([]);
  });
});

describe("buildAttachmentIndex", () => {
  test("indexes by fileId and by title", () => {
    const idx = buildAttachmentIndex([att("pic.png", "file-1")]);
    expect(idx.byFileId.get("file-1")).toBe("pic.png");
    expect(idx.byTitle.get("pic.png")).toBe("pic.png");
  });
});

describe("resolveMediaInMarkdown", () => {
  test("resolves by fileId (authoritative)", () => {
    const idx = buildAttachmentIndex([att("pic.png", "file-1")]);
    const { markdown, unresolved } = resolveMediaInMarkdown(
      "![pic.png](adf:media:file-1)",
      idx,
    );
    expect(markdown).toBe("![pic.png](/images/pic.png)");
    expect(unresolved).toEqual([]);
  });

  test("falls back to alt/title when the id does not match", () => {
    // media id (e.g. a media-platform UUID) differs from extensions.fileId,
    // but the ADF alt equals the attachment filename.
    const idx = buildAttachmentIndex([att("diagram.png", "some-other-id")]);
    const { markdown, unresolved } = resolveMediaInMarkdown(
      "![diagram.png](adf:media:unmatched-uuid)",
      idx,
    );
    expect(markdown).toBe("![diagram.png](/images/diagram.png)");
    expect(unresolved).toEqual([]);
  });

  test("drops unresolved references and reports them", () => {
    const idx = buildAttachmentIndex([att("known.png", "file-1")]);
    const { markdown, unresolved } = resolveMediaInMarkdown(
      "before ![ghost.png](adf:media:missing) after",
      idx,
    );
    expect(markdown).toBe("before  after");
    expect(unresolved).toEqual([{ alt: "ghost.png", id: "missing" }]);
  });

  test("leaves markdown without media references untouched", () => {
    const idx = buildAttachmentIndex([]);
    const md = "# Title\n\nNo images here.";
    expect(resolveMediaInMarkdown(md, idx).markdown).toBe(md);
  });
});
