import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChefHat, Loader2, AlertCircle, ShieldX, Settings } from 'lucide-react';

export function LoginPage() {
  const { signIn, signOut, isAdmin, isLoading, user, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showResetButton, setShowResetButton] = useState(false);
  const [showForceReset, setShowForceReset] = useState(false);

  // Show reset button if loading takes more than 5 seconds
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowResetButton(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowResetButton(false);
    }
  }, [isLoading]);

  // Show force reset if signing out takes more than 3 seconds
  useEffect(() => {
    if (isSigningOut) {
      const timer = setTimeout(() => {
        setShowForceReset(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowForceReset(false);
    }
  }, [isSigningOut]);

  const handleReset = () => {
    // Clear all auth-related localStorage
    localStorage.removeItem('adminCache');
    // Clear all localStorage keys that start with 'sb-'
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
    }
    });
    // Force reload
    window.location.reload();
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {showResetButton && (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Taking too long?</p>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset & Try Again
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Supabase not configured - show setup instructions
  if (!isConfigured) {
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
                Add the following environment variables in the ENV tab:
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 bg-secondary/30 rounded-lg font-mono text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Supabase URL</p>
                <code className="text-primary">VITE_SUPABASE_URL</code>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Supabase Anon Key</p>
                <code className="text-primary">VITE_SUPABASE_ANON_KEY</code>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              After adding the variables, refresh the page to continue.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is logged in but not an admin
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/50 bg-card">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-foreground">Access Denied</CardTitle>
            <CardDescription className="text-muted-foreground">
              You don't have admin privileges to access this console.
              Please contact a superadmin if you believe this is an error.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                'Sign Out'
              )}
            </Button>
            {showForceReset && (
              <Button
                onClick={handleReset}
                variant="destructive"
                className="w-full"
              >
                Force Reset
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

      <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">KitchenSync Admin</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Sign in to access the admin console
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
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@kitchensync.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-secondary/50 border-border"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
