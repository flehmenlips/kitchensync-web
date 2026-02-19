import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Upload,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Search,
  X,
  Download,
} from 'lucide-react';

export function AssetLibraryPage() {
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const { data: assets, isLoading } = useQuery({
    queryKey: ['user-assets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-assets')
          .upload(fileName, file, { contentType: file.type });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('user-assets')
          .getPublicUrl(fileName);

        // Save record to database
        await supabase.from('user_assets').insert({
          user_id: user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          storage_path: fileName,
          tags: [],
        });
      }

      queryClient.invalidateQueries({ queryKey: ['user-assets'] });
      toast.success(`${files.length} ${files.length === 1 ? 'file' : 'files'} uploaded`);
    } catch (err) {
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (asset: any) => {
      // Delete from storage
      if (asset.storage_path) {
        await supabase.storage.from('user-assets').remove([asset.storage_path]);
      }
      // Delete record
      const { error } = await supabase.from('user_assets').delete().eq('id', asset.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-assets'] });
      setSelectedAsset(null);
      toast.success('Asset deleted');
    },
    onError: () => toast.error('Failed to delete asset'),
  });

  const filtered = assets?.filter(a =>
    !search || a.file_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Asset Library</h1>
            <p className="text-xs text-muted-foreground">{assets?.length || 0} files</p>
          </div>
        </div>
        <label>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            size="sm"
            disabled={uploading}
            asChild
          >
            <span>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Upload className="h-4 w-4 mr-1.5" />}
              Upload
            </span>
          </Button>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary/30 border-border/50"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square rounded-lg bg-secondary/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {filtered.map((asset: any) => (
            <div
              key={asset.id}
              className="aspect-square rounded-lg bg-secondary/30 border border-border/40 overflow-hidden hover:border-primary/30 transition-all cursor-pointer relative group"
              onClick={() => setSelectedAsset(asset)}
            >
              {asset.file_type?.startsWith('image/') ? (
                <img src={asset.file_url} alt={asset.file_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                <p className="text-[10px] text-white truncate">{asset.file_name}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center space-y-3">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <div>
            <h3 className="text-base font-semibold text-foreground">No assets yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload images to use in your recipes and menus
            </p>
          </div>
        </div>
      )}

      {/* Asset detail dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">{selectedAsset?.file_name}</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              {selectedAsset.file_type?.startsWith('image/') && (
                <div className="rounded-lg overflow-hidden bg-secondary/30">
                  <img
                    src={selectedAsset.file_url}
                    alt={selectedAsset.file_name}
                    className="w-full max-h-80 object-contain"
                  />
                </div>
              )}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Type: {selectedAsset.file_type}</p>
                {selectedAsset.file_size && <p>Size: {formatSize(selectedAsset.file_size)}</p>}
                <p>Uploaded: {new Date(selectedAsset.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedAsset.file_url);
                    toast.success('URL copied to clipboard');
                  }}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Copy URL
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(selectedAsset)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
