import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Inbox,
  Plus,
  Trash2,
  Loader2,
  Lightbulb,
} from 'lucide-react';

export function InboxPage() {
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [newItem, setNewItem] = useState('');

  const { data: items, isLoading } = useQuery({
    queryKey: ['inbox-items', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('inbox_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('inbox_items').insert({
        user_id: user.id,
        content: content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewItem('');
      queryClient.invalidateQueries({ queryKey: ['inbox-items'] });
      toast.success('Added to inbox');
    },
    onError: () => toast.error('Failed to add item'),
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('inbox_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-items'] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('inbox_items').delete().eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-items'] });
      toast.success('Inbox cleared');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      addMutation.mutate(newItem);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              Inbox
            </h1>
            <p className="text-xs text-muted-foreground">Quick capture ideas, ingredients, and notes</p>
          </div>
        </div>
        {(items?.length || 0) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive text-xs"
            onClick={() => clearMutation.mutate()}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Add new item */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Jot something down..."
          className="bg-secondary/30 border-border/50"
          autoFocus
        />
        <Button
          type="submit"
          size="icon"
          disabled={!newItem.trim() || addMutation.isPending}
          className="bg-primary text-primary-foreground shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {/* Items */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item: any) => (
            <Card key={item.id} className="bg-card/60 border-border/40">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">{item.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeMutation.mutate(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center space-y-3">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <div>
            <h3 className="text-base font-semibold text-foreground">Your inbox is empty</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Quickly capture recipe ideas, ingredients you need, or cooking notes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
