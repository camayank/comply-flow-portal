import * as XLSX from 'xlsx';
import { Request, Response } from 'express';

export function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export function convertToExcel(data: any[], sheetName: string = 'Sheet1'): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function sendCSVResponse(res: Response, data: any[], filename: string) {
  const csv = convertToCSV(data);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
}

export function sendExcelResponse(res: Response, data: any[], filename: string, sheetName?: string) {
  const buffer = convertToExcel(data, sheetName);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.xlsx"`);
  res.send(buffer);
}

export function sendMultiSheetExcel(res: Response, sheets: { name: string; data: any[] }[], filename: string) {
  const workbook = XLSX.utils.book_new();
  
  for (const sheet of sheets) {
    if (sheet.data && sheet.data.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.substring(0, 31));
    }
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.xlsx"`);
  res.send(buffer);
}

export function flattenObject(obj: any, prefix: string = ''): any {
  const flattened: any = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}_${key}` : key;
      
      if (value === null || value === undefined) {
        flattened[newKey] = '';
      } else if (typeof value === 'object' && !(value instanceof Date)) {
        if (Array.isArray(value)) {
          flattened[newKey] = JSON.stringify(value);
        } else {
          Object.assign(flattened, flattenObject(value, newKey));
        }
      } else if (value instanceof Date) {
        flattened[newKey] = value.toISOString();
      } else {
        flattened[newKey] = value;
      }
    }
  }
  
  return flattened;
}

export function prepareDataForExport(data: any[]): any[] {
  return data.map(item => flattenObject(item));
}
