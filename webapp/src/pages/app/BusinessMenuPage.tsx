import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Minus,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export function BusinessMenuPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: business } = useQuery({
    queryKey: ['business-name', id],
    queryFn: async () => api.get<any>(`/api/business/${id}`),
    enabled: !!id,
  });

  const { data: menuData, isLoading } = useQuery({
    queryKey: ['business-menu-order', id],
    queryFn: async () => api.get<any>(`/api/menu/${id}/public`),
    enabled: !!id,
  });

  useEffect(() => {
    if (menuData?.categories?.length > 0 && !activeCategory) {
      setActiveCategory(menuData.categories[0].id);
    }
  }, [menuData]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) {
        return prev.map(c =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
    toast.success(`Added ${item.name}`);
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === menuItemId);
      if (existing && existing.quantity > 1) {
        return prev.map(c =>
          c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c
        );
      }
      return prev.filter(c => c.menuItemId !== menuItemId);
    });
  };

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const getCartQty = (menuItemId: string) => cart.find(c => c.menuItemId === menuItemId)?.quantity || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{business?.businessName || 'Menu'}</h1>
          <p className="text-sm text-muted-foreground">Order for pickup or delivery</p>
        </div>
      </div>

      {/* Category tabs */}
      {menuData?.categories?.length > 0 && (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {menuData.categories.map((cat: any) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                className={activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground shrink-0'
                  : 'shrink-0 border-border/50'
                }
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Menu items */}
      {menuData?.categories?.length > 0 ? (
        <div className="space-y-3">
          {menuData.categories
            .filter((cat: any) => !activeCategory || cat.id === activeCategory)
            .map((cat: any) => (
              <div key={cat.id}>
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                  {cat.name}
                </h3>
                <div className="space-y-2">
                  {cat.items?.filter((item: any) => item.isActive && item.isAvailable).map((item: any) => {
                    const qty = getCartQty(item.id);
                    return (
                      <Card key={item.id} className="bg-card/60 border-border/40">
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            {item.imageUrl && (
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary/30 shrink-0">
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between gap-2">
                                <h4 className="text-sm font-medium text-foreground">{item.name}</h4>
                                <span className="text-sm font-semibold text-foreground shrink-0">
                                  ${(item.price / 100).toFixed(2)}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                              )}
                              <div className="flex items-center gap-1.5 mt-1.5">
                                {item.isVegetarian && <Badge variant="secondary" className="text-[9px] px-1">V</Badge>}
                                {item.isVegan && <Badge variant="secondary" className="text-[9px] px-1">VG</Badge>}
                                {item.isGlutenFree && <Badge variant="secondary" className="text-[9px] px-1">GF</Badge>}
                              </div>
                              {/* Add/remove controls */}
                              <div className="flex justify-end mt-2">
                                {qty > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => removeFromCart(item.id)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-6 text-center">{qty}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => addToCart(item)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => addToCart(item)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" /> Add
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Menu not available</p>
        </div>
      )}

      {/* Cart footer */}
      {cartCount > 0 && (
        <div className="fixed bottom-20 md:bottom-4 left-0 right-0 z-40 px-4">
          <div className="max-w-2xl mx-auto">
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base"
              onClick={() => {
                // Save cart to sessionStorage and navigate to checkout
                sessionStorage.setItem('cart', JSON.stringify({ businessId: id, items: cart }));
                navigate('/app/cart');
              }}
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              View Cart ({cartCount}) &middot; ${(cartTotal / 100).toFixed(2)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
