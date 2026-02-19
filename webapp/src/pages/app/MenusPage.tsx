import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Plus,
  UtensilsCrossed,
  Calendar,
  Users as UsersIcon,
  Search,
  Sparkles,
} from 'lucide-react';

export function MenusPage() {
  const { user } = useCustomerAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOccasion, setNewOccasion] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newGuestCount, setNewGuestCount] = useState('');

  const { data: menus, isLoading } = useQuery({
    queryKey: ['my-menus', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('menus')
        .insert({
          user_id: user.id,
          title: newTitle.trim(),
          occasion: newOccasion.trim() || null,
          date: newDate || null,
          guest_count: newGuestCount ? parseInt(newGuestCount) : null,
          is_ai_generated: false,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (menuId) => {
      queryClient.invalidateQueries({ queryKey: ['my-menus'] });
      setShowCreate(false);
      setNewTitle('');
      setNewOccasion('');
      setNewDate('');
      setNewGuestCount('');
      toast.success('Menu created');
      navigate(`/app/menus/${menuId}`);
    },
    onError: () => toast.error('Failed to create menu'),
  });

  const filtered = menus?.filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Menus</h1>
          <p className="text-sm text-muted-foreground">{menus?.length || 0} menus</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/menus/ai')}
          >
            <Sparkles className="h-4 w-4 mr-1.5" /> AI Menu
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
                <Plus className="h-4 w-4 mr-1.5" /> New Menu
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Menu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Thanksgiving Dinner"
                  className="bg-secondary/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Occasion</Label>
                <Input
                  value={newOccasion}
                  onChange={(e) => setNewOccasion(e.target.value)}
                  placeholder="e.g. Holiday, Birthday, Dinner Party"
                  className="bg-secondary/30 border-border/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="bg-secondary/30 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Guests</Label>
                  <Input
                    type="number"
                    value={newGuestCount}
                    onChange={(e) => setNewGuestCount(e.target.value)}
                    placeholder="0"
                    className="bg-secondary/30 border-border/50"
                  />
                </div>
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground"
                disabled={!newTitle.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create Menu
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search menus..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary/30 border-border/50"
        />
      </div>

      {/* Menu list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card/60 border-border/40">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((menu: any) => (
            <Link key={menu.id} to={`/app/menus/${menu.id}`}>
              <Card className="bg-card/60 border-border/40 hover:border-primary/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <UtensilsCrossed className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-foreground truncate">{menu.title}</h3>
                        {menu.is_ai_generated && (
                          <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {menu.occasion && <span>{menu.occasion}</span>}
                        {menu.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(menu.date).toLocaleDateString()}
                          </span>
                        )}
                        {menu.guest_count && (
                          <span className="flex items-center gap-1">
                            <UsersIcon className="h-3 w-3" />
                            {menu.guest_count} guests
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No menus yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Plan your next meal or event</p>
        </div>
      )}
    </div>
  );
}
