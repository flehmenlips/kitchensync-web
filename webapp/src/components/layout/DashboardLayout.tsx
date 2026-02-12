import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ChefHat,
  LayoutDashboard,
  BookOpen,
  Lightbulb,
  Users,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  UtensilsCrossed,
  BarChart3,
  History,
  Sparkles,
  Flag,
  BadgeCheck,
  Package,
  Receipt,
  Wallet,
  Building2,
  ExternalLink,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  superadminOnly?: boolean;
  section?: string;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { title: 'Featured', href: '/admin/featured', icon: Sparkles },
  { title: 'Moderation', href: '/admin/moderation', icon: Flag },
  { title: 'Creators', href: '/admin/creators', icon: BadgeCheck },
  { title: 'Businesses', href: '/admin/businesses', icon: Building2, section: 'Commercial' },
  { title: 'Products', href: '/admin/products', icon: Package, section: 'Marketplace' },
  { title: 'Orders', href: '/admin/orders', icon: Receipt, section: 'Marketplace' },
  { title: 'Payouts', href: '/admin/payouts', icon: Wallet, section: 'Marketplace' },
  { title: 'My Recipes', href: '/admin/my-recipes', icon: UtensilsCrossed, superadminOnly: true },
  { title: 'Shared Recipes', href: '/admin/recipes', icon: BookOpen },
  { title: 'Tips & Tutorials', href: '/admin/tips', icon: Lightbulb },
  { title: 'Users', href: '/admin/users', icon: Users },
  { title: 'Admin Users', href: '/admin/admins', icon: Shield, superadminOnly: true },
  { title: 'Activity Log', href: '/admin/activity', icon: History },
];

export function DashboardLayout() {
  const { adminUser, signOut, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNavItems = navItems.filter(
    (item) => !item.superadminOnly || isSuperAdmin
  );

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <ChefHat className="h-5 w-5 text-primary" />
        </div>
        {!collapsed ? (
          <div className="overflow-hidden">
            <h1 className="font-semibold text-foreground truncate">KitchenSync</h1>
            <p className="text-xs text-muted-foreground">Admin Console</p>
          </div>
        ) : null}
      </div>

      <Separator className="bg-border/50" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item, index) => {
            const prevItem = index > 0 ? filteredNavItems[index - 1] : null;
            const showSectionHeader = item.section && (!prevItem || prevItem.section !== item.section);

            return (
              <div key={item.href}>
                {showSectionHeader && !collapsed ? (
                  <p className="px-3 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.section}
                  </p>
                ) : null}
                <NavLink
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    )
                  }
                  end={item.href === '/admin'}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed ? <span>{item.title}</span> : null}
                </NavLink>
                {/* Add Business Console link after Businesses */}
                {item.href === '/admin/businesses' ? (
                  <NavLink
                    to="/business"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  >
                    <ExternalLink className="h-5 w-5 flex-shrink-0" />
                    {!collapsed ? <span>Business Console</span> : null}
                  </NavLink>
                ) : null}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-border/50" />

      {/* User info & sign out */}
      <div className="p-4 space-y-3">
        {!collapsed ? (
          <div className="px-3 py-2 bg-secondary/30 rounded-lg">
            <p className="text-sm font-medium text-foreground truncate">
              {adminUser?.email}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {adminUser?.role}
            </p>
          </div>
        ) : null}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          className="w-full text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed ? <span className="ml-2">Sign Out</span> : null}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <ChefHat className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">KitchenSync Admin</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border">
            <div className="pt-16">
              <NavContent />
            </div>
          </div>
          <div
            className="fixed inset-0"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 border-r border-border bg-card transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <NavContent />
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-6 h-6 w-6 rounded-full border border-border bg-card hover:bg-secondary"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              'h-3 w-3 transition-transform',
              collapsed && 'rotate-180'
            )}
          />
        </Button>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          'pt-16 lg:pt-0',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        )}
      >
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
