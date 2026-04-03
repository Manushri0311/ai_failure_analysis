# AI Failure Analysis

A standalone AI-powered tool that analyses Playwright test failures and generates
a detailed HTML report with root cause categories and suggested fixes per failure.

## What it does

Takes any Playwright results.json as input, sends each failure to Gemini AI,
and produces a detailed HTML report showing exactly why each test failed and
how to fix it.

## How it works

1. Read results.json from any Playwright test run
2. Strip ANSI colour codes from error messages
3. Send each failure individually to Gemini for analysis
4. Gemini identifies root cause category and suggests a concrete fix
5. HTML report generated with full breakdown

## Root cause categories

- selector-issue — locator did not match any element or matched multiple
- assertion-mismatch — expected value did not match actual value
- timing-issue — element not found within timeout
- navigation-issue — page did not navigate to expected URL
- data-issue — test data caused unexpected application behaviour
- environment-issue — browser or infrastructure level failure

## Tech stack

- TypeScript
- Node.js
- Google Gemini API
- Playwright (for results input)

## Setup

1. Clone the repo
2. Run `npm install`
3. Create `.env` file with `GEMINI_API_KEY=your_key_here`
4. Copy your Playwright `results.json` into the `input/` folder

## Running
```bash
npm run analyse
```

This will:
- Read `input/results.json`
- Analyse each failure with Gemini
- Print root cause and fix to terminal
- Save HTML report to `output/failure-report.html`
- Open the report in your browser automatically

## Output

The HTML report shows:

- Summary: total tests, passed, failed, pass rate
- Failure breakdown by root cause category
- Per test: status, category, plain English explanation, suggested fix

## Input format

Accepts standard Playwright JSON reporter output. To generate this from
any Playwright project, add this to your playwright.config.ts:
```typescript
reporter: [
  ["json", { outputFile: "./output/results.json" }]
]
```

## Example output
```
[Analyser] Total tests found: 10
[Analyser] Passed: 3 | Failed: 7

[FAIL] Verify login with invalid password
       Category: selector-issue
       Fix: Use page.locator('input[data-qa="login-email"]') instead of
            input[name="email"] which matches multiple elements on the page

[PASS] Verify newsletter subscription