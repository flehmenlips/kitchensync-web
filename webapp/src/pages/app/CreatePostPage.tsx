import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  ImagePlus,
  X,
  MapPin,
  Hash,
  Loader2,
} from 'lucide-react';
import { useCreatePost } from '@/hooks/usePosts';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { PostType, PostMedia, PostVisibility } from '@/types/posts';

export function CreatePostPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('businessId') ?? undefined;
  const businessName = searchParams.get('businessName') ?? undefined;
  const createPost = useCreatePost();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postType, setPostType] = useState<PostType>(businessId ? 'announcement' : 'photo');
  const [caption, setCaption] = useState('');
  const [body, setBody] = useState('');
  const [mediaFiles, setMediaFiles] = useState<PostMedia[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [locationName, setLocationName] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const uploaded: PostMedia[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('post-media').upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(path);
        uploaded.push({
          url: urlData.publicUrl,
          type: file.type.startsWith('video') ? 'video' : 'image',
        });
      }
      setMediaFiles(prev => [...prev, ...uploaded]);
    } catch (err: any) {
      toast.error('Upload failed: ' + (err.message ?? 'Unknown error'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (tag && !tags.includes(tag)) setTags(prev => [...prev, tag]);
    setTagInput('');
  };

  const handleSubmit = async () => {
    if (!caption.trim() && !mediaFiles.length && !body.trim()) {
      toast.error('Add a photo, caption, or text.');
      return;
    }

    try {
      await createPost.mutateAsync({
        post_type: postType,
        caption: caption.trim() || undefined,
        body: body.trim() || undefined,
        media: mediaFiles.length ? mediaFiles : undefined,
        tags: tags.length ? tags : undefined,
        location_name: locationName.trim() || undefined,
        visibility,
        business_id: businessId,
      });
      toast.success('Post created!');
      navigate(-1);
    } catch (err: any) {
      toast.error('Failed to create post: ' + (err.message ?? 'Unknown error'));
    }
  };

  const canSubmit = (caption.trim() || mediaFiles.length > 0 || body.trim()) && !createPost.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">New Post</h1>
          {businessName && (
            <p className="text-xs text-blue-500">Posting as {businessName}</p>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Post Type */}
          <div className="space-y-2">
            <Label>Post Type</Label>
            <Select value={postType} onValueChange={(v) => setPostType(v as PostType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label>Caption</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's cooking?"
              rows={3}
            />
          </div>

          {/* Body for articles/announcements */}
          {(postType === 'article' || postType === 'announcement') && (
            <div className="space-y-2">
              <Label>{postType === 'article' ? 'Article' : 'Details'}</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={postType === 'article' ? 'Write your article...' : 'Announcement details...'}
                rows={8}
              />
            </div>
          )}

          {/* Media */}
          <div className="space-y-2">
            <Label>Media</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            {mediaFiles.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {mediaFiles.map((m, i) => (
                  <div key={i} className="relative">
                    <img src={m.url} alt="" className="h-24 w-24 rounded-lg object-cover" />
                    <button
                      onClick={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImagePlus className="h-4 w-4 mr-2" />}
              {isUploading ? 'Uploading...' : 'Add Photos / Videos'}
            </Button>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Location (optional)
            </Label>
            <Input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Portland, OR"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" /> Tags
            </Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleAddTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                    #{tag} <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as PostVisibility)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="followers">Followers Only</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
            {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Post
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
