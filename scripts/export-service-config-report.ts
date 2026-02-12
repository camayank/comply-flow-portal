import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import {
  servicesCatalog,
  workflowTemplatesAdmin,
  serviceDocTypes,
  dueDateMaster
} from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

type CoverageRow = {
  serviceKey: string;
  name: string;
  category: string | null;
  periodicity: string;
  templates: number;
  docTypes: number;
  dueDates: number;
};

const asPercent = (value: number, total: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100);

async function run() {
  const services = await db
    .select({
      serviceKey: servicesCatalog.serviceKey,
      name: servicesCatalog.name,
      category: servicesCatalog.category,
      periodicity: servicesCatalog.periodicity
    })
    .from(servicesCatalog)
    .where(eq(servicesCatalog.isActive, true))
    .orderBy(servicesCatalog.category, servicesCatalog.name);

  const templateCounts = await db
    .select({
      serviceKey: workflowTemplatesAdmin.serviceKey,
      count: sql<number>`count(*)::int`
    })
    .from(workflowTemplatesAdmin)
    .where(eq(workflowTemplatesAdmin.isPublished, true))
    .groupBy(workflowTemplatesAdmin.serviceKey);

  const docCounts = await db
    .select({
      serviceKey: serviceDocTypes.serviceKey,
      count: sql<number>`count(*)::int`
    })
    .from(serviceDocTypes)
    .groupBy(serviceDocTypes.serviceKey);

  const dueCounts = await db
    .select({
      serviceKey: dueDateMaster.serviceKey,
      count: sql<number>`count(*)::int`
    })
    .from(dueDateMaster)
    .where(eq(dueDateMaster.isActive, true))
    .groupBy(dueDateMaster.serviceKey);

  const templateMap = new Map(templateCounts.map(row => [row.serviceKey, Number(row.count || 0)]));
  const docMap = new Map(docCounts.map(row => [row.serviceKey, Number(row.count || 0)]));
  const dueMap = new Map(dueCounts.map(row => [row.serviceKey, Number(row.count || 0)]));

  const rows: CoverageRow[] = services.map((service) => ({
    serviceKey: service.serviceKey,
    name: service.name,
    category: service.category,
    periodicity: service.periodicity,
    templates: templateMap.get(service.serviceKey) || 0,
    docTypes: docMap.get(service.serviceKey) || 0,
    dueDates: dueMap.get(service.serviceKey) || 0
  }));

  const total = rows.length;
  const withTemplates = rows.filter(row => row.templates > 0).length;
  const withDocTypes = rows.filter(row => row.docTypes > 0).length;
  const withDueDates = rows.filter(row => row.dueDates > 0).length;

  const reportLines: string[] = [];
  reportLines.push('# Service Configuration Completion Checklist');
  reportLines.push('');
  reportLines.push(`Generated: ${new Date().toISOString()}`);
  reportLines.push('');
  reportLines.push('## Summary');
  reportLines.push(`- Total services: ${total}`);
  reportLines.push(`- Templates coverage: ${withTemplates}/${total} (${asPercent(withTemplates, total)}%)`);
  reportLines.push(`- Doc types coverage: ${withDocTypes}/${total} (${asPercent(withDocTypes, total)}%)`);
  reportLines.push(`- Due date rules coverage: ${withDueDates}/${total} (${asPercent(withDueDates, total)}%)`);
  reportLines.push('');
  reportLines.push('## Per-Service Checklist');
  reportLines.push('| Service Key | Name | Category | Periodicity | Template | Doc Types | Due Dates | Status |');
  reportLines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');

  for (const row of rows) {
    const templateOk = row.templates > 0 ? '[x]' : '[ ]';
    const docOk = row.docTypes > 0 ? '[x]' : '[ ]';
    const dueOk = row.dueDates > 0 ? '[x]' : '[ ]';
    const status = row.templates > 0 && row.docTypes > 0 && row.dueDates > 0 ? 'Complete' : 'Needs Attention';
    reportLines.push(`| ${row.serviceKey} | ${row.name} | ${row.category || ''} | ${row.periodicity} | ${templateOk} (${row.templates}) | ${docOk} (${row.docTypes}) | ${dueOk} (${row.dueDates}) | ${status} |`);
  }

  const outputPath = path.resolve(process.cwd(), 'SERVICE_CONFIGURATION_CHECKLIST.md');
  fs.writeFileSync(outputPath, reportLines.join('\n'), 'utf8');
  console.log(`✅ Service configuration checklist written to ${outputPath}`);
}

run().catch((error) => {
  console.error('❌ Failed to generate service configuration checklist:', error);
  process.exit(1);
});
