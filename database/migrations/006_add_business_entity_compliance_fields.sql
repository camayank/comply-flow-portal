ALTER TABLE business_entities
  ADD COLUMN IF NOT EXISTS annual_turnover numeric(15,2),
  ADD COLUMN IF NOT EXISTS employee_count integer;
