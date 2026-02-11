import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X, Image as ImageIcon, Palette } from 'lucide-react';
import { type Business } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface EditBrandingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: Business;
  onSave: (data: { logoUrl?: string; coverImageUrl?: string; brandColor?: string }) => Promise<void>;
}

export function EditBrandingDialog({ open, onOpenChange, business, onSave }: EditBrandingDialogProps) {
  const [logoUrl, setLogoUrl] = useState(business.logoUrl || '');
  const [coverImageUrl, setCoverImageUrl] = useState(business.coverImageUrl || '');
  const [brandColor, setBrandColor] = useState(business.brandColor || '#3b82f6');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setLogoUrl(business.logoUrl || '');
      setCoverImageUrl(business.coverImageUrl || '');
      setBrandColor(business.brandColor || '#3b82f6');
    }
  }, [open, business]);

  const uploadImage = async (file: File, type: 'logo' | 'cover'): Promise<string | null> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!fileExt || !allowedTypes.includes(fileExt)) {
      toast.error('Please upload a valid image file (jpg, png, gif, or webp)');
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return null;
    }

    const fileName = `${business.id}/${type}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('business-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Failed to upload image. Please try again.');
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('business-assets')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const url = await uploadImage(file, 'logo');
      if (url) {
        setLogoUrl(url);
        toast.success('Logo uploaded successfully');
      }
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const url = await uploadImage(file, 'cover');
      if (url) {
        setCoverImageUrl(url);
        toast.success('Cover image uploaded successfully');
      }
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        logoUrl: logoUrl || undefined,
        coverImageUrl: coverImageUrl || undefined,
        brandColor: brandColor || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const isUploading = isUploadingLogo || isUploadingCover;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Edit Branding
          </DialogTitle>
          <DialogDescription>
            Customize how your business appears on KitchenSync
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Cover Image */}
          <div className="space-y-3">
            <Label className="text-foreground">Cover Image</Label>
            <p className="text-sm text-muted-foreground">
              This hero image appears at the top of your business profile. Recommended size: 1200x400px
            </p>
            <div className="relative">
              {coverImageUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img
                    src={coverImageUrl}
                    alt="Cover"
                    className="w-full h-40 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => setCoverImageUrl('')}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="w-full h-40 rounded-lg border-2 border-dashed border-border bg-secondary/30 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {isUploadingCover ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload cover image</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
                disabled={isUploading}
              />
              {coverImageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace Cover
                </Button>
              )}
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-3">
            <Label className="text-foreground">Logo</Label>
            <p className="text-sm text-muted-foreground">
              Your business logo. Recommended size: 200x200px (square)
            </p>
            <div className="flex items-start gap-4">
              <div className="relative">
                {logoUrl ? (
                  <div className="relative">
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-24 h-24 rounded-xl object-cover border border-border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setLogoUrl('')}
                      disabled={isUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-secondary/30 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={isUploading}
                />
              </div>
              <div className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {logoUrl ? 'Replace Logo' : 'Upload Logo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPG, GIF or WebP. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Brand Color */}
          <div className="space-y-3">
            <Label className="text-foreground">Brand Color</Label>
            <p className="text-sm text-muted-foreground">
              Choose your primary brand color for accents and highlights
            </p>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border border-border"
                  style={{ padding: 0 }}
                />
              </div>
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                placeholder="#3b82f6"
                className="w-32 bg-secondary/50 border-border text-foreground font-mono"
              />
              <div className="flex gap-2">
                {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${brandColor === color ? 'border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBrandColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <Label className="text-foreground">Preview</Label>
            <div className="rounded-lg border border-border overflow-hidden bg-background">
              {/* Cover preview */}
              <div
                className="h-24 relative"
                style={{
                  backgroundColor: coverImageUrl ? undefined : brandColor,
                  backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Logo overlay */}
                <div className="absolute -bottom-6 left-4">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-16 h-16 rounded-xl object-cover border-4 border-background"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-xl border-4 border-background flex items-center justify-center text-white font-bold text-xl"
                      style={{ backgroundColor: brandColor }}
                    >
                      {business.name?.charAt(0) || 'B'}
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-8 pb-4 px-4">
                <h3 className="font-semibold text-foreground">{business.name}</h3>
                <p className="text-sm text-muted-foreground">{business.type}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving || isUploading}
            className="border-border"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isUploading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
