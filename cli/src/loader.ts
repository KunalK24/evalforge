import * as fs from "fs";
import * as yaml from "js-yaml";
import { EvalSuiteSchema, EvalSuite } from "./schemas";
import { ZodError } from "zod";

export function loadSuite(filepath: string): EvalSuite {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Suite file not found: ${filepath}`);
  }

  const raw = fs.readFileSync(filepath, "utf-8");

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new Error(
      `Failed to parse YAML: ${err instanceof Error ? err.message : err}`
    );
  }

  try {
    return EvalSuiteSchema.parse(parsed);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues
        .map((e) => `  • ${e.path.join(".")} — ${e.message}`)
        .join("\n");
      throw new Error(`Suite validation failed:\n${messages}`);
    }
    throw err;
  }
}

export function loadRunResult(filepath: string): unknown {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Run result file not found: ${filepath}`);
  }

  const raw = fs.readFileSync(filepath, "utf-8");

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse JSON: ${filepath}`);
  }
}