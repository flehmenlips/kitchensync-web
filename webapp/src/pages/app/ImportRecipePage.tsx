import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  Link2,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';

export function ImportRecipePage() {
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [urlImporting, setUrlImporting] = useState(false);

  // Manual import fields
  const [title, setTitle] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [instructionsText, setInstructionsText] = useState('');

  const handleUrlImport = async () => {
    if (!user || !url.trim()) return;
    setUrlImporting(true);

    try {
      // Try backend AI parsing endpoint
      const parsed = await api.post<any>('/api/ai/recipe-parse', { url: url.trim() });

      if (parsed?.title) {
        // Save the parsed recipe
        const { data: recipe, error } = await supabase.from('recipes').insert({
          user_id: user.id,
          title: parsed.title,
          description: parsed.description || '',
          ingredients: parsed.ingredients || [],
          instructions: parsed.instructions || [],
          prep_time: parsed.prep_time?.toString() || null,
          cook_time: parsed.cook_time?.toString() || null,
          servings: parsed.servings || 4,
          difficulty: parsed.difficulty || 'Medium',
          tags: parsed.tags || [],
          image_url: parsed.image_url || null,
          is_ai_generated: false,
        }).select('id').single();

        if (error) throw error;
        toast.success('Recipe imported from URL!');
        navigate(`/app/recipes/${recipe.id}`);
      } else {
        throw new Error('Could not parse recipe from URL');
      }
    } catch (err: any) {
      // Fallback: pre-fill manual import form
      toast.error('Could not auto-import from URL. Try pasting the recipe manually below.');
      setTitle(url.split('/').pop()?.replace(/-/g, ' ') || '');
    } finally {
      setUrlImporting(false);
    }
  };

  const handleManualImport = async () => {
    if (!user || !title.trim()) {
      toast.error('Title is required');
      return;
    }

    setImporting(true);
    try {
      // Parse ingredients and instructions (one per line)
      const ingredients = ingredientsText.split('\n').filter(l => l.trim()).map(l => l.trim());
      const instructions = instructionsText.split('\n').filter(l => l.trim()).map(l => l.trim());

      // Save as JSON arrays on the recipe (matching iOS format)
      const { data: recipe, error } = await supabase.from('recipes').insert({
        user_id: user.id,
        title: title.trim(),
        ingredients,
        instructions,
        servings: 4,
        difficulty: 'Medium',
        tags: [],
        is_ai_generated: false,
      }).select('id').single();

      if (error) throw error;

      toast.success('Recipe imported!');
      navigate(`/app/recipes/${recipe.id}`);
    } catch (err) {
      toast.error('Failed to import recipe');
    } finally {
      setImporting(false);
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
          <h1 className="text-xl font-bold text-foreground">Import Recipe</h1>
          <p className="text-sm text-muted-foreground">Add a recipe from a URL or paste it manually</p>
        </div>
      </div>

      {/* URL Import */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Import from URL</CardTitle>
          </div>
          <CardDescription>Paste a recipe URL and we'll extract the details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/recipe/..."
            className="bg-secondary/30 border-border/50"
          />
          <Button
            variant="outline"
            className="w-full"
            disabled={!url.trim() || urlImporting}
            onClick={handleUrlImport}
          >
            {urlImporting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {urlImporting ? 'Parsing...' : 'Import from URL'}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Import */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Paste Recipe</CardTitle>
          </div>
          <CardDescription>Paste ingredients and instructions from any source</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Recipe Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Recipe name"
              className="bg-secondary/30 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Ingredients (one per line)</Label>
            <textarea
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder="2 cups flour&#10;1 cup sugar&#10;3 eggs&#10;..."
              rows={6}
              className="w-full rounded-md bg-secondary/30 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Instructions (one step per line)</Label>
            <textarea
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              placeholder="Preheat oven to 350F&#10;Mix dry ingredients&#10;Add wet ingredients&#10;..."
              rows={6}
              className="w-full rounded-md bg-secondary/30 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
            />
          </div>
          <Button
            className="w-full bg-primary text-primary-foreground"
            disabled={importing || !title.trim()}
            onClick={handleManualImport}
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Import Recipe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
