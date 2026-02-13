import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChefHat, Loader2, CheckCircle2, AlertCircle, XCircle, Settings } from 'lucide-react';

type VerificationStatus = 'loading' | 'success' | 'error' | 'no-token';

export function EmailVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      const errorDescription = searchParams.get('error_description');
      const error = searchParams.get('error');

      if (error || errorDescription) {
        setStatus('error');
        setErrorMessage(errorDescription || error || 'Verification failed');
        return;
      }

      if (accessToken && refreshToken) {
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setStatus('error');
            setErrorMessage(sessionError.message);
            return;
          }

          if (type === 'signup' || type === 'email') {
            setStatus('success');
            return;
          }

          setStatus('success');
        } catch (err) {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Failed to verify email');
        }
        return;
      }

      const tokenHash = searchParams.get('token_hash');
      const tokenType = searchParams.get('type');

      if (tokenHash && tokenType) {
        try {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: tokenType as 'signup' | 'email' | 'recovery' | 'invite' | 'magiclink',
          });

          if (verifyError) {
            setStatus('error');
            setErrorMessage(verifyError.message);
            return;
          }

          setStatus('success');
        } catch (err) {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Failed to verify email');
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('success');
        return;
      }

      setStatus('no-token');
    };

    if (isSupabaseConfigured) {
      verifyEmail();
    } else {
      setStatus('error');
      setErrorMessage('Supabase is not configured');
    }
  }, [searchParams]);

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
                Supabase configuration is required
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
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
          {/* Loading State */}
          {status === 'loading' && (
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div>
                <CardTitle className="font-syne text-2xl font-bold text-foreground">Verifying Email</CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  Please wait while we verify your email address...
                </CardDescription>
              </div>
            </CardHeader>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-emerald-400/10 border border-emerald-400/20 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="font-syne text-2xl font-bold text-foreground">Email Verified</CardTitle>
                  <CardDescription className="text-muted-foreground mt-2">
                    Your email has been successfully verified. You can now register your business.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <Button
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => navigate('/business/register')}
                >
                  Continue to Business Registration
                </Button>

                <p className="text-center text-muted-foreground text-sm">
                  Already registered?{' '}
                  <Link to="/business/login" className="text-primary font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </CardContent>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <CardTitle className="font-syne text-2xl font-bold text-foreground">Verification Failed</CardTitle>
                  <CardDescription className="text-muted-foreground mt-2">
                    We could not verify your email address.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {errorMessage ? (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                ) : null}

                <p className="text-sm text-muted-foreground text-center">
                  The verification link may have expired or already been used.
                </p>

                <div className="space-y-3">
                  <Button
                    className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => navigate('/business/signup')}
                  >
                    Try Again
                  </Button>

                  <p className="text-center text-muted-foreground text-sm">
                    Already verified?{' '}
                    <Link to="/business/login" className="text-primary font-medium hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {/* No Token State */}
          {status === 'no-token' && (
            <>
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-amber-400/10 border border-amber-400/20 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-amber-400" />
                </div>
                <div>
                  <CardTitle className="font-syne text-2xl font-bold text-foreground">Invalid Link</CardTitle>
                  <CardDescription className="text-muted-foreground mt-2">
                    This verification link appears to be invalid or incomplete.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Please check your email for the correct verification link, or request a new one.
                </p>

                <div className="space-y-3">
                  <Button
                    className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => navigate('/business/signup')}
                  >
                    Sign Up Again
                  </Button>

                  <p className="text-center text-muted-foreground text-sm">
                    Already have an account?{' '}
                    <Link to="/business/login" className="text-primary font-medium hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}

export default EmailVerificationPage;
