import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChefHat, Loader2, AlertCircle, Mail } from 'lucide-react';

export function CustomerSignupPage() {
  const navigate = useNavigate();
  const { signUp, isLoading, user } = useCustomerAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsSubmitting(false);
      return;
    }

    const { error: signUpError } = await signUp(email, password, displayName);

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
    } else {
      setShowVerification(true);
      setIsSubmitting(false);
    }
  };

  if (user && !isLoading) {
    navigate('/app');
    return null;
  }

  if (showVerification) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/40 bg-card/50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <ChefHat className="h-4 w-4 text-primary" />
              </div>
              <span className="font-syne text-base font-bold text-foreground">KitchenSync</span>
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50 text-center">
            <CardHeader className="space-y-2">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-foreground">Check your email</CardTitle>
              <CardDescription className="text-muted-foreground">
                We sent a verification link to <span className="text-foreground font-medium">{email}</span>.
                Click the link to activate your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full mt-2" onClick={() => navigate('/app/login')}>
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ChefHat className="h-4 w-4 text-primary" />
            </div>
            <span className="font-syne text-base font-bold text-foreground">KitchenSync</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">Create your account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Join KitchenSync to discover recipes, connect with foodies, and more
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Display Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="bg-secondary/30 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-secondary/30 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-secondary/30 border-border/50"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/app/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
