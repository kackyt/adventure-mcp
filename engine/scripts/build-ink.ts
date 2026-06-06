import { spawnSync } from "node:child_process";
import { readdirSync, statSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const assetsDir = resolve(__dirname, "../assets");

const compilerBin = process.platform === "win32"
  ? resolve(__dirname, "../node_modules/.bin/inkjs-compiler.cmd")
  : resolve(__dirname, "../node_modules/.bin/inkjs-compiler");

function findInkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  let results: string[] = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findInkFiles(filePath));
    } else if (file.endsWith(".ink")) {
      results.push(filePath);
    }
  }
  return results;
}

function main() {
  const inkFiles = findInkFiles(assetsDir);

  if (inkFiles.length === 0) {
    console.log("No .ink files found in assets directory.");
    process.exit(0);
  }

  let hasError = false;

  for (const file of inkFiles) {
    const targetJson = file.replace(/\.ink$/, ".json");
    console.log(`Compiling: ${file} -> ${targetJson}`);
    const result = spawnSync(compilerBin, [file], { encoding: "utf-8", shell: true });

    if (result.error) {
      console.error(`Failed to execute compiler for ${file}:`, result.error);
      hasError = true;
    } else if (result.status !== 0) {
      console.error(`Error compiling ${file}:`);
      console.error(result.stdout || result.stderr);
      hasError = true;
    } else {
      const generatedJson = file + ".json";
      if (existsSync(generatedJson)) {
        // If the target file already exists, remove it first to avoid conflicts
        if (generatedJson !== targetJson && existsSync(targetJson)) {
            unlinkSync(targetJson);
        }
        if (generatedJson !== targetJson) {
            renameSync(generatedJson, targetJson);
        }
      }
      console.log(`Successfully compiled: ${targetJson}`);
      if (result.stdout && result.stdout.trim().length > 0) {
        console.log(result.stdout);
      }
    }
  }

  if (hasError) {
    process.exit(1);
  }
}

main();
