import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Save,
  ExternalLink,
} from 'lucide-react';

export function SettingsPage() {
  const { business } = useBusiness();

  const settingsSections = [
    {
      title: 'Business Profile',
      description: 'Basic information about your business',
      icon: Building2,
      items: [
        { label: 'Business Name', value: business?.name || 'The Golden Fork' },
        { label: 'Business Type', value: business?.type || 'Restaurant' },
        { label: 'Description', value: business?.description || 'A cozy farm-to-table restaurant' },
      ],
    },
    {
      title: 'Contact Information',
      description: 'How customers can reach you',
      icon: Phone,
      items: [
        { label: 'Phone', value: business?.phone || '(415) 555-0123', icon: Phone },
        { label: 'Email', value: business?.email || 'hello@goldenfork.com', icon: Mail },
        { label: 'Website', value: business?.website || 'https://goldenfork.com', icon: Globe },
      ],
    },
    {
      title: 'Location',
      description: 'Your business address',
      icon: MapPin,
      items: [
        { label: 'Address', value: business?.address || '123 Main Street' },
        { label: 'City', value: business?.city || 'San Francisco' },
        { label: 'State', value: business?.state || 'CA' },
        { label: 'ZIP', value: business?.zip || '94102' },
      ],
    },
  ];

  const quickSettings = [
    {
      title: 'Operating Hours',
      description: 'Set your business hours and availability',
      icon: Clock,
      action: 'Configure',
    },
    {
      title: 'Payment Methods',
      description: 'Manage accepted payment options',
      icon: CreditCard,
      action: 'Manage',
    },
    {
      title: 'Notifications',
      description: 'Configure alerts and reminders',
      icon: Bell,
      action: 'Configure',
    },
    {
      title: 'Security',
      description: 'Password and access settings',
      icon: Shield,
      action: 'Manage',
    },
    {
      title: 'Branding',
      description: 'Logo, colors, and appearance',
      icon: Palette,
      action: 'Customize',
    },
    {
      title: 'Integrations',
      description: 'Connect third-party services',
      icon: ExternalLink,
      action: 'Browse',
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
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
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
                  Your business has been verified on KitchenSync
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Verified
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
                        <span className="text-foreground">{item.value}</span>
                      </div>
                    </div>
                    {index < section.items.length - 1 ? (
                      <Separator className="mt-4 bg-border/50" />
                    ) : null}
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-6">
                Edit {section.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

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
                    <Button variant="link" className="px-0 mt-2 h-auto text-primary">
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
            <Button variant="destructive" className="flex-shrink-0">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
