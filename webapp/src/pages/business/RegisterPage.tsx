import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Building2,
  User,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Check,
  Store,
  Coffee,
  Tractor,
  Truck,
  ShoppingBag,
  ChefHat,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RegisterBusinessRequest, RegisterBusinessResponse } from '../../../../backend/src/types';

// Business types with labels and icons
const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant', icon: ChefHat },
  { value: 'cafe', label: 'Cafe', icon: Coffee },
  { value: 'farm', label: 'Farm', icon: Tractor },
  { value: 'farmstand', label: 'Farm Stand', icon: Store },
  { value: 'farmers_market', label: 'Farmers Market', icon: ShoppingBag },
  { value: 'food_producer', label: 'Food Producer', icon: Building2 },
  { value: 'food_store', label: 'Food Store', icon: Store },
  { value: 'catering', label: 'Catering', icon: ChefHat },
  { value: 'food_truck', label: 'Food Truck', icon: Truck },
] as const;

type BusinessType = typeof BUSINESS_TYPES[number]['value'];

// Plan types
interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
  buttonText: string;
}

const PLANS: Plan[] = [
  {
    id: 'trial',
    name: 'Trial',
    price: 'Free',
    period: 'for 14 days',
    features: [
      'Basic menu management',
      'Reservation system',
      '1 team member',
      'Email support',
    ],
    buttonText: 'Start Free Trial',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    period: '/month',
    features: [
      'Full menu management',
      'Unlimited reservations',
      '3 team members',
      'Basic analytics',
      'Priority support',
    ],
    buttonText: 'Select Plan',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$79',
    period: '/month',
    features: [
      'Everything in Starter',
      'Order management',
      'Customer CRM',
      'Loyalty program',
      '10 team members',
      'Advanced analytics',
      'API access',
    ],
    recommended: true,
    buttonText: 'Select Plan',
  },
];

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: 'Business Info', icon: Building2 },
    { label: 'Owner Info', icon: User },
    { label: 'Select Plan', icon: CreditCard },
    { label: 'Confirm', icon: CheckCircle2 },
  ];

  return (
    <div className="flex items-center justify-between mb-8 px-2">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                index < currentStep
                  ? 'bg-emerald-500 text-white'
                  : index === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              {index < currentStep ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>
            <span
              className={cn(
                'text-xs mt-2 font-medium hidden sm:block transition-colors duration-300',
                index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-8 sm:w-16 md:w-24 h-0.5 mx-2 sm:mx-4 transition-colors duration-300',
                index < currentStep ? 'bg-emerald-500' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Plan card component
function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all duration-300',
        selected
          ? 'border-2 border-primary shadow-lg shadow-primary/10'
          : 'border border-border/50 hover:border-border',
        plan.recommended && 'md:-mt-4 md:mb-4'
      )}
      onClick={onSelect}
    >
      {plan.recommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-3 py-1">Recommended</Badge>
        </div>
      )}
      <CardHeader className="pb-4">
        <CardTitle className="text-lg text-foreground">{plan.name}</CardTitle>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-foreground">{plan.price}</span>
          <span className="text-muted-foreground">{plan.period}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          className={cn(
            'w-full',
            selected
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-secondary text-foreground hover:bg-secondary/80'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {selected ? 'Selected' : plan.buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}

// Login required component
function LoginRequired() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-syne text-lg font-bold text-foreground">KitchenSync</h1>
              <p className="text-xs text-muted-foreground">Business Console</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center p-4 min-h-[calc(100vh-65px)]">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center">
              <ChefHat className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="font-syne text-2xl font-bold text-foreground">Sign In Required</CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                You need to sign in before registering a business
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Create an account or sign in to continue with your business registration.
            </p>

            <div className="space-y-3">
              <Button asChild className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/business/login">Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="w-full h-12 border-border text-foreground hover:bg-secondary">
                <Link to="/business/signup">Create Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState(0);

  // Step 1: Business Information
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType | ''>('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 2: Owner Information
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  // Step 3: Plan Selection
  const [selectedPlan, setSelectedPlan] = useState<string>('trial');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      if (!ownerEmail && user.email) {
        setOwnerEmail(user.email);
      }
      const metadata = user.user_metadata;
      if (!ownerName && metadata?.full_name) {
        setOwnerName(metadata.full_name);
      } else if (!ownerName && metadata?.name) {
        setOwnerName(metadata.name);
      }
    }
  }, [user, ownerEmail, ownerName]);

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterBusinessRequest) => {
      return api.post<RegisterBusinessResponse>('/api/business/register', data);
    },
    onSuccess: (data) => {
      toast.success('Welcome to KitchenSync!', {
        description: `Your business "${data.business.businessName}" has been registered successfully.`,
      });
      navigate(`/business?businessId=${data.business.id}`);
    },
    onError: (error) => {
      toast.error('Registration failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginRequired />;
  }

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!businessType) newErrors.businessType = 'Please select a business type';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!ownerName.trim()) newErrors.ownerName = 'Owner name is required';
    if (!ownerEmail.trim()) newErrors.ownerEmail = 'Owner email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) newErrors.ownerEmail = 'Please enter a valid email';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !validateStep2()) return;
    setErrors({});
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    if (!businessType || !user) return;

    registerMutation.mutate({
      businessName: businessName.trim(),
      businessType: businessType,
      email: email.trim(),
      phone: phone.trim() || undefined,
      description: description.trim() || undefined,
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim(),
      supabaseUserId: user.id,
    });
  };

  const getBusinessTypeLabel = (type: string) => {
    return BUSINESS_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getSelectedPlan = () => {
    return PLANS.find((p) => p.id === selectedPlan);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-accent/4 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-syne text-lg font-bold text-foreground">KitchenSync</h1>
              <p className="text-xs text-muted-foreground">Business Console</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8">
          <h2 className="font-syne text-2xl md:text-3xl font-bold text-foreground mb-2">
            Register Your Business
          </h2>
          <p className="text-muted-foreground">
            Join thousands of food businesses using KitchenSync to manage their operations
          </p>
        </div>

        {/* Progress Indicator */}
        <StepIndicator currentStep={step} />

        {/* Form Card */}
        <Card className="border-border/50 shadow-xl bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6 md:p-8">
            {/* Step 1: Business Information */}
            {step === 0 && (
              <div className="space-y-6 animate-in fade-in-0 duration-300">
                <div className="space-y-2">
                  <CardTitle className="text-foreground">Business Information</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Tell us about your food business
                  </CardDescription>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-foreground">
                      Business Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="businessName"
                      placeholder="Enter your business name"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className={cn('h-12 bg-secondary/50 border-border', errors.businessName && 'border-destructive')}
                    />
                    {errors.businessName && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.businessName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType" className="text-foreground">
                      Business Type <span className="text-destructive">*</span>
                    </Label>
                    <Select value={businessType} onValueChange={(val) => setBusinessType(val as BusinessType)}>
                      <SelectTrigger className={cn('h-12 bg-secondary/50 border-border', errors.businessType && 'border-destructive')}>
                        <SelectValue placeholder="Select your business type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.businessType && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.businessType}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-foreground">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Tell customers about your business..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="resize-none bg-secondary/50 border-border"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground">
                        Business Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@yourbusiness.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={cn('h-12 bg-secondary/50 border-border', errors.email && 'border-destructive')}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-foreground">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-12 bg-secondary/50 border-border"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleNext}
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Owner Information */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in-0 duration-300">
                <div className="space-y-2">
                  <CardTitle className="text-foreground">Owner Information</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    This account will be the primary administrator
                  </CardDescription>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName" className="text-foreground">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ownerName"
                      placeholder="Enter your full name"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className={cn('h-12 bg-secondary/50 border-border', errors.ownerName && 'border-destructive')}
                    />
                    {errors.ownerName && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.ownerName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail" className="text-foreground">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      placeholder="you@email.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className={cn('h-12 bg-secondary/50 border-border', errors.ownerEmail && 'border-destructive')}
                    />
                    {errors.ownerEmail && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.ownerEmail}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This is linked to your signed-in account
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    className="h-12 px-6 border-border text-foreground hover:bg-secondary"
                    onClick={handleBack}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleNext}
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Plan Selection */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in-0 duration-300">
                <div className="space-y-2 text-center">
                  <CardTitle className="text-foreground">Choose Your Plan</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Start with a free trial and upgrade anytime
                  </CardDescription>
                </div>

                <div className="grid md:grid-cols-3 gap-4 md:gap-6 pt-4">
                  {PLANS.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      selected={selectedPlan === plan.id}
                      onSelect={() => setSelectedPlan(plan.id)}
                    />
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    className="h-12 px-6 border-border text-foreground hover:bg-secondary"
                    onClick={handleBack}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleNext}
                  >
                    Review
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in-0 duration-300">
                <div className="space-y-2">
                  <CardTitle className="text-foreground">Review and Confirm</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Please review your information before creating your account
                  </CardDescription>
                </div>

                <div className="space-y-4">
                  {/* Business Information Summary */}
                  <div className="bg-secondary/30 border border-border/30 rounded-xl p-6">
                    <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Business Information
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Business Name</span>
                        <p className="font-medium text-foreground">{businessName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Business Type</span>
                        <p className="font-medium text-foreground">
                          {getBusinessTypeLabel(businessType)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email</span>
                        <p className="font-medium text-foreground">{email}</p>
                      </div>
                      {phone ? (
                        <div>
                          <span className="text-muted-foreground">Phone</span>
                          <p className="font-medium text-foreground">{phone}</p>
                        </div>
                      ) : null}
                      {description ? (
                        <div className="sm:col-span-2">
                          <span className="text-muted-foreground">Description</span>
                          <p className="font-medium text-foreground">{description}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Owner Information Summary */}
                  <div className="bg-secondary/30 border border-border/30 rounded-xl p-6">
                    <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Owner Information
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name</span>
                        <p className="font-medium text-foreground">{ownerName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email</span>
                        <p className="font-medium text-foreground">{ownerEmail}</p>
                      </div>
                    </div>
                  </div>

                  {/* Plan Summary */}
                  <div className="bg-secondary/30 border border-border/30 rounded-xl p-6">
                    <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Selected Plan
                    </h4>
                    {getSelectedPlan() && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {getSelectedPlan()!.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getSelectedPlan()!.price} {getSelectedPlan()!.period}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary/80 hover:bg-primary/10"
                          onClick={() => setStep(2)}
                        >
                          Change
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {registerMutation.error ? (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Registration failed</p>
                      <p className="text-sm text-muted-foreground">
                        {registerMutation.error instanceof Error
                          ? registerMutation.error.message
                          : 'Please try again or contact support.'}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    className="h-12 px-6 border-border text-foreground hover:bg-secondary"
                    onClick={handleBack}
                    disabled={registerMutation.isPending}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleSubmit}
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <CheckCircle2 className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-8">
          Already have a business account?{' '}
          <Link to="/business/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}

export default RegisterPage;
