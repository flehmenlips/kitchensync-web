import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Save,
  Image as ImageIcon,
} from 'lucide-react';

export function RecipeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [ingredientsList, setIngredientsList] = useState<string[]>(['']);
  const [instructionsList, setInstructionsList] = useState<string[]>(['']);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing recipe for editing (ingredients & instructions are JSON arrays on the recipe row)
  const { data: existing } = useQuery({
    queryKey: ['recipe-edit', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existing) {
      setTitle(existing.title || '');
      setDescription(existing.description || '');
      setPrepTime(existing.prep_time?.toString() || '');
      setCookTime(existing.cook_time?.toString() || '');
      setServings(existing.servings?.toString() || '');
      setDifficulty(existing.difficulty || '');
      setIngredientsList(
        existing.ingredients?.length > 0 ? existing.ingredients : ['']
      );
      setInstructionsList(
        existing.instructions?.length > 0 ? existing.instructions : ['']
      );
      setImageUrls(existing.image_urls || (existing.image_url ? [existing.image_url] : []));
    }
  }, [existing]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user) return;
    setUploading(true);

    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const fileName = `${user.id}/recipes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('recipe-images')
          .upload(fileName, file, { contentType: file.type });

        if (uploadError) {
          // Try user-assets bucket as fallback
          const { error: fallbackError } = await supabase.storage
            .from('user-assets')
            .upload(fileName, file, { contentType: file.type });

          if (fallbackError) {
            console.error('Upload error:', fallbackError);
            toast.error(`Failed to upload ${file.name}`);
            continue;
          }
          const { data: urlData } = supabase.storage.from('user-assets').getPublicUrl(fileName);
          newUrls.push(urlData.publicUrl);
        } else {
          const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(fileName);
          newUrls.push(urlData.publicUrl);
        }
      }
      setImageUrls(prev => [...prev, ...newUrls]);
      if (newUrls.length > 0) toast.success(`${newUrls.length} image(s) uploaded`);
    } catch (err) {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      setSaving(true);

      const validIngredients = ingredientsList.filter(i => i.trim()).map(i => i.trim());
      const validInstructions = instructionsList.filter(i => i.trim()).map(i => i.trim());

      const recipeData = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        prep_time: prepTime || null,
        cook_time: cookTime || null,
        servings: servings ? parseInt(servings) : 4,
        difficulty: difficulty || 'Medium',
        ingredients: validIngredients,
        instructions: validInstructions,
        tags: [],
        is_ai_generated: false,
        image_url: imageUrls[0] || null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
      };

      let recipeId = id;

      if (isEditing) {
        const { error } = await supabase.from('recipes').update(recipeData).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('recipes').insert(recipeData).select('id').single();
        if (error) throw error;
        recipeId = data.id;
      }

      return recipeId;
    },
    onSuccess: (recipeId) => {
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
      toast.success(isEditing ? 'Recipe updated' : 'Recipe created');
      navigate(`/app/recipes/${recipeId}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save recipe');
    },
    onSettled: () => setSaving(false),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Recipe title is required');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {isEditing ? 'Edit Recipe' : 'New Recipe'}
          </h1>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={saving || !title.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
          {isEditing ? 'Update' : 'Save'}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="bg-card/60 border-border/40">
          <CardHeader>
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Recipe name"
                required
                className="bg-secondary/30 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the recipe"
                rows={3}
                className="w-full rounded-md bg-secondary/30 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Prep (min)</Label>
                <Input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="0"
                  className="bg-secondary/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Cook (min)</Label>
                <Input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  placeholder="0"
                  className="bg-secondary/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Servings</Label>
                <Input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  placeholder="4"
                  className="bg-secondary/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="bg-secondary/30 border-border/50">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card className="bg-card/60 border-border/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Photos</CardTitle>
              <label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  disabled={uploading}
                  asChild
                >
                  <span>
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    {uploading ? 'Uploading...' : 'Add'}
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </CardHeader>
          <CardContent>
            {imageUrls.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {imageUrls.map((url, idx) => (
                  <div key={idx} className="aspect-square rounded-lg bg-secondary/30 overflow-hidden relative group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center cursor-pointer hover:border-primary/30 transition-colors">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            ) : (
              <label className="block">
                <div className="aspect-[3/1] rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 transition-colors gap-2">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Click to add recipe photos</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card className="bg-card/60 border-border/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ingredients</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => setIngredientsList([...ingredientsList, ''])}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {ingredientsList.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                <Input
                  value={ing}
                  onChange={(e) => {
                    const updated = [...ingredientsList];
                    updated[idx] = e.target.value;
                    setIngredientsList(updated);
                  }}
                  placeholder={`Ingredient ${idx + 1}`}
                  className="bg-secondary/30 border-border/50"
                />
                {ingredientsList.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => setIngredientsList(ingredientsList.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-card/60 border-border/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Instructions</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => setInstructionsList([...instructionsList, ''])}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {instructionsList.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0 mt-2">
                  {idx + 1}
                </div>
                <textarea
                  value={step}
                  onChange={(e) => {
                    const updated = [...instructionsList];
                    updated[idx] = e.target.value;
                    setInstructionsList(updated);
                  }}
                  placeholder={`Step ${idx + 1}`}
                  rows={2}
                  className="flex-1 rounded-md bg-secondary/30 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {instructionsList.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                    onClick={() => setInstructionsList(instructionsList.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
