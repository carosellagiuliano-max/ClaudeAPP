-- =====================================================================
-- ADD IBAN TO SALONS TABLE
-- =====================================================================
-- This adds Swiss IBAN support for QR-Bill payment slips
-- Required for generating QR codes on invoices
-- =====================================================================

-- Add IBAN field to salons table
ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS iban TEXT;

-- Add comment
COMMENT ON COLUMN salons.iban IS 'Swiss IBAN for QR-Bill payment slips (21 characters, format: CHxx xxxx xxxx xxxx xxxx x)';

-- Add check constraint for Swiss IBAN format (optional but recommended)
ALTER TABLE salons
  ADD CONSTRAINT check_iban_format
  CHECK (iban IS NULL OR iban ~ '^CH[0-9]{2}[0-9A-Z]{17}$');
