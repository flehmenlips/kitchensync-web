import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  User,
  Ruler,
  Bell,
  Shield,
  Loader2,
  LogOut,
  Save,
  Camera,
} from 'lucide-react';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useCustomerAuth();
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        // Try user-assets as fallback
        const { error: fallback } = await supabase.storage
          .from('user-assets')
          .upload(fileName, file, { contentType: file.type, upsert: true });
        if (fallback) throw fallback;
        const { data: urlData } = supabase.storage.from('user-assets').getPublicUrl(fileName);
        await supabase.from('user_profiles').update({ avatar_url: urlData.publicUrl }).eq('user_id', user.id);
      } else {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        await supabase.from('user_profiles').update({ avatar_url: urlData.publicUrl }).eq('user_id', user.id);
      }

      await refreshProfile();
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error('Failed to upload avatar');
      console.error(err);
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  // Form state
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [kitchenName, setKitchenName] = useState(profile?.kitchen_name || '');
  const [measurementSystem, setMeasurementSystem] = useState(profile?.measurement_system || 'imperial');
  const [temperatureUnit, setTemperatureUnit] = useState(profile?.temperature_unit || 'fahrenheit');
  const [defaultServings, setDefaultServings] = useState(profile?.default_servings?.toString() || '4');
  const [showNutritional, setShowNutritional] = useState(profile?.show_nutritional_info ?? false);
  const [cookingTimers, setCookingTimers] = useState(profile?.enable_cooking_timers ?? true);
  const [shoppingReminders, setShoppingReminders] = useState(profile?.enable_shopping_reminders ?? true);
  // Per-type notification preferences
  const [notifyFollows, setNotifyFollows] = useState(profile?.notify_follows ?? true);
  const [notifyLikes, setNotifyLikes] = useState(profile?.notify_likes ?? true);
  const [notifyComments, setNotifyComments] = useState(profile?.notify_comments ?? true);
  const [notifyMentions, setNotifyMentions] = useState(profile?.notify_mentions ?? true);
  const [notifyNewRecipes, setNotifyNewRecipes] = useState(profile?.notify_new_recipes ?? true);
  // Privacy
  const [isPrivate, setIsPrivate] = useState(profile?.is_private ?? false);
  const [requireApproval, setRequireApproval] = useState(profile?.require_follow_approval ?? false);
  const [showActivity, setShowActivity] = useState(profile?.show_activity_status ?? true);
  const [allowMentions, setAllowMentions] = useState(profile?.allow_mentions ?? true);
  const [showInSuggestions, setShowInSuggestions] = useState(profile?.show_in_suggestions ?? true);
  const [handle, setHandle] = useState(profile?.handle || '');

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName,
          kitchen_name: kitchenName,
          measurement_system: measurementSystem,
          temperature_unit: temperatureUnit,
          default_servings: parseInt(defaultServings) || 4,
          show_nutritional_info: showNutritional,
          enable_cooking_timers: cookingTimers,
          enable_shopping_reminders: shoppingReminders,
          notify_follows: notifyFollows,
          notify_likes: notifyLikes,
          notify_comments: notifyComments,
          notify_mentions: notifyMentions,
          notify_new_recipes: notifyNewRecipes,
          is_private: isPrivate,
          require_follow_approval: requireApproval,
          show_activity_status: showActivity,
          allow_mentions: allowMentions,
          show_in_suggestions: showInSuggestions,
          ...(handle.trim() ? { handle: handle.trim().toLowerCase() } : {}),
        })
        .eq('user_id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Failed to save settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Profile Section */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Profile</CardTitle>
          </div>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-sm">
                {avatarUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={avatarUploading}
                />
              </label>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{displayName || 'Your name'}</p>
              <p className="text-xs text-muted-foreground">Tap camera to change avatar</p>
            </div>
          </div>
          <Separator className="bg-border/40" />
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="bg-secondary/30 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Kitchen Name</Label>
            <Input
              value={kitchenName}
              onChange={(e) => setKitchenName(e.target.value)}
              placeholder="e.g. Maria's Kitchen"
              className="bg-secondary/30 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Handle</Label>
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="your_handle"
              className="bg-secondary/30 border-border/50"
            />
            <p className="text-xs text-muted-foreground">Unique username for your profile (letters, numbers, underscores)</p>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled className="bg-secondary/20 border-border/30 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Cooking Preferences */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Cooking Preferences</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Measurement System</Label>
            <Select value={measurementSystem} onValueChange={setMeasurementSystem}>
              <SelectTrigger className="bg-secondary/30 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imperial">Imperial (cups, oz)</SelectItem>
                <SelectItem value="metric">Metric (ml, g)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Temperature Unit</Label>
            <Select value={temperatureUnit} onValueChange={setTemperatureUnit}>
              <SelectTrigger className="bg-secondary/30 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fahrenheit">Fahrenheit</SelectItem>
                <SelectItem value="celsius">Celsius</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default Servings</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={defaultServings}
              onChange={(e) => setDefaultServings(e.target.value)}
              className="bg-secondary/30 border-border/50 w-24"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="nutritional">Show Nutritional Info</Label>
            <Switch id="nutritional" checked={showNutritional} onCheckedChange={setShowNutritional} />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Notifications</CardTitle>
          </div>
          <CardDescription>Choose which notifications you receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifyFollows">New Followers</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When someone follows you</p>
            </div>
            <Switch id="notifyFollows" checked={notifyFollows} onCheckedChange={setNotifyFollows} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifyLikes">Likes</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When someone likes your recipe</p>
            </div>
            <Switch id="notifyLikes" checked={notifyLikes} onCheckedChange={setNotifyLikes} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifyComments">Comments</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When someone comments on your recipe</p>
            </div>
            <Switch id="notifyComments" checked={notifyComments} onCheckedChange={setNotifyComments} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifyMentions">Mentions</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When someone @mentions you</p>
            </div>
            <Switch id="notifyMentions" checked={notifyMentions} onCheckedChange={setNotifyMentions} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifyNewRecipes">New Recipes</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When someone you follow shares a recipe</p>
            </div>
            <Switch id="notifyNewRecipes" checked={notifyNewRecipes} onCheckedChange={setNotifyNewRecipes} />
          </div>
          <Separator className="bg-border/40" />
          <div className="flex items-center justify-between">
            <Label htmlFor="timers">Cooking Timers</Label>
            <Switch id="timers" checked={cookingTimers} onCheckedChange={setCookingTimers} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="reminders">Shopping Reminders</Label>
            <Switch id="reminders" checked={shoppingReminders} onCheckedChange={setShoppingReminders} />
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Privacy</CardTitle>
          </div>
          <CardDescription>Control who can see your content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="private">Private Account</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Only approved followers can see your recipes</p>
            </div>
            <Switch id="private" checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="approval">Require Follow Approval</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Manually approve new followers</p>
            </div>
            <Switch id="approval" checked={requireApproval} onCheckedChange={setRequireApproval} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="activity">Show Activity Status</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Others can see when you're online</p>
            </div>
            <Switch id="activity" checked={showActivity} onCheckedChange={setShowActivity} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="mentions">Allow Mentions</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Others can @mention you in comments</p>
            </div>
            <Switch id="mentions" checked={allowMentions} onCheckedChange={setAllowMentions} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="suggestions">Show in Suggestions</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Appear in "Discover Users" suggestions</p>
            </div>
            <Switch id="suggestions" checked={showInSuggestions} onCheckedChange={setShowInSuggestions} />
          </div>
        </CardContent>
      </Card>

      {/* Save & Sign Out */}
      <div className="flex flex-col gap-3 pb-8">
        <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
        <Separator />
        <Button variant="destructive" className="w-full" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
