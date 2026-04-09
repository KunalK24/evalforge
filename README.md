# EvalForge

A developer toolkit for benchmarking and evaluating LLM outputs across multiple providers.
Define eval suites in YAML, run them against local or hosted models, and track regressions
across model versions — all from the command line.

> **Status:** In Progress — TypeScript CLI is complete. Python runner under active development.

---

## Architecture

```
evalforge run suite.yaml
      │
      │  Zod validates the YAML
      │  POST /run → localhost:8000
      ▼
Python Runner (FastAPI)         ← in progress
      │
      │  asyncio runs all cases concurrently
      ▼
Ollama (localhost:11434)
      │
      └──► RunResult JSON → ./reports/
```

The CLI is a thin orchestration layer written in TypeScript. All LLM execution
happens in the Python runner, which handles concurrency, retries, and timeouts.
The two communicate over a local REST API.

---

## Project Structure

```
evalforge/
├── cli/          # TypeScript CLI — commands, schema validation, HTML reports
└── runner/       # Python FastAPI backend — provider execution, async runner (in progress)
```

---

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Python](https://python.org) 3.12+
- [Ollama](https://ollama.com) running locally

Pull the model you want to eval against:

```bash
ollama pull llama3
```

---

## Setup

### Python Runner (in progress)

```bash
cd runner
pip install -r requirements.txt
uvicorn runner.main:app --reload
```

### TypeScript CLI

```bash
cd cli
npm install
npm run build
npm link
```

`npm link` makes the `evalforge` command available globally in your terminal.

---

## CLI Commands

### `evalforge run <suite.yaml>`

Validates the YAML suite with Zod, sends it to the Python runner, prints a
summary, and saves the result to `./reports/`.

```bash
evalforge run examples/basic-suite.yaml
```

### `evalforge report <run.json>`

Generates a self-contained HTML benchmark report from a saved run result.
No internet connection required — everything is inline in a single file.

```bash
evalforge report reports/<your-run>.json

# Custom output path
evalforge report reports/<your-run>.json --output reports/my-report.html
```

### `evalforge diff <run1.json> <run2.json>`

Compares two saved run results and prints a regression table to the terminal.
Useful for comparing results across model versions or after prompt changes.

```bash
evalforge diff reports/run-v1.json reports/run-v2.json
```

---

## Suite YAML Format

```yaml
name: My Eval Suite
description: Optional description
timeout_ms: 30000   # per-case timeout in ms (default: 30000)
max_retries: 2      # retries on failure, 0-5 (default: 2)

providers:
  - name: ollama
    model: llama3
    # base_url: http://localhost:11434  # optional, this is the default

cases:
  - id: my-case-id
    prompt: "Your prompt here"
    expected: "Expected output"
    scorer_type: exact_match   # exact_match | contains | none
```

**Scorer types:**

- `exact_match` — case-insensitive exact match against `expected`
- `contains` — checks if `expected` appears anywhere in the output
- `none` — no scoring, output is captured only

---

## CLI Reference

| Command | Description |
|---|---|
| `evalforge run <suite.yaml>` | Run an eval suite against configured providers |
| `evalforge diff <run1.json> <run2.json>` | Compare two runs and show regression table |
| `evalforge report <run.json>` | Generate a self-contained HTML benchmark report |
| `evalforge report <run.json> --output <path>` | Generate report at a custom path |
| `evalforge --help` | Show all commands |
| `evalforge --version` | Show version |

---

## Roadmap

- [x] TypeScript CLI with commander.js
- [x] Zod schema validation for YAML suites
- [x] `evalforge run` — YAML suite execution via Python runner
- [x] `evalforge diff` — terminal regression table
- [x] `evalforge report` — self-contained HTML report
- [ ] Python FastAPI runner
- [ ] Ollama provider with retry and timeout logic
- [ ] Concurrent case execution per provider
- [ ] OpenAI provider
- [ ] Anthropic provider
- [ ] Cost estimation per run
- [ ] `evalforge init` — scaffold a new suite interactively

---

## License

MIT
