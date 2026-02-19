import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  BookOpen,
  ListTodo,
  UtensilsCrossed,
  ChefHat,
  Bell,
  Bookmark,
  Edit2,
} from 'lucide-react';

export function ProfilePage() {
  const { user, profile } = useCustomerAuth();
  const [activeTab, setActiveTab] = useState('recipes');

  const { data: stats } = useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: async () => {
      if (!user) return { recipes: 0, lists: 0, menus: 0, followers: 0, following: 0 };

      const { data: profileData, error: profileErr } = await supabase
        .from('user_profiles')
        .select('follower_count, following_count, shared_recipe_count')
        .eq('user_id', user.id)
        .maybeSingle();

      // Throw on AbortError so react-query retries instead of caching empty data
      if (profileErr?.message?.includes('aborted')) throw profileErr;

      const [recipesRes, listsRes, menusRes] = await Promise.all([
        supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('prep_lists').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('menus').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      if (recipesRes.error?.message?.includes('aborted')) throw recipesRes.error;

      return {
        recipes: recipesRes.count || 0,
        lists: listsRes.count || 0,
        menus: menusRes.count || 0,
        followers: profileData?.follower_count || 0,
        following: profileData?.following_count || 0,
      };
    },
    enabled: !!user,
  });

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex flex-col items-center text-center space-y-4">
        <Avatar className="h-24 w-24 border-2 border-primary/20">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">
            {profile?.display_name || 'User'}
          </h1>
          {profile?.kitchen_name && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <ChefHat className="h-3 w-3" />
              {profile.kitchen_name}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm">
          <Link to="/app/recipes" className="text-center hover:opacity-80 transition-opacity">
            <p className="font-semibold text-foreground">{stats?.recipes || 0}</p>
            <p className="text-muted-foreground text-xs">Recipes</p>
          </Link>
          <Separator orientation="vertical" className="h-8" />
          <Link to="/app/followers" className="text-center hover:opacity-80 transition-opacity">
            <p className="font-semibold text-foreground">{stats?.followers || 0}</p>
            <p className="text-muted-foreground text-xs">Followers</p>
          </Link>
          <Separator orientation="vertical" className="h-8" />
          <Link to="/app/followers" className="text-center hover:opacity-80 transition-opacity">
            <p className="font-semibold text-foreground">{stats?.following || 0}</p>
            <p className="text-muted-foreground text-xs">Following</p>
          </Link>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/me/settings">
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              Edit Profile
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/me/settings">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Recipes', icon: BookOpen, href: '/app/recipes', count: stats?.recipes },
          { label: 'Lists', icon: ListTodo, href: '/app/lists', count: stats?.lists },
          { label: 'Menus', icon: UtensilsCrossed, href: '/app/menus', count: stats?.menus },
          { label: 'Notifications', icon: Bell, href: '/app/me/notifications' },
        ].map((item) => (
          <Link key={item.href} to={item.href}>
            <Card className="bg-card/60 border-border/40 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  {item.count !== undefined && (
                    <p className="text-xs text-muted-foreground">{item.count} items</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tabs for content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-secondary/30">
          <TabsTrigger value="recipes" className="flex-1">My Recipes</TabsTrigger>
          <TabsTrigger value="saved" className="flex-1">Saved</TabsTrigger>
          <TabsTrigger value="shared" className="flex-1">Shared</TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="mt-4">
          <RecentRecipes userId={user?.id} />
        </TabsContent>
        <TabsContent value="saved" className="mt-4">
          <SavedRecipes userId={user?.id} />
        </TabsContent>
        <TabsContent value="shared" className="mt-4">
          <SharedRecipes userId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecentRecipes({ userId }: { userId?: string }) {
  const { data: recipes, isLoading } = useQuery({
    queryKey: ['my-recipes-preview', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, image_url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6);
      if (error?.message?.includes('aborted')) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-square rounded-lg bg-secondary/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!recipes?.length) {
    return <EmptyState icon={BookOpen} message="No recipes yet. Create your first one!" />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {recipes.map((recipe: { id: string; title: string; image_url: string | null }) => (
        <Link key={recipe.id} to={`/app/recipes/${recipe.id}`}>
          <div className="aspect-square rounded-lg bg-secondary/30 border border-border/40 overflow-hidden hover:border-primary/30 transition-colors relative group">
            {recipe.image_url ? (
              <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-xs text-white font-medium truncate">{recipe.title}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function SavedRecipes({ userId }: { userId?: string }) {
  const { data: saved, isLoading } = useQuery({
    queryKey: ['my-saved-recipes', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('recipe_saves')
        .select(`
          shared_recipe_id,
          user_shared_recipes:shared_recipe_id (
            id, recipe_id, user_id,
            recipe:recipes ( id, title, image_url, image_urls )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(12);
      // Flatten
      return (data || [])
        .map((s: any) => s.user_shared_recipes)
        .filter(Boolean)
        .map((sr: any) => ({
          id: sr.id,
          recipe_id: sr.recipe_id,
          title: sr.recipe?.title || 'Recipe',
          image_url: sr.recipe?.image_url || sr.recipe?.image_urls?.[0],
        }));
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-square rounded-lg bg-secondary/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!saved?.length) {
    return <EmptyState icon={Bookmark} message="Saved recipes will appear here" />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {saved.map((item: any) => (
        <Link key={item.id} to={`/app/community/${item.id}`}>
          <div className="aspect-square rounded-lg bg-secondary/30 border border-border/40 overflow-hidden hover:border-primary/30 transition-colors relative">
            {item.image_url ? (
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Bookmark className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-xs text-white font-medium truncate">{item.title}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function SharedRecipes({ userId }: { userId?: string }) {
  const { data: shared, isLoading } = useQuery({
    queryKey: ['my-shared-recipes', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('user_shared_recipes')
        .select(`
          id, recipe_id, like_count, comment_count,
          recipe:recipes ( id, title, image_url, image_urls )
        `)
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(12);
      return (data || []).map((item: any) => ({
        id: item.id,
        title: item.recipe?.title || 'Recipe',
        image_url: item.recipe?.image_url || item.recipe?.image_urls?.[0],
        like_count: item.like_count || 0,
      }));
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-square rounded-lg bg-secondary/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!shared?.length) {
    return <EmptyState icon={ChefHat} message="Share recipes from your collection to see them here" />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {shared.map((item: any) => (
        <Link key={item.id} to={`/app/community/${item.id}`}>
          <div className="aspect-square rounded-lg bg-secondary/30 border border-border/40 overflow-hidden hover:border-primary/30 transition-colors relative">
            {item.image_url ? (
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ChefHat className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-xs text-white font-medium truncate">{item.title}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="py-12 text-center">
      <Icon className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
