import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function parseSOPs() {
  // Read the Excel file
  const filePath = path.join(__dirname, '../attached_assets/KOSHIKA Services SOPs_1749493985488.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log('=== KOSHIKA Services SOPs Analysis ===\n');
  console.log('Available Worksheets:', workbook.worksheets.map(ws => ws.name));
  console.log('\n');

  const serviceConfigs = {};

  // Parse each worksheet
  workbook.worksheets.forEach((worksheet, index) => {
    const sheetName = worksheet.name;
    console.log(`\n=== WORKSHEET ${index + 1}: ${sheetName} ===`);

    const jsonData = [];
    worksheet.eachRow((row, rowNumber) => {
      const rowValues = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowValues[colNumber - 1] = cell.value;
      });
      jsonData.push(rowValues);
    });

    // Find headers and data structure
    if (jsonData.length > 0) {
      console.log('Headers/Structure:');
      console.log(jsonData[0]);

      console.log('\nSample Data (first 5 rows):');
      jsonData.slice(0, Math.min(6, jsonData.length)).forEach((row, idx) => {
        if (row.length > 0) {
          console.log(`Row ${idx}:`, row);
        }
      });

      console.log(`\nTotal Rows: ${jsonData.length}`);
      console.log(`Total Columns: ${jsonData[0] ? jsonData[0].length : 0}`);
    }

    console.log('\n' + '='.repeat(50));

    // Build service config
    if (jsonData.length > 1) {
      const headers = jsonData[0];
      const dataRows = jsonData.slice(1);

      serviceConfigs[sheetName] = {
        name: sheetName,
        headers: headers,
        processes: dataRows.map(row => {
          const process = {};
          headers.forEach((header, idx) => {
            if (header && row[idx] !== undefined) {
              process[header] = row[idx];
            }
          });
          return process;
        }).filter(p => Object.keys(p).length > 0)
      };
    }
  });

  // Generate structured configuration
  console.log('\n\n=== GENERATING SERVICE CONFIGURATION ===\n');

  // Output the configuration
  console.log('Service Configurations:');
  console.log(JSON.stringify(serviceConfigs, null, 2));

  // Save configuration to file
  const outputPath = path.join(__dirname, '../server/sops-config.json');
  fs.writeFileSync(outputPath, JSON.stringify(serviceConfigs, null, 2));
  console.log(`\nConfiguration saved to: ${outputPath}`);
}

parseSOPs().catch(console.error);
