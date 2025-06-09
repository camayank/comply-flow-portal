import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const filePath = path.join(__dirname, '../attached_assets/KOSHIKA Services SOPs_1749493985488.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('=== KOSHIKA Services SOPs Analysis ===\n');
console.log('Available Worksheets:', workbook.SheetNames);
console.log('\n');

// Parse each worksheet
workbook.SheetNames.forEach((sheetName, index) => {
  console.log(`\n=== WORKSHEET ${index + 1}: ${sheetName} ===`);
  
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
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
});

// Generate structured configuration
console.log('\n\n=== GENERATING SERVICE CONFIGURATION ===\n');

const serviceConfigs = {};

workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
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

// Output the configuration
console.log('Service Configurations:');
console.log(JSON.stringify(serviceConfigs, null, 2));

// Save configuration to file
const outputPath = path.join(__dirname, '../server/sops-config.json');
fs.writeFileSync(outputPath, JSON.stringify(serviceConfigs, null, 2));
console.log(`\nConfiguration saved to: ${outputPath}`);