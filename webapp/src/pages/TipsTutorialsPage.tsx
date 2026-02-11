import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { TipTutorial, TipType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Lightbulb,
  Video,
  Loader2,
  BookOpen,
  Bell,
  Megaphone,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

const tipTypes: TipType[] = ['tip', 'tutorial', 'announcement', 'feature'];

const typeIcons: Record<TipType, React.ComponentType<{ className?: string }>> = {
  tip: Lightbulb,
  tutorial: BookOpen,
  announcement: Megaphone,
  feature: RefreshCw,
};

const typeColors: Record<TipType, string> = {
  tip: 'bg-amber-400/10 text-amber-400',
  tutorial: 'bg-blue-400/10 text-blue-400',
  announcement: 'bg-primary/10 text-primary',
  feature: 'bg-emerald-400/10 text-emerald-400',
};

interface TipFormData {
  title: string;
  content: string;
  type: TipType;
  video_url: string;
  is_active: boolean;
  priority: number;
}

const defaultFormData: TipFormData = {
  title: '',
  content: '',
  type: 'tip',
  video_url: '',
  is_active: true,
  priority: 0,
};

export function TipsTutorialsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTip, setSelectedTip] = useState<TipTutorial | null>(null);
  const [formData, setFormData] = useState<TipFormData>(defaultFormData);

  const { data: tips, isLoading } = useQuery({
    queryKey: ['tips-tutorials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('new_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Map new_content columns to TipTutorial interface
      return (data ?? []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        title: item.title as string,
        content: item.description as string,
        type: item.content_type as TipType,
        video_url: item.video_url as string | null,
        thumbnail_url: item.thumbnail_url as string | null,
        is_active: true, // new_content doesn't have is_active, default to true
        priority: 0, // new_content doesn't have priority
        created_at: item.created_at as string,
        updated_at: item.updated_at as string,
      })) as TipTutorial[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<TipTutorial, 'id' | 'created_at' | 'updated_at'>) => {
      const insertData = {
        title: data.title,
        description: data.content,
        content_type: data.type,
        video_url: data.video_url || null,
      };
      const { error } = await supabase.from('new_content').insert(insertData as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips-tutorials'] });
      toast.success('Tip created successfully');
      setIsFormOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create tip: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TipTutorial> }) => {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.description = data.content;
      if (data.type !== undefined) updateData.content_type = data.type;
      if (data.video_url !== undefined) updateData.video_url = data.video_url;

      const { error } = await supabase.from('new_content').update(updateData as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips-tutorials'] });
      toast.success('Tip updated successfully');
      setIsFormOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update tip: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('new_content').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips-tutorials'] });
      toast.success('Tip deleted successfully');
      setIsDeleteOpen(false);
      setSelectedTip(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete tip: ${error.message}`);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      // new_content table doesn't have is_active column, so this is a no-op for now
      console.log('Toggle not supported for new_content table', id, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips-tutorials'] });
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setSelectedTip(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (tip: TipTutorial) => {
    setSelectedTip(tip);
    setFormData({
      title: tip.title,
      content: tip.content,
      type: tip.type,
      video_url: tip.video_url ?? '',
      is_active: tip.is_active,
      priority: tip.priority,
    });
    setIsFormOpen(true);
  };

  const openDelete = (tip: TipTutorial) => {
    setSelectedTip(tip);
    setIsDeleteOpen(true);
  };

  const handleSubmit = () => {
    const cleanedData = {
      ...formData,
      video_url: formData.video_url || null,
    };

    if (selectedTip) {
      updateMutation.mutate({ id: selectedTip.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData as Omit<TipTutorial, 'id' | 'created_at' | 'updated_at'>);
    }
  };

  const filteredTips = tips?.filter((tip) => {
    const matchesSearch =
      tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tip.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || tip.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Tips & Tutorials</h1>
          <p className="text-muted-foreground mt-1">
            Manage tips, tutorials, and announcements shown in What's New
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          New Tip
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-secondary/50">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {tipTypes.map((type) => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tips Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTips && filteredTips.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-muted-foreground">Title</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">Type</TableHead>
                    <TableHead className="text-muted-foreground hidden lg:table-cell">Priority</TableHead>
                    <TableHead className="text-muted-foreground hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-muted-foreground text-center">Active</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTips.map((tip) => {
                    const TypeIcon = typeIcons[tip.type];
                    return (
                      <TableRow key={tip.id} className="border-border/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeColors[tip.type]}`}>
                              <TypeIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[200px]">
                                {tip.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {tip.content.substring(0, 50)}...
                              </p>
                            </div>
                            {tip.video_url ? (
                              <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className={typeColors[tip.type]}>
                            {tip.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {tip.priority}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {format(new Date(tip.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={tip.is_active}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: tip.id, value: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditForm(tip)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDelete(tip)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No tips found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first tip or tutorial to get started'}
              </p>
              {!searchQuery && typeFilter === 'all' ? (
                <Button onClick={openCreateForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tip
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTip ? 'Edit Tip' : 'Create Tip'}</DialogTitle>
            <DialogDescription>
              {selectedTip
                ? 'Update the tip details below'
                : 'Fill in the details to create a new tip or tutorial'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 pr-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Quick Tip: Meal Prep Like a Pro"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="content">Content (Markdown supported)</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your tip content here..."
                  rows={6}
                  className="mt-1.5 font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: TipType) =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tipTypes.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, priority: parseInt(e.target.value) || 0 }))
                    }
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Higher priority shows first</p>
                </div>
              </div>

              <div>
                <Label htmlFor="video_url">Video URL (optional)</Label>
                <Input
                  id="video_url"
                  value={formData.video_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, video_url: e.target.value }))}
                  placeholder="https://youtube.com/..."
                  className="mt-1.5"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.title || !formData.content}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : selectedTip ? (
                'Update Tip'
              ) : (
                'Create Tip'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTip?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedTip && deleteMutation.mutate(selectedTip.id)}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
