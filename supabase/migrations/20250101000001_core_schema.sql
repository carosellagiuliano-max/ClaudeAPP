-- Migration 001: Core Schema
-- SCHNITTWERK - Foundation Tables
-- Creates: salons, profiles, roles, user_roles, audit_logs
-- Purpose: Multi-tenant foundation with RBAC

-- ============================================================
-- EXTENSIONS
-- ============================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crypto functions for hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

-- Role names for RBAC
CREATE TYPE role_name AS ENUM (
  'admin',      -- Full access to salon
  'manager',    -- Management access
  'mitarbeiter',-- Staff member
  'kunde',      -- Customer
  'hq'          -- Cross-salon access (future)
);

-- Audit log action types
CREATE TYPE audit_action_type AS ENUM (
  'appointment_created',
  'appointment_updated',
  'appointment_cancelled',
  'appointment_completed',
  'customer_created',
  'customer_updated',
  'customer_view',
  'customer_export',
  'customer_deleted',
  'staff_created',
  'staff_updated',
  'order_created',
  'order_updated',
  'payment_captured',
  'payment_refunded',
  'role_assigned',
  'role_revoked',
  'impersonation_start',
  'impersonation_end',
  'login',
  'logout',
  'settings_changed'
);

-- ============================================================
-- SALONS TABLE
-- ============================================================
-- Core table: Every business record references a salon

CREATE TABLE salons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic info
  name TEXT NOT NULL,
  legal_entity_name TEXT,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier

  -- Location
  address_street TEXT NOT NULL,
  address_city TEXT NOT NULL,
  address_postal_code TEXT NOT NULL,
  address_country TEXT NOT NULL DEFAULT 'CH',

  -- Contact
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Settings
  timezone TEXT NOT NULL DEFAULT 'Europe/Zurich',
  currency TEXT NOT NULL DEFAULT 'CHF',
  locale TEXT NOT NULL DEFAULT 'de-CH',

  -- Accounting
  tax_id TEXT, -- Swiss UID number
  accounting_settings JSONB DEFAULT '{}'::jsonb,

  -- Features
  features JSONB DEFAULT '{"booking": true, "shop": true, "loyalty": true}'::jsonb,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT salons_name_length CHECK (char_length(name) >= 2),
  CONSTRAINT salons_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Indexes
CREATE INDEX idx_salons_slug ON salons(slug);
CREATE INDEX idx_salons_active ON salons(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER salons_updated_at
  BEFORE UPDATE ON salons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PROFILES TABLE
-- ============================================================
-- Links to auth.users, extended user information

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,

  -- Preferences
  preferred_language TEXT DEFAULT 'de',
  timezone TEXT DEFAULT 'Europe/Zurich',

  -- Avatar
  avatar_url TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  phone_verified BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT profiles_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROLES TABLE
-- ============================================================
-- Static role definitions

CREATE TABLE roles (
  name role_name PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, display_name, description, permissions) VALUES
  ('admin', 'Administrator', 'Full access to all salon features', '{"all": true}'::jsonb),
  ('manager', 'Manager', 'Manage bookings, staff, and customers', '{"bookings": "rw", "customers": "rw", "staff": "r", "analytics": "r"}'::jsonb),
  ('mitarbeiter', 'Mitarbeiter', 'View bookings and customers', '{"bookings": "r", "customers": "r"}'::jsonb),
  ('kunde', 'Kunde', 'Customer access to portal', '{"bookings": "own", "orders": "own", "profile": "own"}'::jsonb),
  ('hq', 'HQ', 'Cross-salon access for headquarters', '{"all": true, "multi_salon": true}'::jsonb);

-- ============================================================
-- USER_ROLES TABLE
-- ============================================================
-- M:N relationship: Users can have multiple roles across salons

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  role_name role_name NOT NULL REFERENCES roles(name),

  -- Metadata
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiry for temporary roles

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  -- HQ role has no salon_id, all others must have salon_id
  CONSTRAINT user_roles_salon_requirement CHECK (
    (role_name = 'hq' AND salon_id IS NULL) OR
    (role_name != 'hq' AND salon_id IS NOT NULL)
  ),

  -- Unique: one role per user per salon
  CONSTRAINT user_roles_unique UNIQUE (profile_id, salon_id, role_name)
);

-- Indexes
CREATE INDEX idx_user_roles_profile ON user_roles(profile_id);
CREATE INDEX idx_user_roles_salon ON user_roles(salon_id);
CREATE INDEX idx_user_roles_active ON user_roles(profile_id, salon_id) WHERE is_active = true;

-- ============================================================
-- AUDIT_LOGS TABLE
-- ============================================================
-- Immutable audit trail for compliance (GDPR, Swiss DSG)

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Context
  salon_id UUID REFERENCES salons(id),
  actor_profile_id UUID REFERENCES profiles(id),

  -- Action
  action_type audit_action_type NOT NULL,

  -- Target
  target_type TEXT, -- e.g., 'customer', 'appointment', 'order'
  target_id UUID,

  -- Details
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,

  -- Timestamp (immutable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_salon ON audit_logs(salon_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_profile_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action_type, created_at DESC);

-- Prevent updates and deletes on audit logs (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_prevent_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_changes();

CREATE TRIGGER audit_logs_prevent_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_changes();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function: Get user's salon IDs
CREATE OR REPLACE FUNCTION get_user_salon_ids(user_id UUID)
RETURNS TABLE(salon_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT ur.salon_id
  FROM user_roles ur
  WHERE ur.profile_id = user_id
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    AND ur.salon_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has role in salon
CREATE OR REPLACE FUNCTION user_has_role(
  user_id UUID,
  p_salon_id UUID,
  p_role_name role_name
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.profile_id = user_id
      AND ur.salon_id = p_salon_id
      AND ur.role_name = p_role_name
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
  p_salon_id UUID,
  p_actor_profile_id UUID,
  p_action_type audit_action_type,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    salon_id,
    actor_profile_id,
    action_type,
    target_type,
    target_id,
    metadata
  ) VALUES (
    p_salon_id,
    p_actor_profile_id,
    p_action_type,
    p_target_type,
    p_target_id,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE salons IS 'Core table: Each salon is a tenant in the multi-tenant architecture';
COMMENT ON TABLE profiles IS 'Extended user information, linked to auth.users';
COMMENT ON TABLE roles IS 'Static role definitions for RBAC';
COMMENT ON TABLE user_roles IS 'M:N relationship: users can have multiple roles across salons';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance (GDPR, Swiss DSG)';

COMMENT ON COLUMN salons.slug IS 'URL-friendly identifier for the salon';
COMMENT ON COLUMN salons.timezone IS 'IANA timezone, e.g., Europe/Zurich';
COMMENT ON COLUMN salons.features IS 'Feature flags per salon (booking, shop, loyalty)';
COMMENT ON COLUMN user_roles.expires_at IS 'Optional expiry for temporary role assignments';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context (before/after values, etc.)';
