import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChefHat, Loader2, AlertCircle, Settings, Building2 } from 'lucide-react';

export function BusinessLoginPage() {
  const navigate = useNavigate();
  const { signIn, isLoading, user, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
    } else {
      // Navigate to business dashboard after successful login
      navigate('/business');
    }
  };

  // Already logged in, redirect to business dashboard
  if (user && !isLoading) {
    navigate('/business');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      </div>
    );
  }

  // Supabase not configured - show setup instructions
  if (!isConfigured) {
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
              <Building2 className="h-8 w-8 text-slate-900" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">Business Login</CardTitle>
              <CardDescription className="text-slate-600 mt-2">
                Sign in to manage your business
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-slate-500 text-sm">
                Don't have an account?{' '}
                <Link to="/business/signup" className="text-slate-900 font-medium hover:underline">
                  Create account
                </Link>
              </p>
              <p className="text-slate-500 text-sm">
                Already have an account but need to register a business?{' '}
                <Link to="/business/register" className="text-slate-900 font-medium hover:underline">
                  Register your business
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default BusinessLoginPage;
