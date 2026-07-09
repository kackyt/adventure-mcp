import { describe, expect, it } from "vitest";
import { isDebugRequested } from "./analytics.ts";

describe("isDebugRequested", () => {
  it("debug_mode=1 なら true", () => {
    expect(isDebugRequested("?debug_mode=1")).toBe(true);
  });

  it("debug_mode=true なら true", () => {
    expect(isDebugRequested("?debug_mode=true")).toBe(true);
  });

  it("他のクエリと併存していても検出する", () => {
    expect(isDebugRequested("?foo=bar&debug_mode=1")).toBe(true);
  });

  it("クエリが無ければ false", () => {
    expect(isDebugRequested("")).toBe(false);
  });

  it("debug_mode=0 や無関係な値は false", () => {
    expect(isDebugRequested("?debug_mode=0")).toBe(false);
    expect(isDebugRequested("?debug_mode=yes")).toBe(false);
    expect(isDebugRequested("?debug=1")).toBe(false);
  });
});
