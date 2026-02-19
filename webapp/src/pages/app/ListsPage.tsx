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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  ListTodo,
  ShoppingCart,
  CheckCircle2,
  Clock,
  ClipboardList,
  Lightbulb,
  Heart,
  Calendar,
  Wrench,
  Users as UsersIcon,
  FileText,
  Search,
} from 'lucide-react';
import type { ListType } from '@/types/database';

const listTypeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  prep: { label: 'Prep List', icon: ClipboardList, color: 'text-orange-400' },
  shopping: { label: 'Shopping List', icon: ShoppingCart, color: 'text-green-400' },
  todo: { label: 'To-Do', icon: ListTodo, color: 'text-blue-400' },
  recipe_ideas: { label: 'Recipe Ideas', icon: Lightbulb, color: 'text-yellow-400' },
  wishlist: { label: 'Wishlist', icon: Heart, color: 'text-pink-400' },
  event: { label: 'Event Planning', icon: Calendar, color: 'text-purple-400' },
  equipment: { label: 'Equipment', icon: Wrench, color: 'text-gray-400' },
  delegation: { label: 'Delegated', icon: UsersIcon, color: 'text-cyan-400' },
  custom: { label: 'Custom', icon: FileText, color: 'text-muted-foreground' },
};

export function ListsPage() {
  const { user } = useCustomerAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ListType>('todo');

  const { data: lists, isLoading } = useQuery({
    queryKey: ['my-lists', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('prep_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) {
        console.error('Lists error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('prep_lists')
        .insert({
          user_id: user.id,
          title: newTitle.trim(),
          list_type: newType,
          overview: '',
          menu_ids: [],
          menu_titles: [],
          tasks: [],
          tips: [],
          sections: [],
          tags: [],
          is_completed: false,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (listId) => {
      queryClient.invalidateQueries({ queryKey: ['my-lists'] });
      setShowCreate(false);
      setNewTitle('');
      toast.success('List created');
      navigate(`/app/lists/${listId}`);
    },
    onError: () => toast.error('Failed to create list'),
  });

  const filtered = lists?.filter(l =>
    !search || l.title.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Lists</h1>
          <p className="text-sm text-muted-foreground">{lists?.length || 0} lists</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> New List
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New List</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="List name"
                  className="bg-secondary/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as ListType)}>
                  <SelectTrigger className="bg-secondary/30 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(listTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`h-4 w-4 ${config.color}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground"
                disabled={!newTitle.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create List
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search lists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary/30 border-border/50"
        />
      </div>

      {/* List items */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
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
          {filtered.map((list: any) => {
            const config = listTypeConfig[list.list_type] || listTypeConfig.custom;
            return (
              <Link key={list.id} to={`/app/lists/${list.id}`}>
                <Card className="bg-card/60 border-border/40 hover:border-primary/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                        <config.icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-foreground truncate">{list.title}</h3>
                          {list.is_completed && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px]">{config.label}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(list.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No lists yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create a list to get organized</p>
        </div>
      )}
    </div>
  );
}
