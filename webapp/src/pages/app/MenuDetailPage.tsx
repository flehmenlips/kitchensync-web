import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Users as UsersIcon,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function MenuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newCourse, setNewCourse] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('menus').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items } = useQuery({
    queryKey: ['menu-items', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('menu_id', id)
        .order('sort_order');
      if (error) return [];
      return data || [];
    },
    enabled: !!id,
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No menu');
      const course = selectedCourse || newCourse.trim() || 'Main Course';
      const { error } = await supabase.from('menu_items').insert({
        menu_id: id,
        course_name: course,
        item_name: newItemName.trim(),
        sort_order: (items?.length || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', id] });
      setNewItemName('');
      setNewCourse('');
    },
    onError: () => toast.error('Failed to add item'),
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu-items', id] }),
  });

  const deleteMenu = useMutation({
    mutationFn: async () => {
      if (!id) return;
      await supabase.from('menu_items').delete().eq('menu_id', id);
      const { error } = await supabase.from('menus').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-menus'] });
      toast.success('Menu deleted');
      navigate('/app/menus');
    },
  });

  // Group items by course
  const courses = items?.reduce((acc: Record<string, any[]>, item: any) => {
    const course = item.course_name || 'Other';
    if (!acc[course]) acc[course] = [];
    acc[course].push(item);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const existingCourses = Object.keys(courses);

  if (menuLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="py-16 text-center">
        <h3 className="text-lg font-semibold text-foreground">Menu not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/app/menus')}>
          Back to Menus
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/menus')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{menu.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => { if (confirm('Delete this menu?')) deleteMenu.mutate(); }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete Menu
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Courses */}
      {existingCourses.length > 0 ? (
        <div className="space-y-4">
          {existingCourses.map((courseName) => (
            <div key={courseName}>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                {courseName}
              </h3>
              <div className="space-y-1">
                {courses[courseName].map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/20 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{item.item_name}</p>
                      {item.item_description && (
                        <p className="text-xs text-muted-foreground">{item.item_description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteItem.mutate(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No items yet. Add your first course below.
        </div>
      )}

      <Separator className="bg-border/40" />

      {/* Add item */}
      <Card className="bg-card/60 border-border/40">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Add Item</h3>
          <div className="flex gap-2">
            {existingCourses.length > 0 ? (
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="rounded-md bg-secondary/30 border border-border/50 px-3 py-2 text-sm text-foreground min-w-[120px]"
              >
                <option value="">New course...</option>
                {existingCourses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : null}
            {(!selectedCourse || existingCourses.length === 0) && (
              <Input
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                placeholder="Course name"
                className="bg-secondary/30 border-border/50 max-w-[140px]"
              />
            )}
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name"
              className="bg-secondary/30 border-border/50 flex-1"
            />
            <Button
              disabled={!newItemName.trim() || addItem.isPending}
              onClick={() => addItem.mutate()}
              className="bg-primary text-primary-foreground shrink-0"
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
