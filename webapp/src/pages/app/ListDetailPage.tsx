import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  MoreVertical,
  CheckCircle2,
  Copy,
  ArrowUp,
  ArrowDown,
  ShoppingCart,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PrepTask {
  id: string;
  task: string;
  category: string;
  estimatedTime: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  sortOrder: number;
  status: string;
  notes?: string;
}

const SHOPPING_SECTIONS = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry', 'Frozen', 'Bakery', 'Beverages', 'Other'];

export function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [newItem, setNewItem] = useState('');
  const [newSection, setNewSection] = useState('');

  const { data: list, isLoading } = useQuery({
    queryKey: ['list', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('prep_lists').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Tasks are stored as JSON array in the `tasks` column
  const tasks: PrepTask[] = list?.tasks || [];
  const completedCount = tasks.filter(t => t.completed || t.status === 'completed').length;
  const totalCount = tasks.length;

  const updateTasks = useMutation({
    mutationFn: async (newTasks: PrepTask[]) => {
      if (!id) throw new Error('No list');
      const { error } = await supabase
        .from('prep_lists')
        .update({ tasks: newTasks, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', id] });
    },
  });

  const isShopping = list?.list_type === 'shopping';

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    const newTask: PrepTask = {
      id: crypto.randomUUID(),
      task: newItem.trim(),
      category: isShopping ? (newSection || 'Other') : '',
      estimatedTime: '',
      priority: 'medium',
      completed: false,
      sortOrder: tasks.length,
      status: 'pending',
    };
    updateTasks.mutate([...tasks, newTask]);
    setNewItem('');
  };

  const toggleTask = (taskId: string) => {
    const updated = tasks.map(t =>
      t.id === taskId
        ? { ...t, completed: !t.completed, status: t.completed ? 'pending' : 'completed' }
        : t
    );
    updateTasks.mutate(updated);
  };

  const deleteTask = (taskId: string) => {
    updateTasks.mutate(tasks.filter(t => t.id !== taskId));
  };

  const moveTask = (taskId: string, direction: 'up' | 'down') => {
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= tasks.length) return;
    const newTasks = [...tasks];
    [newTasks[idx], newTasks[newIdx]] = [newTasks[newIdx], newTasks[idx]];
    newTasks.forEach((t, i) => t.sortOrder = i);
    updateTasks.mutate(newTasks);
  };

  const duplicateList = useMutation({
    mutationFn: async () => {
      if (!user || !list) throw new Error('Missing data');
      const resetTasks = tasks.map(t => ({
        ...t,
        id: crypto.randomUUID(),
        completed: false,
        status: 'pending',
      }));
      const { data, error } = await supabase.from('prep_lists').insert({
        user_id: user.id,
        title: `${list.title} (Copy)`,
        list_type: list.list_type,
        overview: list.overview,
        tasks: resetTasks,
        sections: list.sections || [],
        tips: list.tips || [],
      }).select('id').single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ['my-lists'] });
      toast.success('List duplicated');
      navigate(`/app/lists/${newId}`);
    },
    onError: () => toast.error('Failed to duplicate list'),
  });

  const deleteList = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const { error } = await supabase.from('prep_lists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lists'] });
      toast.success('List deleted');
      navigate('/app/lists');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="py-16 text-center">
        <h3 className="text-lg font-semibold text-foreground">List not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/app/lists')}>
          Back to Lists
        </Button>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => !t.completed && t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.completed || t.status === 'completed');

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/lists')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{list.title}</h1>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} completed
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => duplicateList.mutate()}>
              <Copy className="h-4 w-4 mr-2" /> Duplicate List
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => { if (confirm('Delete this list?')) deleteList.mutate(); }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete List
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Overview */}
      {list.overview && (
        <p className="text-sm text-muted-foreground">{list.overview}</p>
      )}

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full bg-secondary/30 rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Add item */}
      <form onSubmit={handleAddItem} className="flex gap-2">
        {isShopping && (
          <select
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            className="rounded-md bg-secondary/30 border border-border/50 px-2 py-2 text-sm text-foreground min-w-[110px]"
          >
            <option value="">Section...</option>
            {SHOPPING_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={isShopping ? 'Add item...' : 'Add a task...'}
          className="bg-secondary/30 border-border/50"
        />
        <Button
          type="submit"
          disabled={!newItem.trim() || updateTasks.isPending}
          className="bg-primary text-primary-foreground shrink-0"
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {/* Tasks */}
      <div className="space-y-1">
        {/* Shopping lists: group by section */}
        {isShopping ? (
          <>
            {(() => {
              const sections = new Map<string, PrepTask[]>();
              pendingTasks.forEach(t => {
                const sec = t.category || 'Other';
                if (!sections.has(sec)) sections.set(sec, []);
                sections.get(sec)!.push(t);
              });
              return Array.from(sections.entries()).map(([sec, sectionTasks]) => (
                <div key={sec}>
                  <div className="flex items-center gap-2 pt-2 pb-1">
                    <ShoppingCart className="h-3 w-3 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">{sec}</span>
                  </div>
                  {sectionTasks.map(task => (
                    <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onMove={moveTask} />
                  ))}
                </div>
              ));
            })()}
          </>
        ) : (
          pendingTasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onMove={moveTask} />
          ))
        )}

        {/* Completed tasks */}
        {completedTasks.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-3 pb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
              <span className="text-xs text-muted-foreground font-medium">
                Completed ({completedTasks.length})
              </span>
            </div>
            {completedTasks.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onMove={moveTask} />
            ))}
          </>
        )}

        {totalCount === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No tasks yet. Add one above.
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onMove,
}: {
  task: PrepTask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
}) {
  const isCompleted = task.completed || task.status === 'completed';

  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
      isCompleted ? 'opacity-60' : 'hover:bg-secondary/20'
    )}>
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => onToggle(task.id)}
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm',
          isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
        )}>
          {task.task}
        </p>
        {task.notes && (
          <p className="text-xs text-muted-foreground mt-0.5">{task.notes}</p>
        )}
      </div>
      {task.priority && task.priority !== 'medium' && (
        <Badge
          variant="secondary"
          className={cn('text-[10px]',
            task.priority === 'high' ? 'text-red-400' : 'text-green-400'
          )}
        >
          {task.priority}
        </Badge>
      )}
      {task.estimatedTime && (
        <span className="text-[10px] text-muted-foreground">{task.estimatedTime}</span>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => onMove(task.id, 'up')}>
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => onMove(task.id, 'down')}>
          <ArrowDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
