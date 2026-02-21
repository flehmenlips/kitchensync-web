import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Calendar, Users, Hash, Flame, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, format, isPast, isFuture } from 'date-fns';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  hashtag: string;
  startAt: string;
  endAt: string;
  status: string;
  category: string;
  prizeDescription: string | null;
  entryCount: number;
  isFeatured: boolean;
}

export function ChallengesPage() {
  const { user } = useCustomerAuth();
  const [tab, setTab] = useState<'active' | 'upcoming' | 'completed'>('active');

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['challenges', tab],
    queryFn: async () => {
      let query = supabase
        .from('challenges')
        .select('*')
        .order('start_at', { ascending: tab === 'upcoming' });

      if (tab === 'active') query = query.eq('status', 'active');
      else if (tab === 'upcoming') query = query.eq('status', 'upcoming');
      else query = query.eq('status', 'completed');

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        coverImageUrl: c.cover_image_url,
        hashtag: c.hashtag,
        startAt: c.start_at,
        endAt: c.end_at,
        status: c.status,
        category: c.category,
        prizeDescription: c.prize_description,
        entryCount: c.entry_count,
        isFeatured: c.is_featured,
      })) as Challenge[];
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>;
      case 'upcoming': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Upcoming</Badge>;
      case 'completed': return <Badge className="bg-muted text-muted-foreground">Completed</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Community Challenges
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Join cooking challenges, showcase your skills, and win prizes
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="w-full bg-secondary/30">
          <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1">Upcoming</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">Past</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <div className="py-16 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No {tab} challenges</h3>
          <p className="text-sm text-muted-foreground mt-1">Check back soon for new challenges!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((challenge) => (
            <Card key={challenge.id} className="overflow-hidden hover:border-primary/30 transition-all group">
              {challenge.coverImageUrl && (
                <div className="h-48 overflow-hidden relative">
                  <img
                    src={challenge.coverImageUrl}
                    alt={challenge.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    {challenge.isFeatured && <Badge className="bg-amber-500 text-white">Featured</Badge>}
                    {getStatusBadge(challenge.status)}
                  </div>
                </div>
              )}
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-foreground">{challenge.title}</h3>
                  {!challenge.coverImageUrl && getStatusBadge(challenge.status)}
                </div>

                {challenge.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{challenge.description}</p>
                )}

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    #{challenge.hashtag}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(challenge.startAt), 'MMM d')} - {format(new Date(challenge.endAt), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {challenge.entryCount} entries
                  </span>
                </div>

                {challenge.prizeDescription && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
                      <Trophy className="h-3 w-3" /> Prize
                    </p>
                    <p className="text-sm text-foreground mt-1">{challenge.prizeDescription}</p>
                  </div>
                )}

                {challenge.status === 'active' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Ends {formatDistanceToNow(new Date(challenge.endAt), { addSuffix: true })}
                  </div>
                )}

                {challenge.status === 'active' && (
                  <Link to={`/app/hashtag/${challenge.hashtag}`}>
                    <Button className="w-full mt-2">
                      Join Challenge <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
