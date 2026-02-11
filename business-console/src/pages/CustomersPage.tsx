import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  Star,
  MoreHorizontal,
  TrendingUp,
} from 'lucide-react';

export function CustomersPage() {
  // Mock customers for demo
  const customers = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      visits: 24,
      totalSpent: 1847.50,
      lastVisit: '2024-02-06',
      tier: 'gold',
      notes: 'Prefers window seating',
    },
    {
      id: 2,
      name: 'Emily Davis',
      email: 'emily.d@email.com',
      phone: '(555) 234-5678',
      visits: 12,
      totalSpent: 892.00,
      lastVisit: '2024-02-05',
      tier: 'silver',
      notes: 'Vegetarian',
    },
    {
      id: 3,
      name: 'Michael Johnson',
      email: 'mjohnson@email.com',
      phone: '(555) 345-6789',
      visits: 45,
      totalSpent: 3250.75,
      lastVisit: '2024-02-07',
      tier: 'platinum',
      notes: 'Birthday Feb 15',
    },
    {
      id: 4,
      name: 'Sarah Wilson',
      email: 'sarah.w@email.com',
      phone: '(555) 456-7890',
      visits: 8,
      totalSpent: 456.00,
      lastVisit: '2024-01-28',
      tier: 'bronze',
      notes: '',
    },
    {
      id: 5,
      name: 'Robert Brown',
      email: 'rbrown@email.com',
      phone: '(555) 567-8901',
      visits: 18,
      totalSpent: 1124.50,
      lastVisit: '2024-02-04',
      tier: 'silver',
      notes: 'Allergic to shellfish',
    },
  ];

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'gold':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'silver':
        return 'bg-slate-400/10 text-slate-400 border-slate-400/20';
      case 'bronze':
        return 'bg-orange-700/10 text-orange-400 border-orange-700/20';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer relationships and loyalty program
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">1,247</p>
            <p className="text-sm text-muted-foreground">Total Customers</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-400">+48</p>
            <p className="text-sm text-muted-foreground">New This Month</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">$67.50</p>
            <p className="text-sm text-muted-foreground">Avg. Spend</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-violet-400">156</p>
            <p className="text-sm text-muted-foreground">VIP Members</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers List */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Recent Customers</CardTitle>
          <CardDescription>Sorted by last visit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {customer.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{customer.name}</p>
                      <Badge className={getTierColor(customer.tier)}>
                        <Star className="h-3 w-3 mr-1" />
                        {customer.tier}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {customer.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {customer.phone}
                      </span>
                    </div>
                    {customer.notes ? (
                      <p className="text-xs text-muted-foreground/80 italic">
                        Note: {customer.notes}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-6 ml-16 md:ml-0">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">{customer.visits}</p>
                    <p className="text-xs text-muted-foreground">Visits</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-emerald-400">
                      ${customer.totalSpent.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="text-sm text-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {customer.lastVisit}
                    </p>
                    <p className="text-xs text-muted-foreground">Last Visit</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
