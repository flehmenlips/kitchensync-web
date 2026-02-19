import { useState } from 'react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Play,
  BookOpen,
  Megaphone,
  Sparkles,
  Lightbulb,
  ArrowLeft,
  X,
} from 'lucide-react';

const typeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  tip: { label: 'Tip', icon: Lightbulb, color: 'text-yellow-400' },
  tutorial: { label: 'Tutorial', icon: BookOpen, color: 'text-blue-400' },
  feature: { label: 'Feature', icon: Sparkles, color: 'text-purple-400' },
  announcement: { label: 'Announcement', icon: Megaphone, color: 'text-green-400' },
};

export function TipsPage() {
  const { user } = useCustomerAuth();
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { data: content, isLoading } = useQuery({
    queryKey: ['tips-tutorials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('new_content')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return [];
      return data || [];
    },
  });

  // Track views
  const markViewedMutation = useMutation({
    mutationFn: async (contentId: string) => {
      if (!user) return;
      await supabase.from('content_views').upsert({
        user_id: user.id,
        content_id: contentId,
        viewed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,content_id' }).select();
    },
  });

  const handleOpenItem = (item: any) => {
    setSelectedItem(item);
    if (user) markViewedMutation.mutate(item.id);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Tips & Tutorials</h1>
        <p className="text-sm text-muted-foreground">Learn new skills and discover features</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card/60 border-border/40">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : content && content.length > 0 ? (
        <div className="space-y-4">
          {content.map((item: any) => {
            const config = typeConfig[item.content_type] || typeConfig.tip;
            return (
              <Card
                key={item.id}
                className="bg-card/60 border-border/40 overflow-hidden hover:border-primary/30 transition-all group cursor-pointer"
                onClick={() => handleOpenItem(item)}
              >
                {/* Thumbnail / Video */}
                {(item.thumbnail_url || item.video_url) && (
                  <div className="aspect-video bg-secondary/30 relative overflow-hidden">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <config.icon className={`h-10 w-10 ${config.color} opacity-30`} />
                      </div>
                    )}
                    {item.video_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="h-5 w-5 text-black ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      <config.icon className={`h-3 w-3 mr-1 ${config.color}`} />
                      {config.label}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No content yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Check back soon for tips and tutorials</p>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {(() => {
                      const config = typeConfig[selectedItem.content_type] || typeConfig.tip;
                      return (
                        <>
                          <config.icon className={`h-3 w-3 mr-1 ${config.color}`} />
                          {config.label}
                        </>
                      );
                    })()}
                  </Badge>
                </div>
                <DialogTitle className="text-lg">{selectedItem.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Video player */}
                {selectedItem.video_url && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <video
                      src={selectedItem.video_url}
                      controls
                      autoPlay
                      className="w-full h-full"
                      poster={selectedItem.thumbnail_url}
                    />
                  </div>
                )}

                {/* Image only (no video) */}
                {!selectedItem.video_url && selectedItem.thumbnail_url && (
                  <div className="rounded-lg overflow-hidden">
                    <img
                      src={selectedItem.thumbnail_url}
                      alt={selectedItem.title}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Content */}
                {selectedItem.description && (
                  <p className="text-sm text-foreground leading-relaxed">
                    {selectedItem.description}
                  </p>
                )}

                {selectedItem.body && (
                  <div
                    className="text-sm text-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: selectedItem.body }}
                  />
                )}

                <p className="text-xs text-muted-foreground">
                  Published {new Date(selectedItem.created_at).toLocaleDateString()}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
