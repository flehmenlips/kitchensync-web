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
import { Loader2 } from 'lucide-react';
import { type Business } from '@/contexts/BusinessContext';

interface EditLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: Business;
  onSave: (data: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }) => Promise<void>;
}

export function EditLocationDialog({ open, onOpenChange, business, onSave }: EditLocationDialogProps) {
  const [addressLine1, setAddressLine1] = useState(business.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(business.addressLine2 || '');
  const [city, setCity] = useState(business.city || '');
  const [state, setState] = useState(business.state || '');
  const [postalCode, setPostalCode] = useState(business.postalCode || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAddressLine1(business.addressLine1 || '');
      setAddressLine2(business.addressLine2 || '');
      setCity(business.city || '');
      setState(business.state || '');
      setPostalCode(business.postalCode || '');
    }
  }, [open, business]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || undefined,
        state: state || undefined,
        postalCode: postalCode || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
          <DialogDescription>
            Update your business address and location details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="address1">Street Address</Label>
            <Input
              id="address1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="123 Main Street"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address2">Address Line 2 (Optional)</Label>
            <Input
              id="address2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Suite 100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Francisco"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="CA"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip">ZIP / Postal Code</Label>
            <Input
              id="zip"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="94102"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
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
