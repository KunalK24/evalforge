#!/usr/bin/env node
import { Command } from "commander";
import * as path from "path";
import { loadSuite, loadRunResult } from "./loader";
import { runSuite } from "./commands/run";
import { diffRuns } from "./commands/diff";
import { generateReport } from "./commands/report";
import { RunResult } from "./schemas";

const program = new Command();

program
  .name("evalforge")
  .description("CLI for executing and benchmarking LLM eval suites")
  .version("0.1.0");

// ─── evalforge run <suite.yaml> ───────────────────────────────────────────────

program
  .command("run <suite>")
  .description("Run an eval suite against the configured providers via the Python runner")
  .action(async (suiteFile: string) => {
    try {
      const suite = loadSuite(suiteFile);
      await runSuite(suite);
    } catch (err) {
      console.error(`\n✗ Error: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

// ─── evalforge diff <run1.json> <run2.json> ───────────────────────────────────

program
  .command("diff <run1> <run2>")
  .description("Compare two run result JSON files and show a regression table")
  .action((run1File: string, run2File: string) => {
    try {
      const baseline = loadRunResult(run1File) as RunResult;
      const current = loadRunResult(run2File) as RunResult;
      diffRuns(baseline, current);
    } catch (err) {
      console.error(`\n✗ Error: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

// ─── evalforge report <run.json> ─────────────────────────────────────────────

program
  .command("report <run>")
  .description("Generate a self-contained HTML benchmark report from a run result JSON")
  .option("-o, --output <path>", "Output file path", "")
  .action((runFile: string, options: { output: string }) => {
    try {
      const result = loadRunResult(runFile) as RunResult;
      const outputPath =
        options.output ||
        path.join(
          "./reports",
          path.basename(runFile, ".json") + "-report.html"
        );
      generateReport(result, outputPath);
    } catch (err) {
      console.error(`\n✗ Error: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program.parse(process.argv);