import { describe, test, expect, beforeEach, afterEach } from "vitest";
import middleware from "../../../boilerplate/middleware.js";

const ORIGINAL_ENV = { ...process.env };

function basicAuthHeader(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

function request(headers: Record<string, string> = {}): Request {
  return new Request("https://example.vercel.app/some/asset.js", { headers });
}

beforeEach(() => {
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASS;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("middleware", () => {
  test("passes every request through when no credentials are configured", async () => {
    const response = middleware(request());
    expect(response.status).toBe(200);
  });

  test("rejects a request with no Authorization header once credentials are set", () => {
    process.env.BASIC_AUTH_USER = "docs";
    process.env.BASIC_AUTH_PASS = "s3cret";

    const response = middleware(request());
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Basic realm="Documentation"',
    );
  });

  test("rejects the wrong username or password", () => {
    process.env.BASIC_AUTH_USER = "docs";
    process.env.BASIC_AUTH_PASS = "s3cret";

    const wrongUser = middleware(
      request({ authorization: basicAuthHeader("nope", "s3cret") }),
    );
    expect(wrongUser.status).toBe(401);

    const wrongPass = middleware(
      request({ authorization: basicAuthHeader("docs", "nope") }),
    );
    expect(wrongPass.status).toBe(401);
  });

  test("rejects a non-Basic scheme and a malformed Basic payload", () => {
    process.env.BASIC_AUTH_USER = "docs";
    process.env.BASIC_AUTH_PASS = "s3cret";

    expect(
      middleware(request({ authorization: "Bearer sometoken" })).status,
    ).toBe(401);
    expect(
      middleware(request({ authorization: "Basic not-valid-base64!!" })).status,
    ).toBe(401);
    // Decodes fine but has no ":" separator.
    expect(
      middleware(
        request({
          authorization: `Basic ${Buffer.from("nocolonhere").toString("base64")}`,
        }),
      ).status,
    ).toBe(401);
  });

  test("accepts the right username and password", () => {
    process.env.BASIC_AUTH_USER = "docs";
    process.env.BASIC_AUTH_PASS = "s3cret";

    const response = middleware(
      request({ authorization: basicAuthHeader("docs", "s3cret") }),
    );
    expect(response.status).toBe(200);
  });

  // Every path gets the same treatment; there is no matcher carving out assets.
  test("protects an asset path exactly like any other", () => {
    process.env.BASIC_AUTH_USER = "docs";
    process.env.BASIC_AUTH_PASS = "s3cret";

    const response = middleware(
      new Request("https://example.vercel.app/assets/app.hash.js"),
    );
    expect(response.status).toBe(401);
  });
});
