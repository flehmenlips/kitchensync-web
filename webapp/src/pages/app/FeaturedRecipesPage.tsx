import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Star,
  Heart,
  Bookmark,
  BookOpen,
  Clock,
  Users as UsersIcon,
  ChefHat,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
  'Appetizer',
  'Snack',
  'Beverage',
  'Salad',
  'Soup',
  'Baking',
  'Holiday',
];

export function FeaturedRecipesPage() {
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('All');

  const { data: featured, isLoading } = useQuery({
    queryKey: ['featured-recipes', category],
    queryFn: async () => {
      let query = supabase
        .from('user_shared_recipes')
        .select(`
          *,
          recipe:recipes (
            id, title, description, image_url, image_urls,
            prep_time, cook_time, servings, difficulty
          )
        `)
        .eq('is_public', true)
        .eq('is_featured', true)
        .order('like_count', { ascending: false })
        .limit(50);

      if (category !== 'All') {
        query = query.eq('category', category.toLowerCase());
      }

      const { data, error } = await query;
      if (error) {
        // Fallback: if is_featured column doesn't exist, show popular recipes instead
        const fallback = await supabase
          .from('user_shared_recipes')
          .select(`
            *,
            recipe:recipes (
              id, title, description, image_url, image_urls,
              prep_time, cook_time, servings, difficulty
            )
          `)
          .eq('is_public', true)
          .order('like_count', { ascending: false })
          .limit(50);
        return fallback.data || [];
      }
      // If no featured recipes found, show popular ones as fallback
      if (!data?.length) {
        const fallback = await supabase
          .from('user_shared_recipes')
          .select(`
            *,
            recipe:recipes (
              id, title, description, image_url, image_urls,
              prep_time, cook_time, servings, difficulty
            )
          `)
          .eq('is_public', true)
          .order('like_count', { ascending: false })
          .limit(50);
        return fallback.data || [];
      }
      return data;
    },
  });

  const { data: likedIds } = useQuery({
    queryKey: ['my-likes', user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data } = await supabase.from('recipe_likes').select('shared_recipe_id').eq('user_id', user.id);
      return new Set((data || []).map(d => d.shared_recipe_id));
    },
    enabled: !!user,
  });

  const { data: savedIds } = useQuery({
    queryKey: ['my-saves', user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data } = await supabase.from('recipe_saves').select('shared_recipe_id').eq('user_id', user.id);
      return new Set((data || []).map(d => d.shared_recipe_id));
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (sharedRecipeId: string) => {
      if (!user) return;
      const isSaved = savedIds?.has(sharedRecipeId);
      if (isSaved) {
        await supabase.from('recipe_saves').delete().eq('user_id', user.id).eq('shared_recipe_id', sharedRecipeId);
      } else {
        await supabase.from('recipe_saves').insert({ user_id: user.id, shared_recipe_id: sharedRecipeId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-saves'] });
      toast.success('Updated saved recipes');
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Featured Recipes</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Curated picks and popular community recipes</p>
      </div>

      {/* Category filter */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? 'default' : 'outline'}
              size="sm"
              className={category === cat
                ? 'bg-primary text-primary-foreground shrink-0'
                : 'shrink-0 border-border/50 text-muted-foreground hover:text-foreground'
              }
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-card/60 border-border/40 overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : featured && featured.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {featured.map((item: any) => {
            const recipe = item.recipe;
            const title = recipe?.title || item.caption || 'Shared Recipe';
            const imgUrl = recipe?.image_url || recipe?.image_urls?.[0];
            const isLiked = likedIds?.has(item.id);
            const isSaved = savedIds?.has(item.id);

            return (
              <Link key={item.id} to={`/app/community/${item.id}`}>
                <Card className="bg-card/60 border-border/40 overflow-hidden hover:border-primary/30 transition-all group">
                  <div className="h-48 bg-secondary/30 relative overflow-hidden">
                    {imgUrl ? (
                      <img src={imgUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}
                    {recipe?.difficulty && (
                      <Badge className="absolute top-2 right-2 text-[10px] capitalize" variant="secondary">
                        {recipe.difficulty}
                      </Badge>
                    )}
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      {item.like_count > 0 && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-black/50 text-white border-0">
                          <Heart className={`h-3 w-3 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                          {item.like_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-1.5">
                    <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {title}
                    </h3>
                    {recipe?.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{recipe.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {(recipe?.prep_time || recipe?.cook_time) && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {(Number(recipe.prep_time) || 0) + (Number(recipe.cook_time) || 0)} min
                          </span>
                        )}
                        {recipe?.servings && (
                          <span className="flex items-center gap-1">
                            <UsersIcon className="h-3 w-3" />
                            {recipe.servings}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${isSaved ? 'text-primary' : 'text-muted-foreground'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          saveMutation.mutate(item.id);
                        }}
                      >
                        <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No featured recipes yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Check back soon for curated picks</p>
        </div>
      )}
    </div>
  );
}
