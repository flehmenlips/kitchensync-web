import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  EditProfileDialog,
  EditContactDialog,
  EditLocationDialog,
  EditHoursDialog,
  EditBrandingDialog,
} from '@/components/business';
import {
  Settings,
  Building2,
  Clock,
  Globe,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Bell,
  Shield,
  Palette,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatBusinessType(type: string): string {
  const typeMap: Record<string, string> = {
    restaurant: 'Restaurant',
    cafe: 'Cafe',
    farm: 'Farm',
    farmstand: 'Farm Stand',
    farmers_market: "Farmers' Market",
    food_producer: 'Food Producer',
    food_store: 'Food Store',
    catering: 'Catering',
    food_truck: 'Food Truck',
  };
  return typeMap[type] || type;
}

function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function BusinessSettingsPage() {
  const { business, refreshBusiness } = useBusiness();

  // Dialog states
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [brandingDialogOpen, setBrandingDialogOpen] = useState(false);

  // Handle saving profile
  const handleSaveProfile = async (data: { businessName?: string; businessType?: string; description?: string }) => {
    if (!business?.id) return;
    try {
      await api.put(`/api/business/${business.id}`, data);
      await refreshBusiness();
      toast.success('Business profile updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(message);
      throw error;
    }
  };

  // Handle saving contact info
  const handleSaveContact = async (data: { phone?: string; email?: string; websiteUrl?: string }) => {
    if (!business?.id) return;
    try {
      await api.put(`/api/business/${business.id}`, data);
      await refreshBusiness();
      toast.success('Contact information updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update contact information';
      toast.error(message);
      throw error;
    }
  };

  // Handle saving location
  const handleSaveLocation = async (data: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }) => {
    if (!business?.id) return;
    try {
      await api.put(`/api/business/${business.id}`, data);
      await refreshBusiness();
      toast.success('Location updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update location';
      toast.error(message);
      throw error;
    }
  };

  // Handle saving hours
  const handleSaveHours = async (hours: Array<{
    dayOfWeek: number;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
  }>) => {
    if (!business?.id) return;
    try {
      await api.put(`/api/business/${business.id}/hours`, hours);
      await refreshBusiness();
      toast.success('Operating hours updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update operating hours';
      toast.error(message);
      throw error;
    }
  };

  // Handle saving branding
  const handleSaveBranding = async (data: { logoUrl?: string; coverImageUrl?: string; brandColor?: string }) => {
    if (!business?.id) return;
    try {
      await api.put(`/api/business/${business.id}`, data);
      await refreshBusiness();
      toast.success('Branding updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update branding';
      toast.error(message);
      throw error;
    }
  };

  // Format address for display
  const formatAddress = () => {
    const parts: string[] = [];
    if (business?.addressLine1) parts.push(business.addressLine1);
    if (business?.addressLine2) parts.push(business.addressLine2);
    return parts.join(', ') || 'Not set';
  };

  // Get hours display for a specific day
  const getHoursDisplay = (dayOfWeek: number) => {
    const dayHours = business?.hours?.find((h) => h.dayOfWeek === dayOfWeek);
    if (!dayHours || dayHours.isClosed) {
      return 'Closed';
    }
    return `${formatTime(dayHours.openTime)} - ${formatTime(dayHours.closeTime)}`;
  };

  const settingsSections = [
    {
      title: 'Business Profile',
      description: 'Basic information about your business',
      icon: Building2,
      items: [
        { label: 'Business Name', value: business?.name || 'Not set' },
        { label: 'Business Type', value: business?.type ? formatBusinessType(business.type) : 'Not set' },
        { label: 'Description', value: business?.description || 'Not set' },
      ],
      onEdit: () => setProfileDialogOpen(true),
    },
    {
      title: 'Contact Information',
      description: 'How customers can reach you',
      icon: Phone,
      items: [
        { label: 'Phone', value: business?.phone || 'Not set', icon: Phone },
        { label: 'Email', value: business?.email || 'Not set', icon: Mail },
        { label: 'Website', value: business?.websiteUrl || 'Not set', icon: Globe },
      ],
      onEdit: () => setContactDialogOpen(true),
    },
    {
      title: 'Location',
      description: 'Your business address',
      icon: MapPin,
      items: [
        { label: 'Address', value: formatAddress() },
        { label: 'City', value: business?.city || 'Not set' },
        { label: 'State', value: business?.state || 'Not set' },
        { label: 'ZIP', value: business?.postalCode || 'Not set' },
      ],
      onEdit: () => setLocationDialogOpen(true),
    },
  ];

  const quickSettings = [
    {
      title: 'Operating Hours',
      description: 'Set your business hours and availability',
      icon: Clock,
      action: 'Configure',
      onClick: () => setHoursDialogOpen(true),
    },
    {
      title: 'Payment Methods',
      description: 'Manage accepted payment options',
      icon: CreditCard,
      action: 'Manage',
      onClick: () => toast.info('Payment settings coming soon'),
    },
    {
      title: 'Notifications',
      description: 'Configure alerts and reminders',
      icon: Bell,
      action: 'Configure',
      onClick: () => toast.info('Notification settings coming soon'),
    },
    {
      title: 'Security',
      description: 'Password and access settings',
      icon: Shield,
      action: 'Manage',
      onClick: () => toast.info('Security settings coming soon'),
    },
    {
      title: 'Branding',
      description: 'Logo, colors, and appearance',
      icon: Palette,
      action: 'Customize',
      onClick: () => setBrandingDialogOpen(true),
    },
    {
      title: 'Integrations',
      description: 'Connect third-party services',
      icon: ExternalLink,
      action: 'Browse',
      onClick: () => toast.info('Integrations coming soon'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your business settings and preferences
          </p>
        </div>
      </div>

      {/* Verification Status */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Business Verification</p>
                <p className="text-sm text-muted-foreground">
                  {business?.isVerified
                    ? 'Your business has been verified on KitchenSync'
                    : 'Your business is pending verification'}
                </p>
              </div>
            </div>
            <Badge
              className={
                business?.isVerified
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }
            >
              {business?.isVerified ? 'Verified' : 'Pending'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Profile Sections */}
      <div className="grid gap-6">
        {settingsSections.map((section) => (
          <Card key={section.title} className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <section.icon className="h-5 w-5 text-primary" />
                {section.title}
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {section.items.map((item, index) => (
                  <div key={item.label}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {item.label}
                      </label>
                      <div className="flex items-center gap-2">
                        {'icon' in item && item.icon ? (
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                        ) : null}
                        <span className="text-foreground truncate max-w-[300px]">{item.value}</span>
                      </div>
                    </div>
                    {index < section.items.length - 1 ? (
                      <Separator className="mt-4 bg-border/50" />
                    ) : null}
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-6" onClick={section.onEdit}>
                Edit {section.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operating Hours Section */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Operating Hours
          </CardTitle>
          <CardDescription>Your business operating schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day, index) => (
              <div key={day} className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground w-24">{day}</span>
                <span className="text-sm text-foreground">{getHoursDisplay(index)}</span>
              </div>
            ))}
          </div>
          <Button variant="outline" className="mt-6" onClick={() => setHoursDialogOpen(true)}>
            Edit Operating Hours
          </Button>
        </CardContent>
      </Card>

      {/* Branding Section */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Branding & Appearance
          </CardTitle>
          <CardDescription>Customize how your business appears on KitchenSync</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Preview */}
          <div className="rounded-lg border border-border overflow-hidden bg-background mb-6">
            {/* Cover preview */}
            <div
              className="h-32 relative"
              style={{
                backgroundColor: business?.coverImageUrl ? undefined : (business?.brandColor || '#3b82f6'),
                backgroundImage: business?.coverImageUrl ? `url(${business.coverImageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!business?.coverImageUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/70">
                    <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-50" />
                    <span className="text-sm">No cover image</span>
                  </div>
                </div>
              )}
              {/* Logo overlay */}
              <div className="absolute -bottom-8 left-4">
                {business?.logoUrl ? (
                  <img
                    src={business.logoUrl}
                    alt="Logo"
                    className="w-20 h-20 rounded-xl object-cover border-4 border-background shadow-lg"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-xl border-4 border-background flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                    style={{ backgroundColor: business?.brandColor || '#3b82f6' }}
                  >
                    {business?.name?.charAt(0) || 'B'}
                  </div>
                )}
              </div>
            </div>
            <div className="pt-10 pb-4 px-4">
              <h3 className="font-semibold text-foreground text-lg">{business?.name}</h3>
              <p className="text-sm text-muted-foreground">{business?.type ? formatBusinessType(business.type) : ''}</p>
            </div>
          </div>

          {/* Branding details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Logo</span>
              <span className="text-sm text-foreground">{business?.logoUrl ? 'Uploaded' : 'Not set'}</span>
            </div>
            <Separator className="bg-border/50" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Cover Image</span>
              <span className="text-sm text-foreground">{business?.coverImageUrl ? 'Uploaded' : 'Not set'}</span>
            </div>
            <Separator className="bg-border/50" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Brand Color</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full border border-border"
                  style={{ backgroundColor: business?.brandColor || '#3b82f6' }}
                />
                <span className="text-sm text-foreground font-mono">{business?.brandColor || '#3b82f6'}</span>
              </div>
            </div>
          </div>

          <Button variant="outline" className="mt-6" onClick={() => setBrandingDialogOpen(true)}>
            <Palette className="h-4 w-4 mr-2" />
            Edit Branding
          </Button>
        </CardContent>
      </Card>

      {/* Quick Settings */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Quick Settings
          </CardTitle>
          <CardDescription>Common settings and configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickSettings.map((setting) => (
              <div
                key={setting.title}
                className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <setting.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{setting.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {setting.description}
                    </p>
                    <Button
                      variant="link"
                      className="px-0 mt-2 h-auto text-primary"
                      onClick={setting.onClick}
                    >
                      {setting.action}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-card border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <div>
              <p className="font-medium text-foreground">Delete Business Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your business and all associated data
              </p>
            </div>
            <Button
              variant="destructive"
              className="flex-shrink-0"
              onClick={() => toast.error('Account deletion is not available in demo mode')}
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialogs */}
      {business ? (
        <>
          <EditProfileDialog
            open={profileDialogOpen}
            onOpenChange={setProfileDialogOpen}
            business={business}
            onSave={handleSaveProfile}
          />
          <EditContactDialog
            open={contactDialogOpen}
            onOpenChange={setContactDialogOpen}
            business={business}
            onSave={handleSaveContact}
          />
          <EditLocationDialog
            open={locationDialogOpen}
            onOpenChange={setLocationDialogOpen}
            business={business}
            onSave={handleSaveLocation}
          />
          <EditHoursDialog
            open={hoursDialogOpen}
            onOpenChange={setHoursDialogOpen}
            hours={business.hours}
            onSave={handleSaveHours}
          />
          <EditBrandingDialog
            open={brandingDialogOpen}
            onOpenChange={setBrandingDialogOpen}
            business={business}
            onSave={handleSaveBranding}
          />
        </>
      ) : null}
    </div>
  );
}
