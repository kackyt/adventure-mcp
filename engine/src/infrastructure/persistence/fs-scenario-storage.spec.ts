import { describe, expect, it } from "vitest";
import { EngineError } from "../../shared/errors/engine-error.ts";
import { FsScenarioStorage } from "./fs-scenario-storage.ts";

// 既定 assets ディレクトリ（engine/assets）の実ファイルに対する検証。
const storage = new FsScenarioStorage();

describe("FsScenarioStorage", () => {
  it("コンパイル済み id（snake_case・拡張子なし）を列挙する", () => {
    const ids = storage.listScenarioIds();
    expect(ids).toContain("public_status_demo");
    expect(ids.every((id) => /^[a-z0-9_]+$/.test(id))).toBe(true);
    expect(ids.some((id) => id.endsWith(".json"))).toBe(false);
  });

  it("既知 id の JSON を BOM 無しでロードできる", () => {
    const json = storage.loadScenarioJson("public_status_demo");
    expect(json.charCodeAt(0)).not.toBe(0xfeff);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it.each([
    "../engine-error",
    "..",
    "/etc/passwd",
    "Public_Status_Demo",
    "foo/bar",
  ])("assets 外・不正 id (%s) は EngineError で弾く", (id) => {
    expect(() => storage.loadScenarioJson(id)).toThrowError(EngineError);
  });
});
