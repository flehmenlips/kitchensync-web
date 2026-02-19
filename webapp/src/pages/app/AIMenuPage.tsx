import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  UtensilsCrossed,
  Save,
  Wand2,
  Users as UsersIcon,
} from 'lucide-react';

interface GeneratedMenu {
  title: string;
  occasion: string;
  courses: {
    name: string;
    items: { name: string; description?: string }[];
  }[];
}

export function AIMenuPage() {
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [occasion, setOccasion] = useState('');
  const [guestCount, setGuestCount] = useState('4');
  const [dietary, setDietary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedMenu, setGeneratedMenu] = useState<GeneratedMenu | null>(null);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the menu you want');
      return;
    }

    setGenerating(true);
    try {
      const result = await api.post<GeneratedMenu>('/api/ai/menu', {
        prompt: prompt.trim(),
        occasion: occasion || undefined,
        guest_count: parseInt(guestCount) || 4,
        dietary_restrictions: dietary || undefined,
      });
      setGeneratedMenu(result);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate menu. AI service may be unavailable.');
      // Fallback placeholder menu
      setGeneratedMenu({
        title: prompt.trim(),
        occasion: occasion || 'Dinner',
        courses: [
          {
            name: 'Appetizers',
            items: [{ name: 'Add your appetizer', description: 'Customize this menu item' }],
          },
          {
            name: 'Main Course',
            items: [{ name: 'Add your main dish', description: 'Customize this menu item' }],
          },
          {
            name: 'Dessert',
            items: [{ name: 'Add your dessert', description: 'Customize this menu item' }],
          },
        ],
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user || !generatedMenu) return;
    setSaving(true);

    try {
      // Create menu
      const { data: menu, error: menuError } = await supabase.from('menus').insert({
        user_id: user.id,
        title: generatedMenu.title,
        occasion: generatedMenu.occasion,
        guest_count: parseInt(guestCount) || 4,
        is_ai_generated: true,
      }).select('id').single();

      if (menuError) throw menuError;

      // Add menu items
      const items: { menu_id: string; name: string; description: string; course: string; sort_order: number }[] = [];
      generatedMenu.courses.forEach((course) => {
        course.items.forEach((item, idx) => {
          items.push({
            menu_id: menu.id,
            name: item.name,
            description: item.description || '',
            course: course.name,
            sort_order: idx,
          });
        });
      });

      if (items.length > 0) {
        await supabase.from('menu_items').insert(items);
      }

      queryClient.invalidateQueries({ queryKey: ['my-menus'] });
      toast.success('Menu saved!');
      navigate(`/app/menus/${menu.id}`);
    } catch (err) {
      toast.error('Failed to save menu');
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
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Menu Planner
          </h1>
          <p className="text-sm text-muted-foreground">Describe an event and let AI create a menu</p>
        </div>
      </div>

      {/* Input form */}
      {!generatedMenu && (
        <Card className="bg-card/60 border-border/40">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>What kind of menu do you need?</Label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. An elegant 4-course French dinner party, or a casual summer BBQ for friends"
                rows={3}
                className="w-full rounded-md bg-secondary/30 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Occasion</Label>
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger className="bg-secondary/30 border-border/50">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinner_party">Dinner Party</SelectItem>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="brunch">Brunch</SelectItem>
                    <SelectItem value="bbq">BBQ</SelectItem>
                    <SelectItem value="date_night">Date Night</SelectItem>
                    <SelectItem value="weeknight">Weeknight</SelectItem>
                    <SelectItem value="meal_prep">Meal Prep</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Guests</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="bg-secondary/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Dietary</Label>
                <Input
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  placeholder="Vegan, GF..."
                  className="bg-secondary/30 border-border/50"
                />
              </div>
            </div>
            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={generating || !prompt.trim()}
              onClick={handleGenerate}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {generating ? 'Planning...' : 'Generate Menu'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generated menu preview */}
      {generatedMenu && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-accent/20 text-accent">
              <Sparkles className="h-3 w-3 mr-1" /> AI Generated
            </Badge>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGeneratedMenu(null)}
              >
                Try Again
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save Menu
              </Button>
            </div>
          </div>

          <Card className="bg-card/60 border-border/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{generatedMenu.title}</CardTitle>
              </div>
              <div className="flex gap-3 text-sm text-muted-foreground">
                {generatedMenu.occasion && <span className="capitalize">{generatedMenu.occasion.replace('_', ' ')}</span>}
                <span className="flex items-center gap-1">
                  <UsersIcon className="h-3.5 w-3.5" /> {guestCount} guests
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {generatedMenu.courses.map((course, ci) => (
                <div key={ci} className="space-y-2">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                    {course.name}
                  </h3>
                  <div className="space-y-1.5">
                    {course.items.map((item, ii) => (
                      <div key={ii} className="pl-3 border-l-2 border-primary/20">
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
