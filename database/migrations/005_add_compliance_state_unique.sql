ALTER TABLE compliance_states
  ADD CONSTRAINT compliance_states_entity_id_unique UNIQUE (entity_id);
