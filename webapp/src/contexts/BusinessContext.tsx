import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

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

export interface BusinessHours {
  id: string;
  businessId: string;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  notes?: string | null;
}

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  brandColor?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  hours?: BusinessHours[];
}

// API response shape for list endpoint (different field names, no hours)
interface BusinessListApiResponse {
  id: string;
  businessName: string;
  businessType: BusinessType;
  slug: string;
  description?: string;
  city?: string;
  state?: string;
  logoUrl?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

// API response shape for detail endpoint (includes all fields + hours)
interface BusinessDetailApiResponse {
  id: string;
  businessName: string;
  businessType: BusinessType;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  brandColor?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  hours?: BusinessHours[];
}

// Map API response to Business interface (list endpoint)
function mapApiBusinessList(apiData: BusinessListApiResponse): Business {
  return {
    id: apiData.id,
    name: apiData.businessName,
    type: apiData.businessType,
    slug: apiData.slug,
    description: apiData.description,
    city: apiData.city,
    state: apiData.state,
    logoUrl: apiData.logoUrl,
    isVerified: apiData.isVerified,
    isActive: apiData.isActive,
    createdAt: apiData.createdAt,
  };
}

// Map API response to Business interface (detail endpoint)
function mapApiBusinessDetail(apiData: BusinessDetailApiResponse): Business {
  return {
    id: apiData.id,
    name: apiData.businessName,
    type: apiData.businessType,
    slug: apiData.slug,
    description: apiData.description,
    email: apiData.email,
    phone: apiData.phone,
    websiteUrl: apiData.websiteUrl,
    addressLine1: apiData.addressLine1,
    addressLine2: apiData.addressLine2,
    city: apiData.city,
    state: apiData.state,
    postalCode: apiData.postalCode,
    logoUrl: apiData.logoUrl,
    coverImageUrl: apiData.coverImageUrl,
    brandColor: apiData.brandColor,
    isVerified: apiData.isVerified,
    isActive: apiData.isActive,
    createdAt: apiData.createdAt,
    hours: apiData.hours,
  };
}

interface BusinessUser {
  id: string;
  email: string;
  role: 'owner' | 'manager' | 'staff';
}

interface BusinessContextType {
  business: Business | null;
  businesses: Business[];
  businessUser: BusinessUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  setBusiness: (business: Business | null) => void;
  switchBusiness: (businessId: string) => void;
  refreshBusiness: () => Promise<void>;
  signOut: () => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// Get the business ID from URL if accessing directly (e.g., /business?id=xxx)
function getBusinessIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('businessId') || params.get('id');
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, signOut: authSignOut } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessUser, setBusinessUser] = useState<BusinessUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive isAuthenticated from the Supabase user
  const isAuthenticated = Boolean(user);

  // Fetch full business details (including hours)
  const fetchBusinessDetails = useCallback(async (businessId: string): Promise<Business | null> => {
    try {
      const data = await api.get<BusinessDetailApiResponse>(`/api/business/${businessId}`);
      if (data) {
        return mapApiBusinessDetail(data);
      }
      return null;
    } catch (err) {
      console.error('Error fetching business details:', err);
      return null;
    }
  }, []);

  // Refresh current business data
  const refreshBusiness = useCallback(async () => {
    if (!business?.id) return;

    const refreshedBusiness = await fetchBusinessDetails(business.id);
    if (refreshedBusiness) {
      setBusiness(refreshedBusiness);
      // Also update in the businesses list
      setBusinesses(prev => prev.map(b =>
        b.id === refreshedBusiness.id ? refreshedBusiness : b
      ));
    }
  }, [business?.id, fetchBusinessDetails]);

  // Fetch businesses when user changes
  useEffect(() => {
    async function fetchBusinesses() {
      // If no user is logged in, clear everything
      if (!user) {
        setBusinesses([]);
        setBusiness(null);
        setBusinessUser(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Check if a specific business ID is requested via URL
        const requestedBusinessId = getBusinessIdFromUrl();

        if (requestedBusinessId) {
          // Single business mode - only load the requested business
          const fullBusiness = await fetchBusinessDetails(requestedBusinessId);
          if (fullBusiness) {
            setBusinesses([fullBusiness]);
            setBusiness(fullBusiness);
            // Set business user from Supabase user
            setBusinessUser({
              id: user.id,
              email: user.email || '',
              role: 'owner', // Default role - in production this should come from team member data
            });
          } else {
            setError('Business not found');
          }
        } else {
          // Fetch businesses owned/managed by the current user
          const data = await api.get<BusinessListApiResponse[]>(`/api/business/user/${user.id}`);
          const mapped = (data || []).map(mapApiBusinessList);
          setBusinesses(mapped);

          // Set business user from Supabase user
          setBusinessUser({
            id: user.id,
            email: user.email || '',
            role: 'owner', // Default role - in production this should come from team member data
          });

          // If we have businesses, fetch full details for the first one
          if (mapped.length > 0) {
            const fullBusiness = await fetchBusinessDetails(mapped[0].id);
            setBusiness(fullBusiness || mapped[0]);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch businesses';
        setError(errorMessage);
        console.error('Error fetching businesses:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBusinesses();
  }, [user, fetchBusinessDetails]);

  const switchBusiness = useCallback(async (businessId: string) => {
    // Fetch full details for the selected business
    const fullBusiness = await fetchBusinessDetails(businessId);
    if (fullBusiness) {
      setBusiness(fullBusiness);
    } else {
      // Fallback to the basic info from the list
      const found = businesses.find((b) => b.id === businessId);
      if (found) {
        setBusiness(found);
      }
    }
  }, [businesses, fetchBusinessDetails]);

  const signOut = useCallback(() => {
    // Use AuthContext signOut to clear Supabase session
    authSignOut();
    // Clear local state
    setBusinesses([]);
    setBusiness(null);
    setBusinessUser(null);
  }, [authSignOut]);

  const value: BusinessContextType = {
    business,
    businesses,
    businessUser,
    isLoading,
    isAuthenticated,
    error,
    setBusiness,
    switchBusiness,
    refreshBusiness,
    signOut,
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
