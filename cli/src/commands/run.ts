import * as fs from "fs";
import * as path from "path";
import { EvalSuite, RunResult } from "../schemas";

const RUNNER_URL = "http://localhost:8000";

// Health Check
async function checkRunner(): Promise<void> {
    try {
        const health = await fetch(`${RUNNER_URL}/health`);
        if (!health.ok) throw new Error();
    } catch {
        throw new Error(
            `Cannot reach Python runner at ${RUNNER_URL}.\n` +
            ` Make sure it is running with: uvicorn runner.main:app --reload`
        );
    }
}

export async function runSuite(suite: EvalSuite): Promise<RunResult> {
    // Check Healthy
    await checkRunner();

    console.log(`\n -> Submitting suite "${suite.name}" to Python runner...`);
    console.log(` Cases: ${suite.cases.length}`);
    console.log(` Providers: ${suite.providers
        .map((p: { name: string; model: string }) => `${p.name}/${p.model}`)
        .join(", ")}`
    );

    console.log();

    const response = await fetch(`${RUNNER_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            suite: {
                name: suite.name,
                description: suite.description,
                timeout_ms: suite.timeout_ms,
                max_retries: suite.max_retries,
                cases: suite.cases,
            },
            providers: suite.providers,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Runner returned ${response.status}: ${body}`);
    }

    const result = (await response.json()) as RunResult;

    for (const provider of result.providers) {
        const s = provider.summary;
        console.log(`Provider: ${provider.provider_name} / ${provider.model}`);
        console.log(`  Duration     : ${provider.duration_ms}ms`);
        console.log(`  Passed       : ${s.passed} / ${s.total}`);
        if (s.average_score !== null) {
        console.log(`  Avg Score    : ${s.average_score.toFixed(3)}`);
        }
        console.log(`  Avg Latency  : ${s.average_latency_ms.toFixed(0)}ms`);
        console.log(`  Total Tokens : ${s.total_tokens}`);
        console.log(`  Throughput   : ${s.throughput.toFixed(1)} tokens/s`);
        console.log();
    }

    const reportsDir = "./reports";
    fs.mkdirSync(reportsDir, { recursive: true });

    const safeName = suite.name.replace(/\s+/g, "-").toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${safeName}-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`Report saved to: ${filepath}`);

    return result;
}