-- ============================================
-- KitchenSync Marketplace - Database Migrations
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Creator Profiles (for verified creators)
-- ============================================

CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  creator_tier TEXT DEFAULT 'basic', -- 'basic', 'pro', 'partner'
  specialty_tags TEXT[],
  featured_recipe_id UUID,
  about_text TEXT,
  banner_image_url TEXT,
  contact_email TEXT,
  business_name TEXT,
  stripe_account_id TEXT,
  commission_rate DECIMAL DEFAULT 0.15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_user
ON creator_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_verified
ON creator_profiles(is_verified) WHERE is_verified = true;


-- ============================================
-- 2. Creator Verification Requests
-- ============================================

CREATE TABLE IF NOT EXISTS creator_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  portfolio_url TEXT,
  social_proof TEXT,
  reason TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_status
ON creator_verification_requests(status);

CREATE INDEX IF NOT EXISTS idx_verification_requests_user
ON creator_verification_requests(user_id);


-- ============================================
-- 3. Content Reports (for moderation)
-- ============================================

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id),
  content_type TEXT NOT NULL, -- 'recipe', 'comment', 'user', 'product'
  content_id UUID NOT NULL,
  reason TEXT NOT NULL, -- 'spam', 'inappropriate', 'copyright', 'harassment', 'other'
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned', 'dismissed'
  reviewed_by UUID REFERENCES auth.users(id),
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status
ON content_reports(status);

CREATE INDEX IF NOT EXISTS idx_content_reports_type
ON content_reports(content_type);


-- ============================================
-- 4. Products
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  image_urls TEXT[],
  category TEXT, -- 'spice', 'sauce', 'tool', 'book', 'course', 'kit'
  tags TEXT[],
  inventory_count INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_digital BOOLEAN DEFAULT false,
  digital_download_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_creator
ON products(creator_id);

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_active
ON products(is_active) WHERE is_active = true;


-- ============================================
-- 5. Product Variants
-- ============================================

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  inventory_count INTEGER,
  sku TEXT
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product
ON product_variants(product_id);


-- ============================================
-- 6. Orders
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  creator_id UUID REFERENCES creator_profiles(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'shipped', 'delivered', 'cancelled'
  subtotal_cents INTEGER,
  shipping_cents INTEGER,
  tax_cents INTEGER,
  total_cents INTEGER,
  shipping_address JSONB,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user
ON orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_creator
ON orders(creator_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_created
ON orders(created_at DESC);


-- ============================================
-- 7. Order Items
-- ============================================

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity INTEGER,
  price_cents INTEGER
);

CREATE INDEX IF NOT EXISTS idx_order_items_order
ON order_items(order_id);


-- ============================================
-- 8. Creator Payouts
-- ============================================

CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  stripe_transfer_id TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator
ON creator_payouts(creator_id);

CREATE INDEX IF NOT EXISTS idx_creator_payouts_status
ON creator_payouts(status);


-- ============================================
-- 9. Creator Earnings
-- ============================================

CREATE TABLE IF NOT EXISTS creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  gross_amount_cents INTEGER,
  platform_fee_cents INTEGER,
  net_amount_cents INTEGER,
  payout_id UUID REFERENCES creator_payouts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_earnings_creator
ON creator_earnings(creator_id);

CREATE INDEX IF NOT EXISTS idx_creator_earnings_payout
ON creator_earnings(payout_id);


-- ============================================
-- 10. RLS Policies for new tables
-- ============================================

-- Creator profiles
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage creator profiles" ON creator_profiles;
CREATE POLICY "Admins can manage creator profiles" ON creator_profiles
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Public can view verified creators" ON creator_profiles;
CREATE POLICY "Public can view verified creators" ON creator_profiles
  FOR SELECT TO authenticated
  USING (is_verified = true);

-- Verification requests
ALTER TABLE creator_verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage verification requests" ON creator_verification_requests;
CREATE POLICY "Admins can manage verification requests" ON creator_verification_requests
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Content reports
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage reports" ON content_reports;
CREATE POLICY "Admins can manage reports" ON content_reports
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users can create reports" ON content_reports;
CREATE POLICY "Users can create reports" ON content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products" ON products
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products" ON products
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Creator payouts
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage payouts" ON creator_payouts;
CREATE POLICY "Admins can manage payouts" ON creator_payouts
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Creator earnings
ALTER TABLE creator_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all earnings" ON creator_earnings;
CREATE POLICY "Admins can view all earnings" ON creator_earnings
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- ============================================
-- DONE!
-- ============================================
