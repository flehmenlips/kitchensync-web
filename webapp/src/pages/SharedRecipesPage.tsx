import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SharedRecipe, RecipeCategory, RecipeDifficulty } from '@/types/database';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Star,
  Eye,
  GripVertical,
  X,
  Loader2,
  Clock,
  Users,
  ChefHat,
  Calendar,
  Download,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  StarOff,
} from 'lucide-react';
import { format } from 'date-fns';

const categories: RecipeCategory[] = ['Weekly Pick', 'Seasonal', 'Quick & Easy', 'Holiday Special'];
const difficulties: RecipeDifficulty[] = ['easy', 'medium', 'hard'];

interface RecipeFormData {
  title: string;
  description: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: RecipeDifficulty;
  ingredients: string[];
  instructions: string[];
  image_url: string;
  tags: string[];
  category: RecipeCategory;
  is_featured: boolean;
  is_active: boolean;
  release_date: string;
}

const defaultFormData: RecipeFormData = {
  title: '',
  description: '',
  prep_time: 15,
  cook_time: 30,
  servings: 4,
  difficulty: 'medium',
  ingredients: [''],
  instructions: [''],
  image_url: '',
  tags: [],
  category: 'Weekly Pick',
  is_featured: false,
  is_active: true,
  release_date: '',
};

export function SharedRecipesPage() {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<SharedRecipe | null>(null);
  const [formData, setFormData] = useState<RecipeFormData>(defaultFormData);
  const [tagInput, setTagInput] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['shared-recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as SharedRecipe[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<SharedRecipe, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: created, error } = await supabase
        .from('shared_recipes')
        .insert(data as never)
        .select()
        .single();
      if (error) throw error;
      return created as SharedRecipe;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['shared-recipes'] });
      toast.success('Recipe created successfully');
      setIsFormOpen(false);
      resetForm();
      logActivity('create_recipe', 'recipe', created.id, created.title);
    },
    onError: (error) => {
      toast.error(`Failed to create recipe: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SharedRecipe> }) => {
      const { error } = await supabase.from('shared_recipes').update(data as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-recipes'] });
      toast.success('Recipe updated successfully');
      setIsFormOpen(false);
      if (selectedRecipe) {
        logActivity('update_recipe', 'recipe', selectedRecipe.id, selectedRecipe.title);
      }
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update recipe: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shared_recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-recipes'] });
      toast.success('Recipe deleted successfully');
      setIsDeleteOpen(false);
      if (selectedRecipe) {
        logActivity('delete_recipe', 'recipe', selectedRecipe.id, selectedRecipe.title);
      }
      setSelectedRecipe(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete recipe: ${error.message}`);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'is_featured' | 'is_active'; value: boolean }) => {
      const { error } = await supabase.from('shared_recipes').update({ [field]: value } as never).eq('id', id);
      if (error) throw error;
      return { id, field, value };
    },
    onSuccess: ({ id, field, value }) => {
      queryClient.invalidateQueries({ queryKey: ['shared-recipes'] });
      const recipe = recipes?.find((r) => r.id === id);
      if (recipe) {
        logActivity('update_recipe', 'recipe', id, recipe.title, { field, value });
      }
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Bulk mutations
  const bulkActivateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('shared_recipes')
        .update({ is_active: true } as never)
        .in('id', ids);
      if (error) throw error;
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['shared-recipes'] });
      toast.success(`${ids.length} recipe(s) activated`);
      const names = recipes?.filter((r) => ids.includes(r.id)).map((r) => r.title).join(', ') ?? '';
      logActivity('bulk_activate_recipes', 'recipe', ids.join(','), names, { count: ids.length });
      setSelectedIds(new Set());
    },
    onError: (error) => {
      toast.error(`Failed to activate recipes: ${error.message}`);
    },
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('shared_recipes')
        .update({ is_active: false } as never)
        .in('id', ids);
      if (error) throw error;
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['shared-recipes'] });
      toast.success(`${ids.length} recipe(s) deactivated`);
      const names = recipes?.filter((r) => ids.includes(r.id)).map((r) => r.title).join(', ') ?? '';
      logActivity('bulk_deactivate_recipes', 'recipe', ids.join(','), names, { count: ids.length });
      setSelectedIds(new Set());
    },
    onError: (error) => {
      toast.error(`Failed to deactivate recipes: ${error.message}`);
    },
  });

  const bulkFeatureMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('shared_recipes')
        .update({ is_featured: true } as never)
        .in('id', ids);
      if (error) throw error;
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['shared-recipes'] });
      toast.success(`${ids.length} recipe(s) featured`);
      const names = recipes?.filter((r) => ids.includes(r.id)).map((r) => r.title).join(', ') ?? '';
      logActivity('bulk_feature_recipes', 'recipe', ids.join(','), names, { count: ids.length });
      setSelectedIds(new Set());
    },
    onError: (error) => {
      toast.error(`Failed to feature recipes: ${error.message}`);
    },
  });

  const bulkUnfeatureMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('shared_recipes')
        .update({ is_featured: false } as never)
        .in('id', ids);
      if (error) throw error;
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['shared-recipes'] });
      toast.success(`${ids.length} recipe(s) unfeatured`);
      const names = recipes?.filter((r) => ids.includes(r.id)).map((r) => r.title).join(', ') ?? '';
      logActivity('bulk_unfeature_recipes', 'recipe', ids.join(','), names, { count: ids.length });
      setSelectedIds(new Set());
    },
    onError: (error) => {
      toast.error(`Failed to unfeature recipes: ${error.message}`);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('shared_recipes')
        .delete()
        .in('id', ids);
      if (error) throw error;
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['shared-recipes'] });
      toast.success(`${ids.length} recipe(s) deleted`);
      const names = recipes?.filter((r) => ids.includes(r.id)).map((r) => r.title).join(', ') ?? '';
      logActivity('bulk_delete_recipes', 'recipe', ids.join(','), names, { count: ids.length });
      setSelectedIds(new Set());
      setIsBulkDeleteOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to delete recipes: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setSelectedRecipe(null);
    setTagInput('');
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (recipe: SharedRecipe) => {
    setSelectedRecipe(recipe);
    setFormData({
      title: recipe.title,
      description: recipe.description,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients.length > 0 ? recipe.ingredients : [''],
      instructions: recipe.instructions.length > 0 ? recipe.instructions : [''],
      image_url: recipe.image_url ?? '',
      tags: recipe.tags,
      category: recipe.category,
      is_featured: recipe.is_featured,
      is_active: recipe.is_active,
      release_date: recipe.release_date ?? '',
    });
    setIsFormOpen(true);
  };

  const openPreview = (recipe: SharedRecipe) => {
    setSelectedRecipe(recipe);
    setIsPreviewOpen(true);
  };

  const openDelete = (recipe: SharedRecipe) => {
    setSelectedRecipe(recipe);
    setIsDeleteOpen(true);
  };

  const handleSubmit = () => {
    const cleanedData = {
      ...formData,
      ingredients: formData.ingredients.filter((i) => i.trim() !== ''),
      instructions: formData.instructions.filter((i) => i.trim() !== ''),
      image_url: formData.image_url || null,
      release_date: formData.release_date || null,
    };

    if (selectedRecipe) {
      updateMutation.mutate({ id: selectedRecipe.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData as Omit<SharedRecipe, 'id' | 'created_at' | 'updated_at'>);
    }
  };

  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, ''],
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const updateIngredient = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => (i === index ? value : ing)),
    }));
  };

  const addInstruction = () => {
    setFormData((prev) => ({
      ...prev,
      instructions: [...prev.instructions, ''],
    }));
  };

  const removeInstruction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index),
    }));
  };

  const updateInstruction = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      instructions: prev.instructions.map((ins, i) => (i === index ? value : ins)),
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const filteredRecipes = recipes?.filter((recipe) => {
    const matchesSearch =
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredRecipes) {
      setSelectedIds(new Set(filteredRecipes.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedIds(newSelection);
  };

  const isAllSelected = filteredRecipes && filteredRecipes.length > 0 && filteredRecipes.every((r) => selectedIds.has(r.id));
  const isSomeSelected = selectedIds.size > 0;

  // CSV Export
  const exportToCSV = () => {
    const recipesToExport = selectedIds.size > 0
      ? recipes?.filter((r) => selectedIds.has(r.id)) ?? []
      : recipes ?? [];

    if (recipesToExport.length === 0) {
      toast.error('No recipes to export');
      return;
    }

    const headers = [
      'title',
      'description',
      'category',
      'difficulty',
      'prep_time',
      'cook_time',
      'servings',
      'tags',
      'is_featured',
      'is_active',
      'created_at',
    ];

    const escapeCSV = (value: string | number | boolean | null | undefined): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = recipesToExport.map((recipe) => [
      escapeCSV(recipe.title),
      escapeCSV(recipe.description),
      escapeCSV(recipe.category),
      escapeCSV(recipe.difficulty),
      escapeCSV(recipe.prep_time),
      escapeCSV(recipe.cook_time),
      escapeCSV(recipe.servings),
      escapeCSV(recipe.tags.join('; ')),
      escapeCSV(recipe.is_featured),
      escapeCSV(recipe.is_active),
      escapeCSV(recipe.created_at),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kitchensync-recipes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${recipesToExport.length} recipe(s)`);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isBulkOperating = bulkActivateMutation.isPending || bulkDeactivateMutation.isPending ||
    bulkFeatureMutation.isPending || bulkUnfeatureMutation.isPending || bulkDeleteMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Shared Recipes</h1>
          <p className="text-muted-foreground mt-1">
            Manage curated recipes visible to all users
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            New Recipe
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {isSomeSelected && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} recipe(s) selected
              </span>
              <div className="flex flex-wrap gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isBulkOperating}>
                      {isBulkOperating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ChevronDown className="h-4 w-4 mr-2" />
                      )}
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => bulkActivateMutation.mutate(Array.from(selectedIds))}>
                      <ToggleRight className="h-4 w-4 mr-2" />
                      Activate All
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkDeactivateMutation.mutate(Array.from(selectedIds))}>
                      <ToggleLeft className="h-4 w-4 mr-2" />
                      Deactivate All
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => bulkFeatureMutation.mutate(Array.from(selectedIds))}>
                      <Star className="h-4 w-4 mr-2" />
                      Feature All
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUnfeatureMutation.mutate(Array.from(selectedIds))}>
                      <StarOff className="h-4 w-4 mr-2" />
                      Unfeature All
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsBulkDeleteOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-secondary/50">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Recipes Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredRecipes && filteredRecipes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="text-muted-foreground">Recipe</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">Category</TableHead>
                    <TableHead className="text-muted-foreground hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-muted-foreground text-center">Featured</TableHead>
                    <TableHead className="text-muted-foreground text-center">Active</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecipes.map((recipe) => (
                    <TableRow key={recipe.id} className="border-border/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(recipe.id)}
                          onCheckedChange={(checked) => handleSelectOne(recipe.id, checked as boolean)}
                          aria-label={`Select ${recipe.title}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {recipe.image_url ? (
                              <img
                                src={recipe.image_url}
                                alt={recipe.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <ChefHat className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[200px]">
                              {recipe.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {recipe.prep_time + recipe.cook_time} min - {recipe.difficulty}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="bg-secondary/50">
                          {recipe.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {format(new Date(recipe.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={recipe.is_featured}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({
                              id: recipe.id,
                              field: 'is_featured',
                              value: checked,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={recipe.is_active}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({
                              id: recipe.id,
                              field: 'is_active',
                              value: checked,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openPreview(recipe)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditForm(recipe)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDelete(recipe)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <ChefHat className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No recipes found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first shared recipe to get started'}
              </p>
              {!searchQuery && categoryFilter === 'all' ? (
                <Button onClick={openCreateForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Recipe
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedRecipe ? 'Edit Recipe' : 'Create Recipe'}</DialogTitle>
            <DialogDescription>
              {selectedRecipe
                ? 'Update the recipe details below'
                : 'Fill in the details to create a new shared recipe'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 pb-4">
              {/* Basic Info */}
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Delicious Pasta Carbonara"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="A classic Italian pasta dish..."
                    rows={3}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://..."
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Time and Servings */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="prep_time">Prep Time (min)</Label>
                  <Input
                    id="prep_time"
                    type="number"
                    value={formData.prep_time}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, prep_time: parseInt(e.target.value) || 0 }))
                    }
                    min={0}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="cook_time">Cook Time (min)</Label>
                  <Input
                    id="cook_time"
                    type="number"
                    value={formData.cook_time}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cook_time: parseInt(e.target.value) || 0 }))
                    }
                    min={0}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    type="number"
                    value={formData.servings}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, servings: parseInt(e.target.value) || 1 }))
                    }
                    min={1}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: RecipeDifficulty) =>
                      setFormData((prev) => ({ ...prev, difficulty: value }))
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficulties.map((d) => (
                        <SelectItem key={d} value={d} className="capitalize">
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Category and Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: RecipeCategory) =>
                      setFormData((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="release_date">Release Date (optional)</Label>
                  <Input
                    id="release_date"
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, release_date: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <Label>Ingredients</Label>
                <div className="space-y-2 mt-1.5">
                  {formData.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex items-center text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <Input
                        value={ingredient}
                        onChange={(e) => updateIngredient(index, e.target.value)}
                        placeholder={`Ingredient ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIngredient(index)}
                        disabled={formData.ingredients.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ingredient
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <Label>Instructions</Label>
                <div className="space-y-2 mt-1.5">
                  {formData.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex items-center justify-center w-6 h-9 text-sm font-medium text-muted-foreground">
                        {index + 1}.
                      </div>
                      <Textarea
                        value={instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        placeholder={`Step ${index + 1}`}
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInstruction(index)}
                        disabled={formData.instructions.length === 1}
                        className="self-start"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {formData.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_featured: checked }))
                    }
                  />
                  <Label htmlFor="is_featured" className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-400" />
                    Featured
                  </Label>
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
            </div>
          </ScrollArea>

          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.title}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : selectedRecipe ? (
                'Update Recipe'
              ) : (
                'Create Recipe'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Recipe Preview</DialogTitle>
            <DialogDescription>How this recipe will appear to users</DialogDescription>
          </DialogHeader>

          {selectedRecipe ? (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6 pb-4">
                {/* Image */}
                {selectedRecipe.image_url ? (
                  <img
                    src={selectedRecipe.image_url}
                    alt={selectedRecipe.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-48 bg-primary/10 rounded-lg flex items-center justify-center">
                    <ChefHat className="h-16 w-16 text-primary/50" />
                  </div>
                )}

                {/* Title and badges */}
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="secondary">{selectedRecipe.category}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {selectedRecipe.difficulty}
                    </Badge>
                    {selectedRecipe.is_featured ? (
                      <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/20">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Featured
                      </Badge>
                    ) : null}
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedRecipe.title}</h2>
                  <p className="text-muted-foreground mt-2">{selectedRecipe.description}</p>
                </div>

                {/* Time info */}
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Prep: {selectedRecipe.prep_time} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Cook: {selectedRecipe.cook_time} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{selectedRecipe.servings} servings</span>
                  </div>
                </div>

                {/* Tags */}
                {selectedRecipe.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipe.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {/* Ingredients */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Ingredients</h3>
                  <ul className="space-y-2">
                    {selectedRecipe.ingredients.map((ingredient, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Instructions</h3>
                  <ol className="space-y-4">
                    {selectedRecipe.instructions.map((instruction, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-muted-foreground pt-0.5">{instruction}</p>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Release date */}
                {selectedRecipe.release_date ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Scheduled for {format(new Date(selectedRecipe.release_date), 'MMMM d, yyyy')}</span>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRecipe?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedRecipe && deleteMutation.mutate(selectedRecipe.id)}
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Recipes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} recipe(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedIds.size} Recipe(s)`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
