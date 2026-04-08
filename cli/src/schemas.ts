import { z } from "zod";

export const EvalCaseSchema = z.object ({
    id: z.string().min(1, "Case id is required"),
    prompt: z.string().min(1, "Prompt is required"),
    expected: z.string().optional(),
    scorer_type: z
        .enum(["exact_match", "contains", "none"])
        .default("exact_match"),
});

// TODO: Starting with just Ollama for now, need to add OpenAI and Anthropic
export const ProviderConfigSchema = z.object({
  name: z.enum(["ollama", "openai", "anthropic"]),
  model: z.string().min(1, "Model name is required"),
  base_url: z.string().url().optional(),
});

export const EvalSuiteSchema = z.object({
  name: z.string().min(1, "Suite name is required"),
  description: z.string().optional(),
  timeout_ms: z.number().int().positive().default(30000),
  max_retries: z.number().int().min(0).max(5).default(2),
  providers: z
    .array(ProviderConfigSchema)
    .min(1, "At least one provider is required"),
  cases: z
    .array(EvalCaseSchema)
    .min(1, "At least one eval case is required"),
});

export type EvalSuite = z.infer<typeof EvalSuiteSchema>;
export type EvalCase = z.infer<typeof EvalCaseSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export interface EvalCaseResult {
  case_id: string;
  provider_name: string;
  model: string;
  prompt: string;
  output: string;
  expected?: string;
  score: number | null;
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  retries: number;
  error?: string;
}

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  errored: number;
  average_score: number | null;
  average_latency_ms: number;
  total_tokens: number;
  throughput: number;
}

export interface ProviderRunResult {
  provider_name: string;
  model: string;
  run_at: string;
  duration_ms: number;
  cases: EvalCaseResult[];
  summary: EvalSummary;
}

export interface RunResult {
  suite_name: string;
  run_at: string;
  providers: ProviderRunResult[];
}

export interface RegressionDiff {
  case_id: string;
  baseline_score: number | null;
  current_score: number | null;
  score_delta: number | null;
  baseline_latency_ms: number;
  current_latency_ms: number;
  latency_delta_ms: number;
  status: "improved" | "regressed" | "unchanged" | "unknown";
}

export interface RegressionReport {
  suite_names: string;
  compared_at: string;
  diffs: RegressionDiff[];
  summary: {
    improved: number;
    regressed: number;
    unchanged: number;
    unknown: number;
  };
}