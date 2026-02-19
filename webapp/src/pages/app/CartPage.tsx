import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  MapPin,
  UtensilsCrossed,
  Package,
} from 'lucide-react';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartData {
  businessId: string;
  items: CartItem[];
}

export function CartPage() {
  const navigate = useNavigate();
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [orderType, setOrderType] = useState<'takeout' | 'delivery' | 'dine_in'>('takeout');

  useEffect(() => {
    const stored = sessionStorage.getItem('cart');
    if (stored) {
      setCartData(JSON.parse(stored));
    }
  }, []);

  const { data: business } = useQuery({
    queryKey: ['cart-business', cartData?.businessId],
    queryFn: async () => api.get<any>(`/api/business/${cartData?.businessId}`),
    enabled: !!cartData?.businessId,
  });

  const updateQuantity = (menuItemId: string, delta: number) => {
    if (!cartData) return;
    const updated = cartData.items
      .map(item =>
        item.menuItemId === menuItemId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      )
      .filter(item => item.quantity > 0);

    const newCart = { ...cartData, items: updated };
    setCartData(newCart);
    sessionStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeItem = (menuItemId: string) => {
    if (!cartData) return;
    const updated = cartData.items.filter(item => item.menuItemId !== menuItemId);
    const newCart = { ...cartData, items: updated };
    setCartData(newCart);
    sessionStorage.setItem('cart', JSON.stringify(newCart));
  };

  const subtotal = cartData?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  const tax = Math.round(subtotal * 0.08); // 8% tax estimate
  const deliveryFee = orderType === 'delivery' ? 499 : 0;
  const total = subtotal + tax + deliveryFee;

  if (!cartData?.items?.length) {
    return (
      <div className="py-16 text-center space-y-4 max-w-2xl mx-auto">
        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30" />
        <h3 className="text-lg font-semibold text-foreground">Your cart is empty</h3>
        <p className="text-sm text-muted-foreground">Browse menus and add items to get started</p>
        <Button asChild className="bg-primary text-primary-foreground">
          <Link to="/app/explore">Explore Businesses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Your Cart</h1>
          {business && (
            <p className="text-sm text-muted-foreground">{business.businessName}</p>
          )}
        </div>
      </div>

      {/* Order type */}
      <Card className="bg-card/60 border-border/40">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Order Type</h3>
          <RadioGroup value={orderType} onValueChange={(v) => setOrderType(v as any)}>
            <div className="flex gap-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="takeout" id="takeout" />
                <Label htmlFor="takeout" className="flex items-center gap-1.5 cursor-pointer">
                  <Package className="h-4 w-4" /> Pickup
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delivery" id="delivery" />
                <Label htmlFor="delivery" className="flex items-center gap-1.5 cursor-pointer">
                  <MapPin className="h-4 w-4" /> Delivery
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dine_in" id="dine_in" />
                <Label htmlFor="dine_in" className="flex items-center gap-1.5 cursor-pointer">
                  <UtensilsCrossed className="h-4 w-4" /> Dine In
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Cart items */}
      <Card className="bg-card/60 border-border/40">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Items</h3>
          {cartData.items.map((item) => (
            <div key={item.menuItemId} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">${(item.price / 100).toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateQuantity(item.menuItemId, -1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateQuantity(item.menuItemId, 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm font-semibold text-foreground w-16 text-right">
                ${((item.price * item.quantity) / 100).toFixed(2)}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(item.menuItemId)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-card/60 border-border/40">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">${(subtotal / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax (est.)</span>
            <span className="text-foreground">${(tax / 100).toFixed(2)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span className="text-foreground">${(deliveryFee / 100).toFixed(2)}</span>
            </div>
          )}
          <Separator className="bg-border/40" />
          <div className="flex justify-between text-base font-semibold">
            <span className="text-foreground">Total</span>
            <span className="text-primary">${(total / 100).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Place order */}
      <Button
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base"
        onClick={() => {
          // In production, this would integrate with payment processing
          sessionStorage.setItem('orderType', orderType);
          navigate('/app/checkout');
        }}
      >
        Place Order &middot; ${(total / 100).toFixed(2)}
      </Button>
    </div>
  );
}
