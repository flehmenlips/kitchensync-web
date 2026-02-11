import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type ActivityAction =
  | 'create_recipe'
  | 'update_recipe'
  | 'delete_recipe'
  | 'feature_recipe'
  | 'unfeature_recipe'
  | 'bulk_activate_recipes'
  | 'bulk_deactivate_recipes'
  | 'bulk_feature_recipes'
  | 'bulk_unfeature_recipes'
  | 'bulk_delete_recipes'
  | 'create_content'
  | 'update_content'
  | 'delete_content'
  | 'suspend_user'
  | 'unsuspend_user'
  | 'create_admin'
  | 'update_admin'
  | 'delete_admin'
  | 'review_report'
  | 'dismiss_report'
  | 'action_report'
  | 'approve_creator'
  | 'reject_creator'
  | 'activate_product'
  | 'deactivate_product'
  | 'update_product'
  | 'update_order_status'
  | 'create_payout'
  | 'process_payout'
  | 'complete_payout'
  | 'fail_payout';

export type TargetType = 'recipe' | 'content' | 'user' | 'admin' | 'report' | 'product' | 'order' | 'payout';

export interface ActivityLogEntry {
  id: string;
  admin_user_id: string;
  action: ActivityAction;
  target_type: TargetType;
  target_id: string;
  target_name: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  admin_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface LogActivityParams {
  action: ActivityAction;
  targetType: TargetType;
  targetId: string;
  targetName: string;
  metadata?: Record<string, unknown>;
}

export function useActivityLog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const logActivityMutation = useMutation({
    mutationFn: async ({
      action,
      targetType,
      targetId,
      targetName,
      metadata,
    }: LogActivityParams) => {
      if (!user) {
        throw new Error('User must be logged in to log activity');
      }

      const { error } = await supabase.from('admin_activity_log').insert({
        admin_user_id: user.id,
        action,
        target_type: targetType,
        target_id: targetId,
        target_name: targetName,
        metadata: metadata ?? null,
      });

      if (error) {
        console.error('Failed to log activity:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
    },
  });

  const logActivity = async (
    action: ActivityAction,
    targetType: TargetType,
    targetId: string,
    targetName: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      await logActivityMutation.mutateAsync({
        action,
        targetType,
        targetId,
        targetName,
        metadata,
      });
    } catch (error) {
      // Silently fail - activity logging should not block main operations
      console.error('Activity logging failed:', error);
    }
  };

  return {
    logActivity,
    isLogging: logActivityMutation.isPending,
  };
}
