import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Clock,
  Users as UsersIcon,
  ChefHat,
  Edit2,
  Trash2,
  Share2,
  Bookmark,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [servingMultiplier, setServingMultiplier] = useState(1);

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Ingredients, instructions, and tags are stored as JSON arrays
  // directly on the recipes table (not separate tables)
  const ingredients: string[] = recipe?.ingredients || [];
  const instructions: string[] = recipe?.instructions || [];
  const tags: string[] = recipe?.tags || [];
  const imageUrls: string[] = recipe?.image_urls || (recipe?.image_url ? [recipe.image_url] : []);

  // Check if recipe is shared to community
  const { data: sharedStatus } = useQuery({
    queryKey: ['recipe-shared-status', id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data } = await supabase
        .from('user_shared_recipes')
        .select('id')
        .eq('recipe_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('Missing data');
      if (sharedStatus) {
        // Unshare
        await supabase.from('user_shared_recipes').delete().eq('id', sharedStatus.id);
      } else {
        // Share to community
        await supabase.from('user_shared_recipes').insert({
          recipe_id: id,
          user_id: user.id,
          is_public: true,
          like_count: 0,
          comment_count: 0,
          view_count: 0,
          save_count: 0,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-shared-status', id] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success(sharedStatus ? 'Removed from community' : 'Shared to community!');
    },
    onError: () => toast.error('Failed to update sharing'),
  });

  const isShared = !!sharedStatus;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      toast.success('Recipe deleted');
      navigate('/app/recipes');
    },
    onError: () => toast.error('Failed to delete recipe'),
  });

  const isOwner = recipe?.user_id === user?.id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="py-16 text-center">
        <ChefHat className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <h3 className="text-lg font-semibold text-foreground">Recipe not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/app/recipes')}>
          Back to Recipes
        </Button>
      </div>
    );
  }

  const baseServings = recipe.servings || 1;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1">
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className={isShared ? 'text-primary' : 'text-muted-foreground'}
              onClick={() => shareMutation.mutate()}
              disabled={shareMutation.isPending}
            >
              <Share2 className={`h-4 w-4 mr-1.5 ${isShared ? 'fill-current' : ''}`} />
              {isShared ? 'Shared' : 'Share'}
            </Button>
          )}
          {isOwner && (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link to={`/app/recipes/${id}/edit`}>
                  <Edit2 className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => {
                  if (confirm('Delete this recipe?')) deleteMutation.mutate();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Hero image */}
      {imageUrls.length > 0 && (
        <div className="aspect-[16/10] rounded-xl overflow-hidden bg-secondary/30">
          <img
            src={imageUrls[0]}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title & meta */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-foreground">{recipe.title}</h1>
        {recipe.description && (
          <p className="text-muted-foreground">{recipe.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {recipe.prep_time && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Prep: {recipe.prep_time}m</span>
            </div>
          )}
          {recipe.cook_time && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Cook: {recipe.cook_time}m</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <UsersIcon className="h-4 w-4" />
              <span>{recipe.servings} servings</span>
            </div>
          )}
          {recipe.difficulty && (
            <Badge variant="secondary" className="capitalize">{recipe.difficulty}</Badge>
          )}
          {recipe.is_ai_generated && (
            <Badge variant="secondary" className="bg-accent/20 text-accent">AI Generated</Badge>
          )}
        </div>
      </div>

      <Separator className="bg-border/40" />

      {/* Serving scaler */}
      {recipe.servings && (
        <div className="flex items-center justify-between bg-secondary/20 rounded-lg p-3">
          <span className="text-sm text-foreground font-medium">
            Servings: {Math.round(baseServings * servingMultiplier)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setServingMultiplier(m => Math.max(0.5, m - 0.5))}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm text-muted-foreground w-8 text-center">{servingMultiplier}x</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setServingMultiplier(m => m + 0.5)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
          ))}
        </div>
      )}

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Ingredients
            <span className="text-sm font-normal text-muted-foreground ml-2">({ingredients.length})</span>
          </h2>
          <Card className="bg-card/60 border-border/40">
            <CardContent className="p-4">
              <ul className="space-y-2">
                {ingredients.map((ing, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span className="text-foreground">{scaleIngredient(ing, servingMultiplier)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions */}
      {instructions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Instructions
            <span className="text-sm font-normal text-muted-foreground ml-2">({instructions.length} steps)</span>
          </h2>
          <div className="space-y-3">
            {instructions.map((step, idx) => (
              <Card key={idx} className="bg-card/60 border-border/40">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed pt-1">{step}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Photo gallery */}
      {imageUrls.length > 1 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Photos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {imageUrls.map((url, idx) => (
              <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-secondary/30">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Scale numeric quantities in an ingredient string by a multiplier */
function scaleIngredient(text: string, multiplier: number): string {
  if (multiplier === 1) return text;

  // Match fractions like "1/2", "1 1/2", or decimals like "1.5", or whole numbers at the start
  return text.replace(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)/,
    (match) => {
      let value: number;
      // Mixed fraction: "1 1/2"
      if (/^\d+\s+\d+\/\d+$/.test(match)) {
        const [whole, frac] = match.split(/\s+/);
        const [num, den] = frac.split('/');
        value = parseInt(whole) + parseInt(num) / parseInt(den);
      // Simple fraction: "1/2"
      } else if (match.includes('/')) {
        const [num, den] = match.split('/');
        value = parseInt(num) / parseInt(den);
      // Decimal or whole
      } else {
        value = parseFloat(match);
      }

      const scaled = value * multiplier;
      // Format nicely: remove unnecessary decimals
      if (scaled === Math.floor(scaled)) return scaled.toString();
      // Common fractions
      const remainder = scaled % 1;
      if (Math.abs(remainder - 0.25) < 0.01) return `${Math.floor(scaled)} 1/4`.replace(/^0 /, '');
      if (Math.abs(remainder - 0.33) < 0.02) return `${Math.floor(scaled)} 1/3`.replace(/^0 /, '');
      if (Math.abs(remainder - 0.5) < 0.01) return `${Math.floor(scaled)} 1/2`.replace(/^0 /, '');
      if (Math.abs(remainder - 0.67) < 0.02) return `${Math.floor(scaled)} 2/3`.replace(/^0 /, '');
      if (Math.abs(remainder - 0.75) < 0.01) return `${Math.floor(scaled)} 3/4`.replace(/^0 /, '');
      return (Math.round(scaled * 100) / 100).toString();
    }
  );
}
