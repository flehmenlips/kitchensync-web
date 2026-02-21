import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  Compass,
  ShoppingBag,
  BookOpen,
  User,
  Bell,
  Search,
  ChefHat,
  LogOut,
  Settings,
  Plus,
  Inbox,
  Image as ImageIcon,
  Sparkles,
  MessageCircle,
} from 'lucide-react';

interface TabItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabItem[] = [
  { label: 'Feed', href: '/app', icon: Home },
  { label: 'Explore', href: '/app/explore', icon: Compass },
  { label: 'Market', href: '/app/market', icon: ShoppingBag },
  { label: 'Recipes', href: '/app/recipes', icon: BookOpen },
  { label: 'Me', href: '/app/me', icon: User },
];

export function CustomerLayout() {
  const { profile, user, signOut } = useCustomerAuth();
  const navigate = useNavigate();

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header - desktop & mobile */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Logo */}
          <NavLink to="/app" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <ChefHat className="h-4 w-4 text-primary" />
            </div>
            <span className="font-syne text-base font-bold text-foreground hidden sm:inline">
              KitchenSync
            </span>
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.href}
                to={tab.href}
                end={tab.href === '/app'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )
                }
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/app/search')}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground relative"
              onClick={() => navigate('/app/me/notifications')}
            >
              <Bell className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-primary hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate('/app/create-post')}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  New Post
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/app/recipes/new')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  New Recipe
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/app/me')}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/app/me/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/app/discover')}>
                  <Search className="h-4 w-4 mr-2" />
                  Discover People
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/app/featured')}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Featured Recipes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/app/messages')}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/app/inbox')}>
                  <Inbox className="h-4 w-4 mr-2" />
                  Inbox
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/app/assets')}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Asset Library
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-4">
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => (
            <NavLink
              key={tab.href}
              to={tab.href}
              end={tab.href === '/app'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all min-w-[56px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'p-1.5 rounded-full transition-all',
                    isActive && 'bg-primary/10'
                  )}>
                    <tab.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  </div>
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
