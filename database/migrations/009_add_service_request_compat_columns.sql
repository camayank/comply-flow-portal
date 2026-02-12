ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS entity_id integer;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS service_type text;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS period_label text;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS periodicity text;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS due_date timestamp;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS description text;

UPDATE service_requests
SET entity_id = business_entity_id
WHERE entity_id IS NULL AND business_entity_id IS NOT NULL;

UPDATE service_requests
SET service_type = service_id
WHERE service_type IS NULL AND service_id IS NOT NULL;
