export function mapComplianceCategory(rawCategory?: string | null): string {
  const value = (rawCategory || '').toLowerCase();

  if (value.includes('professional_tax')) return 'Payroll';
  if (value.includes('gst')) return 'GST';
  if (value.includes('income') || value.includes('tds') || value.includes('tcs') || value.includes('tax')) return 'Income Tax';
  if (value.includes('companies_act') || value.includes('mca') || value.includes('roc')) return 'MCA';
  if (value.includes('pf') || value.includes('esi') || value.includes('payroll')) return 'Payroll';
  if (value.includes('labour') || value.includes('labor')) return 'Labor';
  if (value.includes('license') || value.includes('licence')) return 'Licenses';
  if (value.includes('business_registration') || value.includes('registration') || value.includes('incorporation')) return 'Registrations';
  if (value.includes('funding_readiness') || value.includes('funding')) return 'Funding Readiness';

  return 'Other';
}
