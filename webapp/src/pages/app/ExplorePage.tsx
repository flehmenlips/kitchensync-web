import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Search,
  MapPin,
  ChefHat,
  Tractor,
  Coffee,
  Truck,
  Store,
  ShoppingBasket,
  Utensils,
  Building2,
  BadgeCheck,
  Users,
  Map as MapIcon,
  List,
  Navigation,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const businessTypes = [
  { value: 'all', label: 'All', icon: Building2 },
  { value: 'restaurant', label: 'Restaurants', icon: Utensils },
  { value: 'cafe', label: 'Cafes', icon: Coffee },
  { value: 'farm', label: 'Farms', icon: Tractor },
  { value: 'food_truck', label: 'Food Trucks', icon: Truck },
  { value: 'food_store', label: 'Food Stores', icon: Store },
  { value: 'food_producer', label: 'Producers', icon: ShoppingBasket },
  { value: 'farmers_market', label: 'Markets', icon: ChefHat },
];

function formatBusinessType(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

interface ExploreBusinessItem {
  id: string;
  businessName: string;
  businessType: string;
  slug: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  isVerified: boolean;
  latitude: number | null;
  longitude: number | null;
}

function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 12, { duration: 1.5 });
  }, [lat, lng, map]);
  return null;
}

export function ExplorePage() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (viewMode === 'map' && !userLocation) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 39.8283, lng: -98.5795 }),
        { timeout: 5000 }
      );
    }
  }, [viewMode, userLocation]);

  const { data: businesses, isLoading, isError } = useQuery({
    queryKey: ['explore-businesses', selectedType],
    queryFn: async () => {
      let query = supabase
        .from('business_accounts')
        .select('id, owner_user_id, business_name, business_type, slug, logo_url, cover_image_url, description, city, state, is_verified, is_active, latitude, longitude, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (selectedType !== 'all') {
        query = query.eq('business_type', selectedType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(b => ({
        id: b.id,
        businessName: b.business_name,
        businessType: b.business_type,
        slug: b.slug,
        logoUrl: b.logo_url,
        coverImageUrl: b.cover_image_url,
        description: b.description,
        city: b.city,
        state: b.state,
        isVerified: b.is_verified,
        latitude: b.latitude,
        longitude: b.longitude,
      })) as ExploreBusinessItem[];
    },
    retry: 1,
  });

  const filtered = businesses?.filter(b =>
    !search || b.businessName?.toLowerCase().includes(search.toLowerCase()) ||
    b.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const mappable = filtered.filter(b => b.latitude && b.longitude);

  const defaultCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : mappable.length > 0
    ? [mappable[0].latitude!, mappable[0].longitude!]
    : [39.8283, -98.5795];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Explore</h1>
          <p className="text-sm text-muted-foreground">Discover restaurants, farms, and food businesses near you</p>
        </div>
        <div className="flex gap-1 bg-secondary/30 rounded-lg p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('map')}
          >
            <MapIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search businesses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary/30 border-border/50"
        />
      </div>

      {/* Type filters */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {businessTypes.map((type) => (
            <Button
              key={type.value}
              variant={selectedType === type.value ? 'default' : 'outline'}
              size="sm"
              className={selectedType === type.value
                ? 'bg-primary text-primary-foreground shrink-0'
                : 'shrink-0 border-border/50 text-muted-foreground hover:text-foreground'
              }
              onClick={() => setSelectedType(type.value)}
            >
              <type.icon className="h-3.5 w-3.5 mr-1.5" />
              {type.label}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Discover People */}
      <Link to="/app/discover" className="block">
        <Card className="bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Discover People</p>
              <p className="text-xs text-muted-foreground">Find and follow other foodies in the community</p>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="h-[500px] rounded-xl overflow-hidden border border-border/50">
          <MapContainer
            center={defaultCenter}
            zoom={userLocation ? 12 : 4}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {userLocation && <FlyToLocation lat={userLocation.lat} lng={userLocation.lng} />}
            {mappable.map((biz) => (
              <Marker key={biz.id} position={[biz.latitude!, biz.longitude!]}>
                <Popup>
                  <Link to={`/app/business/${biz.id}`} className="no-underline">
                    <div className="min-w-[180px]">
                      <p className="font-semibold text-sm text-foreground">{biz.businessName}</p>
                      <p className="text-xs text-muted-foreground">{formatBusinessType(biz.businessType)}</p>
                      {(biz.city || biz.state) && (
                        <p className="text-xs text-muted-foreground mt-0.5">{[biz.city, biz.state].filter(Boolean).join(', ')}</p>
                      )}
                      <p className="text-xs text-primary mt-1 font-medium">View profile →</p>
                    </div>
                  </Link>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-card/60 border-border/40 overflow-hidden">
                  <Skeleton className="h-40 w-full" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <div className="py-16 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-semibold text-foreground">Unable to load businesses</h3>
              <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((biz) => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No businesses found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try a different search or category</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BusinessCard({ business }: { business: ExploreBusinessItem }) {
  return (
    <Link to={`/app/business/${business.id}`}>
      <Card className="bg-card/60 border-border/40 overflow-hidden hover:border-primary/30 transition-all group">
        <div className="h-40 bg-secondary/30 relative overflow-hidden">
          {business.coverImageUrl ? (
            <img
              src={business.coverImageUrl}
              alt={business.businessName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
              <Building2 className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}
          {business.logoUrl && (
            <div className="absolute bottom-2 left-2 w-10 h-10 rounded-lg bg-card border border-border/50 overflow-hidden">
              <img src={business.logoUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <CardContent className="p-4 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {business.businessName}
            </h3>
            {business.isVerified && <BadgeCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{formatBusinessType(business.businessType)}</Badge>
          </div>
          {business.description && <p className="text-xs text-muted-foreground line-clamp-2">{business.description}</p>}
          {(business.city || business.state) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{[business.city, business.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
