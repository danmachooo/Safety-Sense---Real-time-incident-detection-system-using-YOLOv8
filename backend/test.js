import fs from "fs";
import path from "path";

async function testReportGeneration() {
  const baseUrl = "http://localhost:3000/api/reports";

  const testCases = [
    {
      name: "inventory-summary-pdf",
      url: `${baseUrl}/inventory/summary?format=pdf&startDate=2025-01-01&endDate=2025-12-31`,
      expectedType: "application/pdf",
    },
    {
      name: "incident-summary-excel",
      url: `${baseUrl}/incidents/summary?format=excel&period=monthly`,
      expectedType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  ];

  for (const test of testCases) {
    try {
      const response = await fetch(test.url);

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const filename = `./test-outputs/${test.name}.${
          test.name.includes("pdf") ? "pdf" : "xlsx"
        }`;

        fs.writeFileSync(filename, Buffer.from(buffer));
        console.log(
          `✅ ${test.name}: File saved successfully (${buffer.byteLength} bytes)`
        );
      } else {
        console.log(`❌ ${test.name}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
}

testReportGeneration();
