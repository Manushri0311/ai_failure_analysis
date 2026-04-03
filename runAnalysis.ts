import { analyseFailures } from "./analyzer/failureAnalyzer";
import { generateHTMLReport } from "./reporter/htmlReporter";
import * as path from "path";
import * as child_process from "child_process";

async function main() {
  try {
    console.log("=== AI Failure Analysis ===\n");

    const analyses = await analyseFailures();
    generateHTMLReport(analyses);

    const reportPath = path.resolve("output/failure-report.html");
    console.log(`\n[Done] Opening report in browser...`);

    child_process.exec(`start ${reportPath}`);

  } catch (error) {
    console.error("Analysis failed:", error);
    process.exit(1);
  }
}

main();