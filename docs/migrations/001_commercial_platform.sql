-- ============================================================================
-- KitchenSync Commercial Platform - Supabase Migration
-- ============================================================================
-- Run this in your Supabase SQL Editor to create all tables for the
-- commercial platform (business accounts, reservations, etc.)
--
-- Prerequisites:
-- - Existing user_profiles table with is_admin field
-- - Supabase Auth enabled
-- ============================================================================

-- ============================================================================
-- PHASE 1: BUSINESS ACCOUNTS
-- ============================================================================

-- Business accounts (one per commercial entity)
CREATE TABLE IF NOT EXISTS business_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Business identity
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN (
    'restaurant', 'cafe', 'farm', 'farmstand', 'farmers_market',
    'food_producer', 'food_store', 'catering', 'food_truck'
  )),
  slug TEXT UNIQUE NOT NULL,

  -- Contact & Location
  email TEXT NOT NULL,
  phone TEXT,
  website_url TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Branding
  logo_url TEXT,
  cover_image_url TEXT,
  brand_color TEXT DEFAULT '#000000',
  description TEXT,

  -- Business details (encrypted sensitive data)
  tax_id TEXT,
  business_license TEXT,

  -- Platform settings
  subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN (
    'starter', 'professional', 'enterprise'
  )),
  subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN (
    'trialing', 'active', 'past_due', 'canceled', 'paused'
  )),
  trial_ends_at TIMESTAMPTZ,

  -- Payment processing (Stripe Connect)
  stripe_account_id TEXT,
  stripe_account_status TEXT DEFAULT 'pending',
  commission_rate DECIMAL(5, 4) DEFAULT 0.0500,

  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for business_accounts
CREATE INDEX idx_business_accounts_owner ON business_accounts(owner_user_id);
CREATE INDEX idx_business_accounts_type ON business_accounts(business_type);
CREATE INDEX idx_business_accounts_slug ON business_accounts(slug);
CREATE INDEX idx_business_accounts_active ON business_accounts(is_active, is_verified);
CREATE INDEX idx_business_accounts_location ON business_accounts(city, state);

-- Business team members
CREATE TABLE IF NOT EXISTS business_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Role & permissions
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN (
    'owner', 'manager', 'staff', 'accountant', 'marketing'
  )),
  permissions JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, user_id)
);

-- Indexes for business_team_members
CREATE INDEX idx_team_members_business ON business_team_members(business_id);
CREATE INDEX idx_team_members_user ON business_team_members(user_id);

-- Business operating hours
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,

  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT FALSE,
  notes TEXT,

  UNIQUE(business_id, day_of_week)
);

-- Business activity log (audit trail)
CREATE TABLE IF NOT EXISTS business_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity log
CREATE INDEX idx_activity_log_business ON business_activity_log(business_id, created_at DESC);
CREATE INDEX idx_activity_log_user ON business_activity_log(user_id, created_at DESC);

-- ============================================================================
-- PHASE 2: RESERVATION SYSTEM
-- ============================================================================

-- Restaurant tables/seating
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,

  table_number TEXT NOT NULL,
  capacity_min INTEGER DEFAULT 1,
  capacity_max INTEGER NOT NULL,
  section TEXT, -- 'main', 'patio', 'private', 'bar'
  is_active BOOLEAN DEFAULT TRUE,

  -- Position for visual floor layout
  position_x INTEGER,
  position_y INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tables
CREATE INDEX idx_tables_business ON restaurant_tables(business_id);
CREATE INDEX idx_tables_active ON restaurant_tables(business_id, is_active);

-- Reservation settings per business
CREATE TABLE IF NOT EXISTS reservation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID UNIQUE NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,

  -- Booking rules
  min_party_size INTEGER DEFAULT 1,
  max_party_size INTEGER DEFAULT 20,
  booking_window_days INTEGER DEFAULT 30,
  min_advance_hours INTEGER DEFAULT 2,

  -- Time slots
  slot_duration_minutes INTEGER DEFAULT 15,
  default_dining_duration INTEGER DEFAULT 90,

  -- Capacity
  allow_waitlist BOOLEAN DEFAULT TRUE,
  max_reservations_per_slot INTEGER,

  -- Cancellation
  cancellation_policy TEXT,
  cancellation_deadline_hours INTEGER DEFAULT 24,

  -- Confirmations
  require_confirmation BOOLEAN DEFAULT FALSE,
  auto_confirm BOOLEAN DEFAULT TRUE,
  send_reminders BOOLEAN DEFAULT TRUE,
  reminder_hours_before INTEGER DEFAULT 24,

  -- Deposits
  require_deposit BOOLEAN DEFAULT FALSE,
  deposit_amount DECIMAL(10, 2),
  deposit_policy TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id),

  -- Customer info
  customer_user_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,

  -- Reservation details
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  duration_minutes INTEGER DEFAULT 90,

  -- Table assignment
  table_id UUID REFERENCES restaurant_tables(id),
  seating_preference TEXT, -- 'indoor', 'outdoor', 'bar', 'private'

  -- Special requests
  special_requests TEXT,
  occasion TEXT, -- 'birthday', 'anniversary', 'business', 'date_night', etc.

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'
  )),
  confirmed_at TIMESTAMPTZ,
  seated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Source tracking
  source TEXT DEFAULT 'app' CHECK (source IN (
    'app', 'website', 'phone', 'walk_in', 'third_party'
  )),

  -- Reminders
  reminder_sent_at TIMESTAMPTZ,
  confirmation_sent_at TIMESTAMPTZ,

  -- Internal notes
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reservations
CREATE INDEX idx_reservations_business ON reservations(business_id);
CREATE INDEX idx_reservations_date ON reservations(business_id, reservation_date);
CREATE INDEX idx_reservations_status ON reservations(business_id, status);
CREATE INDEX idx_reservations_customer ON reservations(customer_user_id);

-- ============================================================================
-- PHASE 3: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for business_accounts
-- ============================================================================

-- Public can view active, verified businesses (for discovery)
CREATE POLICY "public_business_read" ON business_accounts
  FOR SELECT
  USING (is_active = TRUE);

-- Owners can do everything with their businesses
CREATE POLICY "owner_business_all" ON business_accounts
  FOR ALL
  USING (owner_user_id = auth.uid());

-- Team members can view their business
CREATE POLICY "team_business_read" ON business_accounts
  FOR SELECT
  USING (
    id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- RLS Policies for business_team_members
-- ============================================================================

-- Team members can view their own team
CREATE POLICY "team_view_own" ON business_team_members
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Business owners can manage team
CREATE POLICY "owner_manage_team" ON business_team_members
  FOR ALL
  USING (
    business_id IN (
      SELECT id FROM business_accounts WHERE owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS Policies for business_hours
-- ============================================================================

-- Anyone can view business hours
CREATE POLICY "public_hours_read" ON business_hours
  FOR SELECT
  USING (TRUE);

-- Team can manage hours
CREATE POLICY "team_hours_manage" ON business_hours
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'manager')
    )
  );

-- ============================================================================
-- RLS Policies for restaurant_tables
-- ============================================================================

-- Public can view active tables
CREATE POLICY "public_tables_read" ON restaurant_tables
  FOR SELECT
  USING (is_active = TRUE);

-- Team can manage tables
CREATE POLICY "team_tables_manage" ON restaurant_tables
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'manager')
    )
  );

-- ============================================================================
-- RLS Policies for reservation_settings
-- ============================================================================

-- Public can view settings
CREATE POLICY "public_settings_read" ON reservation_settings
  FOR SELECT
  USING (TRUE);

-- Team can manage settings
CREATE POLICY "team_settings_manage" ON reservation_settings
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'manager')
    )
  );

-- ============================================================================
-- RLS Policies for reservations
-- ============================================================================

-- Customers can view their own reservations
CREATE POLICY "customer_reservations_own" ON reservations
  FOR SELECT
  USING (customer_user_id = auth.uid());

-- Customers can create reservations
CREATE POLICY "customer_reservations_create" ON reservations
  FOR INSERT
  WITH CHECK (TRUE);

-- Customers can cancel their own reservations
CREATE POLICY "customer_reservations_cancel" ON reservations
  FOR UPDATE
  USING (customer_user_id = auth.uid())
  WITH CHECK (status = 'cancelled');

-- Team can manage all reservations for their business
CREATE POLICY "team_reservations_manage" ON reservations
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- RLS Policies for business_activity_log
-- ============================================================================

-- Team can view their business activity
CREATE POLICY "team_activity_read" ON business_activity_log
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Team can create activity entries
CREATE POLICY "team_activity_create" ON business_activity_log
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_business_accounts_updated_at
  BEFORE UPDATE ON business_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_business_team_members_updated_at
  BEFORE UPDATE ON business_team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reservation_settings_updated_at
  BEFORE UPDATE ON reservation_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- EXTEND user_profiles FOR BUSINESS ACCOUNTS
-- ============================================================================

-- Add business-related fields to user_profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN account_type TEXT DEFAULT 'consumer';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'primary_business_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN primary_business_id UUID REFERENCES business_accounts(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_customer_id TEXT;
  END IF;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS (for service role)
-- ============================================================================

-- Grant necessary permissions for the service role
GRANT ALL ON business_accounts TO service_role;
GRANT ALL ON business_team_members TO service_role;
GRANT ALL ON business_hours TO service_role;
GRANT ALL ON business_activity_log TO service_role;
GRANT ALL ON restaurant_tables TO service_role;
GRANT ALL ON reservation_settings TO service_role;
GRANT ALL ON reservations TO service_role;

-- Grant permissions for authenticated users
GRANT SELECT, INSERT, UPDATE ON business_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_hours TO authenticated;
GRANT SELECT, INSERT ON business_activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON restaurant_tables TO authenticated;
GRANT SELECT, INSERT, UPDATE ON reservation_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON reservations TO authenticated;

-- Grant read access for anonymous users (public discovery)
GRANT SELECT ON business_accounts TO anon;
GRANT SELECT ON business_hours TO anon;
GRANT SELECT ON restaurant_tables TO anon;
GRANT SELECT ON reservation_settings TO anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify the migration succeeded:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT * FROM business_accounts LIMIT 1;
-- SELECT * FROM pg_policies WHERE tablename LIKE 'business%' OR tablename LIKE 'reservation%';
