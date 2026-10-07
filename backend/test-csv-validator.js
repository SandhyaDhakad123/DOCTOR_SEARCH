const fs = require("fs");
const path = require("path");
const { validateRow } = require("./import-real-data");
const csvParser = require("csv-parser");

// Verify that all rows in real-doctors.csv pass validation
async function testCsv(filePath) {
  const rows = [];
  const seenRegs = new Set();
  const errors = [];
  let rowNumber = 1;

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => {
        rowNumber++;
        const res = validateRow(row, rowNumber, seenRegs);
        if (res.errors) errors.push(...res.errors);
        else rows.push(res.record);
      })
      .on("end", () => {
        console.log(`Parsed ${rows.length} valid rows from ${path.basename(filePath)}`);
        if (errors.length) {
          console.error(`Validation errors (${errors.length}):`, errors);
          reject(new Error("CSV validation failed"));
        } else {
          console.log("✓ All rows passed strict validation!");
          resolve(rows);
        }
      })
      .on("error", reject);
  });
}

if (require.main === module) {
  testCsv(path.join(__dirname, "real-doctors.csv")).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
