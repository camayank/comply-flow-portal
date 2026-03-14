const PRIORITY_MULTIPLIERS: Record<string, number> = {
  CRITICAL: 0.25,
  HIGH: 0.5,
  NORMAL: 1.0,
  LOW: 1.5,
};

export async function calculateSlaDeadline(start: Date, baseHours: number, priority: string): Promise<Date> {
  const multiplier = PRIORITY_MULTIPLIERS[priority] || 1.0;
  const adjustedHours = Math.ceil(baseHours * multiplier);

  // DELEGATE to existing sla service (fixed in Task 1 with IST)
  const { slaService } = await import('../../sla-service');
  return slaService.addBusinessHours(start, adjustedHours);
}
