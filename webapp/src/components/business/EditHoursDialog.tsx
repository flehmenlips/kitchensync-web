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
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { type BusinessHours } from '@/contexts/BusinessContext';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

interface HoursEntry {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface EditHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hours: BusinessHours[] | undefined;
  onSave: (hours: Array<{
    dayOfWeek: number;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
  }>) => Promise<void>;
}

function getDefaultHours(): HoursEntry[] {
  return DAYS_OF_WEEK.map((day) => ({
    dayOfWeek: day.value,
    openTime: '09:00',
    closeTime: '17:00',
    isClosed: day.value === 0 || day.value === 6, // Closed on weekends by default
  }));
}

function parseExistingHours(existingHours: BusinessHours[] | undefined): HoursEntry[] {
  if (!existingHours || existingHours.length === 0) {
    return getDefaultHours();
  }

  const hoursMap = new Map<number, BusinessHours>();
  existingHours.forEach((h) => hoursMap.set(h.dayOfWeek, h));

  return DAYS_OF_WEEK.map((day) => {
    const existing = hoursMap.get(day.value);
    if (existing) {
      return {
        dayOfWeek: day.value,
        openTime: existing.openTime || '09:00',
        closeTime: existing.closeTime || '17:00',
        isClosed: existing.isClosed,
      };
    }
    return {
      dayOfWeek: day.value,
      openTime: '09:00',
      closeTime: '17:00',
      isClosed: day.value === 0 || day.value === 6,
    };
  });
}

export function EditHoursDialog({ open, onOpenChange, hours, onSave }: EditHoursDialogProps) {
  const [hoursData, setHoursData] = useState<HoursEntry[]>(() => parseExistingHours(hours));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setHoursData(parseExistingHours(hours));
    }
  }, [open, hours]);

  const handleToggleClosed = (dayOfWeek: number) => {
    setHoursData((prev) =>
      prev.map((h) =>
        h.dayOfWeek === dayOfWeek ? { ...h, isClosed: !h.isClosed } : h
      )
    );
  };

  const handleTimeChange = (dayOfWeek: number, field: 'openTime' | 'closeTime', value: string) => {
    setHoursData((prev) =>
      prev.map((h) =>
        h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formattedHours = hoursData.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.isClosed ? null : h.openTime,
        closeTime: h.isClosed ? null : h.closeTime,
        isClosed: h.isClosed,
      }));
      await onSave(formattedHours);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Operating Hours</DialogTitle>
          <DialogDescription>
            Set your business hours for each day of the week.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayHours = hoursData.find((h) => h.dayOfWeek === day.value);
            if (!dayHours) return null;

            return (
              <div
                key={day.value}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center justify-between sm:justify-start gap-3 min-w-[140px]">
                  <Label className="font-medium min-w-[90px]">{day.label}</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!dayHours.isClosed}
                      onCheckedChange={() => handleToggleClosed(day.value)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {dayHours.isClosed ? 'Closed' : 'Open'}
                    </span>
                  </div>
                </div>
                {!dayHours.isClosed ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={dayHours.openTime}
                      onChange={(e) => handleTimeChange(day.value, 'openTime', e.target.value)}
                      className="w-[130px]"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={dayHours.closeTime}
                      onChange={(e) => handleTimeChange(day.value, 'closeTime', e.target.value)}
                      className="w-[130px]"
                    />
                  </div>
                ) : (
                  <div className="flex-1 text-muted-foreground text-sm italic">
                    Closed for the day
                  </div>
                )}
              </div>
            );
          })}
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
              'Save Hours'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
