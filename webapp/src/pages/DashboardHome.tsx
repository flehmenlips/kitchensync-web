import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Share2,
  Lightbulb,
  Plus,
  ArrowRight,
  TrendingUp,
  Star,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';

interface StatsData {
  totalUsers: number;
  totalRecipes: number;
  sharedRecipes: number;
  activeTips: number;
  totalMenus: number;
  totalLists: number;
}

export function DashboardHome() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<StatsData> => {
      // Use RPC function to get platform-wide stats (bypasses RLS with admin check)
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');

      if (error) {
        console.error('Dashboard stats RPC error:', error);
        // Fallback to direct queries if RPC doesn't exist yet
        const [usersResult, recipesResult, sharedResult, tipsResult] = await Promise.all([
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('recipes').select('id', { count: 'exact', head: true }),
          supabase.from('shared_recipes').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('new_content').select('id', { count: 'exact', head: true }).in('content_type', ['tip', 'tutorial']),
        ]);

        console.log('Dashboard stats fallback queries:', {
          users: { count: usersResult.count, error: usersResult.error },
          recipes: { count: recipesResult.count, error: recipesResult.error },
          shared: { count: sharedResult.count, error: sharedResult.error },
          tips: { count: tipsResult.count, error: tipsResult.error },
        });

        return {
          totalUsers: usersResult.count ?? 0,
          totalRecipes: recipesResult.count ?? 0,
          sharedRecipes: sharedResult.count ?? 0,
          activeTips: tipsResult.count ?? 0,
          totalMenus: 0,
          totalLists: 0,
        };
      }

      console.log('Dashboard stats from RPC:', data);

      return {
        totalUsers: data.total_users ?? 0,
        totalRecipes: data.total_recipes ?? 0,
        sharedRecipes: data.shared_recipes ?? 0,
        activeTips: data.active_tips ?? 0,
        totalMenus: data.total_menus ?? 0,
        totalLists: data.total_lists ?? 0,
      };
    },
  });

  const { data: recentRecipes, isLoading: recipesLoading } = useQuery({
    queryKey: ['recent-shared-recipes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('shared_recipes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: featuredRecipes } = useQuery({
    queryKey: ['featured-recipes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('shared_recipes')
        .select('*')
        .eq('is_featured', true)
        .eq('is_active', true)
        .limit(3);
      return data ?? [];
    },
  });

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      title: 'User Recipes',
      value: stats?.totalRecipes ?? 0,
      icon: BookOpen,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
    },
    {
      title: 'Shared Recipes',
      value: stats?.sharedRecipes ?? 0,
      icon: Share2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Active Tips',
      value: stats?.activeTips ?? 0,
      icon: Lightbulb,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening with KitchenSync.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link to="/tips">
              <Plus className="h-4 w-4 mr-2" />
              Add Tip
            </Link>
          </Button>
          <Button asChild>
            <Link to="/recipes">
              <Plus className="h-4 w-4 mr-2" />
              Add Recipe
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-card border-border/50">
            <CardContent className="p-6">
              {statsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{stat.value.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Shared Recipes */}
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Shared Recipes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/recipes" className="text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recipesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentRecipes && recentRecipes.length > 0 ? (
              <div className="space-y-4">
                {recentRecipes.map((recipe) => {
                  const recipeData = recipe as { id: string; title: string; category: string; is_active: boolean; is_featured: boolean; created_at: string; image_url?: string };
                  return (
                    <div
                      key={recipeData.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {recipeData.image_url ? (
                          <img
                            src={recipeData.image_url}
                            alt={recipeData.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <BookOpen className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{recipeData.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{recipeData.category}</span>
                          <span>•</span>
                          <span>{format(new Date(recipeData.created_at), 'MMM d')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {recipeData.is_featured ? (
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        ) : null}
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            recipeData.is_active
                              ? 'bg-emerald-400/10 text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {recipeData.is_active ? 'Active' : 'Draft'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No shared recipes yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link to="/recipes">Create your first recipe</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Featured Recipes */}
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              Featured Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {featuredRecipes && featuredRecipes.length > 0 ? (
              <div className="space-y-4">
                {featuredRecipes.map((recipe) => {
                  const recipeData = recipe as { id: string; title: string; description: string; prep_time: number; cook_time: number; category: string };
                  return (
                    <div
                      key={recipeData.id}
                      className="p-4 rounded-lg bg-gradient-to-r from-amber-400/5 to-primary/5 border border-amber-400/20"
                    >
                      <h4 className="font-semibold text-foreground">{recipeData.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {recipeData.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {recipeData.prep_time + recipeData.cook_time} min
                        </span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                          {recipeData.category}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No featured recipes</p>
                <p className="text-sm mt-1">Feature recipes to highlight them here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <Link to="/recipes">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>New Shared Recipe</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <Link to="/tips">
                <Lightbulb className="h-5 w-5 text-amber-400" />
                <span>New Tip or Tutorial</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <Link to="/users">
                <Users className="h-5 w-5 text-blue-400" />
                <span>View Users</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <Link to="/recipes">
                <Star className="h-5 w-5 text-amber-400" />
                <span>Manage Featured</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
