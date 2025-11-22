-- =====================================================================
-- LEGAL DOCUMENTS VERSIONING
-- =====================================================================
-- Versionierung von rechtlichen Dokumenten
-- Features:
-- - Privacy Policy, Terms & Conditions, etc.
-- - Versionierung mit Changelog
-- - Tracking von Kunden-Zustimmungen
-- - GDPR-compliant Consent Management
-- =====================================================================

CREATE TYPE document_type AS ENUM (
  'privacy_policy',     -- Datenschutzerklärung
  'terms_conditions',   -- AGB
  'cancellation_policy',-- Stornierungsbedingungen
  'cookie_policy',      -- Cookie-Richtlinie
  'data_processing',    -- Datenverarbeitungsvereinbarung
  'consent_marketing',  -- Marketing-Einwilligung
  'consent_photos',     -- Foto-Einwilligung
  'other'               -- Andere
);

CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Document Type
  type document_type NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL, -- z.B. "privacy-policy"

  -- Versioning
  version TEXT NOT NULL, -- z.B. "1.0", "2.1"
  version_number INTEGER NOT NULL DEFAULT 1, -- Auto-increment per type

  -- Content
  content TEXT NOT NULL, -- HTML oder Markdown
  summary TEXT, -- Kurze Zusammenfassung der Änderungen

  -- Changelog
  changes TEXT[], -- Array von Änderungen: ["Added GDPR clause", "Updated contact info"]

  -- Gültigkeit
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ, -- NULL = aktuell gültig
  is_current BOOLEAN NOT NULL DEFAULT false, -- Nur eine Version pro type/salon kann current sein

  -- Zustimmung erforderlich?
  requires_acceptance BOOLEAN NOT NULL DEFAULT true,
  acceptance_label TEXT, -- z.B. "Ich stimme den Datenschutzbestimmungen zu"

  -- Meta
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(salon_id, type, version_number),
  CHECK (effective_from <= COALESCE(effective_until, '9999-12-31'::TIMESTAMPTZ))
);

-- Indexes
CREATE INDEX idx_legal_documents_salon ON legal_documents(salon_id, type, is_current);
CREATE INDEX idx_legal_documents_type ON legal_documents(type, is_current);
CREATE INDEX idx_legal_documents_current ON legal_documents(salon_id, type) WHERE is_current = true;

-- =====================================================================
-- CUSTOMER CONSENTS (GDPR-compliant Tracking)
-- =====================================================================

CREATE TYPE consent_status AS ENUM (
  'accepted',   -- Zugestimmt
  'rejected',   -- Abgelehnt
  'withdrawn',  -- Zurückgezogen (GDPR right to withdraw)
  'expired'     -- Abgelaufen (bei zeitlich begrenzten Consents)
);

CREATE TABLE customer_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Kunde
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Dokument
  document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  document_version TEXT NOT NULL, -- Snapshot der akzeptierten Version

  -- Consent
  status consent_status NOT NULL,

  -- Timestamps
  accepted_at TIMESTAMPTZ, -- Wann zugestimmt
  rejected_at TIMESTAMPTZ, -- Wann abgelehnt
  withdrawn_at TIMESTAMPTZ, -- Wann zurückgezogen (GDPR)

  -- Technische Details (GDPR Anforderung)
  ip_address INET, -- IP-Adresse bei Zustimmung
  user_agent TEXT, -- Browser/Device Info
  consent_method TEXT, -- z.B. "web_form", "app", "email", "paper"

  -- Expiry (für zeitlich begrenzte Consents)
  expires_at TIMESTAMPTZ,

  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (
    (status = 'accepted' AND accepted_at IS NOT NULL) OR
    (status = 'rejected' AND rejected_at IS NOT NULL) OR
    (status = 'withdrawn' AND withdrawn_at IS NOT NULL AND accepted_at IS NOT NULL) OR
    (status = 'expired')
  )
);

-- Indexes
CREATE INDEX idx_customer_consents_salon ON customer_consents(salon_id, customer_id);
CREATE INDEX idx_customer_consents_customer ON customer_consents(customer_id, document_type, status);
CREATE INDEX idx_customer_consents_document ON customer_consents(document_id);
CREATE INDEX idx_customer_consents_expires ON customer_consents(expires_at) WHERE status = 'accepted';

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

-- Legal Documents (Public read für aktuelle Versionen, Admin write)
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_documents_select_current" ON legal_documents
  FOR SELECT USING (
    is_current = true -- Jeder kann aktuelle Versionen lesen
    OR salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
  );

CREATE POLICY "legal_documents_insert" ON legal_documents
  FOR INSERT WITH CHECK (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

CREATE POLICY "legal_documents_update" ON legal_documents
  FOR UPDATE USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

CREATE POLICY "legal_documents_delete" ON legal_documents
  FOR DELETE USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

-- Customer Consents
ALTER TABLE customer_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_consents_select_own" ON customer_consents
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
  );

CREATE POLICY "customer_consents_insert" ON customer_consents
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
  );

CREATE POLICY "customer_consents_update_own" ON customer_consents
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
  );

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Function: Ensure only one document per type is current
CREATE OR REPLACE FUNCTION ensure_single_current_document()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    -- Set all other documents of same type/salon to not current
    UPDATE legal_documents
    SET is_current = false
    WHERE salon_id = NEW.salon_id
      AND type = NEW.type
      AND id != NEW.id
      AND is_current = true;

    -- Set effective_until for previous current version
    UPDATE legal_documents
    SET effective_until = NEW.effective_from
    WHERE salon_id = NEW.salon_id
      AND type = NEW.type
      AND id != NEW.id
      AND effective_until IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_current_document
  AFTER INSERT OR UPDATE OF is_current ON legal_documents
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION ensure_single_current_document();

-- Function: Auto-increment version_number
CREATE OR REPLACE FUNCTION set_document_version_number()
RETURNS TRIGGER AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  IF NEW.version_number IS NULL OR NEW.version_number = 1 THEN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_max_version
    FROM legal_documents
    WHERE salon_id = NEW.salon_id
      AND type = NEW.type;

    NEW.version_number := v_max_version;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_document_version_number
  BEFORE INSERT ON legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION set_document_version_number();

-- Function: Update timestamps
CREATE OR REPLACE FUNCTION update_legal_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_legal_documents_updated_at
  BEFORE UPDATE ON legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_timestamps();

CREATE TRIGGER trigger_customer_consents_updated_at
  BEFORE UPDATE ON customer_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_timestamps();

-- Function: Expire old consents (run via cron)
CREATE OR REPLACE FUNCTION expire_old_consents()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE customer_consents
  SET status = 'expired'
  WHERE status = 'accepted'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- HELPER VIEWS
-- =====================================================================

-- View: Aktuelle Dokumente pro Salon
CREATE VIEW current_legal_documents AS
SELECT
  d.*,
  s.name AS salon_name
FROM legal_documents d
JOIN salons s ON s.id = d.salon_id
WHERE d.is_current = true;

-- View: Customer Consent Status (neueste pro Document Type)
CREATE VIEW customer_consent_status AS
SELECT DISTINCT ON (customer_id, document_type)
  c.*,
  d.title AS document_title,
  d.is_current AS is_current_version
FROM customer_consents c
JOIN legal_documents d ON d.id = c.document_id
ORDER BY customer_id, document_type, created_at DESC;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE legal_documents IS 'Versionierte rechtliche Dokumente (Privacy Policy, AGB, etc.)';
COMMENT ON TABLE customer_consents IS 'GDPR-compliant Tracking von Kunden-Zustimmungen';
COMMENT ON COLUMN customer_consents.ip_address IS 'IP-Adresse bei Zustimmung (GDPR Anforderung)';
COMMENT ON COLUMN customer_consents.user_agent IS 'Browser/Device Info (GDPR Anforderung)';
COMMENT ON FUNCTION expire_old_consents() IS 'Setzt abgelaufene Consents auf expired (via Cron Job)';
