import * as fs from "fs";
import * as path from "path";
import { RunResult } from "../schemas";

/**
 * Generates a self-contained HTML benchmark report from a RunResult.
 * The HTML file has no external dependencies and includes a sortable table.
 */
export function generateReport(result: RunResult, outputPath: string): void {
  const html = buildHtml(result);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, "utf-8");
  console.log(`\n📊 HTML report generated: ${outputPath}\n`);
}

function fmt(n: number | null, decimals = 2): string {
  return n === null ? "—" : n.toFixed(decimals);
}

function scoreColor(score: number | null): string {
  if (score === null) return "#888";
  if (score >= 0.9) return "#22c55e";
  if (score >= 0.6) return "#f59e0b";
  return "#ef4444";
}

function buildHtml(result: RunResult): string {
  const providerSections = result.providers
    .map((provider) => {
      const s = provider.summary;
      const rows = provider.cases
        .map((c) => {
          const scoreVal = c.score !== null ? c.score.toFixed(2) : "—";
          const color = scoreColor(c.score);
          const errorCell = c.error
            ? `<span class="error">${c.error}</span>`
            : "—";
          return `
          <tr>
            <td>${c.case_id}</td>
            <td class="prompt" title="${c.prompt.replace(/"/g, "&quot;")}">${c.prompt.slice(0, 80)}${c.prompt.length > 80 ? "…" : ""}</td>
            <td style="color:${color};font-weight:600">${scoreVal}</td>
            <td>${c.latency_ms}ms</td>
            <td>${c.total_tokens}</td>
            <td>${c.retries}</td>
            <td>${errorCell}</td>
          </tr>`;
        })
        .join("\n");

      return `
      <section class="provider-section">
        <h2>${provider.provider_name} <span class="model-tag">${provider.model}</span></h2>
        <div class="summary-grid">
          <div class="stat"><span class="label">Total</span><span class="value">${s.total}</span></div>
          <div class="stat"><span class="label">Passed</span><span class="value green">${s.passed}</span></div>
          <div class="stat"><span class="label">Failed</span><span class="value red">${s.failed}</span></div>
          <div class="stat"><span class="label">Errored</span><span class="value red">${s.errored}</span></div>
          <div class="stat"><span class="label">Avg Score</span><span class="value">${fmt(s.average_score)}</span></div>
          <div class="stat"><span class="label">Avg Latency</span><span class="value">${s.average_latency_ms.toFixed(0)}ms</span></div>
          <div class="stat"><span class="label">Tokens</span><span class="value">${s.total_tokens}</span></div>
          <div class="stat"><span class="label">Throughput</span><span class="value">${s.throughput.toFixed(1)} t/s</span></div>
        </div>
        <table id="table-${provider.model.replace(/[^a-z0-9]/gi, "-")}">
          <thead>
            <tr>
              <th data-sort="string">Case ID</th>
              <th data-sort="string">Prompt</th>
              <th data-sort="number">Score</th>
              <th data-sort="number">Latency</th>
              <th data-sort="number">Tokens</th>
              <th data-sort="number">Retries</th>
              <th data-sort="string">Error</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EvalForge — ${result.suite_name}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      padding: 2rem;
      min-height: 100vh;
    }
    header {
      border-bottom: 1px solid #2d3748;
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    header h1 { font-size: 1.75rem; font-weight: 700; color: #f8fafc; }
    header p  { color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem; }
    .provider-section { margin-bottom: 3rem; }
    .provider-section h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #f8fafc;
    }
    .model-tag {
      font-size: 0.75rem;
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 0.1rem 0.5rem;
      border-radius: 9999px;
      margin-left: 0.5rem;
      font-weight: 400;
      vertical-align: middle;
    }
    .summary-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .stat {
      background: #1e293b;
      border: 1px solid #2d3748;
      border-radius: 0.5rem;
      padding: 0.75rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 100px;
    }
    .stat .label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat .value { font-size: 1.25rem; font-weight: 700; color: #f8fafc; }
    .stat .value.green { color: #22c55e; }
    .stat .value.red   { color: #ef4444; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      background: #1e293b;
      border-radius: 0.5rem;
      overflow: hidden;
      border: 1px solid #2d3748;
    }
    thead tr { background: #0f172a; }
    th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      color: #94a3b8;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    th:hover { color: #e2e8f0; }
    th.sorted-asc::after  { content: " ▲"; color: #6366f1; }
    th.sorted-desc::after { content: " ▼"; color: #6366f1; }
    td {
      padding: 0.75rem 1rem;
      border-top: 1px solid #2d3748;
      color: #cbd5e1;
      vertical-align: top;
    }
    tr:hover td { background: #263144; }
    .prompt { max-width: 300px; color: #94a3b8; font-size: 0.8rem; }
    .error  { color: #f87171; font-size: 0.8rem; }
    footer {
      margin-top: 3rem;
      color: #475569;
      font-size: 0.75rem;
      border-top: 1px solid #1e293b;
      padding-top: 1rem;
    }
  </style>
</head>
<body>
  <header>
    <h1>⚡ EvalForge — ${result.suite_name}</h1>
    <p>Run at: ${result.run_at} &nbsp;·&nbsp; ${result.providers.length} provider${result.providers.length !== 1 ? "s" : ""}</p>
  </header>

  ${providerSections}

  <footer>Generated by EvalForge · github.com/KunalK24/evalforge</footer>

  <script>
    // Sortable table logic — no external dependencies
    document.querySelectorAll("table").forEach((table) => {
      const headers = table.querySelectorAll("th");
      let sortCol = -1;
      let sortDir = 1;

      headers.forEach((th, colIndex) => {
        th.addEventListener("click", () => {
          const tbody = table.querySelector("tbody");
          const rows = Array.from(tbody.querySelectorAll("tr"));
          const type = th.dataset.sort || "string";

          if (sortCol === colIndex) {
            sortDir *= -1;
          } else {
            sortDir = 1;
            sortCol = colIndex;
          }

          headers.forEach((h) => h.classList.remove("sorted-asc", "sorted-desc"));
          th.classList.add(sortDir === 1 ? "sorted-asc" : "sorted-desc");

          rows.sort((a, b) => {
            const aText = a.cells[colIndex]?.textContent?.trim() ?? "";
            const bText = b.cells[colIndex]?.textContent?.trim() ?? "";

            if (type === "number") {
              const aNum = parseFloat(aText) || 0;
              const bNum = parseFloat(bText) || 0;
              return (aNum - bNum) * sortDir;
            }
            return aText.localeCompare(bText) * sortDir;
          });

          rows.forEach((row) => tbody.appendChild(row));
        });
      });
    });
  </script>
</body>
</html>`;
}