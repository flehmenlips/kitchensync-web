import { createContext, useContext, useState, type ReactNode } from 'react';

export type BusinessType =
  | 'restaurant'
  | 'cafe'
  | 'farm'
  | 'farmstand'
  | 'farmers_market'
  | 'food_producer'
  | 'food_store'
  | 'catering'
  | 'food_truck';

interface Business {
  id: string;
  name: string;
  type: BusinessType;
  description: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website?: string;
  logo_url?: string;
  cover_image_url?: string;
  is_verified: boolean;
  created_at: string;
}

interface BusinessContextType {
  business: Business | null;
  isLoading: boolean;
  setBusiness: (business: Business | null) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// Mock business for demo purposes
const mockBusiness: Business = {
  id: 'demo-business',
  name: 'The Golden Fork',
  type: 'restaurant',
  description: 'A cozy farm-to-table restaurant serving seasonal American cuisine',
  address: '123 Main Street',
  city: 'San Francisco',
  state: 'CA',
  zip: '94102',
  phone: '(415) 555-0123',
  email: 'hello@goldenfork.com',
  website: 'https://goldenfork.com',
  is_verified: true,
  created_at: '2024-01-15T00:00:00Z',
};

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(mockBusiness);
  const [isLoading] = useState(false);

  const value: BusinessContextType = {
    business,
    isLoading,
    setBusiness,
  };

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
