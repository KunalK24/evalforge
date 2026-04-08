import { RunResult, EvalCaseResult, RegressionDiff, RegressionReport } from "../schemas";

export function diffRuns(baseline: RunResult, current: RunResult): RegressionReport {
    const baselineProvider = baseline.providers[0];
    const currentProvider = current.providers[0];

    if (!baselineProvider || !currentProvider) {
        throw new Error("One or both run results have no provider data.");
    }

    const baselineMap = new Map<string, EvalCaseResult>(
        baselineProvider.cases.map((c) => [c.case_id, c])
    );

    const currentMap = new Map<string, EvalCaseResult>(
        currentProvider.cases.map((c) => [c.case_id, c])
    );

    const allIds = new Set([...baselineMap.keys(), ...currentMap.keys()]);
    const diffs: RegressionDiff[] = [];

    for (const caseId of allIds) {
        const baseline = baselineMap.get(caseId)
        const current = currentMap.get(caseId)

        // Score
        const baselineScore = baseline?.score ?? null;
        const currentScore = current?.score ?? null;
        const scoreDelta = baselineScore !== null && currentScore !== null ? currentScore - baselineScore : null;

        // Latency
        const baselineLatency = baseline?.latency_ms ?? 0;
        const currentLatency = current?.latency_ms ?? 0;
        const latencyDelta = currentLatency - baselineLatency;

        let status: RegressionDiff["status"] = "unknown";
        if (scoreDelta !== null) {
            if (scoreDelta > 0) status = "improved";
            else if (scoreDelta < 0) status = "regressed";
            else status = "unchanged";
        }

        diffs.push({
            case_id: caseId,
            baseline_score: baselineScore,
            current_score: currentScore,
            score_delta: scoreDelta,
            baseline_latency_ms: baselineLatency,
            current_latency_ms: currentLatency,
            latency_delta_ms: latencyDelta,
            status,
        });
    }

    const summary = {
        improved: diffs.filter((d) => d.status === "improved").length,
        regressed: diffs.filter((d) => d.status === "regressed").length,
        unchanged: diffs.filter((d) => d.status === "unchanged").length,
        unknown: diffs.filter((d) => d.status === "unknown").length,
    };

    const report: RegressionReport = {
        suite_names: `${baseline.suite_name} → ${current.suite_name}`,
        compared_at: new Date().toISOString(),
        diffs,
        summary,
    };

    // TODO: printDiffTable(report, baseline, current);
    return report;
}