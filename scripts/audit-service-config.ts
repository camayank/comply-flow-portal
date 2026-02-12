import { db } from '../server/db';
import {
  servicesCatalog,
  workflowTemplatesAdmin,
  serviceDocTypes,
  dueDateMaster
} from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

type CoverageMap = Map<string, number>;

const buildCoverageMap = (rows: Array<{ serviceKey: string; count: number }>) =>
  new Map(rows.map(row => [row.serviceKey, Number(row.count || 0)]));

const asPercent = (value: number, total: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100);

async function runAudit() {
  const services = await db
    .select({
      serviceKey: servicesCatalog.serviceKey,
      name: servicesCatalog.name,
      periodicity: servicesCatalog.periodicity,
      category: servicesCatalog.category
    })
    .from(servicesCatalog)
    .where(eq(servicesCatalog.isActive, true));

  const templateRows = await db
    .select({
      serviceKey: workflowTemplatesAdmin.serviceKey,
      count: sql<number>`count(*)::int`
    })
    .from(workflowTemplatesAdmin)
    .where(eq(workflowTemplatesAdmin.isPublished, true))
    .groupBy(workflowTemplatesAdmin.serviceKey);

  const docTypeRows = await db
    .select({
      serviceKey: serviceDocTypes.serviceKey,
      count: sql<number>`count(*)::int`
    })
    .from(serviceDocTypes)
    .groupBy(serviceDocTypes.serviceKey);

  const dueDateRows = await db
    .select({
      serviceKey: dueDateMaster.serviceKey,
      count: sql<number>`count(*)::int`
    })
    .from(dueDateMaster)
    .where(eq(dueDateMaster.isActive, true))
    .groupBy(dueDateMaster.serviceKey);

  const templateCoverage: CoverageMap = buildCoverageMap(templateRows);
  const docTypeCoverage: CoverageMap = buildCoverageMap(docTypeRows);
  const dueDateCoverage: CoverageMap = buildCoverageMap(dueDateRows);

  const missingTemplates: string[] = [];
  const missingDocTypes: string[] = [];
  const missingDueDates: string[] = [];

  for (const service of services) {
    if (!templateCoverage.get(service.serviceKey)) {
      missingTemplates.push(service.serviceKey);
    }
    if (!docTypeCoverage.get(service.serviceKey)) {
      missingDocTypes.push(service.serviceKey);
    }
    if (!dueDateCoverage.get(service.serviceKey)) {
      missingDueDates.push(service.serviceKey);
    }
  }

  const report = {
    totals: {
      services: services.length,
      publishedTemplates: templateRows.reduce((sum, row) => sum + Number(row.count || 0), 0),
      docTypes: docTypeRows.reduce((sum, row) => sum + Number(row.count || 0), 0),
      dueDateRules: dueDateRows.reduce((sum, row) => sum + Number(row.count || 0), 0)
    },
    coverage: {
      templates: `${asPercent(services.length - missingTemplates.length, services.length)}%`,
      docTypes: `${asPercent(services.length - missingDocTypes.length, services.length)}%`,
      dueDates: `${asPercent(services.length - missingDueDates.length, services.length)}%`
    },
    missing: {
      templates: missingTemplates,
      docTypes: missingDocTypes,
      dueDates: missingDueDates
    }
  };

  console.log(JSON.stringify(report, null, 2));
}

runAudit().catch((error) => {
  console.error('❌ Service configuration audit failed:', error);
  process.exit(1);
});
