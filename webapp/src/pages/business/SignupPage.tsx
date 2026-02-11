import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChefHat, Loader2, AlertCircle, Settings, UserPlus, Mail, CheckCircle2 } from 'lucide-react';

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

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
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

      // Success - show confirmation message
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
      setIsSubmitting(false);
    }
  };

  // Supabase not configured - show setup instructions
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-200 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Settings className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">Setup Required</CardTitle>
              <CardDescription className="text-slate-600 mt-2">
                Connect your Supabase project to get started
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert className="bg-slate-50 border-slate-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Add the following environment variables in the ENV tab:
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 bg-slate-100 rounded-lg font-mono text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-1">Supabase URL</p>
                <code className="text-slate-900">VITE_SUPABASE_URL</code>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Supabase Anon Key</p>
                <code className="text-slate-900">VITE_SUPABASE_ANON_KEY</code>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              After adding the variables, refresh the page to continue.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - email sent
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
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
          <Card className="w-full max-w-md border-slate-200 shadow-xl bg-white">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <Mail className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">Check Your Email</CardTitle>
                <CardDescription className="text-slate-600 mt-2">
                  We sent a verification link to <span className="font-medium text-slate-900">{email}</span>
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Click the verification link</p>
                    <p className="text-xs text-slate-500">Check your inbox and spam folder</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-slate-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Complete business registration</p>
                    <p className="text-xs text-slate-400">After verifying your email</p>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm text-slate-500">
                  Did not receive the email?{' '}
                  <button
                    type="button"
                    className="text-slate-900 font-medium hover:underline"
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
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                ) : null}

                <p className="text-sm text-slate-500">
                  Already verified?{' '}
                  <Link to="/business/login" className="text-slate-900 font-medium hover:underline">
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
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
        <Card className="w-full max-w-md border-slate-200 shadow-xl bg-white">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
              <UserPlus className="h-8 w-8 text-slate-900" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">Create Account</CardTitle>
              <CardDescription className="text-slate-600 mt-2">
                Sign up to register your business on KitchenSync
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-700">Full Name (optional)</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-500">Must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white"
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
              <p className="text-slate-500 text-sm">
                Already have an account?{' '}
                <Link to="/business/login" className="text-slate-900 font-medium hover:underline">
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
