import { FailureAnalysis } from "../analyzer/failureAnalyzer";
import * as fs from "fs";
import * as path from "path";

export function generateHTMLReport(analyses: FailureAnalysis[]): void {
  const passed = analyses.filter(a => a.status === "passed").length;
  const failed = analyses.filter(a => a.status === "failed").length;
  const total = analyses.length;
  const passRate = Math.round((passed / total) * 100);

  const categoryCount: Record<string, number> = {};
  analyses
    .filter(a => a.rootCauseCategory)
    .forEach(a => {
      const cat = a.rootCauseCategory as string;
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

  const categoryRows = Object.entries(categoryCount)
    .map(
      ([cat, count]) => `
      <tr>
        <td>${cat}</td>
        <td>${count}</td>
      </tr>`
    )
    .join("");

  const testRows = analyses
    .map(a => {
      const statusBadge =
        a.status === "passed"
          ? `<span class="badge pass">PASS</span>`
          : `<span class="badge fail">FAIL</span>`;

      const failureDetails =
        a.status === "failed"
          ? `
          <tr class="detail-row">
            <td colspan="4">
              <div class="detail-box">
                <div class="detail-section">
                  <span class="detail-label">Error</span>
                  <pre class="error-text">${escapeHtml(a.errorMessage || "")}</pre>
                </div>
                <div class="detail-section">
                  <span class="detail-label">Root cause category</span>
                  <span class="category-badge">${a.rootCauseCategory}</span>
                </div>
                <div class="detail-section">
                  <span class="detail-label">Explanation</span>
                  <p class="detail-text">${a.rootCauseExplanation}</p>
                </div>
                <div class="detail-section">
                  <span class="detail-label">Suggested fix</span>
                  <p class="detail-text fix-text">${a.suggestedFix}</p>
                </div>
              </div>
            </td>
          </tr>`
          : "";

      return `
        <tr class="test-row ${a.status}">
          <td>${statusBadge}</td>
          <td class="test-name">${escapeHtml(a.testName)}</td>
          <td>${a.rootCauseCategory || "—"}</td>
          <td>${a.duration}ms</td>
        </tr>
        ${failureDetails}`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Failure Analysis Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #333; padding: 2rem; }
    h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 2rem; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 2rem; }
    .summary-card { background: white; border-radius: 8px; padding: 16px; border: 1px solid #e0e0e0; }
    .summary-card .value { font-size: 32px; font-weight: 600; }
    .summary-card .label { font-size: 13px; color: #666; margin-top: 4px; }
    .value.pass { color: #2e7d32; }
    .value.fail { color: #c62828; }
    .value.rate { color: #1565c0; }
    .section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 1.5rem; border: 1px solid #e0e0e0; }
    .section h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 10px 12px; background: #f8f8f8; border-bottom: 1px solid #e0e0e0; font-weight: 500; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    .test-row:hover td { background: #fafafa; }
    .badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .badge.pass { background: #e8f5e9; color: #2e7d32; }
    .badge.fail { background: #ffebee; color: #c62828; }
    .test-name { font-weight: 500; }
    .detail-row td { padding: 0 12px 12px; }
    .detail-box { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; }
    .detail-section { margin-bottom: 12px; }
    .detail-section:last-child { margin-bottom: 0; }
    .detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #888; display: block; margin-bottom: 4px; }
    .error-text { font-family: monospace; font-size: 12px; background: #fff3f3; border: 1px solid #ffcdd2; border-radius: 4px; padding: 8px; white-space: pre-wrap; color: #c62828; }
    .category-badge { background: #e3f2fd; color: #1565c0; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; }
    .detail-text { font-size: 13px; line-height: 1.6; color: #444; }
    .fix-text { background: #f1f8e9; border-left: 3px solid #7cb342; padding: 8px 12px; border-radius: 0 4px 4px 0; }
    .generated { font-size: 12px; color: #999; margin-top: 1rem; text-align: right; }
  </style>
</head>
<body>
  <h1>AI Failure Analysis Report</h1>
  <p class="subtitle">Generated by Gemini AI — ${new Date().toLocaleString()}</p>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="value">${total}</div>
      <div class="label">Total tests</div>
    </div>
    <div class="summary-card">
      <div class="value pass">${passed}</div>
      <div class="label">Passed</div>
    </div>
    <div class="summary-card">
      <div class="value fail">${failed}</div>
      <div class="label">Failed</div>
    </div>
    <div class="summary-card">
      <div class="value rate">${passRate}%</div>
      <div class="label">Pass rate</div>
    </div>
  </div>

  ${
    Object.keys(categoryCount).length > 0
      ? `
  <div class="section">
    <h2>Failure breakdown by root cause category</h2>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Count</th>
        </tr>
      </thead>
      <tbody>
        ${categoryRows}
      </tbody>
    </table>
  </div>`
      : ""
  }

  <div class="section">
    <h2>Test results</h2>
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Test name</th>
          <th>Root cause</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${testRows}
      </tbody>
    </table>
  </div>

  <p class="generated">Report generated at ${new Date().toISOString()}</p>
</body>
</html>`;

  const outputPath = path.join(__dirname, "..", "output", "failure-report.html");

  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  fs.writeFileSync(outputPath, html, "utf-8");
  console.log(`\n[Reporter] HTML report saved to output/failure-report.html`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}