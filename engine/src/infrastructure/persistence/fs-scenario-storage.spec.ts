import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Compiler } from "inkjs/compiler/Compiler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EngineError } from "../../shared/errors/engine-error.ts";
import { FsScenarioStorage } from "./fs-scenario-storage.ts";

// engine/assets の本番シナリオは docs/06-reference/scenarios/ へ参照化されたため、
// アダプタ自体（列挙・BOM 除去・パストラバーサル防御）は一時フィクスチャで検証する。
let dir: string;
let storage: FsScenarioStorage;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "scenario-fixtures-"));
  const json =
    new Compiler('VAR public_status = ""\n-> e\n=== e ===\nおわり\n-> DONE\n').Compile().ToJson() ??
    "";
  // BOM 付きで書き、stripBom を検証する
  writeFileSync(join(dir, "sample_demo.json"), `﻿${json}`, "utf-8");
  writeFileSync(join(dir, "not_a_scenario.txt"), "ignore me", "utf-8");
  writeFileSync(join(dir, "Bad-Id.json"), json, "utf-8"); // 文字種違反は列挙から除外
  storage = new FsScenarioStorage(dir);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("FsScenarioStorage", () => {
  it("コンパイル済み id（snake_case・拡張子なし）を列挙する", () => {
    const ids = storage.listScenarioIds();
    expect(ids).toContain("sample_demo");
    expect(ids).not.toContain("Bad-Id"); // 文字種違反は弾く
    expect(ids).not.toContain("not_a_scenario"); // .json 以外は対象外
    expect(ids.every((id) => /^[a-z0-9_]+$/.test(id))).toBe(true);
    expect(ids.some((id) => id.endsWith(".json"))).toBe(false);
  });

  it("既知 id の JSON を BOM 無しでロードできる", () => {
    const json = storage.loadScenarioJson("sample_demo");
    expect(json.charCodeAt(0)).not.toBe(0xfeff);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it.each([
    "../engine-error",
    "..",
    "/etc/passwd",
    "Sample_Demo",
    "foo/bar",
    "Bad-Id",
  ])("assets 外・不正 id (%s) は EngineError で弾く", (id) => {
    expect(() => storage.loadScenarioJson(id)).toThrowError(EngineError);
  });
});
