-- ============================================================================
-- KitchenSync Commercial Platform - Phase 3: Customer CRM & Loyalty
-- ============================================================================
-- Run this AFTER 002_menu_orders.sql
-- Adds customer profiles, activity tracking, and loyalty program
-- ============================================================================

-- ============================================================================
-- CUSTOMER CRM
-- ============================================================================

-- Customer profiles per business
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,

  -- Link to platform user (optional - guests don't have accounts)
  user_id UUID REFERENCES auth.users(id),

  -- Customer info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Marketing preferences
  marketing_opt_in BOOLEAN DEFAULT FALSE,
  sms_opt_in BOOLEAN DEFAULT FALSE,

  -- Tags and notes
  tags JSONB, -- ["vip", "regular", "new"]
  internal_notes TEXT,
  dietary_restrictions TEXT,
  preferences JSONB, -- {seating_preference, favorite_items, etc.}

  -- Denormalized stats
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  average_spend DECIMAL(10, 2) DEFAULT 0,
  last_visit_at TIMESTAMPTZ,

  -- Source tracking
  source TEXT DEFAULT 'pos' CHECK (source IN (
    'pos', 'reservation', 'order', 'manual', 'import'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, email)
);

CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_email ON customers(business_id, email);
CREATE INDEX idx_customers_phone ON customers(business_id, phone);
CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_customers_last_visit ON customers(business_id, last_visit_at DESC);

-- Customer activity log
CREATE TABLE IF NOT EXISTS customer_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL, -- Denormalized for querying

  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'order', 'reservation', 'visit', 'feedback', 'note',
    'loyalty_earned', 'loyalty_redeemed'
  )),

  -- References
  order_id UUID REFERENCES orders(id),
  reservation_id UUID REFERENCES reservations(id),

  -- Activity details
  description TEXT,
  amount DECIMAL(10, 2),
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_activities_customer ON customer_activities(customer_id, created_at DESC);
CREATE INDEX idx_customer_activities_business ON customer_activities(business_id, activity_type);

-- ============================================================================
-- LOYALTY PROGRAM
-- ============================================================================

-- Loyalty points balance per customer
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL, -- Denormalized

  points_balance INTEGER DEFAULT 0,
  lifetime_earned INTEGER DEFAULT 0,
  lifetime_redeemed INTEGER DEFAULT 0,

  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_points_business ON loyalty_points(business_id);
CREATE INDEX idx_loyalty_points_tier ON loyalty_points(business_id, tier);

-- Loyalty transactions
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_points_id UUID NOT NULL REFERENCES loyalty_points(id) ON DELETE CASCADE,
  business_id UUID NOT NULL, -- Denormalized

  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'earned', 'redeemed', 'adjusted', 'expired'
  )),
  points INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,

  -- References
  order_id UUID REFERENCES orders(id),
  description TEXT,
  processed_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_transactions_points ON loyalty_transactions(loyalty_points_id, created_at DESC);
CREATE INDEX idx_loyalty_transactions_business ON loyalty_transactions(business_id);

-- Loyalty program settings per business
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID UNIQUE NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,

  is_enabled BOOLEAN DEFAULT FALSE,
  program_name TEXT DEFAULT 'Rewards Program',

  -- Earning rules
  points_per_dollar INTEGER DEFAULT 1,
  minimum_spend DECIMAL(10, 2),

  -- Redemption rules
  points_per_reward INTEGER DEFAULT 100,
  reward_value DECIMAL(10, 2) DEFAULT 5.00,
  max_redemption_percent DECIMAL(5, 2) DEFAULT 50,

  -- Tier thresholds
  tier_thresholds JSONB, -- {silver: 500, gold: 1000, platinum: 2500}

  -- Expiration
  points_expire_days INTEGER, -- null = never

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;

-- Customers: Team can manage
CREATE POLICY "team_customers_manage" ON customers
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Customers: Users can view their own profile
CREATE POLICY "user_customer_own" ON customers
  FOR SELECT USING (user_id = auth.uid());

-- Customer activities: Team can manage
CREATE POLICY "team_activities_manage" ON customer_activities
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Loyalty points: Team can manage
CREATE POLICY "team_loyalty_points_manage" ON loyalty_points
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Loyalty points: Customers can view their own
CREATE POLICY "customer_loyalty_points_view" ON loyalty_points
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Loyalty transactions: Team can manage
CREATE POLICY "team_loyalty_transactions_manage" ON loyalty_transactions
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Loyalty transactions: Customers can view their own
CREATE POLICY "customer_loyalty_transactions_view" ON loyalty_transactions
  FOR SELECT USING (
    loyalty_points_id IN (
      SELECT id FROM loyalty_points WHERE customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
      )
    )
  );

-- Loyalty settings: Public read
CREATE POLICY "public_loyalty_settings_read" ON loyalty_settings
  FOR SELECT USING (is_enabled = TRUE);

-- Loyalty settings: Team can manage
CREATE POLICY "team_loyalty_settings_manage" ON loyalty_settings
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_loyalty_points_updated_at
  BEFORE UPDATE ON loyalty_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_loyalty_settings_updated_at
  BEFORE UPDATE ON loyalty_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT ALL ON customers TO service_role;
GRANT ALL ON customer_activities TO service_role;
GRANT ALL ON loyalty_points TO service_role;
GRANT ALL ON loyalty_transactions TO service_role;
GRANT ALL ON loyalty_settings TO service_role;

GRANT SELECT ON loyalty_settings TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO authenticated;
GRANT SELECT, INSERT ON customer_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON loyalty_points TO authenticated;
GRANT SELECT, INSERT ON loyalty_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON loyalty_settings TO authenticated;
