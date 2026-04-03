import { callGeminiForJSON } from "../shared/gemini-client";
import * as fs from "fs";
import * as path from "path";

export interface FailureAnalysis {
  testName: string;
  filePath: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  errorMessage: string | null;
  rootCauseCategory: string | null;
  rootCauseExplanation: string | null;
  suggestedFix: string | null;
}

interface PlaywrightSpec {
  title: string;
  file: string;
  ok: boolean;
  tests: Array<{
    status: string;
    results: Array<{
      status: string;
      duration: number;
      errors: Array<{ message: string }>;
    }>;
  }>;
}

interface PlaywrightSuite {
  title: string;
  file?: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightResults {
  suites: PlaywrightSuite[];
}

const SYSTEM_PROMPT = `You are a Senior QA Engineer specializing in Playwright test failure analysis.

Your job is to analyze a failed Playwright test and identify:
1. The root cause category
2. A plain English explanation of why it failed
3. A concrete suggested fix

You must always respond with ONLY a valid JSON object. No explanation, no markdown, no additional text.
Just the raw JSON.

The JSON must follow this exact structure:
{
  "rootCauseCategory": "one of: selector-issue, assertion-mismatch, timing-issue, data-issue, navigation-issue, environment-issue",
  "rootCauseExplanation": "plain English explanation of exactly why this test failed",
  "suggestedFix": "concrete actionable fix with example code if relevant"
}

Rules:
- rootCauseCategory must be exactly one of the 6 categories listed
- rootCauseExplanation must be specific to this failure, not generic
- suggestedFix must be concrete and actionable, include corrected selector or assertion where relevant
- If the error mentions a locator or selector, the category is selector-issue
- If the error mentions toContainText or toHaveURL mismatch, the category is assertion-mismatch
- If the error mentions timeout, the category is timing-issue`;

function extractSpecs(suite: PlaywrightSuite): PlaywrightSpec[] {
  const specs: PlaywrightSpec[] = [];

  if (suite.specs) {
    suite.specs.forEach(spec => specs.push(spec));
  }

  if (suite.suites) {
    suite.suites.forEach(child => {
      extractSpecs(child).forEach(s => specs.push(s));
    });
  }

  return specs;
}

export async function analyseFailures(): Promise<FailureAnalysis[]> {
  console.log("\n[Analyser] Reading results.json...");

  const resultsPath = path.join(__dirname, "..", "input", "results.json");

  if (!fs.existsSync(resultsPath)) {
    throw new Error("results.json not found in input/ folder.");
  }

  const raw = JSON.parse(
    fs.readFileSync(resultsPath, "utf-8")
  ) as PlaywrightResults;

  const allSpecs: PlaywrightSpec[] = [];
  raw.suites.forEach(suite => {
    extractSpecs(suite).forEach(s => allSpecs.push(s));
  });

  console.log(`[Analyser] Total tests found: ${allSpecs.length}`);

  const passed = allSpecs.filter(s => s.ok).length;
  const failed = allSpecs.filter(s => !s.ok).length;

  console.log(`[Analyser] Passed: ${passed} | Failed: ${failed}`);
  console.log(`[Analyser] Analysing failures with Gemini...\n`);

  const analyses: FailureAnalysis[] = [];

  for (const spec of allSpecs) {
    const firstResult = spec.tests?.[0]?.results?.[0];
    const duration = firstResult?.duration || 0;

    if (spec.ok) {
      analyses.push({
        testName: spec.title,
        filePath: spec.file,
        status: "passed",
        duration,
        errorMessage: null,
        rootCauseCategory: null,
        rootCauseExplanation: null,
        suggestedFix: null,
      });
      console.log(`[PASS] ${spec.title}`);
      continue;
    }

    const errorMessage = firstResult?.errors?.[0]?.message || "Unknown error";

    const cleanError = errorMessage
      .replace(/\u001b\[[0-9;]*m/g, "")
      .trim();

    const userMessage = `Analyse this failed Playwright test and return JSON:

TEST NAME: ${spec.title}
FILE: ${spec.file}
ERROR MESSAGE:
${cleanError}`;

    try {
      const analysis = await callGeminiForJSON<{
        rootCauseCategory: string;
        rootCauseExplanation: string;
        suggestedFix: string;
      }>(SYSTEM_PROMPT, userMessage);

      analyses.push({
        testName: spec.title,
        filePath: spec.file,
        status: "failed",
        duration,
        errorMessage: cleanError,
        rootCauseCategory: analysis.rootCauseCategory,
        rootCauseExplanation: analysis.rootCauseExplanation,
        suggestedFix: analysis.suggestedFix,
      });

      console.log(`[FAIL] ${spec.title}`);
      console.log(`       Category: ${analysis.rootCauseCategory}`);
      console.log(`       Fix: ${analysis.suggestedFix}\n`);

    } catch (err) {
      console.error(`[ERROR] Failed to analyse: ${spec.title}`, err);
    }
  }

  return analyses;
}