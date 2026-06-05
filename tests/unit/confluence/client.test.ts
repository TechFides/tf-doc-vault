import { describe, test, expect } from "vitest";
import {
  absoluteNext,
  isRetryable,
  HttpError,
} from "../../../src/confluence/client.js";

describe("absoluteNext", () => {
  test("undefined → undefined (end of pagination)", () => {
    expect(absoluteNext("site.example", undefined)).toBeUndefined();
  });
  test("an absolute URL passes through unchanged", () => {
    expect(absoluteNext("site.example", "https://other/x")).toBe(
      "https://other/x",
    );
  });
  test("a /wiki-relative next link is prefixed with the host (v2 cursor)", () => {
    expect(
      absoluteNext("site.example", "/wiki/api/v2/pages/1/children?cursor=z"),
    ).toBe("https://site.example/wiki/api/v2/pages/1/children?cursor=z");
  });
  test("a /rest-relative next link is prefixed with /wiki (v1 attachments)", () => {
    expect(
      absoluteNext(
        "site.example",
        "/rest/api/content/1/child/attachment?start=50",
      ),
    ).toBe(
      "https://site.example/wiki/rest/api/content/1/child/attachment?start=50",
    );
  });
});

describe("isRetryable", () => {
  test("429 and 5xx are retryable", () => {
    expect(isRetryable(new HttpError(429, "x"))).toBe(true);
    expect(isRetryable(new HttpError(500, "x"))).toBe(true);
    expect(isRetryable(new HttpError(503, "x"))).toBe(true);
  });
  test("4xx other than 429 is not retryable", () => {
    expect(isRetryable(new HttpError(404, "x"))).toBe(false);
    expect(isRetryable(new HttpError(401, "x"))).toBe(false);
  });
  test("invalid-JSON responses are not retryable", () => {
    expect(isRetryable(new Error("Invalid JSON from https://x"))).toBe(false);
  });
  test("transient network errors are retryable", () => {
    expect(isRetryable(new Error("read ECONNRESET"))).toBe(true);
  });
});
