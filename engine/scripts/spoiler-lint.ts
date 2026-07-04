import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// =====================================================================
//  スポイラー・リンター（独立スクリプト）
//  長編ミステリ Ink の「ネタバレ漏洩」を字句レベルで機械検出する。
//  Ink ビルド（inklecate）は構文と divert しか見ないので、これは別物。pre-commit 可。
//
//  検出する4クラス（references/longform_mystery_craft.md §G）:
//   ①題材   … 禁止語が解禁章より前の本文に出る（// @forbid 台帳と章で照合）
//   ②メタ   … 「あとX個必要」「残りN件」等、進捗の地の声
//   ③有意性 … 「XXは合っているがYYは間違っている」等、判定の露出
//   ④誘導   … 「XXをつきつけたほうがよい」等、作者からの指示
//
//  入力アノテーション（.ink 内のコメント）:
//   // @forbid <語/正規表現> @from <章番号>   … 禁止語台帳（その語はN章以降のみ可）
//   // @chapter <章番号>                       … 以降の行をその章として扱う（直後の knot から）
//   // @reveals <flag>                          … 直後の knot 本文を①題材チェックから除外（正規の開示点）
//
//  走査対象＝//コメントを除いた本文のみ（台帳・封印コメント自体は対象外）。
//  ②③④は章に関係なく常に検出する（正規の開示点でも作者の地の声は不可）。
//
//  使い方:  node scripts/spoiler-lint.ts [path ...]
//    引数なし＝ docs/06-reference/scenarios/ 配下の *.ink を全走査。
//    漏洩が1件でもあれば exit 1。
// =====================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "../..");
const defaultDir = resolve(repoRoot, "docs/06-reference/scenarios");

interface ForbidRule {
  raw: string;
  re: RegExp;
  from: number;
}

interface Finding {
  file: string;
  line: number;
  cls: "①題材" | "②メタ" | "③有意性" | "④誘導";
  message: string;
  excerpt: string;
}

// ②③④＝作者の地の声。章に関係なく常に不可。控えめ（高信頼）なパターンに絞る。
const META_PATTERNS: { cls: Finding["cls"]; re: RegExp; message: string }[] = [
  {
    cls: "②メタ",
    re: /あと[0-9０-９一二三四五六七八九十]+\s*[つ個件こ][^。、]{0,10}(必要|要る|いる|足り|集め)/,
    message: "残り必要数の露出（例:「あと3つ必要だ」）",
  },
  {
    cls: "②メタ",
    re: /(残り|のこり)[0-9０-９一二三四五六七八九十]+\s*(の)?(情報|手がかり|証拠|物証|フラグ)/,
    message: "残り情報数の露出（例:「残り2件の手がかり」）",
  },
  {
    cls: "③有意性",
    re: /(合って|正しく|当たって|正解)[^。、]{0,14}(が|けれど|けど|ものの|一方|他方)[^。、]{0,14}(間違|誤り|誤って|外れ|違って|不正解)/,
    message: "判定の露出（例:「XXは合っているがYYは間違っている」）",
  },
  {
    cls: "④誘導",
    re: /つきつけ(た方がよ|たほうがよ|るべき|るとよ|ると良|た方が良)/,
    message: "つきつけ先の指示（例:「XXをつきつけたほうがよい」）",
  },
  {
    cls: "④誘導",
    re: /[（(][^）)]*(次は|べきだ|すべき|正解は|犯人は|が正しい|を選べ|を疑え|に注目せよ)[^）)]*[）)]/,
    message: "括弧内の作者からの指示・第四の壁の独白",
  },
];

function parseForbidRules(lines: string[]): ForbidRule[] {
  const rules: ForbidRule[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*\/\/\s*@forbid\s+(\S+)\s+@from\s+(\d+)/);
    if (!m) continue;
    const raw = m[1];
    const from = Number(m[2]);
    try {
      rules.push({ raw, re: new RegExp(raw), from });
    } catch {
      // 正規表現として不正なら、リテラル一致にフォールバック
      rules.push({ raw, re: new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), from });
    }
  }
  return rules;
}

/** //コメントを除いた本文を返す（行頭//や行中//以降を落とす）。文字列リテラル内の//は本作では未使用。 */
function stripComment(line: string): string {
  const idx = line.indexOf("//");
  return idx >= 0 ? line.slice(0, idx) : line;
}

function isKnotHeader(body: string): boolean {
  return /^\s*={2,}\s*\S/.test(body);
}

function lintFile(file: string): Finding[] {
  const text = readFileSync(file, "utf-8");
  const lines = text.split(/\r?\n/);
  const rules = parseForbidRules(lines);
  const findings: Finding[] = [];

  let chapter = 0; // @chapter 1 より前＝0（プロローグ/関数定義）
  let pendingChapter: number | null = null;
  let pendingReveal = false;
  let knotExempt = false; // 現在の knot が @reveals 除外下か

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // アノテーション（コメント）を先に解釈
    const chMark = rawLine.match(/^\s*\/\/\s*@chapter\s+(\d+)/);
    if (chMark) {
      pendingChapter = Number(chMark[1]);
      continue;
    }
    if (/^\s*\/\/\s*@reveals\b/.test(rawLine)) {
      pendingReveal = true;
      continue;
    }

    const body = stripComment(rawLine);

    if (isKnotHeader(body)) {
      // knot 境界：保留中の章/除外を適用
      if (pendingChapter !== null) {
        chapter = pendingChapter;
        pendingChapter = null;
      }
      knotExempt = pendingReveal;
      pendingReveal = false;
      continue;
    }

    if (body.trim() === "") continue;

    // ②③④：常に検出
    for (const p of META_PATTERNS) {
      if (p.re.test(body)) {
        findings.push({
          file,
          line: i + 1,
          cls: p.cls,
          message: p.message,
          excerpt: body.trim().slice(0, 60),
        });
      }
    }

    // ①題材：禁止語×章。@reveals 除外 knot ではスキップ
    if (!knotExempt) {
      for (const rule of rules) {
        if (chapter < rule.from && rule.re.test(body)) {
          findings.push({
            file,
            line: i + 1,
            cls: "①題材",
            message: `禁止語「${rule.raw}」が解禁章(${rule.from})より前(現在${chapter || "序"}章)に出現`,
            excerpt: body.trim().slice(0, 60),
          });
        }
      }
    }
  }
  return findings;
}

function findInkFiles(target: string): string[] {
  if (!existsSync(target)) return [];
  if (statSync(target).isFile()) return target.endsWith(".ink") ? [target] : [];
  const out: string[] = [];
  for (const name of readdirSync(target)) {
    const p = join(target, name);
    if (statSync(p).isDirectory()) out.push(...findInkFiles(p));
    else if (name.endsWith(".ink")) out.push(p);
  }
  return out;
}

function main(): void {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args.map((a) => resolve(a)) : [defaultDir];

  const files = targets.flatMap(findInkFiles);
  if (files.length === 0) {
    console.log("スポイラー走査対象の .ink が見つかりません。");
    return;
  }

  let total = 0;
  for (const file of files) {
    const findings = lintFile(file);
    const rel = relative(repoRoot, file).replace(/\\/g, "/");
    if (findings.length === 0) {
      console.log(`✓ ${rel}`);
      continue;
    }
    total += findings.length;
    console.error(`✗ ${rel} — 漏洩 ${findings.length} 件`);
    for (const f of findings) {
      console.error(`    ${rel}:${f.line}  [${f.cls}] ${f.message}`);
      console.error(`        ${f.excerpt}`);
    }
  }

  if (total > 0) {
    console.error(
      `\n漏洩 ${total} 件。字句レベルの網であり、言い換え漏洩は捕えない（独立レビュー併用）。`,
    );
    process.exit(1);
  }
  console.log("\n字句レベルの漏洩なし。");
}

main();
