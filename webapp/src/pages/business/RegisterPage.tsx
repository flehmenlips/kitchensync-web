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
  LogIn,
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
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-400'
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
                index <= currentStep ? 'text-slate-900' : 'text-slate-400'
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-8 sm:w-16 md:w-24 h-0.5 mx-2 sm:mx-4 transition-colors duration-300',
                index < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
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
        'relative cursor-pointer transition-all duration-300 hover:border-slate-400',
        selected
          ? 'border-2 border-slate-900 shadow-lg'
          : 'border border-slate-200',
        plan.recommended && 'md:-mt-4 md:mb-4'
      )}
      onClick={onSelect}
    >
      {plan.recommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-slate-900 text-white px-3 py-1">Recommended</Badge>
        </div>
      )}
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{plan.price}</span>
          <span className="text-slate-500">{plan.period}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          className={cn(
            'w-full',
            selected
              ? 'bg-slate-900 hover:bg-slate-800'
              : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">KitchenSync</h1>
            <p className="text-xs text-slate-500">Business Console</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center p-4 min-h-[calc(100vh-73px)]">
        <Card className="w-full max-w-md border-slate-200 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
              <LogIn className="h-8 w-8 text-slate-900" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">Sign In Required</CardTitle>
              <CardDescription className="text-slate-600 mt-2">
                You need to sign in before registering a business
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 text-center">
              Create an account or sign in to continue with your business registration.
            </p>

            <div className="space-y-3">
              <Button asChild className="w-full h-12 bg-slate-900 hover:bg-slate-800">
                <Link to="/business/login">Sign In</Link>
              </Button>
              <p className="text-center text-slate-500 text-sm">
                Don't have an account? You can create one on the sign in page.
              </p>
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

  // Current step (0-3)
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

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill owner info from Supabase user
  useEffect(() => {
    if (user) {
      // Use the user's email for owner email if not already set
      if (!ownerEmail && user.email) {
        setOwnerEmail(user.email);
      }
      // Try to get the name from user metadata
      const metadata = user.user_metadata;
      if (!ownerName && metadata?.full_name) {
        setOwnerName(metadata.full_name);
      } else if (!ownerName && metadata?.name) {
        setOwnerName(metadata.name);
      }
    }
  }, [user, ownerEmail, ownerName]);

  // Registration mutation
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

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      </div>
    );
  }

  // If user is not logged in, show login required message
  if (!user) {
    return <LoginRequired />;
  }

  // Validation functions
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

  // Navigation handlers
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

  // Submit handler
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

  // Get business type label
  const getBusinessTypeLabel = (type: string) => {
    return BUSINESS_TYPES.find((t) => t.value === type)?.label || type;
  };

  // Get selected plan details
  const getSelectedPlan = () => {
    return PLANS.find((p) => p.id === selectedPlan);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">KitchenSync</h1>
            <p className="text-xs text-slate-500">Business Console</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            Register Your Business
          </h2>
          <p className="text-slate-600">
            Join thousands of food businesses using KitchenSync to manage their operations
          </p>
        </div>

        {/* Progress Indicator */}
        <StepIndicator currentStep={step} />

        {/* Form Card */}
        <Card className="border-0 shadow-xl bg-white">
          <CardContent className="p-6 md:p-8">
            {/* Step 1: Business Information */}
            {step === 0 && (
              <div className="space-y-6 animate-in fade-in-0 duration-300">
                <div className="space-y-2">
                  <CardTitle className="text-slate-900">Business Information</CardTitle>
                  <CardDescription className="text-slate-600">
                    Tell us about your food business
                  </CardDescription>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-slate-700">
                      Business Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="businessName"
                      placeholder="Enter your business name"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className={cn('h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400', errors.businessName && 'border-red-500')}
                    />
                    {errors.businessName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.businessName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType" className="text-slate-700">
                      Business Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={businessType} onValueChange={(val) => setBusinessType(val as BusinessType)}>
                      <SelectTrigger className={cn('h-12 bg-white border-slate-300 text-slate-900', errors.businessType && 'border-red-500')}>
                        <SelectValue placeholder="Select your business type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-slate-900">
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.businessType && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.businessType}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-slate-700">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Tell customers about your business..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="resize-none bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700">
                        Business Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@yourbusiness.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={cn('h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400', errors.email && 'border-red-500')}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-700">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white"
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
                  <CardTitle className="text-slate-900">Owner Information</CardTitle>
                  <CardDescription className="text-slate-600">
                    This account will be the primary administrator
                  </CardDescription>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName" className="text-slate-700">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="ownerName"
                      placeholder="Enter your full name"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className={cn('h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400', errors.ownerName && 'border-red-500')}
                    />
                    {errors.ownerName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.ownerName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail" className="text-slate-700">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      placeholder="you@email.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className={cn('h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400', errors.ownerEmail && 'border-red-500')}
                    />
                    {errors.ownerEmail && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.ownerEmail}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      This is linked to your signed-in account
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    className="h-12 px-6 border-slate-300 text-slate-700 hover:bg-slate-100"
                    onClick={handleBack}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white"
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
                  <CardTitle className="text-slate-900">Choose Your Plan</CardTitle>
                  <CardDescription className="text-slate-600">
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
                    className="h-12 px-6 border-slate-300 text-slate-700 hover:bg-slate-100"
                    onClick={handleBack}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white"
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
                  <CardTitle className="text-slate-900">Review and Confirm</CardTitle>
                  <CardDescription className="text-slate-600">
                    Please review your information before creating your account
                  </CardDescription>
                </div>

                <div className="space-y-4">
                  {/* Business Information Summary */}
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Business Information
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Business Name</span>
                        <p className="font-medium text-slate-900">{businessName}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Business Type</span>
                        <p className="font-medium text-slate-900">
                          {getBusinessTypeLabel(businessType)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Email</span>
                        <p className="font-medium text-slate-900">{email}</p>
                      </div>
                      {phone && (
                        <div>
                          <span className="text-slate-500">Phone</span>
                          <p className="font-medium text-slate-900">{phone}</p>
                        </div>
                      )}
                      {description && (
                        <div className="sm:col-span-2">
                          <span className="text-slate-500">Description</span>
                          <p className="font-medium text-slate-900">{description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Owner Information Summary */}
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Owner Information
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Name</span>
                        <p className="font-medium text-slate-900">{ownerName}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Email</span>
                        <p className="font-medium text-slate-900">{ownerEmail}</p>
                      </div>
                    </div>
                  </div>

                  {/* Plan Summary */}
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Selected Plan
                    </h4>
                    {getSelectedPlan() && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {getSelectedPlan()!.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {getSelectedPlan()!.price} {getSelectedPlan()!.period}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                          onClick={() => setStep(2)}
                        >
                          Change
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {registerMutation.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Registration failed</p>
                      <p className="text-sm text-red-600">
                        {registerMutation.error instanceof Error
                          ? registerMutation.error.message
                          : 'Please try again or contact support.'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    className="h-12 px-6 border-slate-300 text-slate-700 hover:bg-slate-100"
                    onClick={handleBack}
                    disabled={registerMutation.isPending}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white"
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
        <p className="text-center text-slate-500 text-sm mt-8">
          Already have a business account?{' '}
          <Link to="/business/login" className="text-slate-900 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}

export default RegisterPage;
