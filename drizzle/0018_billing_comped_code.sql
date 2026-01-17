ALTER TABLE organizations
  ADD COLUMN billingCompedCode varchar(64),
  ADD COLUMN billingCompedAt timestamp;
