import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMarkStoryViewed } from '@/hooks/useStories';
import type { StoryGroup, StoryWithAuthor } from '@/types/stories';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}

const STORY_DURATION_MS = 5000;

export function StoryViewer({ groups, initialGroupIndex, onClose }: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number>(0);
  const startTimeRef = useRef(Date.now());
  const markViewed = useMarkStoryViewed();

  const group = groups[groupIdx];
  const story: StoryWithAuthor | undefined = group?.stories[storyIdx];

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [group, storyIdx, groupIdx, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1);
      setStoryIdx(groups[groupIdx - 1]?.stories.length - 1 ?? 0);
    }
  }, [storyIdx, groupIdx, groups]);

  useEffect(() => {
    if (story && !story.is_viewed) {
      markViewed.mutate(story.id);
    }
  }, [story?.id]);

  useEffect(() => {
    setProgress(0);
    startTimeRef.current = Date.now();

    if (paused) return;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / STORY_DURATION_MS, 1);
      setProgress(pct);
      if (pct >= 1) {
        goNext();
      } else {
        timerRef.current = requestAnimationFrame(animate);
      }
    };
    timerRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(timerRef.current);
  }, [storyIdx, groupIdx, paused, goNext]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  if (!group || !story) return null;

  const name = group.business_name || group.author?.display_name || group.author?.kitchen_name || 'User';

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <div
        className="relative w-full max-w-[420px] aspect-[9/16] bg-black rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-2">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < storyIdx ? '100%' : i === storyIdx ? `${progress * 100}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 z-20 flex items-center gap-3 px-4 pt-2">
          <Avatar className="h-9 w-9 border-2 border-white/50">
            <AvatarImage src={group.author?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-white/20 text-white text-xs">{name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{name}</p>
            <p className="text-white/60 text-[11px]">{formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}</p>
          </div>
          <button onClick={() => setPaused((p) => !p)} className="text-white/80 hover:text-white p-1">
            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </button>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Media */}
        {story.media_type === 'video' ? (
          <video
            src={story.media_url}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />
        ) : (
          <img
            src={story.media_url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}

        {/* Caption */}
        {story.caption && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-4 pb-6 pt-16">
            <p className="text-white text-sm">{story.caption}</p>
          </div>
        )}

        {/* Touch navigation zones */}
        <button
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
          onClick={goPrev}
          aria-label="Previous"
        />
        <button
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
          onClick={goNext}
          aria-label="Next"
        />

        {/* Arrow buttons for desktop */}
        {groupIdx > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-[-50px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {groupIdx < groups.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-[-50px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
