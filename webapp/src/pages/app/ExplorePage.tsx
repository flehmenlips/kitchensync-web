import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Search,
  MapPin,
  Star,
  Clock,
  ChefHat,
  Tractor,
  Coffee,
  Truck,
  Store,
  ShoppingBasket,
  Utensils,
  Building2,
  BadgeCheck,
} from 'lucide-react';

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

export function ExplorePage() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['explore-businesses', selectedType],
    queryFn: async () => {
      const params = new URLSearchParams({ active: 'true' });
      if (selectedType !== 'all') params.set('type', selectedType);
      return api.get<any[]>(`/api/business?${params}`);
    },
  });

  const filtered = businesses?.filter(b =>
    !search || b.businessName?.toLowerCase().includes(search.toLowerCase()) ||
    b.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Explore</h1>
        <p className="text-sm text-muted-foreground">Discover restaurants, farms, and food businesses near you</p>
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

      {/* Results */}
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
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((biz: any) => (
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
    </div>
  );
}

function BusinessCard({ business }: { business: any }) {
  return (
    <Link to={`/app/business/${business.id}`}>
      <Card className="bg-card/60 border-border/40 overflow-hidden hover:border-primary/30 transition-all group">
        {/* Cover image */}
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
          {/* Logo overlay */}
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
            {business.isVerified && (
              <BadgeCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {formatBusinessType(business.businessType)}
            </Badge>
          </div>

          {business.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{business.description}</p>
          )}

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
