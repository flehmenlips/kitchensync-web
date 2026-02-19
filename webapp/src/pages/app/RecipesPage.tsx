import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Plus,
  BookOpen,
  Clock,
  Users as UsersIcon,
  Filter,
  SortAsc,
} from 'lucide-react';

export function RecipesPage() {
  const { user } = useCustomerAuth();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'alpha'>('recent');

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['my-recipes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          id, title, description, prep_time, cook_time, servings, difficulty,
          image_url, is_ai_generated, created_at, updated_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // AbortErrors are transient — let react-query retry handle them
        if (error.message?.includes('aborted') || (error as any).name === 'AbortError') {
          throw error;
        }
        console.error('[Recipes] Error:', error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
  });

  // Tags are not available (recipe_tags table doesn't exist in Supabase yet)
  // When the table is created, re-enable this query
  const recipeTags: Record<string, string[]> = {};

  const filtered = recipes
    ?.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()))
    ?.sort((a, b) => {
      if (sortBy === 'alpha') return a.title.localeCompare(b.title);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Recipes</h1>
          <p className="text-sm text-muted-foreground">{recipes?.length || 0} recipes</p>
        </div>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
          <Link to="/app/recipes/new">
            <Plus className="h-4 w-4 mr-1.5" />
            New Recipe
          </Link>
        </Button>
      </div>

      {/* Search & Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/30 border-border/50"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 border-border/50"
          onClick={() => setSortBy(s => s === 'recent' ? 'alpha' : 'recent')}
        >
          <SortAsc className="h-4 w-4" />
        </Button>
      </div>

      {/* Recipe grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card/60 border-border/40">
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((recipe) => (
            <Link key={recipe.id} to={`/app/recipes/${recipe.id}`}>
              <Card className="bg-card/60 border-border/40 overflow-hidden hover:border-primary/30 transition-all group">
                <div className="h-40 bg-secondary/30 relative overflow-hidden">
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                  {recipe.difficulty && (
                    <Badge className="absolute top-2 right-2 text-[10px] capitalize" variant="secondary">
                      {recipe.difficulty}
                    </Badge>
                  )}
                  {recipe.is_ai_generated && (
                    <Badge className="absolute top-2 left-2 text-[10px] bg-accent/20 text-accent" variant="secondary">
                      AI
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3 space-y-1.5">
                  <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {recipe.title}
                  </h3>
                  {recipe.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{recipe.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {(recipe.prep_time || recipe.cook_time) && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {[recipe.prep_time && formatTime(recipe.prep_time), recipe.cook_time && formatTime(recipe.cook_time)].filter(Boolean).join(' + ')}
                      </span>
                    )}
                    {recipe.servings && (
                      <span className="flex items-center gap-1">
                        <UsersIcon className="h-3 w-3" />
                        {recipe.servings}
                      </span>
                    )}
                  </div>
                  {recipeTags?.[recipe.id]?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipeTags[recipe.id].slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No recipes yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first recipe to get started</p>
          <Button asChild className="mt-4 bg-primary text-primary-foreground">
            <Link to="/app/recipes/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Recipe
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
