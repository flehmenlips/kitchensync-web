import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Brain,
  Zap,
  Hash,
  Target,
  TrendingUp,
  Eye,
  Heart,
  Bookmark,
  MessageCircle,
  Share2,
  Timer,
  Video,
  Users,
  Megaphone,
  MousePointerClick,
  BarChart3,
  Activity,
  Sparkles,
} from 'lucide-react';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

const SIGNAL_LABELS: Record<string, string> = {
  view: 'Views',
  view_duration: 'Dwell Time',
  like: 'Likes',
  save: 'Saves',
  comment: 'Comments',
  share: 'Shares',
  profile_visit: 'Profile Visits',
  follow_from_post: 'Follows',
  link_click: 'Link Clicks',
  video_complete: 'Video Completes',
  video_progress: 'Video Progress',
  hashtag_click: 'Hashtag Clicks',
  carousel_swipe: 'Carousel Swipes',
};

const FEED_WEIGHTS = [
  { name: 'Freshness', weight: 35, description: 'Exponential decay with ~6hr half-life', color: '#3b82f6' },
  { name: 'Quality', weight: 30, description: 'Weighted engagement rate (likes×3, saves×5, comments×4, shares×6)', color: '#10b981' },
  { name: 'Relevance', weight: 25, description: 'Tag overlap + post type preference + featured boost', color: '#8b5cf6' },
  { name: 'Bonuses', weight: 10, description: 'Pinned (+0.5) and Featured (+0.3) boosts', color: '#f59e0b' },
];

export function IntelligencePage() {
  const [dateRange, setDateRange] = useState<number>(30);
  const startDate = subDays(new Date(), dateRange);

  // Signal pipeline stats
  const { data: signalStats, isLoading: loadingSignals } = useQuery({
    queryKey: ['intelligence-signals', dateRange],
    queryFn: async () => {
      const { data: signals, error } = await supabase
        .from('post_engagement_signals')
        .select('signal_type, created_at')
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.warn('Failed to fetch signals (RLS policy may be missing):', error.message);
        return { total: 0, byType: [], daily: [] };
      }

      const byType: Record<string, number> = {};
      const byDay: Record<string, Record<string, number>> = {};

      (signals || []).forEach((s: { signal_type: string; created_at: string }) => {
        byType[s.signal_type] = (byType[s.signal_type] || 0) + 1;
        const day = s.created_at.split('T')[0];
        if (!byDay[day]) byDay[day] = {};
        byDay[day][s.signal_type] = (byDay[day][s.signal_type] || 0) + 1;
      });

      const days = eachDayOfInterval({ start: startDate, end: new Date() });
      const dailyData = days.map(d => {
        const key = format(d, 'yyyy-MM-dd');
        const daySignals = byDay[key] || {};
        return {
          date: format(d, 'MMM d'),
          total: Object.values(daySignals).reduce((a, b) => a + b, 0),
          views: daySignals['view'] || 0,
          engagements: (daySignals['like'] || 0) + (daySignals['save'] || 0) +
            (daySignals['comment'] || 0) + (daySignals['share'] || 0),
        };
      });

      const typeBreakdown = Object.entries(byType)
        .map(([type, count]) => ({ type, label: SIGNAL_LABELS[type] || type, count }))
        .sort((a, b) => b.count - a.count);

      return {
        total: signals?.length || 0,
        byType: typeBreakdown,
        daily: dailyData,
      };
    },
  });

  // User interest profiles stats
  const { data: interestStats, isLoading: loadingInterests } = useQuery({
    queryKey: ['intelligence-interests'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('user_interest_profiles')
        .select('preferred_tags, preferred_post_types, total_views, total_engagements, interest_vector');

      if (error) {
        console.warn('Failed to fetch interest profiles (RLS policy may be missing):', error.message);
        return { totalProfiles: 0, topTags: [], postTypes: [], totalViews: 0, totalEngagements: 0 };
      }

      const totalProfiles = profiles?.length || 0;

      const tagCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};

      (profiles || []).forEach((p: {
        preferred_tags: string[] | null;
        preferred_post_types: string[] | null;
        interest_vector: Record<string, number> | null;
      }) => {
        (p.preferred_tags || []).forEach((t: string) => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
        (p.preferred_post_types || []).forEach((t: string) => {
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
      });

      const topTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      const postTypes = Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      const totalViews = (profiles || []).reduce((sum: number, p: { total_views: number | null }) => sum + (p.total_views || 0), 0);
      const totalEngagements = (profiles || []).reduce((sum: number, p: { total_engagements: number | null }) => sum + (p.total_engagements || 0), 0);

      return { totalProfiles, topTags, postTypes, totalViews, totalEngagements };
    },
  });

  // Hashtag & trending stats
  const { data: hashtagStats, isLoading: loadingHashtags } = useQuery({
    queryKey: ['intelligence-hashtags'],
    queryFn: async () => {
      const { data: hashtags, error } = await supabase
        .from('hashtags')
        .select('tag, use_count, trending_score')
        .order('use_count', { ascending: false })
        .limit(25);

      if (error) throw error;

      const { count: totalHashtags } = await supabase
        .from('hashtags')
        .select('*', { count: 'exact', head: true });

      const trending = [...(hashtags || [])]
        .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
        .slice(0, 10);

      return {
        total: totalHashtags || 0,
        topByUse: (hashtags || []).slice(0, 10),
        trending,
      };
    },
  });

  // Promotion stats
  const { data: promoStats, isLoading: loadingPromos } = useQuery({
    queryKey: ['intelligence-promos'],
    queryFn: async () => {
      const { data: promos, error } = await supabase
        .from('promoted_posts')
        .select('id, status, budget_cents, spent_cents, impressions, clicks, target_radius_km, start_at, end_at');

      if (error) {
        console.warn('Failed to fetch promotions (RLS policy may be missing):', error.message);
        return { total: 0, active: 0, totalBudget: 0, totalSpent: 0, totalImpressions: 0, totalClicks: 0, ctr: 0 };
      }

      const active = (promos || []).filter((p: { status: string }) => p.status === 'active');
      const totalBudget = (promos || []).reduce((s: number, p: { budget_cents: number | null }) => s + (p.budget_cents || 0), 0);
      const totalSpent = (promos || []).reduce((s: number, p: { spent_cents: number | null }) => s + (p.spent_cents || 0), 0);
      const totalImpressions = (promos || []).reduce((s: number, p: { impressions: number | null }) => s + (p.impressions || 0), 0);
      const totalClicks = (promos || []).reduce((s: number, p: { clicks: number | null }) => s + (p.clicks || 0), 0);
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;

      return {
        total: promos?.length || 0,
        active: active.length,
        totalBudget,
        totalSpent,
        totalImpressions,
        totalClicks,
        ctr,
      };
    },
  });

  // Content quality & AI classification stats
  const { data: contentStats, isLoading: loadingContent } = useQuery({
    queryKey: ['intelligence-content', dateRange],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from('posts')
        .select('post_type, quality_badge, is_featured, is_pinned, tags, like_count, comment_count, save_count, view_count, share_count, created_at')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const typeBreakdown: Record<string, number> = {};
      const badgeBreakdown: Record<string, number> = {};
      let featured = 0;
      let pinned = 0;
      let withTags = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalSaves = 0;
      let totalViews = 0;
      let totalShares = 0;

      (posts || []).forEach((p: {
        post_type: string;
        quality_badge: string | null;
        is_featured: boolean;
        is_pinned: boolean;
        tags: string[] | null;
        like_count: number;
        comment_count: number;
        save_count: number;
        view_count: number;
        share_count: number;
      }) => {
        typeBreakdown[p.post_type] = (typeBreakdown[p.post_type] || 0) + 1;
        if (p.quality_badge) {
          badgeBreakdown[p.quality_badge] = (badgeBreakdown[p.quality_badge] || 0) + 1;
        }
        if (p.is_featured) featured++;
        if (p.is_pinned) pinned++;
        if (p.tags && p.tags.length > 0) withTags++;
        totalLikes += p.like_count || 0;
        totalComments += p.comment_count || 0;
        totalSaves += p.save_count || 0;
        totalViews += p.view_count || 0;
        totalShares += p.share_count || 0;
      });

      const total = posts?.length || 0;
      const engagementRate = totalViews > 0
        ? ((totalLikes + totalComments + totalSaves + totalShares) / totalViews * 100)
        : 0;

      return {
        total,
        typeBreakdown: Object.entries(typeBreakdown).map(([type, count]) => ({ type, count })),
        badgeBreakdown: Object.entries(badgeBreakdown).map(([badge, count]) => ({ badge, count })),
        featured,
        pinned,
        withTags,
        tagRate: total > 0 ? (withTags / total * 100) : 0,
        totalLikes,
        totalComments,
        totalSaves,
        totalViews,
        totalShares,
        engagementRate,
      };
    },
  });

  // Moderation & verification stats
  const { data: moderationStats, isLoading: loadingModeration } = useQuery({
    queryKey: ['intelligence-moderation'],
    queryFn: async () => {
      let reports: { status: string; reason: string; created_at: string }[] = [];
      let verifications: { status: string; verification_type: string; created_at: string }[] = [];

      try {
        const { data, error } = await supabase
          .from('content_reports')
          .select('status, reason, created_at');
        if (!error) reports = data || [];
      } catch { /* table may not exist */ }

      try {
        const { data, error } = await supabase
          .from('verification_requests')
          .select('status, verification_type, created_at');
        if (!error) verifications = data || [];
      } catch { /* table may not exist */ }

      const reportsByStatus: Record<string, number> = {};
      const reportsByReason: Record<string, number> = {};
      reports.forEach((r) => {
        reportsByStatus[r.status] = (reportsByStatus[r.status] || 0) + 1;
        reportsByReason[r.reason] = (reportsByReason[r.reason] || 0) + 1;
      });

      const verByStatus: Record<string, number> = {};
      const verByType: Record<string, number> = {};
      verifications.forEach((v) => {
        verByStatus[v.status] = (verByStatus[v.status] || 0) + 1;
        verByType[v.verification_type] = (verByType[v.verification_type] || 0) + 1;
      });

      return {
        totalReports: reports.length,
        pendingReports: reportsByStatus['pending'] || 0,
        reportsByStatus,
        reportsByReason,
        totalVerifications: verifications.length,
        pendingVerifications: verByStatus['pending'] || 0,
        verByStatus,
        verByType,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intelligence Platform</h1>
          <p className="text-muted-foreground">Feed algorithm, engagement signals, AI insights & discovery analytics</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDateRange(d)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateRange === d
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Top-level KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Signals Collected"
          value={signalStats?.total}
          icon={Zap}
          description={`Last ${dateRange} days`}
          loading={loadingSignals}
        />
        <MetricCard
          title="User Interest Profiles"
          value={interestStats?.totalProfiles}
          icon={Brain}
          description="Users with computed preferences"
          loading={loadingInterests}
        />
        <MetricCard
          title="Unique Hashtags"
          value={hashtagStats?.total}
          icon={Hash}
          description="Total tags in circulation"
          loading={loadingHashtags}
        />
        <MetricCard
          title="Platform Engagement Rate"
          value={contentStats?.engagementRate !== undefined ? `${contentStats.engagementRate.toFixed(1)}%` : undefined}
          icon={TrendingUp}
          description="(Likes+Comments+Saves+Shares) / Views"
          loading={loadingContent}
        />
      </div>

      <Tabs defaultValue="signals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="signals">Signal Pipeline</TabsTrigger>
          <TabsTrigger value="algorithm">Feed Algorithm</TabsTrigger>
          <TabsTrigger value="content">Content Quality</TabsTrigger>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="moderation">Trust & Safety</TabsTrigger>
        </TabsList>

        {/* Signal Pipeline Tab */}
        <TabsContent value="signals" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Daily Signal Volume
                </CardTitle>
                <CardDescription>Total signals collected per day</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSignals ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={signalStats?.daily || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: 'currentColor' }} />
                      <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="views" name="Views" fill="#3b82f6" stackId="a" />
                      <Bar dataKey="engagements" name="Engagements" fill="#10b981" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Signal Type Breakdown
                </CardTitle>
                <CardDescription>Distribution of engagement signal types</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSignals ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="space-y-3">
                    {(signalStats?.byType || []).map((s, i) => {
                      const max = signalStats?.byType[0]?.count || 1;
                      return (
                        <div key={s.type} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{s.label}</span>
                            <span className="text-muted-foreground">{s.count.toLocaleString()}</span>
                          </div>
                          <Progress value={(s.count / max) * 100} className="h-2" style={{ '--progress-color': CHART_COLORS[i % CHART_COLORS.length] } as React.CSSProperties} />
                        </div>
                      );
                    })}
                    {(signalStats?.byType || []).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No signals collected yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feed Algorithm Tab */}
        <TabsContent value="algorithm" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Scoring Weights
                </CardTitle>
                <CardDescription>How the feed algorithm ranks content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {FEED_WEIGHTS.map(w => (
                    <div key={w.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{w.name}</span>
                        <Badge variant="secondary">{w.weight}%</Badge>
                      </div>
                      <Progress value={w.weight} className="h-3" />
                      <p className="text-xs text-muted-foreground">{w.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Interest Profiles
                </CardTitle>
                <CardDescription>Computed user preferences from engagement</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingInterests ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{interestStats?.totalProfiles || 0}</div>
                        <div className="text-xs text-muted-foreground">Profiles Built</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{(interestStats?.totalViews || 0).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Total Views Tracked</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Preferred Post Types</h4>
                      <div className="flex flex-wrap gap-2">
                        {(interestStats?.postTypes || []).map(pt => (
                          <Badge key={pt.type} variant="outline">
                            {pt.type} ({pt.count})
                          </Badge>
                        ))}
                        {(interestStats?.postTypes || []).length === 0 && (
                          <p className="text-sm text-muted-foreground">No data yet</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Top Interest Tags</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {(interestStats?.topTags || []).map((t, i) => (
                          <Badge
                            key={t.tag}
                            className="text-xs"
                            style={{
                              opacity: 1 - (i * 0.05),
                              backgroundColor: `${CHART_COLORS[i % CHART_COLORS.length]}22`,
                              color: CHART_COLORS[i % CHART_COLORS.length],
                              borderColor: CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          >
                            #{t.tag} ({t.count})
                          </Badge>
                        ))}
                        {(interestStats?.topTags || []).length === 0 && (
                          <p className="text-sm text-muted-foreground">No data yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quality Score Formula</CardTitle>
              <CardDescription>The get_scored_feed() function computes a composite score for each post</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <FormulaCard
                  title="Quality Score"
                  formula="(likes×3 + saves×5 + comments×4 + shares×6) / (views × 10)"
                  weight="30%"
                  icon={<Sparkles className="h-4 w-4 text-emerald-500" />}
                />
                <FormulaCard
                  title="Freshness Score"
                  formula="e^(-0.693 × age_seconds / 21600)"
                  weight="35%"
                  icon={<Timer className="h-4 w-4 text-blue-500" />}
                />
                <FormulaCard
                  title="Relevance Score"
                  formula="tag_overlap + type_pref(0.3) + featured(0.2)"
                  weight="25%"
                  icon={<Target className="h-4 w-4 text-purple-500" />}
                />
                <FormulaCard
                  title="Bonus Modifiers"
                  formula="pinned: +0.5 | featured: +0.3"
                  weight="+bonus"
                  icon={<Zap className="h-4 w-4 text-amber-500" />}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Quality Tab */}
        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <SmallMetric label="Total Posts" value={contentStats?.total} loading={loadingContent} icon={<BarChart3 className="h-4 w-4" />} />
            <SmallMetric label="Featured" value={contentStats?.featured} loading={loadingContent} icon={<Sparkles className="h-4 w-4 text-amber-500" />} />
            <SmallMetric label="Pinned" value={contentStats?.pinned} loading={loadingContent} icon={<Target className="h-4 w-4 text-blue-500" />} />
            <SmallMetric label="Tag Coverage" value={contentStats?.tagRate !== undefined ? `${contentStats.tagRate.toFixed(0)}%` : undefined} loading={loadingContent} icon={<Hash className="h-4 w-4 text-purple-500" />} />
            <SmallMetric label="Engagement Rate" value={contentStats?.engagementRate !== undefined ? `${contentStats.engagementRate.toFixed(1)}%` : undefined} loading={loadingContent} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Post Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingContent ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={contentStats?.typeBreakdown || []}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ type, count }) => `${type} (${count})`}
                      >
                        {(contentStats?.typeBreakdown || []).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Totals</CardTitle>
                <CardDescription>Last {dateRange} days</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingContent ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <EngagementStat icon={<Eye className="h-5 w-5 text-blue-500" />} label="Views" value={contentStats?.totalViews || 0} />
                    <EngagementStat icon={<Heart className="h-5 w-5 text-red-500" />} label="Likes" value={contentStats?.totalLikes || 0} />
                    <EngagementStat icon={<MessageCircle className="h-5 w-5 text-green-500" />} label="Comments" value={contentStats?.totalComments || 0} />
                    <EngagementStat icon={<Bookmark className="h-5 w-5 text-purple-500" />} label="Saves" value={contentStats?.totalSaves || 0} />
                    <EngagementStat icon={<Share2 className="h-5 w-5 text-cyan-500" />} label="Shares" value={contentStats?.totalShares || 0} />
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <TrendingUp className="h-5 w-5 text-amber-500" />
                        <span className="text-xs">Engagement Rate</span>
                      </div>
                      <div className="text-xl font-bold">{contentStats?.engagementRate.toFixed(2)}%</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {(contentStats?.badgeBreakdown || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quality Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {contentStats?.badgeBreakdown.map(b => (
                    <div key={b.badge} className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2">
                      <Badge variant="outline" className="capitalize">{b.badge.replace(/_/g, ' ')}</Badge>
                      <span className="font-semibold">{b.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Discovery Tab */}
        <TabsContent value="discovery" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Top Hashtags by Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHashtags ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Hashtag</TableHead>
                        <TableHead className="text-right">Uses</TableHead>
                        <TableHead className="text-right">Trend Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(hashtagStats?.topByUse || []).map((h, i) => (
                        <TableRow key={h.tag}>
                          <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">#{h.tag}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{h.use_count}</TableCell>
                          <TableCell className="text-right">
                            {(h.trending_score || 0) > 0 ? (
                              <Badge variant="default" className="bg-emerald-500">{(h.trending_score || 0).toFixed(1)}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(hashtagStats?.topByUse || []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No hashtags yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trending Hashtags
                </CardTitle>
                <CardDescription>Ranked by trending score</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHashtags ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hashtagStats?.trending || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fill: 'currentColor' }} />
                      <YAxis dataKey="tag" type="category" width={100} tick={{ fill: 'currentColor' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Bar dataKey="trending_score" name="Trend Score" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Promotions Tab */}
        <TabsContent value="promotions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SmallMetric label="Total Promotions" value={promoStats?.total} loading={loadingPromos} icon={<Megaphone className="h-4 w-4 text-purple-500" />} />
            <SmallMetric label="Active" value={promoStats?.active} loading={loadingPromos} icon={<Activity className="h-4 w-4 text-emerald-500" />} />
            <SmallMetric label="Impressions" value={promoStats?.totalImpressions?.toLocaleString()} loading={loadingPromos} icon={<Eye className="h-4 w-4 text-blue-500" />} />
            <SmallMetric label="CTR" value={promoStats?.ctr !== undefined ? `${promoStats.ctr.toFixed(2)}%` : undefined} loading={loadingPromos} icon={<MousePointerClick className="h-4 w-4 text-amber-500" />} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Budget Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPromos ? (
                  <Skeleton className="h-[120px] w-full" />
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Total Budget</span>
                      <span className="font-bold">${((promoStats?.totalBudget || 0) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Spent</span>
                      <span className="font-bold">${((promoStats?.totalSpent || 0) / 100).toFixed(2)}</span>
                    </div>
                    <Progress value={promoStats?.totalBudget ? (promoStats.totalSpent / promoStats.totalBudget * 100) : 0} className="h-3" />
                    <p className="text-xs text-muted-foreground">
                      {promoStats?.totalBudget ? ((promoStats.totalSpent / promoStats.totalBudget) * 100).toFixed(1) : 0}% of total budget consumed
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPromos ? (
                  <Skeleton className="h-[120px] w-full" />
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold">{(promoStats?.totalImpressions || 0).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground mt-1">Total Impressions</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold">{(promoStats?.totalClicks || 0).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground mt-1">Total Clicks</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trust & Safety Tab */}
        <TabsContent value="moderation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SmallMetric label="Content Reports" value={moderationStats?.totalReports} loading={loadingModeration} icon={<Activity className="h-4 w-4 text-red-500" />} />
            <SmallMetric label="Pending Reports" value={moderationStats?.pendingReports} loading={loadingModeration} icon={<Timer className="h-4 w-4 text-amber-500" />} />
            <SmallMetric label="Verification Requests" value={moderationStats?.totalVerifications} loading={loadingModeration} icon={<Users className="h-4 w-4 text-blue-500" />} />
            <SmallMetric label="Pending Verifications" value={moderationStats?.pendingVerifications} loading={loadingModeration} icon={<Timer className="h-4 w-4 text-amber-500" />} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Content Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingModeration ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">By Status</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(moderationStats?.reportsByStatus || {}).map(([status, count]) => (
                          <Badge
                            key={status}
                            variant={status === 'pending' ? 'destructive' : 'secondary'}
                            className="capitalize"
                          >
                            {status}: {count}
                          </Badge>
                        ))}
                        {Object.keys(moderationStats?.reportsByStatus || {}).length === 0 && (
                          <p className="text-sm text-muted-foreground">No reports filed</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">By Reason</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(moderationStats?.reportsByReason || {}).map(([reason, count]) => (
                          <Badge key={reason} variant="outline" className="capitalize">
                            {reason.replace(/_/g, ' ')}: {count}
                          </Badge>
                        ))}
                        {Object.keys(moderationStats?.reportsByReason || {}).length === 0 && (
                          <p className="text-sm text-muted-foreground">No reports filed</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Verifications</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingModeration ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">By Status</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(moderationStats?.verByStatus || {}).map(([status, count]) => (
                          <Badge
                            key={status}
                            variant={status === 'pending' ? 'destructive' : 'secondary'}
                            className="capitalize"
                          >
                            {status}: {count}
                          </Badge>
                        ))}
                        {Object.keys(moderationStats?.verByStatus || {}).length === 0 && (
                          <p className="text-sm text-muted-foreground">No verification requests</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">By Type</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(moderationStats?.verByType || {}).map(([type, count]) => (
                          <Badge key={type} variant="outline" className="capitalize">
                            {type.replace(/_/g, ' ')}: {count}
                          </Badge>
                        ))}
                        {Object.keys(moderationStats?.verByType || {}).length === 0 && (
                          <p className="text-sm text-muted-foreground">No verification requests</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, description, loading }: {
  title: string;
  value: number | string | undefined;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="text-2xl font-bold">
            {typeof value === 'number' ? value.toLocaleString() : value ?? '—'}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function SmallMetric({ label, value, loading, icon }: {
  label: string;
  value: number | string | undefined;
  loading: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className="text-2xl font-bold">
            {typeof value === 'number' ? value.toLocaleString() : value ?? '—'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FormulaCard({ title, formula, weight, icon }: {
  title: string;
  formula: string;
  weight: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <Badge variant="secondary">{weight}</Badge>
      </div>
      <code className="text-xs text-muted-foreground block bg-background/50 rounded p-2">{formula}</code>
    </div>
  );
}

function EngagementStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}
