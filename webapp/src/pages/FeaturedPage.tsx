import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SharedRecipe, RecipeCategory } from '@/types/database';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Sparkles,
  Search,
  Star,
  StarOff,
  ChefHat,
  Clock,
  ArrowUp,
  ArrowDown,
  Plus,
  Loader2,
  Users,
  Hash,
  Award,
  TrendingUp,
  Calendar,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

export function FeaturedPage() {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [activeTab, setActiveTab] = useState('recipes');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUnfeatureDialogOpen, setIsUnfeatureDialogOpen] = useState(false);
  const [recipeToUnfeature, setRecipeToUnfeature] = useState<SharedRecipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch featured recipes
  const { data: featuredRecipes, isLoading: isFeaturedLoading } = useQuery({
    queryKey: ['featured-recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_recipes')
        .select('*')
        .eq('is_featured', true)
        .order('featured_order', { ascending: true, nullsFirst: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as (SharedRecipe & { featured_order?: number })[];
    },
  });

  // Fetch all recipes for adding to featured
  const { data: allRecipes, isLoading: isAllRecipesLoading } = useQuery({
    queryKey: ['all-recipes-for-featuring'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_recipes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as SharedRecipe[];
    },
    enabled: isAddDialogOpen,
  });

  // Feature a recipe mutation
  const featureMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const maxOrder = featuredRecipes?.length ?? 0;
      const { error } = await supabase
        .from('shared_recipes')
        .update({ is_featured: true, featured_order: maxOrder + 1 } as never)
        .eq('id', recipeId);
      if (error) throw error;
      return recipeId;
    },
    onSuccess: (recipeId) => {
      queryClient.invalidateQueries({ queryKey: ['featured-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['all-recipes-for-featuring'] });
      toast.success('Recipe featured successfully');
      const recipe = allRecipes?.find((r) => r.id === recipeId);
      if (recipe) {
        logActivity('feature_recipe', 'recipe', recipeId, recipe.title);
      }
    },
    onError: (error) => {
      toast.error(`Failed to feature recipe: ${error.message}`);
    },
  });

  // Unfeature a recipe mutation
  const unfeatureMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const { error } = await supabase
        .from('shared_recipes')
        .update({ is_featured: false, featured_order: null } as never)
        .eq('id', recipeId);
      if (error) throw error;
      return recipeId;
    },
    onSuccess: (recipeId) => {
      queryClient.invalidateQueries({ queryKey: ['featured-recipes'] });
      toast.success('Recipe unfeatured successfully');
      if (recipeToUnfeature) {
        logActivity('unfeature_recipe', 'recipe', recipeId, recipeToUnfeature.title);
      }
      setRecipeToUnfeature(null);
      setIsUnfeatureDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to unfeature recipe: ${error.message}`);
    },
  });

  // Reorder mutation (move up/down)
  const reorderMutation = useMutation({
    mutationFn: async ({
      recipeId,
      direction,
    }: {
      recipeId: string;
      direction: 'up' | 'down';
    }) => {
      if (!featuredRecipes) return;

      const currentIndex = featuredRecipes.findIndex((r) => r.id === recipeId);
      if (currentIndex === -1) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= featuredRecipes.length) return;

      const currentRecipe = featuredRecipes[currentIndex];
      const swapRecipe = featuredRecipes[newIndex];

      // Swap the orders
      const currentOrder = currentIndex + 1;
      const swapOrder = newIndex + 1;

      const { error: error1 } = await supabase
        .from('shared_recipes')
        .update({ featured_order: swapOrder } as never)
        .eq('id', currentRecipe.id);
      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from('shared_recipes')
        .update({ featured_order: currentOrder } as never)
        .eq('id', swapRecipe.id);
      if (error2) throw error2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-recipes'] });
    },
    onError: (error) => {
      toast.error(`Failed to reorder: ${error.message}`);
    },
  });

  // Filter recipes for the add dialog (exclude already featured)
  const availableRecipes = allRecipes?.filter((recipe) => {
    const isAlreadyFeatured = featuredRecipes?.some((f) => f.id === recipe.id);
    const matchesSearch =
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAlreadyFeatured && matchesSearch;
  });

  const openUnfeatureDialog = (recipe: SharedRecipe) => {
    setRecipeToUnfeature(recipe);
    setIsUnfeatureDialogOpen(true);
  };

  const getCategoryBadgeColor = (category: RecipeCategory) => {
    switch (category) {
      case 'Weekly Pick':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Seasonal':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Quick & Easy':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Holiday Special':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-amber-400" />
            Featured Curation
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage featured content across the KitchenSync platform
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="recipes" className="gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Recipes</span>
          </TabsTrigger>
          <TabsTrigger value="creators" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Creators</span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Hash className="h-4 w-4" />
            <span className="hidden sm:inline">Tags</span>
          </TabsTrigger>
        </TabsList>

        {/* Featured Recipes Tab */}
        <TabsContent value="recipes" className="mt-6">
          <div className="space-y-4">
            {/* Actions Bar */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {featuredRecipes?.length ?? 0} featured recipe(s)
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Featured Recipe
              </Button>
            </div>

            {/* Featured Recipes List */}
            {isFeaturedLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="bg-card border-border/50">
                    <CardContent className="p-0">
                      <Skeleton className="h-40 w-full rounded-t-lg" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : featuredRecipes && featuredRecipes.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featuredRecipes.map((recipe, index) => (
                  <Card
                    key={recipe.id}
                    className="bg-card border-border/50 overflow-hidden group hover:border-primary/30 transition-colors"
                  >
                    <CardContent className="p-0">
                      {/* Recipe Image */}
                      <div className="relative h-40 bg-primary/5">
                        {recipe.image_url ? (
                          <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ChefHat className="h-12 w-12 text-primary/30" />
                          </div>
                        )}
                        {/* Order Badge */}
                        <div className="absolute top-2 left-2 w-8 h-8 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        {/* Featured Star */}
                        <div className="absolute top-2 right-2">
                          <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                        </div>
                      </div>

                      {/* Recipe Info */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-foreground truncate">
                            {recipe.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={getCategoryBadgeColor(recipe.category)}
                            >
                              {recipe.category}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {recipe.prep_time + recipe.cook_time} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(recipe.updated_at), 'MMM d')}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={index === 0 || reorderMutation.isPending}
                            onClick={() =>
                              reorderMutation.mutate({
                                recipeId: recipe.id,
                                direction: 'up',
                              })
                            }
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={
                              index === featuredRecipes.length - 1 ||
                              reorderMutation.isPending
                            }
                            onClick={() =>
                              reorderMutation.mutate({
                                recipeId: recipe.id,
                                direction: 'down',
                              })
                            }
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <div className="flex-1" />
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openUnfeatureDialog(recipe)}
                          >
                            <StarOff className="h-4 w-4 mr-1" />
                            Unfeature
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border/50">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-1">
                      No featured recipes
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Add recipes to feature them on the platform homepage
                    </p>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Featured Recipe
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Featured Creators Tab (Placeholder) */}
        <TabsContent value="creators" className="mt-6">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Featured Creators
              </CardTitle>
              <CardDescription>
                Highlight verified creators and their culinary content
              </CardDescription>
            </CardHeader>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Coming Soon
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Featured Creators will allow you to highlight verified culinary experts
                  and food enthusiasts. This feature will be available in Phase 4: Creator Tools.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Badge variant="outline">Verification Workflow</Badge>
                  <Badge variant="outline">Creator Analytics</Badge>
                  <Badge variant="outline">Profile Badges</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trending Tags Tab (Placeholder) */}
        <TabsContent value="tags" className="mt-6">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Trending Tags
              </CardTitle>
              <CardDescription>
                Monitor and curate popular hashtags across the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Hash className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Coming Soon
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Trending Tags will show real-time hashtag analytics and allow you to
                  curate featured tags. This feature will be available in Phase 3: Social Management.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Badge variant="outline">#trending</Badge>
                  <Badge variant="outline">#seasonal</Badge>
                  <Badge variant="outline">#quickmeals</Badge>
                  <Badge variant="outline">#homemade</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Featured Recipe Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Featured Recipe</DialogTitle>
            <DialogDescription>
              Search and select a recipe to feature on the platform homepage
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery ? (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          {/* Recipe List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {isAllRecipesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : availableRecipes && availableRecipes.length > 0 ? (
              <div className="space-y-2 pb-4">
                {availableRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex-shrink-0 overflow-hidden">
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ChefHat className="h-5 w-5 text-primary/50" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {recipe.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getCategoryBadgeColor(recipe.category)}`}
                        >
                          {recipe.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {recipe.prep_time + recipe.cook_time} min
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      size="sm"
                      onClick={() => {
                        featureMutation.mutate(recipe.id);
                        setIsAddDialogOpen(false);
                        setSearchQuery('');
                      }}
                      disabled={featureMutation.isPending}
                    >
                      {featureMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-1" />
                          Feature
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <ChefHat className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'No recipes match your search'
                    : 'All active recipes are already featured'}
                </p>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unfeature Confirmation Dialog */}
      <AlertDialog open={isUnfeatureDialogOpen} onOpenChange={setIsUnfeatureDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Featured</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{recipeToUnfeature?.title}" from featured
              recipes? It will no longer appear on the platform homepage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                recipeToUnfeature && unfeatureMutation.mutate(recipeToUnfeature.id)
              }
            >
              {unfeatureMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove from Featured'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
