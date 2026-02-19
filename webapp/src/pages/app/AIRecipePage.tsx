import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
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
  ChefHat,
  Save,
  Wand2,
} from 'lucide-react';

function formatTime(val: unknown): string {
  if (val == null || val === '') return '';
  const s = String(val);
  return /^\d+$/.test(s) ? `${s} min` : s;
}

export function AIRecipePage() {
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const [prompt, setPrompt] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe what you want to cook');
      return;
    }

    setGenerating(true);
    try {
      const result = await api.post<any>('/api/ai/recipe', {
        prompt: prompt.trim(),
        cuisine: cuisine || undefined,
        difficulty: difficulty || undefined,
        dietary_restrictions: dietaryRestrictions || undefined,
      });
      setGeneratedRecipe(result);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate recipe. Make sure AI service is available.');
      // Fallback: create a placeholder if AI is not configured
      setGeneratedRecipe({
        title: prompt.trim(),
        description: `A delicious ${cuisine || ''} recipe`,
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        difficulty: difficulty || 'medium',
        ingredients: ['Add your ingredients here'],
        instructions: ['Add your cooking instructions here'],
        tags: cuisine ? [cuisine] : [],
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user || !generatedRecipe) return;
    setSaving(true);

    try {
      // Create recipe with ingredients/instructions as JSON arrays (matching iOS format)
      const { data: recipe, error } = await supabase.from('recipes').insert({
        user_id: user.id,
        title: generatedRecipe.title,
        description: generatedRecipe.description,
        prep_time: generatedRecipe.prep_time?.toString() || null,
        cook_time: generatedRecipe.cook_time?.toString() || null,
        servings: generatedRecipe.servings || 4,
        difficulty: generatedRecipe.difficulty || 'Medium',
        ingredients: generatedRecipe.ingredients || [],
        instructions: generatedRecipe.instructions || [],
        tags: generatedRecipe.tags || [],
        is_ai_generated: true,
      }).select('id').single();

      if (error) throw error;

      toast.success('Recipe saved to your collection!');
      navigate(`/app/recipes/${recipe.id}`);
    } catch (err) {
      toast.error('Failed to save recipe');
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
            AI Recipe Generator
          </h1>
          <p className="text-sm text-muted-foreground">Describe a dish and let AI create a recipe for you</p>
        </div>
      </div>

      {/* Input form */}
      {!generatedRecipe && (
        <Card className="bg-card/60 border-border/40">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>What do you want to cook?</Label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A creamy pasta with mushrooms and garlic, or a Thai-inspired stir fry with tofu"
                rows={3}
                className="w-full rounded-md bg-secondary/30 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Cuisine</Label>
                <Input
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  placeholder="Italian, Thai..."
                  className="bg-secondary/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="bg-secondary/30 border-border/50">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dietary</Label>
                <Input
                  value={dietaryRestrictions}
                  onChange={(e) => setDietaryRestrictions(e.target.value)}
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
              {generating ? 'Generating...' : 'Generate Recipe'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generated recipe preview */}
      {generatedRecipe && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-accent/20 text-accent">
              <Sparkles className="h-3 w-3 mr-1" /> AI Generated
            </Badge>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGeneratedRecipe(null)}
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
                Save Recipe
              </Button>
            </div>
          </div>

          <Card className="bg-card/60 border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">{generatedRecipe.title}</CardTitle>
              {generatedRecipe.description && (
                <p className="text-sm text-muted-foreground">{generatedRecipe.description}</p>
              )}
              <div className="flex gap-3 text-sm text-muted-foreground">
                {generatedRecipe.prep_time && <span>Prep: {formatTime(generatedRecipe.prep_time)}</span>}
                {generatedRecipe.cook_time && <span>Cook: {formatTime(generatedRecipe.cook_time)}</span>}
                {generatedRecipe.servings && <span>Serves {generatedRecipe.servings}</span>}
                {generatedRecipe.difficulty && (
                  <Badge variant="secondary" className="capitalize text-[10px]">{generatedRecipe.difficulty}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedRecipe.ingredients?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Ingredients</h3>
                  <ul className="space-y-1">
                    {generatedRecipe.ingredients.map((ing: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <span className="text-foreground">{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {generatedRecipe.instructions?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Instructions</h3>
                  <ol className="space-y-2">
                    {generatedRecipe.instructions.map((step: string, idx: number) => (
                      <li key={idx} className="flex gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                          {idx + 1}
                        </div>
                        <span className="text-foreground pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
