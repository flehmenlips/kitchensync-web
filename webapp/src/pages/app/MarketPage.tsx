import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingBag,
  CalendarDays,
  Utensils,
  MapPin,
  BadgeCheck,
  ArrowRight,
  Star,
  Truck,
} from 'lucide-react';

export function MarketPage() {
  const { data: featured, isLoading } = useQuery({
    queryKey: ['market-featured'],
    queryFn: async () => {
      return api.get<any[]>('/api/business?active=true');
    },
  });

  const categories = [
    { label: 'Restaurants', type: 'restaurant', icon: Utensils, color: 'text-orange-400' },
    { label: 'Farms', type: 'farm', icon: Star, color: 'text-green-400' },
    { label: 'Food Trucks', type: 'food_truck', icon: Truck, color: 'text-blue-400' },
    { label: 'Reservations', type: 'reservations', icon: CalendarDays, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Market</h1>
        <p className="text-sm text-muted-foreground">Order food, book tables, and discover local producers</p>
      </div>

      {/* Quick categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categories.map((cat) => (
          <Link key={cat.type} to={`/app/explore?type=${cat.type}`}>
            <Card className="bg-card/60 border-border/40 hover:border-primary/30 transition-all cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center">
                  <cat.icon className={`h-6 w-6 ${cat.color}`} />
                </div>
                <p className="text-sm font-medium text-foreground">{cat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Featured businesses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Featured</h2>
          <Link to="/app/explore" className="text-sm text-primary hover:underline flex items-center gap-1">
            See all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="bg-card/60 border-border/40">
                <Skeleton className="h-36 w-full" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : featured && featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {featured.slice(0, 6).map((biz: any) => (
              <Link key={biz.id} to={`/app/business/${biz.id}`}>
                <Card className="bg-card/60 border-border/40 overflow-hidden hover:border-primary/30 transition-all group">
                  <div className="h-36 bg-secondary/30 relative overflow-hidden">
                    {biz.coverImageUrl ? (
                      <img
                        src={biz.coverImageUrl}
                        alt={biz.businessName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {biz.businessName}
                      </h3>
                      {biz.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {biz.businessType?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </Badge>
                      {biz.city && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {biz.city}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No businesses available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
