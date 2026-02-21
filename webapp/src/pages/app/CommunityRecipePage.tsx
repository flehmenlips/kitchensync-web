import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  Clock,
  Users as UsersIcon,
  Loader2,
  ChefHat,
  Star,
} from 'lucide-react';

function formatDuration(val: unknown): string {
  if (val == null || val === '') return '';
  const s = String(val);
  return /^\d+$/.test(s) ? `${s} min` : s;
}

export function CommunityRecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['community-recipe', id],
    queryFn: async () => {
      if (!id) return null;
      // Fetch shared recipe with linked recipe details
      const { data, error } = await supabase
        .from('user_shared_recipes')
        .select(`
          *,
          recipe:recipes (
            id, title, description, image_url, image_urls,
            prep_time, cook_time, servings, difficulty,
            ingredients, instructions, tags
          )
        `)
        .eq('id', id)
        .single();
      if (error || !data) return null;

      // Separately fetch the author profile
      const { data: authorProfile } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, avatar_url, kitchen_name')
        .eq('user_id', data.user_id)
        .maybeSingle();

      // Flatten recipe details for easy rendering
      const r = data.recipe;
      return {
        ...data,
        title: r?.title || data.caption || 'Shared Recipe',
        description: r?.description || data.caption,
        image_url: r?.image_url,
        image_urls: r?.image_urls,
        prep_time: r?.prep_time,
        cook_time: r?.cook_time,
        servings: r?.servings,
        difficulty: r?.difficulty,
        ingredients: r?.ingredients || [],
        instructions: r?.instructions || [],
        tags: r?.tags || [],
        user_profiles: authorProfile,
      };
    },
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ['recipe-comments', id],
    queryFn: async () => {
      if (!id) return [];
      // Fetch comments without FK join
      const { data, error } = await supabase
        .from('recipe_comments')
        .select('*')
        .eq('shared_recipe_id', id)
        .order('created_at', { ascending: true });
      if (error || !data?.length) return [];

      // Batch fetch profiles for comment authors
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return data.map(comment => ({
        ...comment,
        user_profiles: profileMap.get(comment.user_id) || null,
      }));
    },
    enabled: !!id,
  });

  // Fetch like/save status for current user
  const { data: likeStatus } = useQuery({
    queryKey: ['recipe-like-status', id, user?.id],
    queryFn: async () => {
      if (!user || !id) return { liked: false, saved: false };
      const [likeRes, saveRes] = await Promise.all([
        supabase.from('recipe_likes').select('id').eq('user_id', user.id).eq('shared_recipe_id', id).maybeSingle(),
        supabase.from('recipe_saves').select('id').eq('user_id', user.id).eq('shared_recipe_id', id).maybeSingle(),
      ]);
      return { liked: !!likeRes.data, saved: !!saveRes.data };
    },
    enabled: !!user && !!id,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) return;
      if (likeStatus?.liked) {
        await supabase.from('recipe_likes').delete().eq('user_id', user.id).eq('shared_recipe_id', id);
        await supabase.from('user_shared_recipes').update({ like_count: Math.max(0, (recipe?.like_count || 1) - 1) }).eq('id', id);
      } else {
        await supabase.from('recipe_likes').insert({ user_id: user.id, shared_recipe_id: id });
        await supabase.from('user_shared_recipes').update({ like_count: (recipe?.like_count || 0) + 1 }).eq('id', id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-like-status', id] });
      queryClient.invalidateQueries({ queryKey: ['community-recipe', id] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) return;
      if (likeStatus?.saved) {
        await supabase.from('recipe_saves').delete().eq('user_id', user.id).eq('shared_recipe_id', id);
      } else {
        await supabase.from('recipe_saves').insert({ user_id: user.id, shared_recipe_id: id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-like-status', id] });
      toast.success(likeStatus?.saved ? 'Removed from saved' : 'Saved to collection');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('recipe_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-comments', id] });
    },
  });

  // Ratings
  const { data: ratingData } = useQuery({
    queryKey: ['recipe-ratings', id],
    queryFn: async () => {
      if (!id) return { average: 0, count: 0, userRating: 0 };
      const { data: ratings } = await supabase
        .from('recipe_ratings')
        .select('rating, user_id')
        .eq('shared_recipe_id', id);
      if (!ratings?.length) return { average: 0, count: 0, userRating: 0 };
      const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      const userRating = user ? (ratings.find(r => r.user_id === user.id)?.rating || 0) : 0;
      return { average: Math.round(avg * 10) / 10, count: ratings.length, userRating };
    },
    enabled: !!id,
  });

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      if (!user || !id) return;
      // Upsert rating
      const { data: existing } = await supabase
        .from('recipe_ratings')
        .select('id')
        .eq('user_id', user.id)
        .eq('shared_recipe_id', id)
        .maybeSingle();
      if (existing) {
        await supabase.from('recipe_ratings').update({ rating }).eq('id', existing.id);
      } else {
        await supabase.from('recipe_ratings').insert({
          user_id: user.id,
          shared_recipe_id: id,
          rating,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-ratings', id] });
      toast.success('Rating saved');
    },
    onError: () => toast.error('Failed to save rating'),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('Missing data');
      const { error } = await supabase.from('recipe_comments').insert({
        shared_recipe_id: id,
        user_id: user.id,
        content: commentText.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-comments', id] });
      setCommentText('');
    },
    onError: () => toast.error('Failed to add comment'),
  });

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
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const authorProfile = recipe.user_profiles;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className={likeStatus?.saved ? 'text-primary' : 'text-muted-foreground'}
          onClick={() => saveMutation.mutate()}
        >
          <Bookmark className={`h-4 w-4 ${likeStatus?.saved ? 'fill-current' : ''}`} />
        </Button>
      </div>

      {/* Author */}
      {authorProfile && (
        <div className="flex items-center gap-3">
          <Link to={`/app/user/${authorProfile.user_id}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={authorProfile.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {authorProfile.display_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link to={`/app/user/${authorProfile.user_id}`} className="text-sm font-medium text-foreground hover:underline">
              {authorProfile.display_name || 'User'}
            </Link>
            {authorProfile.kitchen_name && (
              <p className="text-xs text-muted-foreground">{authorProfile.kitchen_name}</p>
            )}
          </div>
        </div>
      )}

      {/* Image */}
      {(recipe.image_url || recipe.image_urls?.[0]) && (
        <div className="aspect-[4/3] rounded-xl overflow-hidden bg-secondary/30">
          <img
            src={recipe.image_url || recipe.image_urls[0]}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="sm"
          className={`h-9 gap-1.5 ${likeStatus?.liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
          onClick={() => likeMutation.mutate()}
        >
          <Heart className={`h-4 w-4 ${likeStatus?.liked ? 'fill-current' : ''}`} />
          <span className="text-sm">{recipe.like_count || 0}</span>
        </Button>
        <Button variant="ghost" size="sm" className="h-9 text-muted-foreground gap-1.5">
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm">{comments?.length || recipe.comment_count || 0}</span>
        </Button>
        <Button
          variant="ghost" size="sm"
          className={`h-9 gap-1.5 ml-auto ${likeStatus?.saved ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
          onClick={() => saveMutation.mutate()}
        >
          <Bookmark className={`h-4 w-4 ${likeStatus?.saved ? 'fill-current' : ''}`} />
        </Button>
      </div>

      {/* Title & description */}
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-foreground">{recipe.title}</h1>
        {recipe.description && (
          <p className="text-muted-foreground text-sm">{recipe.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {recipe.prep_time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Prep: {formatDuration(recipe.prep_time)}</span>}
          {recipe.cook_time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Cook: {formatDuration(recipe.cook_time)}</span>}
          {recipe.servings && <span className="flex items-center gap-1"><UsersIcon className="h-3.5 w-3.5" /> {recipe.servings} servings</span>}
          {recipe.difficulty && <Badge variant="secondary" className="capitalize">{recipe.difficulty}</Badge>}
        </div>

        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.map((tag: string) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <Separator className="bg-border/40" />

      {/* Ingredients */}
      {recipe.ingredients?.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Ingredients</h2>
          <Card className="bg-card/60 border-border/40">
            <CardContent className="p-4">
              <ul className="space-y-1.5">
                {recipe.ingredients.map((ing: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span className="text-foreground">{ing}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions */}
      {recipe.instructions?.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Instructions</h2>
          <div className="space-y-2">
            {recipe.instructions.map((step: string, idx: number) => (
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

      {/* Rating */}
      <Card className="bg-card/60 border-border/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Rating</h3>
            {ratingData && ratingData.count > 0 && (
              <span className="text-sm text-muted-foreground">
                {ratingData.average} / 5 ({ratingData.count} {ratingData.count === 1 ? 'rating' : 'ratings'})
              </span>
            )}
          </div>
          {user && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-2">Your rating:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => rateMutation.mutate(star)}
                  className="p-0.5 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-5 w-5 ${
                      star <= (ratingData?.userRating || 0)
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="bg-border/40" />

      {/* Comments */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Comments ({comments?.length || 0})
        </h2>

        {/* Add comment */}
        {user && (
          <div className="flex gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="bg-secondary/30 border-border/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && commentText.trim()) {
                  addComment.mutate();
                }
              }}
            />
            <Button
              size="icon"
              className="bg-primary text-primary-foreground shrink-0"
              disabled={!commentText.trim() || addComment.isPending}
              onClick={() => addComment.mutate()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Comment list */}
        {comments && comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map((comment: any) => {
              const cp = comment.user_profiles;
              return (
                <div key={comment.id} className="flex gap-3">
                  <Link to={`/app/user/${cp?.user_id || comment.user_id}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={cp?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {cp?.display_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="bg-secondary/20 rounded-lg p-3">
                      <Link to={`/app/user/${cp?.user_id || comment.user_id}`} className="text-xs font-medium text-foreground hover:underline">
                        {cp?.display_name || 'User'}
                      </Link>
                      <p className="text-sm text-foreground mt-1">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{formatTime(comment.created_at)}</span>
                      {comment.user_id === user?.id && (
                        <button
                          className="hover:text-destructive"
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Be the first!
          </p>
        )}
      </div>
    </div>
  );
}

function formatTime(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
