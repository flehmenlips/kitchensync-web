import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  ShoppingBag,
  CalendarDays,
  Utensils,
  MapPin,
  BadgeCheck,
  ArrowRight,
  Star,
  Truck,
  Search,
  Package,
  BookOpen,
  ChefHat,
  Leaf,
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  priceCents: number;
  currency: string;
  imageUrls: string[];
  category: string | null;
  isDigital: boolean;
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  creatorName?: string;
}

const productCategories = [
  { value: 'all', label: 'All', icon: Package },
  { value: 'recipe_book', label: 'Recipe Books', icon: BookOpen },
  { value: 'meal_kit', label: 'Meal Kits', icon: ChefHat },
  { value: 'spice_blend', label: 'Spices', icon: Leaf },
  { value: 'sauce', label: 'Sauces', icon: ChefHat },
  { value: 'baked_good', label: 'Baked Goods', icon: ChefHat },
  { value: 'equipment', label: 'Equipment', icon: Utensils },
];

export function MarketPage() {
  const [tab, setTab] = useState<'businesses' | 'products'>('businesses');
  const [productCategory, setProductCategory] = useState('all');
  const [productSearch, setProductSearch] = useState('');

  const { data: featured, isLoading: bizLoading } = useQuery({
    queryKey: ['market-featured'],
    queryFn: async () => api.get<any[]>('/api/business?active=true'),
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['marketplace-products', productCategory],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sales_count', { ascending: false })
        .limit(30);

      if (productCategory !== 'all') {
        query = query.eq('category', productCategory);
      }

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        shortDescription: p.short_description,
        priceCents: p.price_cents,
        currency: p.currency || 'USD',
        imageUrls: p.image_urls || [],
        category: p.category,
        isDigital: p.is_digital,
        ratingAvg: 0,
        ratingCount: 0,
        salesCount: p.sales_count || 0,
      })) as Product[];
    },
    enabled: tab === 'products',
  });

  const filteredProducts = products.filter(p =>
    !productSearch || p.title?.toLowerCase().includes(productSearch.toLowerCase())
  );

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
        <p className="text-sm text-muted-foreground">Order food, shop products, and discover local producers</p>
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="w-full bg-secondary/30">
          <TabsTrigger value="businesses" className="flex-1">Businesses</TabsTrigger>
          <TabsTrigger value="products" className="flex-1">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="businesses" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Featured</h2>
            <Link to="/app/explore" className="text-sm text-primary hover:underline flex items-center gap-1">
              See all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {bizLoading ? (
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
                        <img src={biz.coverImageUrl} alt={biz.businessName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{biz.businessName}</h3>
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
        </TabsContent>

        <TabsContent value="products" className="mt-4 space-y-4">
          {/* Product search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-9 bg-secondary/30 border-border/50"
            />
          </div>

          {/* Product category filters */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {productCategories.map((cat) => (
                <Button
                  key={cat.value}
                  variant={productCategory === cat.value ? 'default' : 'outline'}
                  size="sm"
                  className="shrink-0"
                  onClick={() => setProductCategory(cat.value)}
                >
                  <cat.icon className="h-3.5 w-3.5 mr-1.5" />
                  {cat.label}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Products grid */}
          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-40 w-full" />
                  <CardContent className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:border-primary/30 transition-all group cursor-pointer">
                  <div className="h-40 bg-secondary/30 overflow-hidden">
                    {product.imageUrls[0] ? (
                      <img src={product.imageUrls[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}
                    {product.isDigital && (
                      <Badge className="absolute top-2 right-2 text-[10px] bg-blue-500/80">Digital</Badge>
                    )}
                  </div>
                  <CardContent className="p-3 space-y-1">
                    <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {product.title}
                    </h3>
                    {product.shortDescription && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{product.shortDescription}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-bold text-foreground">
                        ${(product.priceCents / 100).toFixed(2)}
                      </span>
                      {product.category && (
                        <Badge variant="secondary" className="text-[9px]">
                          {product.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </Badge>
                      )}
                    </div>
                    {product.salesCount > 0 && (
                      <p className="text-[10px] text-muted-foreground">{product.salesCount} sold</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-semibold text-foreground">No products yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Products from creators and businesses will appear here
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
