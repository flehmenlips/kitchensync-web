import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  User,
  MapPin,
} from 'lucide-react';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, profile } = useCustomerAuth();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(profile?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [cartData, setCartData] = useState<{ businessId: string; items: CartItem[] } | null>(null);
  const [orderType, setOrderType] = useState('takeout');

  useEffect(() => {
    const stored = sessionStorage.getItem('cart');
    const type = sessionStorage.getItem('orderType');
    if (stored) setCartData(JSON.parse(stored));
    if (type) setOrderType(type);
  }, []);

  const handlePlaceOrder = async () => {
    if (!cartData) return;
    setSubmitting(true);

    try {
      const orderItems = cartData.items.map(item => ({
        menu_item_id: item.menuItemId,
        item_name: item.name,
        item_price: item.price,
        quantity: item.quantity,
        total_price: item.price * item.quantity,
      }));

      const subtotal = cartData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const tax = Math.round(subtotal * 0.08);
      const deliveryFee = orderType === 'delivery' ? 499 : 0;

      await api.post(`/api/orders/${cartData.businessId}`, {
        order_type: orderType,
        customer_user_id: user?.id,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        delivery_address: orderType === 'delivery' ? address : null,
        delivery_fee: deliveryFee,
        subtotal,
        tax_amount: tax,
        total_amount: subtotal + tax + deliveryFee,
        special_instructions: notes || null,
        source: 'website',
        items: orderItems,
      });

      // Clear cart
      sessionStorage.removeItem('cart');
      sessionStorage.removeItem('orderType');

      toast.success('Order placed successfully!');
      navigate('/app/order-confirmed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!cartData?.items?.length) {
    navigate('/app/cart');
    return null;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Checkout</h1>
      </div>

      {/* Contact Info */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Contact Info</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-secondary/30 border-border/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="bg-secondary/30 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder="(555) 123-4567"
                className="bg-secondary/30 border-border/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery address */}
      {orderType === 'delivery' && (
        <Card className="bg-card/60 border-border/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Delivery Address</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full delivery address"
              className="bg-secondary/30 border-border/50"
            />
          </CardContent>
        </Card>
      )}

      {/* Special instructions */}
      <Card className="bg-card/60 border-border/40">
        <CardContent className="p-4 space-y-2">
          <Label>Special Instructions</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests or dietary needs?"
            rows={2}
            className="w-full rounded-md bg-secondary/30 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </CardContent>
      </Card>

      {/* Order summary */}
      <Card className="bg-card/60 border-border/40">
        <CardContent className="p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground mb-2">Order Summary</h3>
          {cartData.items.map((item) => (
            <div key={item.menuItemId} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
              <span className="text-foreground">${((item.price * item.quantity) / 100).toFixed(2)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Place order */}
      <Button
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base"
        disabled={submitting || !name}
        onClick={handlePlaceOrder}
      >
        {submitting ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <CreditCard className="h-5 w-5 mr-2" />
        )}
        Confirm Order
      </Button>
    </div>
  );
}
