import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { type Business, type BusinessType } from '@/contexts/BusinessContext';

const businessTypes: { value: BusinessType; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'farm', label: 'Farm' },
  { value: 'farmstand', label: 'Farm Stand' },
  { value: 'farmers_market', label: "Farmers' Market" },
  { value: 'food_producer', label: 'Food Producer' },
  { value: 'food_store', label: 'Food Store' },
  { value: 'catering', label: 'Catering' },
  { value: 'food_truck', label: 'Food Truck' },
];

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: Business;
  onSave: (data: { businessName?: string; businessType?: string; description?: string }) => Promise<void>;
}

export function EditProfileDialog({ open, onOpenChange, business, onSave }: EditProfileDialogProps) {
  const [name, setName] = useState(business.name || '');
  const [type, setType] = useState<BusinessType>(business.type || 'restaurant');
  const [description, setDescription] = useState(business.description || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(business.name || '');
      setType(business.type || 'restaurant');
      setDescription(business.description || '');
    }
  }, [open, business]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        businessName: name,
        businessType: type,
        description: description || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Business Profile</DialogTitle>
          <DialogDescription>
            Update your business name, type, and description.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Business Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter business name"
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type" className="text-foreground">Business Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as BusinessType)}>
              <SelectTrigger className="bg-secondary/50 border-border text-foreground">
                <SelectValue placeholder="Select a business type" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {businessTypes.map((bt) => (
                  <SelectItem key={bt.value} value={bt.value} className="text-foreground">
                    {bt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your business..."
              rows={4}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving} className="border-border">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
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
