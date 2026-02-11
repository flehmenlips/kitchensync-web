import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  UtensilsCrossed,
  LayoutDashboard,
  CalendarDays,
  ShoppingBag,
  BookOpen,
  Users,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Building2,
  ChevronDown,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Reservations', href: '/reservations', icon: CalendarDays },
  { title: 'Orders', href: '/orders', icon: ShoppingBag },
  { title: 'Menu', href: '/menu', icon: BookOpen },
  { title: 'Customers', href: '/customers', icon: Users, section: 'Management' },
  { title: 'Team', href: '/team', icon: UserCog, section: 'Management' },
  { title: 'Settings', href: '/settings', icon: Settings, section: 'Management' },
];

export function DashboardLayout() {
  const { businessUser, signOut } = useAuth();
  const { business } = useBusiness();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
        </div>
        {!collapsed ? (
          <div className="overflow-hidden">
            <h1 className="font-semibold text-foreground truncate">KitchenSync</h1>
            <p className="text-xs text-muted-foreground">for Business</p>
          </div>
        ) : null}
      </div>

      <Separator className="bg-border/50" />

      {/* Business Selector */}
      {!collapsed ? (
        <div className="px-3 py-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between text-left h-auto py-3 px-3 bg-secondary/30 border-border/50 hover:bg-secondary/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{business?.name || 'Select Business'}</p>
                    <p className="text-xs text-muted-foreground capitalize">{business?.type || 'No business'}</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px]">
              <DropdownMenuLabel>Your Businesses</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Building2 className="h-4 w-4 mr-2" />
                {business?.name || 'The Golden Fork'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-1">
          {navItems.map((item, index) => {
            const prevItem = index > 0 ? navItems[index - 1] : null;
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
                  end={item.href === '/'}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed ? <span>{item.title}</span> : null}
                </NavLink>
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
              {businessUser?.email || 'demo@business.com'}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {businessUser?.role || 'Owner'}
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
              <UtensilsCrossed className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">KitchenSync Business</span>
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
