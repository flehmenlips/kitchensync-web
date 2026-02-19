import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  BadgeCheck,
  CalendarDays,
  ShoppingBag,
  BookOpen,
  Loader2,
  ExternalLink,
  Building2,
} from 'lucide-react';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatBusinessType(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function BusinessProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('menu');

  const { data: business, isLoading } = useQuery({
    queryKey: ['business-profile', id],
    queryFn: async () => api.get<any>(`/api/business/${id}`),
    enabled: !!id,
  });

  const { data: hours } = useQuery({
    queryKey: ['business-hours', id],
    queryFn: async () => {
      try {
        return await api.get<any[]>(`/api/business/${id}/hours`);
      } catch {
        return [];
      }
    },
    enabled: !!id,
  });

  const { data: menuData } = useQuery({
    queryKey: ['business-public-menu', id],
    queryFn: async () => {
      try {
        return await api.get<any>(`/api/menu/${id}/public`);
      } catch {
        return { categories: [] };
      }
    },
    enabled: !!id && activeTab === 'menu',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="py-16 text-center">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <h3 className="text-lg font-semibold text-foreground">Business not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/app/explore')}>
          Back to Explore
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {/* Cover image */}
      {business.coverImageUrl && (
        <div className="aspect-[2.5/1] rounded-xl overflow-hidden bg-secondary/30 -mt-2">
          <img src={business.coverImageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Business info */}
      <div className="flex items-start gap-4">
        {business.logoUrl && (
          <div className="w-16 h-16 rounded-xl border border-border/50 overflow-hidden shrink-0 bg-card">
            <img src={business.logoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground truncate">{business.businessName}</h1>
            {business.isVerified && <BadgeCheck className="h-5 w-5 text-primary shrink-0" />}
          </div>
          <Badge variant="secondary">{formatBusinessType(business.businessType)}</Badge>
          {business.description && (
            <p className="text-sm text-muted-foreground">{business.description}</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
          <Link to={`/app/business/${id}/reserve`}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Reserve
          </Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link to={`/app/business/${id}/menu`}>
            <BookOpen className="h-4 w-4 mr-2" />
            Order
          </Link>
        </Button>
      </div>

      {/* Contact info */}
      <Card className="bg-card/60 border-border/40">
        <CardContent className="p-4 space-y-3">
          {(business.addressLine1 || business.city) && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-foreground">
                {[business.addressLine1, business.city, business.state].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {business.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`tel:${business.phone}`} className="text-primary hover:underline">{business.phone}</a>
            </div>
          )}
          {business.email && (
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${business.email}`} className="text-primary hover:underline">{business.email}</a>
            </div>
          )}
          {business.websiteUrl && (
            <div className="flex items-center gap-3 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={business.websiteUrl} target="_blank" rel="noopener" className="text-primary hover:underline flex items-center gap-1">
                Website <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Menu / Hours */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-secondary/30">
          <TabsTrigger value="menu" className="flex-1">Menu</TabsTrigger>
          <TabsTrigger value="hours" className="flex-1">Hours</TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="mt-4 space-y-4">
          {menuData?.categories?.length > 0 ? (
            menuData.categories.map((cat: any) => (
              <div key={cat.id}>
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                  {cat.name}
                </h3>
                <div className="space-y-2">
                  {cat.items?.map((item: any) => (
                    <Card key={item.id} className="bg-card/40 border-border/30">
                      <CardContent className="p-3">
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                            )}
                            <div className="flex gap-1.5 mt-1">
                              {item.isVegetarian && <Badge variant="secondary" className="text-[9px]">V</Badge>}
                              {item.isVegan && <Badge variant="secondary" className="text-[9px]">VG</Badge>}
                              {item.isGlutenFree && <Badge variant="secondary" className="text-[9px]">GF</Badge>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-foreground">
                              ${(item.price / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Menu not available
            </div>
          )}
        </TabsContent>

        <TabsContent value="hours" className="mt-4">
          <Card className="bg-card/60 border-border/40">
            <CardContent className="p-4 space-y-2">
              {hours && hours.length > 0 ? (
                hours.sort((a: any, b: any) => a.day_of_week - b.day_of_week).map((h: any) => (
                  <div key={h.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{dayNames[h.day_of_week]}</span>
                    <span className={h.is_closed ? 'text-muted-foreground' : 'text-foreground'}>
                      {h.is_closed ? 'Closed' : `${h.open_time} - ${h.close_time}`}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center">Hours not available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
