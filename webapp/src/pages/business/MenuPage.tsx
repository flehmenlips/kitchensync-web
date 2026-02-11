import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  BookOpen,
  Plus,
  Search,
  Edit,
  MoreHorizontal,
  Eye,
  EyeOff,
  DollarSign,
  Leaf,
  Wheat,
  GripVertical,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Milk,
  Nut,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useBusiness } from '@/contexts/BusinessContext';

interface MenuCategory {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  availableStartTime: string | null;
  availableEndTime: string | null;
  availableDays: string | null;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  businessId: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  displayOrder: number;
  isActive: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  containsNuts: boolean;
  containsDairy: boolean;
  spiceLevel: number | null;
  calories: number | null;
  isAvailable: boolean;
  unavailableReason: string | null;
  prepTimeMinutes: number | null;
  tags: string | null;
}

export function MenuPage() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'item'; id: string; name: string } | null>(null);

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    isActive: true,
  });

  // Item form state
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    isActive: true,
    isAvailable: true,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    containsNuts: false,
    containsDairy: false,
    spiceLevel: '',
    calories: '',
    prepTimeMinutes: '',
  });

  // Fetch categories with items
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['menu-categories', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const data = await api.get<MenuCategory[]>(`/api/menu/${businessId}/categories`);
      // Expand all categories by default
      setExpandedCategories(new Set(data.map(c => c.id)));
      return data;
    },
    enabled: !!businessId,
  });

  // Create category mutation
  const createCategory = useMutation({
    mutationFn: async (data: { name: string; description?: string; isActive?: boolean }) => {
      return api.post<MenuCategory>(`/api/menu/${businessId}/categories`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', businessId] });
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
  });

  // Update category mutation
  const updateCategory = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MenuCategory> }) => {
      return api.put<MenuCategory>(`/api/menu/${businessId}/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', businessId] });
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
  });

  // Delete category mutation
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/menu/${businessId}/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', businessId] });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
  });

  // Create item mutation
  const createItem = useMutation({
    mutationFn: async (data: Parameters<typeof api.post>[1]) => {
      return api.post<MenuItem>(`/api/menu/${businessId}/items`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', businessId] });
      setItemDialogOpen(false);
      resetItemForm();
    },
  });

  // Update item mutation
  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return api.put<MenuItem>(`/api/menu/${businessId}/items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', businessId] });
      setItemDialogOpen(false);
      resetItemForm();
    },
  });

  // Delete item mutation
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/menu/${businessId}/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', businessId] });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
  });

  // Toggle item availability
  const toggleItemAvailability = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      return api.put<MenuItem>(`/api/menu/${businessId}/items/${id}`, { isAvailable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', businessId] });
    },
  });

  // Helper functions
  const resetCategoryForm = () => {
    setCategoryForm({ name: '', description: '', isActive: true });
    setEditingCategory(null);
  };

  const resetItemForm = () => {
    setItemForm({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      isActive: true,
      isAvailable: true,
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      containsNuts: false,
      containsDairy: false,
      spiceLevel: '',
      calories: '',
      prepTimeMinutes: '',
    });
    setEditingItem(null);
    setSelectedCategoryId(null);
  };

  const openAddCategory = () => {
    resetCategoryForm();
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive,
    });
    setCategoryDialogOpen(true);
  };

  const openAddItem = (categoryId?: string) => {
    resetItemForm();
    if (categoryId) {
      setItemForm(f => ({ ...f, categoryId }));
      setSelectedCategoryId(categoryId);
    }
    setItemDialogOpen(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      categoryId: item.categoryId,
      isActive: item.isActive,
      isAvailable: item.isAvailable,
      isVegetarian: item.isVegetarian,
      isVegan: item.isVegan,
      isGlutenFree: item.isGlutenFree,
      containsNuts: item.containsNuts,
      containsDairy: item.containsDairy,
      spiceLevel: item.spiceLevel?.toString() || '',
      calories: item.calories?.toString() || '',
      prepTimeMinutes: item.prepTimeMinutes?.toString() || '',
    });
    setSelectedCategoryId(item.categoryId);
    setItemDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name.trim()) return;

    if (editingCategory) {
      updateCategory.mutate({
        id: editingCategory.id,
        data: {
          name: categoryForm.name,
          description: categoryForm.description || undefined,
          isActive: categoryForm.isActive,
        },
      });
    } else {
      createCategory.mutate({
        name: categoryForm.name,
        description: categoryForm.description || undefined,
        isActive: categoryForm.isActive,
      });
    }
  };

  const handleSaveItem = () => {
    if (!itemForm.name.trim() || !itemForm.price || !itemForm.categoryId) return;

    const itemData = {
      name: itemForm.name,
      description: itemForm.description || undefined,
      price: parseFloat(itemForm.price),
      categoryId: itemForm.categoryId,
      isActive: itemForm.isActive,
      isAvailable: itemForm.isAvailable,
      isVegetarian: itemForm.isVegetarian,
      isVegan: itemForm.isVegan,
      isGlutenFree: itemForm.isGlutenFree,
      containsNuts: itemForm.containsNuts,
      containsDairy: itemForm.containsDairy,
      spiceLevel: itemForm.spiceLevel ? parseInt(itemForm.spiceLevel) : undefined,
      calories: itemForm.calories ? parseInt(itemForm.calories) : undefined,
      prepTimeMinutes: itemForm.prepTimeMinutes ? parseInt(itemForm.prepTimeMinutes) : undefined,
    };

    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, data: itemData });
    } else {
      createItem.mutate(itemData);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'category') {
      deleteCategory.mutate(deleteTarget.id);
    } else {
      deleteItem.mutate(deleteTarget.id);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Filter items by search
  const filteredCategories = categories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category =>
    searchQuery === '' ||
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.items.length > 0
  );

  // Stats
  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  const availableItems = categories.reduce((sum, c) => sum + c.items.filter(i => i.isAvailable).length, 0);
  const unavailableItems = totalItems - availableItems;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load menu</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Menu</h1>
          <p className="text-muted-foreground mt-1">
            Manage your menu items, categories, and pricing
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={openAddCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={() => openAddItem()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{categories.length}</p>
            <p className="text-sm text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{totalItems}</p>
            <p className="text-sm text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-400">{availableItems}</p>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-muted-foreground">{unavailableItems}</p>
            <p className="text-sm text-muted-foreground">Unavailable</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {categories.length === 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No menu items yet</h3>
            <p className="text-muted-foreground mb-6">
              Start by creating a category, then add items to it.
            </p>
            <Button onClick={openAddCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Category
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Menu Categories */}
      <div className="space-y-4">
        {filteredCategories.map((category) => (
          <Card key={category.id} className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex items-center gap-3 text-left flex-1"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                {expandedCategories.has(category.id) ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {category.name}
                    {!category.isActive && (
                      <Badge variant="secondary" className="ml-2">Hidden</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{category.items.length} items</CardDescription>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAddItem(category.id)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditCategory(category)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Category
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setDeleteTarget({ type: 'category', id: category.id, name: category.name });
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Category
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            {expandedCategories.has(category.id) && (
              <CardContent className="pt-0">
                {category.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No items in this category</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => openAddItem(category.id)}
                    >
                      Add first item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg transition-colors ${
                          item.isAvailable
                            ? 'bg-secondary/30 hover:bg-secondary/50'
                            : 'bg-muted/30 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <GripVertical className="h-5 w-5 text-muted-foreground/50 mt-1 flex-shrink-0" />
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground">{item.name}</p>
                              {item.isVegetarian && (
                                <span title="Vegetarian">
                                  <Leaf className="h-4 w-4 text-emerald-500" />
                                </span>
                              )}
                              {item.isVegan && (
                                <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500">V</Badge>
                              )}
                              {item.isGlutenFree && (
                                <span title="Gluten-free">
                                  <Wheat className="h-4 w-4 text-amber-500" />
                                </span>
                              )}
                              {item.containsNuts && (
                                <span title="Contains nuts">
                                  <Nut className="h-4 w-4 text-orange-500" />
                                </span>
                              )}
                              {item.containsDairy && (
                                <span title="Contains dairy">
                                  <Milk className="h-4 w-4 text-blue-400" />
                                </span>
                              )}
                              {!item.isAvailable && (
                                <Badge variant="secondary" className="text-xs">
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Unavailable
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 ml-8 md:ml-0">
                          <p className="text-lg font-semibold text-foreground flex items-center min-w-[80px]">
                            <DollarSign className="h-4 w-4" />
                            {item.price.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleItemAvailability.mutate({
                                id: item.id,
                                isAvailable: !item.isAvailable,
                              })}
                              disabled={toggleItemAvailability.isPending}
                            >
                              {item.isAvailable ? (
                                <Eye className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditItem(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditItem(item)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Item
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setDeleteTarget({ type: 'item', id: item.id, name: item.name });
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Item
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Appetizers, Main Courses, Desserts"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description (optional)</Label>
              <Textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this category"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="category-active">Active</Label>
                <p className="text-sm text-muted-foreground">Show this category on your menu</p>
              </div>
              <Switch
                id="category-active"
                checked={categoryForm.isActive}
                onCheckedChange={(checked) => setCategoryForm(f => ({ ...f, isActive: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={!categoryForm.name.trim() || createCategory.isPending || updateCategory.isPending}
            >
              {(createCategory.isPending || updateCategory.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="item-name">Name *</Label>
                <Input
                  id="item-name"
                  value={itemForm.name}
                  onChange={(e) => setItemForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Grilled Salmon"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-description">Description</Label>
                <Textarea
                  id="item-description"
                  value={itemForm.description}
                  onChange={(e) => setItemForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the dish..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item-price">Price *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="item-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemForm.price}
                      onChange={(e) => setItemForm(f => ({ ...f, price: e.target.value }))}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item-category">Category *</Label>
                  <Select
                    value={itemForm.categoryId}
                    onValueChange={(value) => setItemForm(f => ({ ...f, categoryId: value }))}
                  >
                    <SelectTrigger id="item-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Dietary Info */}
            <div className="space-y-3">
              <Label>Dietary Information</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="item-vegetarian"
                    checked={itemForm.isVegetarian}
                    onCheckedChange={(checked) => setItemForm(f => ({ ...f, isVegetarian: checked }))}
                  />
                  <Label htmlFor="item-vegetarian" className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-emerald-500" />
                    Vegetarian
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="item-vegan"
                    checked={itemForm.isVegan}
                    onCheckedChange={(checked) => setItemForm(f => ({ ...f, isVegan: checked }))}
                  />
                  <Label htmlFor="item-vegan">Vegan</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="item-gluten-free"
                    checked={itemForm.isGlutenFree}
                    onCheckedChange={(checked) => setItemForm(f => ({ ...f, isGlutenFree: checked }))}
                  />
                  <Label htmlFor="item-gluten-free" className="flex items-center gap-2">
                    <Wheat className="h-4 w-4 text-amber-500" />
                    Gluten-Free
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="item-nuts"
                    checked={itemForm.containsNuts}
                    onCheckedChange={(checked) => setItemForm(f => ({ ...f, containsNuts: checked }))}
                  />
                  <Label htmlFor="item-nuts" className="flex items-center gap-2">
                    <Nut className="h-4 w-4 text-orange-500" />
                    Contains Nuts
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="item-dairy"
                    checked={itemForm.containsDairy}
                    onCheckedChange={(checked) => setItemForm(f => ({ ...f, containsDairy: checked }))}
                  />
                  <Label htmlFor="item-dairy" className="flex items-center gap-2">
                    <Milk className="h-4 w-4 text-blue-400" />
                    Contains Dairy
                  </Label>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-calories">Calories</Label>
                <Input
                  id="item-calories"
                  type="number"
                  min="0"
                  value={itemForm.calories}
                  onChange={(e) => setItemForm(f => ({ ...f, calories: e.target.value }))}
                  placeholder="e.g., 450"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-prep-time">Prep Time (min)</Label>
                <Input
                  id="item-prep-time"
                  type="number"
                  min="0"
                  value={itemForm.prepTimeMinutes}
                  onChange={(e) => setItemForm(f => ({ ...f, prepTimeMinutes: e.target.value }))}
                  placeholder="e.g., 20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-spice">Spice Level (0-5)</Label>
                <Input
                  id="item-spice"
                  type="number"
                  min="0"
                  max="5"
                  value={itemForm.spiceLevel}
                  onChange={(e) => setItemForm(f => ({ ...f, spiceLevel: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="item-active">Active</Label>
                  <p className="text-sm text-muted-foreground">Show this item on your menu</p>
                </div>
                <Switch
                  id="item-active"
                  checked={itemForm.isActive}
                  onCheckedChange={(checked) => setItemForm(f => ({ ...f, isActive: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="item-available">Available</Label>
                  <p className="text-sm text-muted-foreground">Currently available for ordering</p>
                </div>
                <Switch
                  id="item-available"
                  checked={itemForm.isAvailable}
                  onCheckedChange={(checked) => setItemForm(f => ({ ...f, isAvailable: checked }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveItem}
              disabled={
                !itemForm.name.trim() ||
                !itemForm.price ||
                !itemForm.categoryId ||
                createItem.isPending ||
                updateItem.isPending
              }
            >
              {(createItem.isPending || updateItem.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === 'category' ? 'Category' : 'Item'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"?
              {deleteTarget?.type === 'category' && (
                <span className="block mt-2 text-destructive">
                  This will also delete all items in this category.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {(deleteCategory.isPending || deleteItem.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
