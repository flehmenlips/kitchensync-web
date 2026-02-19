import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { RecipeCategory, RecipeDifficulty } from '@/types/database';
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Search,
  Eye,
  Share2,
  ChefHat,
  Clock,
  Users,
  Loader2,
  Check,
  BookOpen,
  X,
  Plus,
  Star,
  Pencil,
  Trash2,
  Save,
  Image as ImageIcon,
  ArrowLeft,
  Utensils,
  ListOrdered,
  Tag,
  Calendar,
  Sparkles,
  Camera,
  Link as LinkIcon,
  LayoutGrid,
  List,
  GripVertical,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Personal recipe from the recipes table
interface PersonalRecipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  prep_time: string | null;
  cook_time: string | null;
  servings: number;
  difficulty: string;
  image_url: string | null;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
  ingredients?: { id: string; content: string; sort_order: number }[];
  instructions?: { id: string; content: string; step_number: number }[];
}

interface Ingredient {
  id: string;
  content: string;
  sort_order: number;
}

interface Instruction {
  id: string;
  content: string;
  step_number: number;
}

const categories: RecipeCategory[] = ['Weekly Pick', 'Seasonal', 'Quick & Easy', 'Holiday Special'];
const difficulties: RecipeDifficulty[] = ['easy', 'medium', 'hard'];

interface ShareFormData {
  category: RecipeCategory;
  is_featured: boolean;
  is_active: boolean;
  release_date: string;
  tags: string[];
}

const defaultShareForm: ShareFormData = {
  category: 'Weekly Pick',
  is_featured: false,
  is_active: true,
  release_date: '',
  tags: [],
};

interface EditFormData {
  title: string;
  description: string;
  prep_time: string;
  cook_time: string;
  servings: number;
  difficulty: string;
  image_url: string;
}

type ViewMode = 'grid' | 'list';

export function MyRecipesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<PersonalRecipe | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [shareForm, setShareForm] = useState<ShareFormData>(defaultShareForm);
  const [tagInput, setTagInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState('overview');

  // Edit form state
  const [editForm, setEditForm] = useState<EditFormData>({
    title: '',
    description: '',
    prep_time: '',
    cook_time: '',
    servings: 1,
    difficulty: 'medium',
    image_url: '',
  });
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([]);
  const [editInstructions, setEditInstructions] = useState<Instruction[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [newInstruction, setNewInstruction] = useState('');

  // Fetch personal recipes for the logged-in admin
  const { data: recipes, isLoading } = useQuery({
    queryKey: ['my-recipes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as PersonalRecipe[];
    },
    enabled: !!user?.id,
  });

  // Fetch ingredients and instructions for a specific recipe
  const fetchRecipeDetails = async (recipeId: string): Promise<PersonalRecipe | null> => {
    // Try to fetch recipe with related tables first
    const recipeRes = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single();

    if (recipeRes.error) {
      console.error('Error fetching recipe:', recipeRes.error);
      return null;
    }

    // Log the recipe data to see what fields are available
    console.log('Recipe data:', recipeRes.data);

    // Check if ingredients/instructions are stored directly on the recipe (as arrays or JSON)
    const recipeData = recipeRes.data as Record<string, unknown>;

    // Try to get ingredients from various possible column names
    let ingredients: Ingredient[] = [];
    let instructions: Instruction[] = [];

    // Check for ingredients - could be stored as array, JSON, or in separate table
    if (Array.isArray(recipeData.ingredients)) {
      // Stored as TEXT[] array on recipe table
      ingredients = (recipeData.ingredients as string[]).map((content, i) => ({
        id: `ing-${i}`,
        content,
        sort_order: i,
      }));
    } else if (typeof recipeData.ingredients === 'string') {
      // Stored as JSON string
      try {
        const parsed = JSON.parse(recipeData.ingredients as string);
        if (Array.isArray(parsed)) {
          ingredients = parsed.map((item: string | { content: string }, i: number) => ({
            id: `ing-${i}`,
            content: typeof item === 'string' ? item : item.content,
            sort_order: i,
          }));
        }
      } catch { /* not JSON */ }
    }

    // Try fetching from recipe_ingredients table (alternative name)
    if (ingredients.length === 0) {
      const ingredientsRes = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('sort_order');

      if (!ingredientsRes.error && ingredientsRes.data) {
        ingredients = ingredientsRes.data.map((ing: { id?: string; content?: string; ingredient?: string; name?: string; sort_order?: number }, i: number) => ({
          id: ing.id || `ing-${i}`,
          content: ing.content || ing.ingredient || ing.name || '',
          sort_order: ing.sort_order ?? i,
        }));
      }
    }

    // Check for instructions - could be stored as array, JSON, or in separate table
    if (Array.isArray(recipeData.instructions)) {
      // Stored as TEXT[] array on recipe table
      instructions = (recipeData.instructions as string[]).map((content, i) => ({
        id: `inst-${i}`,
        content,
        step_number: i + 1,
      }));
    } else if (typeof recipeData.instructions === 'string') {
      // Stored as JSON string
      try {
        const parsed = JSON.parse(recipeData.instructions as string);
        if (Array.isArray(parsed)) {
          instructions = parsed.map((item: string | { content: string }, i: number) => ({
            id: `inst-${i}`,
            content: typeof item === 'string' ? item : item.content,
            step_number: i + 1,
          }));
        }
      } catch { /* not JSON */ }
    }

    // Try fetching from recipe_instructions table (alternative name)
    if (instructions.length === 0) {
      const instructionsRes = await supabase
        .from('recipe_instructions')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('step_number');

      if (!instructionsRes.error && instructionsRes.data) {
        instructions = instructionsRes.data.map((inst: { id?: string; content?: string; instruction?: string; step?: string; step_number?: number }, i: number) => ({
          id: inst.id || `inst-${i}`,
          content: inst.content || inst.instruction || inst.step || '',
          step_number: inst.step_number ?? i + 1,
        }));
      }
    }

    return {
      ...recipeRes.data,
      ingredients,
      instructions,
    } as PersonalRecipe;
  };

  // Check if a recipe has already been shared
  const { data: sharedRecipeIds } = useQuery({
    queryKey: ['shared-recipe-titles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('shared_recipes')
        .select('title');
      return new Set((data ?? []).map((r) => r.title.toLowerCase()));
    },
  });

  // Update recipe mutation
  const updateRecipeMutation = useMutation({
    mutationFn: async ({ recipeId, data, ingredients, instructions }: {
      recipeId: string;
      data: Partial<EditFormData>;
      ingredients: Ingredient[];
      instructions: Instruction[];
    }) => {
      // Update recipe basic info
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          title: data.title,
          description: data.description || null,
          prep_time: data.prep_time || null,
          cook_time: data.cook_time || null,
          servings: data.servings,
          difficulty: data.difficulty,
          image_url: data.image_url || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', recipeId);

      if (recipeError) throw recipeError;

      // Delete existing ingredients and instructions
      await Promise.all([
        supabase.from('ingredients').delete().eq('recipe_id', recipeId),
        supabase.from('instructions').delete().eq('recipe_id', recipeId),
      ]);

      // Insert new ingredients
      if (ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredients.map((ing, i) => ({
            recipe_id: recipeId,
            content: ing.content,
            sort_order: i,
          })) as never[]);
        if (ingredientsError) throw ingredientsError;
      }

      // Insert new instructions
      if (instructions.length > 0) {
        const { error: instructionsError } = await supabase
          .from('instructions')
          .insert(instructions.map((inst, i) => ({
            recipe_id: recipeId,
            content: inst.content,
            step_number: i + 1,
          })) as never[]);
        if (instructionsError) throw instructionsError;
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      toast.success('Recipe updated successfully!');
      setIsEditing(false);
      // Refresh the selected recipe
      if (selectedRecipe) {
        const updated = await fetchRecipeDetails(selectedRecipe.id);
        if (updated) setSelectedRecipe(updated);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update recipe: ${error.message}`);
    },
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      // Delete ingredients and instructions first
      await Promise.all([
        supabase.from('ingredients').delete().eq('recipe_id', recipeId),
        supabase.from('instructions').delete().eq('recipe_id', recipeId),
      ]);

      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      toast.success('Recipe deleted successfully!');
      setIsDeleteOpen(false);
      setIsDetailOpen(false);
      setSelectedRecipe(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete recipe: ${error.message}`);
    },
  });

  // Create recipe mutation
  const createRecipeMutation = useMutation({
    mutationFn: async ({ data, ingredients, instructions }: {
      data: EditFormData;
      ingredients: Ingredient[];
      instructions: Instruction[];
    }) => {
      // Create the recipe
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          user_id: user?.id,
          title: data.title,
          description: data.description || null,
          prep_time: data.prep_time || null,
          cook_time: data.cook_time || null,
          servings: data.servings,
          difficulty: data.difficulty,
          image_url: data.image_url || null,
          is_ai_generated: false,
        } as never)
        .select()
        .single();

      if (recipeError) throw recipeError;

      const recipeId = (newRecipe as PersonalRecipe).id;

      // Insert ingredients
      if (ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredients.map((ing, i) => ({
            recipe_id: recipeId,
            content: ing.content,
            sort_order: i,
          })) as never[]);
        if (ingredientsError) throw ingredientsError;
      }

      // Insert instructions
      if (instructions.length > 0) {
        const { error: instructionsError } = await supabase
          .from('instructions')
          .insert(instructions.map((inst, i) => ({
            recipe_id: recipeId,
            content: inst.content,
            step_number: i + 1,
          })) as never[]);
        if (instructionsError) throw instructionsError;
      }

      return newRecipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      toast.success('Recipe created successfully!');
      setIsCreateOpen(false);
      resetEditForm();
    },
    onError: (error) => {
      toast.error(`Failed to create recipe: ${error.message}`);
    },
  });

  // Share mutation - copies recipe to shared_recipes table
  const shareMutation = useMutation({
    mutationFn: async ({ recipe, form }: { recipe: PersonalRecipe; form: ShareFormData }) => {
      // Fetch full recipe details including ingredients and instructions
      const fullRecipe = await fetchRecipeDetails(recipe.id);
      if (!fullRecipe) throw new Error('Failed to fetch recipe details');

      // Map difficulty to the shared_recipes format (capitalized: Easy, Medium, Hard)
      const mapDifficulty = (diff: string): string => {
        const lower = diff.toLowerCase();
        if (lower === 'easy') return 'Easy';
        if (lower === 'hard') return 'Hard';
        return 'Medium';
      };

      const sharedRecipeData = {
        title: fullRecipe.title,
        description: fullRecipe.description ?? '',
        prep_time: fullRecipe.prep_time ?? '',
        cook_time: fullRecipe.cook_time ?? '',
        servings: fullRecipe.servings ?? 4,
        difficulty: mapDifficulty(fullRecipe.difficulty),
        ingredients: (fullRecipe.ingredients ?? []).map((i) => i.content),
        instructions: (fullRecipe.instructions ?? []).map((i) => i.content),
        image_url: fullRecipe.image_url || null,
        tags: form.tags,
        category: form.category,
        is_featured: form.is_featured,
        is_active: form.is_active,
        release_date: form.release_date || null,
      };

      console.log('Sharing recipe with data:', sharedRecipeData);

      const { error, data } = await supabase.from('shared_recipes').insert(sharedRecipeData as never).select();

      if (error) {
        console.error('Share error:', error);
        throw error;
      }

      console.log('Share success:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-recipe-titles'] });
      queryClient.invalidateQueries({ queryKey: ['shared-recipes'] });
      toast.success('Recipe shared successfully! It is now available to all users.');
      setIsShareOpen(false);
      setShareForm(defaultShareForm);
    },
    onError: (error) => {
      console.error('Share mutation error:', error);
      toast.error(`Failed to share recipe: ${error.message}`);
    },
  });

  const resetEditForm = () => {
    setEditForm({
      title: '',
      description: '',
      prep_time: '',
      cook_time: '',
      servings: 1,
      difficulty: 'medium',
      image_url: '',
    });
    setEditIngredients([]);
    setEditInstructions([]);
    setNewIngredient('');
    setNewInstruction('');
  };

  const openDetail = async (recipe: PersonalRecipe) => {
    const fullRecipe = await fetchRecipeDetails(recipe.id);
    if (fullRecipe) {
      setSelectedRecipe(fullRecipe);
      setIsDetailOpen(true);
      setIsEditing(false);
      setActiveTab('overview');
    }
  };

  const startEditing = () => {
    if (selectedRecipe) {
      setEditForm({
        title: selectedRecipe.title,
        description: selectedRecipe.description ?? '',
        prep_time: selectedRecipe.prep_time ?? '',
        cook_time: selectedRecipe.cook_time ?? '',
        servings: selectedRecipe.servings,
        difficulty: selectedRecipe.difficulty,
        image_url: selectedRecipe.image_url ?? '',
      });
      setEditIngredients(selectedRecipe.ingredients?.map((i, idx) => ({
        id: i.id,
        content: i.content,
        sort_order: idx,
      })) ?? []);
      setEditInstructions(selectedRecipe.instructions?.map((i, idx) => ({
        id: i.id,
        content: i.content,
        step_number: idx + 1,
      })) ?? []);
      setIsEditing(true);
    }
  };

  const openCreateDialog = () => {
    resetEditForm();
    setIsCreateOpen(true);
  };

  const openShareDialog = () => {
    if (selectedRecipe) {
      setShareForm(defaultShareForm);
      setTagInput('');
      setIsShareOpen(true);
    }
  };

  const handleSave = () => {
    if (selectedRecipe) {
      updateRecipeMutation.mutate({
        recipeId: selectedRecipe.id,
        data: editForm,
        ingredients: editIngredients,
        instructions: editInstructions,
      });
    }
  };

  const handleCreate = () => {
    if (!editForm.title.trim()) {
      toast.error('Please enter a recipe title');
      return;
    }
    createRecipeMutation.mutate({
      data: editForm,
      ingredients: editIngredients,
      instructions: editInstructions,
    });
  };

  const handleShare = () => {
    if (selectedRecipe) {
      shareMutation.mutate({ recipe: selectedRecipe, form: shareForm });
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !shareForm.tags.includes(tagInput.trim())) {
      setShareForm((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setShareForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setEditIngredients((prev) => [
        ...prev,
        { id: crypto.randomUUID(), content: newIngredient.trim(), sort_order: prev.length },
      ]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (id: string) => {
    setEditIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  const addInstruction = () => {
    if (newInstruction.trim()) {
      setEditInstructions((prev) => [
        ...prev,
        { id: crypto.randomUUID(), content: newInstruction.trim(), step_number: prev.length + 1 },
      ]);
      setNewInstruction('');
    }
  };

  const removeInstruction = (id: string) => {
    setEditInstructions((prev) => prev.filter((i) => i.id !== id));
  };

  const updateIngredient = (id: string, content: string) => {
    setEditIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, content } : i)));
  };

  const updateInstruction = (id: string, content: string) => {
    setEditInstructions((prev) => prev.map((i) => (i.id === id ? { ...i, content } : i)));
  };

  const isAlreadyShared = (title: string) => {
    return sharedRecipeIds?.has(title.toLowerCase()) ?? false;
  };

  const filteredRecipes = recipes?.filter((recipe) =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return '-';
    return timeStr;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'hard': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  // Recipe Card Component
  const RecipeCard = ({ recipe }: { recipe: PersonalRecipe }) => {
    const shared = isAlreadyShared(recipe.title);
    return (
      <Card
        className="group cursor-pointer overflow-hidden border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
        onClick={() => openDetail(recipe)}
      >
        <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ChefHat className="h-16 w-16 text-primary/30" />
            </div>
          )}
          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {shared && (
              <Badge className="bg-emerald-500/90 text-white border-0 shadow-lg">
                <Check className="h-3 w-3 mr-1" />
                Shared
              </Badge>
            )}
            {recipe.is_ai_generated && (
              <Badge className="bg-violet-500/90 text-white border-0 shadow-lg">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Badge>
            )}
          </div>
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <Badge variant="outline" className={cn("border", getDifficultyColor(recipe.difficulty))}>
              {recipe.difficulty}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
              {recipe.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(recipe.prep_time)}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {recipe.servings}
            </div>
            <div className="ml-auto text-muted-foreground/70">
              {format(new Date(recipe.created_at), 'MMM d')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Recipe List Item Component
  const RecipeListItem = ({ recipe }: { recipe: PersonalRecipe }) => {
    const shared = isAlreadyShared(recipe.title);
    return (
      <div
        className="group flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
        onClick={() => openDetail(recipe)}
      >
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 flex-shrink-0">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ChefHat className="h-8 w-8 text-primary/30" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {recipe.title}
            </h3>
            {shared && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                Shared
              </Badge>
            )}
            {recipe.is_ai_generated && (
              <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20 text-xs">
                AI
              </Badge>
            )}
          </div>
          {recipe.description && (
            <p className="text-muted-foreground text-sm line-clamp-1">{recipe.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <Badge variant="outline" className={cn("text-xs", getDifficultyColor(recipe.difficulty))}>
              {recipe.difficulty}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(recipe.prep_time)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {recipe.servings} servings
            </span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground hidden md:block">
          {format(new Date(recipe.created_at), 'MMM d, yyyy')}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Recipes</h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal recipes and share them with all users.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          New Recipe
        </Button>
      </div>

      {/* Search and View Toggle */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>
            <div className="flex items-center border border-border/50 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{recipes?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Recipes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <Share2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {recipes?.filter((r) => isAlreadyShared(r.title)).length ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Already Shared</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-400/10 flex items-center justify-center">
              <ChefHat className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {recipes?.filter((r) => !isAlreadyShared(r.title)).length ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Ready to Share</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipes Grid/List */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-72 rounded-lg' : 'h-24 rounded-lg'} />
          ))}
        </div>
      ) : filteredRecipes && filteredRecipes.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecipes.map((recipe) => (
              <RecipeListItem key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )
      ) : (
        <Card className="bg-card border-border/50">
          <CardContent className="p-12 text-center">
            <ChefHat className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No recipes found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Create your first recipe to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateDialog} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Recipe
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recipe Detail Sheet */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => {
        setIsDetailOpen(open);
        if (!open) {
          setIsEditing(false);
          setSelectedRecipe(null);
        }
      }}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0">
          {selectedRecipe && (
            <>
              {/* Header Image */}
              <div className="relative h-48 sm:h-56 flex-shrink-0">
                {selectedRecipe.image_url ? (
                  <img
                    src={selectedRecipe.image_url}
                    alt={selectedRecipe.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
                    <ChefHat className="h-24 w-24 text-primary/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

                {/* Close and actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {!isEditing && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-9 w-9 bg-background/80 backdrop-blur-sm hover:bg-background"
                        onClick={startEditing}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!isAlreadyShared(selectedRecipe.title) && (
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-9 w-9 bg-emerald-500/80 hover:bg-emerald-500 text-white backdrop-blur-sm"
                          onClick={openShareDialog}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-9 w-9 bg-rose-500/80 hover:bg-rose-500 text-white backdrop-blur-sm"
                        onClick={() => setIsDeleteOpen(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Title overlay */}
                <div className="absolute bottom-4 left-6 right-6">
                  {isEditing ? (
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="text-2xl font-bold bg-background/80 backdrop-blur-sm border-primary/20"
                      placeholder="Recipe title"
                    />
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className={cn("border", getDifficultyColor(selectedRecipe.difficulty))}>
                          {selectedRecipe.difficulty}
                        </Badge>
                        {selectedRecipe.is_ai_generated && (
                          <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                        {isAlreadyShared(selectedRecipe.title) && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <Check className="h-3 w-3 mr-1" />
                            Shared
                          </Badge>
                        )}
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{selectedRecipe.title}</h1>
                    </>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-6 space-y-6 pb-8">
                  {isEditing ? (
                    /* Edit Mode */
                    <div className="space-y-6">
                      {/* Image URL */}
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <ImageIcon className="h-4 w-4" />
                          Image URL
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={editForm.image_url}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, image_url: e.target.value }))}
                            placeholder="https://example.com/image.jpg"
                            className="flex-1"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Paste an image URL or upload to your Asset Library
                        </p>
                      </div>

                      {/* Description */}
                      <div>
                        <Label className="mb-2 block">Description</Label>
                        <Textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="A brief description of your recipe..."
                          rows={3}
                        />
                      </div>

                      {/* Time and Servings */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <Label className="mb-2 block">Prep Time</Label>
                          <Input
                            value={editForm.prep_time}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, prep_time: e.target.value }))}
                            placeholder="15 mins"
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block">Cook Time</Label>
                          <Input
                            value={editForm.cook_time}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, cook_time: e.target.value }))}
                            placeholder="30 mins"
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block">Servings</Label>
                          <Input
                            type="number"
                            min={1}
                            value={editForm.servings}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, servings: parseInt(e.target.value) || 1 }))}
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block">Difficulty</Label>
                          <Select
                            value={editForm.difficulty}
                            onValueChange={(value) => setEditForm((prev) => ({ ...prev, difficulty: value }))}
                          >
                            <SelectTrigger>
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

                      <Separator />

                      {/* Ingredients */}
                      <div>
                        <Label className="flex items-center gap-2 mb-3">
                          <Utensils className="h-4 w-4" />
                          Ingredients
                        </Label>
                        <div className="space-y-2">
                          {editIngredients.map((ingredient, idx) => (
                            <div key={ingredient.id} className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-move" />
                              <Input
                                value={ingredient.content}
                                onChange={(e) => updateIngredient(ingredient.id, e.target.value)}
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-muted-foreground hover:text-rose-500"
                                onClick={() => removeIngredient(ingredient.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex items-center gap-2">
                            <Input
                              value={newIngredient}
                              onChange={(e) => setNewIngredient(e.target.value)}
                              placeholder="Add an ingredient..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addIngredient();
                                }
                              }}
                            />
                            <Button variant="outline" onClick={addIngredient}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Instructions */}
                      <div>
                        <Label className="flex items-center gap-2 mb-3">
                          <ListOrdered className="h-4 w-4" />
                          Instructions
                        </Label>
                        <div className="space-y-2">
                          {editInstructions.map((instruction, idx) => (
                            <div key={instruction.id} className="flex items-start gap-2">
                              <span className="w-6 h-9 flex items-center justify-center text-sm font-medium text-muted-foreground">
                                {idx + 1}.
                              </span>
                              <Textarea
                                value={instruction.content}
                                onChange={(e) => updateInstruction(instruction.id, e.target.value)}
                                className="flex-1 min-h-[2.5rem]"
                                rows={2}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-muted-foreground hover:text-rose-500"
                                onClick={() => removeInstruction(instruction.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex items-start gap-2">
                            <span className="w-6 h-9 flex items-center justify-center text-sm font-medium text-muted-foreground">
                              {editInstructions.length + 1}.
                            </span>
                            <Textarea
                              value={newInstruction}
                              onChange={(e) => setNewInstruction(e.target.value)}
                              placeholder="Add an instruction step..."
                              className="flex-1"
                              rows={2}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.metaKey) {
                                  e.preventDefault();
                                  addInstruction();
                                }
                              }}
                            />
                            <Button variant="outline" className="h-9" onClick={addInstruction}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Save/Cancel buttons */}
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={updateRecipeMutation.isPending}>
                          {updateRecipeMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      {/* Quick Info Bar */}
                      <div className="flex flex-wrap items-center gap-4 p-4 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="text-sm">
                            <span className="text-muted-foreground">Prep:</span>{' '}
                            <span className="font-medium">{formatTime(selectedRecipe.prep_time)}</span>
                          </span>
                        </div>
                        <Separator orientation="vertical" className="h-4" />
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="text-sm">
                            <span className="text-muted-foreground">Cook:</span>{' '}
                            <span className="font-medium">{formatTime(selectedRecipe.cook_time)}</span>
                          </span>
                        </div>
                        <Separator orientation="vertical" className="h-4" />
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="text-sm">
                            <span className="font-medium">{selectedRecipe.servings}</span>{' '}
                            <span className="text-muted-foreground">servings</span>
                          </span>
                        </div>
                        <div className="ml-auto text-xs text-muted-foreground">
                          Created {format(new Date(selectedRecipe.created_at), 'MMMM d, yyyy')}
                        </div>
                      </div>

                      {/* Description */}
                      {selectedRecipe.description && (
                        <p className="text-muted-foreground leading-relaxed">
                          {selectedRecipe.description}
                        </p>
                      )}

                      {/* Tabs for Ingredients/Instructions */}
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="w-full grid grid-cols-2 sticky top-0 z-10 bg-background">
                          <TabsTrigger value="overview" className="gap-2">
                            <Utensils className="h-4 w-4" />
                            Ingredients ({selectedRecipe.ingredients?.length || 0})
                          </TabsTrigger>
                          <TabsTrigger value="instructions" className="gap-2">
                            <ListOrdered className="h-4 w-4" />
                            Instructions ({selectedRecipe.instructions?.length || 0})
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-4 pb-4">
                          {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
                            <div className="grid gap-2">
                              {selectedRecipe.ingredients.map((ingredient) => (
                                <div
                                  key={ingredient.id}
                                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                                >
                                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                  <span className="text-foreground">{ingredient.content}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              No ingredients added yet
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="instructions" className="mt-4 pb-4">
                          {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 ? (
                            <div className="space-y-4">
                              {selectedRecipe.instructions.map((instruction, idx) => (
                                <div key={instruction.id} className="flex gap-4">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-sm font-semibold text-primary">{idx + 1}</span>
                                  </div>
                                  <div className="flex-1 pt-1">
                                    <p className="text-foreground leading-relaxed">{instruction.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              No instructions added yet
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Recipe Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        setIsCreateOpen(open);
        if (!open) resetEditForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Create New Recipe
            </DialogTitle>
            <DialogDescription>
              Add a new recipe to your personal collection
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 pb-4">
              {/* Basic Info */}
              <div>
                <Label className="mb-2 block">Title *</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Recipe title"
                />
              </div>

              <div>
                <Label className="mb-2 block">Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="A brief description of your recipe..."
                  rows={3}
                />
              </div>

              {/* Image URL */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <ImageIcon className="h-4 w-4" />
                  Image URL
                </Label>
                <Input
                  value={editForm.image_url}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste an image URL or upload to your Asset Library
                </p>
              </div>

              {/* Time and Servings */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label className="mb-2 block">Prep Time</Label>
                  <Input
                    value={editForm.prep_time}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, prep_time: e.target.value }))}
                    placeholder="15 mins"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Cook Time</Label>
                  <Input
                    value={editForm.cook_time}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, cook_time: e.target.value }))}
                    placeholder="30 mins"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Servings</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editForm.servings}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, servings: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Difficulty</Label>
                  <Select
                    value={editForm.difficulty}
                    onValueChange={(value) => setEditForm((prev) => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger>
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

              <Separator />

              {/* Ingredients */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Utensils className="h-4 w-4" />
                  Ingredients
                </Label>
                <div className="space-y-2">
                  {editIngredients.map((ingredient, idx) => (
                    <div key={ingredient.id} className="flex items-center gap-2">
                      <Input
                        value={ingredient.content}
                        onChange={(e) => updateIngredient(ingredient.id, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-rose-500"
                        onClick={() => removeIngredient(ingredient.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newIngredient}
                      onChange={(e) => setNewIngredient(e.target.value)}
                      placeholder="Add an ingredient..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addIngredient();
                        }
                      }}
                    />
                    <Button variant="outline" onClick={addIngredient}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Instructions */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <ListOrdered className="h-4 w-4" />
                  Instructions
                </Label>
                <div className="space-y-2">
                  {editInstructions.map((instruction, idx) => (
                    <div key={instruction.id} className="flex items-start gap-2">
                      <span className="w-6 h-9 flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {idx + 1}.
                      </span>
                      <Textarea
                        value={instruction.content}
                        onChange={(e) => updateInstruction(instruction.id, e.target.value)}
                        className="flex-1 min-h-[2.5rem]"
                        rows={2}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-rose-500"
                        onClick={() => removeInstruction(instruction.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-9 flex items-center justify-center text-sm font-medium text-muted-foreground">
                      {editInstructions.length + 1}.
                    </span>
                    <Textarea
                      value={newInstruction}
                      onChange={(e) => setNewInstruction(e.target.value)}
                      placeholder="Add an instruction step..."
                      className="flex-1"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.metaKey) {
                          e.preventDefault();
                          addInstruction();
                        }
                      }}
                    />
                    <Button variant="outline" className="h-9" onClick={addInstruction}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createRecipeMutation.isPending}>
              {createRecipeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Recipe
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-emerald-500" />
              Share Recipe
            </DialogTitle>
            <DialogDescription>
              Share "{selectedRecipe?.title}" with all KitchenSync users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={shareForm.category}
                onValueChange={(value: RecipeCategory) =>
                  setShareForm((prev) => ({ ...prev, category: value }))
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

            {/* Release Date */}
            <div>
              <Label htmlFor="release_date">Release Date (optional)</Label>
              <Input
                id="release_date"
                type="date"
                value={shareForm.release_date}
                onChange={(e) => setShareForm((prev) => ({ ...prev, release_date: e.target.value }))}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to publish immediately
              </p>
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
              {shareForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {shareForm.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <Switch
                  id="is_featured"
                  checked={shareForm.is_featured}
                  onCheckedChange={(checked) =>
                    setShareForm((prev) => ({ ...prev, is_featured: checked }))
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
                  checked={shareForm.is_active}
                  onCheckedChange={(checked) =>
                    setShareForm((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4 mt-4">
            <Button variant="outline" onClick={() => setIsShareOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={shareMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {shareMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Recipe
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRecipe?.title}"? This action cannot be undone
              and will permanently remove the recipe and all its ingredients and instructions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => selectedRecipe && deleteRecipeMutation.mutate(selectedRecipe.id)}
              disabled={deleteRecipeMutation.isPending}
            >
              {deleteRecipeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
