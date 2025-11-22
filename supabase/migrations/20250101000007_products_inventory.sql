-- =====================================================================================
-- Migration: Products and Inventory
-- =====================================================================================
-- Purpose: E-commerce product catalog with inventory management
--
-- Tables:
--   - product_categories: Hierarchical product categories
--   - products: Hair care products, styling tools, gift sets
--   - product_variants: Size/color variations (e.g., 100ml, 250ml, 500ml)
--   - product_images: Multiple images per product
--   - inventory_transactions: Audit trail for stock movements
--
-- Features:
--   - Multi-tenant (salon_id scoped)
--   - SKU management
--   - Stock tracking with low-stock alerts
--   - Price tiers (regular, sale, member)
--   - Product bundling for gift sets
--   - Image gallery support
--   - Tax rate association
-- =====================================================================================

-- =====================================================================================
-- PRODUCT CATEGORIES
-- =====================================================================================

CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,

  -- Basic Info
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Display
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_in_navigation BOOLEAN NOT NULL DEFAULT true,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Images
  image_url TEXT,
  banner_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_categories_slug_unique UNIQUE (salon_id, slug)
);

CREATE INDEX idx_product_categories_salon ON product_categories(salon_id);
CREATE INDEX idx_product_categories_parent ON product_categories(parent_id);
CREATE INDEX idx_product_categories_active ON product_categories(salon_id, is_active);

COMMENT ON TABLE product_categories IS 'Hierarchical product categories (e.g., Shampoo > Feuchtigkeit, Styling > Gel)';

-- =====================================================================================
-- PRODUCTS
-- =====================================================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE RESTRICT,

  -- Basic Info
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sku TEXT, -- Optional base SKU, variants have their own
  description TEXT,
  short_description TEXT,

  -- Brand Info
  brand TEXT,
  manufacturer TEXT,

  -- Pricing (base price, variants can override)
  base_price_chf NUMERIC(10, 2) NOT NULL CHECK (base_price_chf >= 0),
  sale_price_chf NUMERIC(10, 2) CHECK (sale_price_chf IS NULL OR sale_price_chf >= 0),
  member_price_chf NUMERIC(10, 2) CHECK (member_price_chf IS NULL OR member_price_chf >= 0),

  -- Sale Period
  sale_starts_at TIMESTAMPTZ,
  sale_ends_at TIMESTAMPTZ,

  -- Stock (if no variants, tracked here)
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  allow_backorder BOOLEAN NOT NULL DEFAULT false,

  -- Product Type
  has_variants BOOLEAN NOT NULL DEFAULT false, -- If true, use product_variants
  is_bundle BOOLEAN NOT NULL DEFAULT false, -- Gift sets, etc.

  -- Display
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  show_in_shop BOOLEAN NOT NULL DEFAULT true,

  -- Physical Properties
  weight_grams INTEGER,
  length_mm INTEGER,
  width_mm INTEGER,
  height_mm INTEGER,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT products_slug_unique UNIQUE (salon_id, slug),
  CONSTRAINT products_sku_unique UNIQUE (salon_id, sku),
  CONSTRAINT products_sale_dates_valid CHECK (
    sale_starts_at IS NULL OR
    sale_ends_at IS NULL OR
    sale_starts_at < sale_ends_at
  )
);

CREATE INDEX idx_products_salon ON products(salon_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(salon_id, is_active);
CREATE INDEX idx_products_featured ON products(salon_id, is_featured, is_active);
CREATE INDEX idx_products_brand ON products(brand);

COMMENT ON TABLE products IS 'Product catalog for hair care products, tools, and accessories';
COMMENT ON COLUMN products.has_variants IS 'If true, product has variants (size, color) in product_variants table';
COMMENT ON COLUMN products.is_bundle IS 'If true, product is a bundle/gift set containing multiple items';

-- =====================================================================================
-- PRODUCT VARIANTS
-- =====================================================================================

CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Variant Attributes
  name TEXT NOT NULL, -- "100ml", "250ml", "Rot", etc.
  sku TEXT NOT NULL,

  -- Variant Options (structured data)
  variant_options JSONB, -- e.g., {"size": "100ml", "color": "red"}

  -- Pricing (overrides product base price)
  price_chf NUMERIC(10, 2) NOT NULL CHECK (price_chf >= 0),
  sale_price_chf NUMERIC(10, 2) CHECK (sale_price_chf IS NULL OR sale_price_chf >= 0),
  member_price_chf NUMERIC(10, 2) CHECK (member_price_chf IS NULL OR member_price_chf >= 0),

  -- Stock
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,

  -- Physical Properties (can differ from base product)
  weight_grams INTEGER,

  -- Display
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false, -- Default variant to show

  -- Images (if different from product)
  image_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_variants_sku_unique UNIQUE (sku)
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_active ON product_variants(product_id, is_active);

COMMENT ON TABLE product_variants IS 'Product variations (e.g., 100ml vs 250ml, different colors)';
COMMENT ON COLUMN product_variants.variant_options IS 'Structured variant attributes as JSON';

-- =====================================================================================
-- PRODUCT IMAGES
-- =====================================================================================

CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,

  -- Image
  image_url TEXT NOT NULL,
  alt_text TEXT,

  -- Display
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_images_product_or_variant CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL) OR
    (product_id IS NOT NULL AND variant_id IS NOT NULL)
  )
);

CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_variant ON product_images(variant_id);
CREATE INDEX idx_product_images_primary ON product_images(product_id, is_primary);

COMMENT ON TABLE product_images IS 'Multiple images per product for gallery display';

-- =====================================================================================
-- PRODUCT BUNDLES
-- =====================================================================================

CREATE TABLE product_bundle_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  included_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  included_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,

  -- Quantity in bundle
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

  -- Display
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT bundle_items_product_or_variant CHECK (
    (included_product_id IS NOT NULL AND included_variant_id IS NULL) OR
    (included_product_id IS NULL AND included_variant_id IS NOT NULL)
  )
);

CREATE INDEX idx_product_bundle_items_bundle ON product_bundle_items(bundle_product_id);
CREATE INDEX idx_product_bundle_items_product ON product_bundle_items(included_product_id);

COMMENT ON TABLE product_bundle_items IS 'Items included in product bundles (gift sets)';

-- =====================================================================================
-- INVENTORY TRANSACTIONS
-- =====================================================================================

CREATE TYPE inventory_transaction_type AS ENUM (
  'purchase',     -- Stock received from supplier
  'sale',         -- Sold to customer (via order)
  'adjustment',   -- Manual adjustment (count, damage)
  'return',       -- Customer return
  'transfer',     -- Between locations (future)
  'loss',         -- Theft, damage, expiry
  'reservation'   -- Reserved for pending order
);

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,

  -- Transaction Details
  transaction_type inventory_transaction_type NOT NULL,
  quantity_change INTEGER NOT NULL, -- Positive = increase, Negative = decrease

  -- Before/After (for audit)
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,

  -- Reference
  reference_type TEXT, -- 'order', 'manual', 'supplier_order'
  reference_id UUID, -- ID of related order/document

  -- Notes
  notes TEXT,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT inventory_transactions_product_or_variant CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL) OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  ),
  CONSTRAINT inventory_transactions_quantity_valid CHECK (
    quantity_after = quantity_before + quantity_change
  )
);

CREATE INDEX idx_inventory_transactions_salon ON inventory_transactions(salon_id);
CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_variant ON inventory_transactions(variant_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);
CREATE INDEX idx_inventory_transactions_created ON inventory_transactions(created_at DESC);

COMMENT ON TABLE inventory_transactions IS 'Immutable audit log of all inventory movements';
COMMENT ON COLUMN inventory_transactions.quantity_change IS 'Positive = stock increase, Negative = stock decrease';

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Updated timestamp trigger
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
