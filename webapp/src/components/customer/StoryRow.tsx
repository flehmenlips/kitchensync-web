import { useActiveStories } from '@/hooks/useStories';
import type { StoryGroup } from '@/types/stories';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

interface StoryRowProps {
  onStoryClick: (group: StoryGroup, index: number) => void;
}

export function StoryRow({ onStoryClick }: StoryRowProps) {
  const { data: groups = [] } = useActiveStories();
  const { user } = useCustomerAuth();
  const navigate = useNavigate();

  if (groups.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto py-3 px-4 scrollbar-none">
      {/* Create story button */}
      {user && (
        <button
          onClick={() => navigate('/app/create-post')}
          className="flex flex-col items-center gap-1 min-w-[72px]"
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-secondary/30">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-[11px] text-muted-foreground truncate w-16 text-center">Your story</span>
        </button>
      )}

      {groups.map((group, idx) => {
        const name = group.business_name || group.author?.display_name || group.author?.kitchen_name || 'User';
        return (
          <button
            key={group.user_id + (group.business_id ?? '')}
            onClick={() => onStoryClick(group, idx)}
            className="flex flex-col items-center gap-1 min-w-[72px]"
          >
            <div
              className={cn(
                'w-16 h-16 rounded-full p-[2px]',
                group.has_unviewed
                  ? 'bg-gradient-to-br from-amber-400 via-rose-500 to-purple-500'
                  : 'bg-muted'
              )}
            >
              <Avatar className="w-full h-full border-2 border-background">
                <AvatarImage src={group.author?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {name[0]?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-[11px] text-foreground truncate w-16 text-center">{name}</span>
          </button>
        );
      })}
    </div>
  );
}
