-- Add verification_notes column to business_accounts
-- Run this in Supabase SQL Editor

ALTER TABLE business_accounts
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN business_accounts.verification_notes IS 'Admin notes for verification approval or rejection reason';
