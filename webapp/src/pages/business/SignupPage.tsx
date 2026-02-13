import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChefHat, Loader2, AlertCircle, Settings, Mail, CheckCircle2 } from 'lucide-react';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/business/verify-email`,
          data: {
            full_name: fullName || undefined,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
      setIsSubmitting(false);
    }
  };

  // Supabase not configured
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-amber-400/10 rounded-2xl flex items-center justify-center">
              <Settings className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Setup Required</CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Connect your Supabase project to get started
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-secondary/50 border-border">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Add environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - email sent
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-primary/6 blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-accent/5 blur-[120px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 border-b border-border/40 bg-background/80 backdrop-blur-xl">
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
              <div className="mx-auto w-16 h-16 bg-emerald-400/10 border border-emerald-400/20 rounded-2xl flex items-center justify-center">
                <Mail className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="font-syne text-2xl font-bold text-foreground">Check Your Email</CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  We sent a verification link to <span className="font-medium text-foreground">{email}</span>
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="bg-secondary/30 rounded-lg p-4 space-y-3 border border-border/30">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Click the verification link</p>
                    <p className="text-xs text-muted-foreground">Check your inbox and spam folder</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground/30 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Complete business registration</p>
                    <p className="text-xs text-muted-foreground/70">After verifying your email</p>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Did not receive the email?{' '}
                  <button
                    type="button"
                    className="text-primary font-medium hover:underline"
                    onClick={async () => {
                      setError(null);
                      const { error } = await supabase.auth.resend({
                        type: 'signup',
                        email,
                        options: {
                          emailRedirectTo: `${window.location.origin}/business/verify-email`,
                        },
                      });
                      if (error) {
                        setError(error.message);
                      }
                    }}
                  >
                    Resend
                  </button>
                </p>

                {error ? (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <p className="text-sm text-muted-foreground">
                  Already verified?{' '}
                  <Link to="/business/login" className="text-primary font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-border/40 bg-background/80 backdrop-blur-xl">
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
              <CardTitle className="font-syne text-2xl font-bold text-foreground">Join KitchenSync</CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Create an account to register your business
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">Full Name (optional)</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 bg-secondary/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-secondary/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-secondary/50 border-border"
                />
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 bg-secondary/50 border-border"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                Already have an account?{' '}
                <Link to="/business/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default SignupPage;
