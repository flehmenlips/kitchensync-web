import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Home, ShoppingBag } from 'lucide-react';

export function OrderConfirmedPage() {
  return (
    <div className="max-w-md mx-auto py-12 text-center space-y-6">
      <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Order Confirmed!</h1>
        <p className="text-muted-foreground">
          Your order has been placed successfully. You'll receive updates on your order status.
        </p>
      </div>

      <Card className="bg-card/60 border-border/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <span className="text-foreground">Your order is being prepared</span>
          </div>
          <p className="text-xs text-muted-foreground">
            You can check your order status in the Market section.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link to="/app/market">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Market
          </Link>
        </Button>
        <Button className="flex-1 bg-primary text-primary-foreground" asChild>
          <Link to="/app">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
