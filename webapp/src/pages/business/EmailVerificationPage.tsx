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
      // Supabase sends tokens in different ways depending on the flow
      // Check URL hash for tokens (PKCE flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      // Also check query params for error
      const errorDescription = searchParams.get('error_description');
      const error = searchParams.get('error');

      if (error || errorDescription) {
        setStatus('error');
        setErrorMessage(errorDescription || error || 'Verification failed');
        return;
      }

      // If we have tokens in the hash, let Supabase handle them
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

          // Check if this was a signup verification
          if (type === 'signup' || type === 'email') {
            setStatus('success');
            return;
          }

          // For other types, still mark as success
          setStatus('success');
        } catch (err) {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Failed to verify email');
        }
        return;
      }

      // Check for token_hash and type in query params (magic link / email confirmation)
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

      // No token found - check if user is already authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // User is already logged in, redirect to register
        setStatus('success');
        return;
      }

      // No token and not authenticated
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-200 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Settings className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">Setup Required</CardTitle>
              <CardDescription className="text-slate-600 mt-2">
                Supabase configuration is required
              </CardDescription>
            </div>
          </CardHeader>
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
          {/* Loading State */}
          {status === 'loading' && (
            <>
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-slate-900 animate-spin" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900">Verifying Email</CardTitle>
                  <CardDescription className="text-slate-600 mt-2">
                    Please wait while we verify your email address...
                  </CardDescription>
                </div>
              </CardHeader>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900">Email Verified</CardTitle>
                  <CardDescription className="text-slate-600 mt-2">
                    Your email has been successfully verified. You can now register your business.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <Button
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white"
                  onClick={() => navigate('/business/register')}
                >
                  Continue to Business Registration
                </Button>

                <p className="text-center text-slate-500 text-sm">
                  Already registered?{' '}
                  <Link to="/business/login" className="text-slate-900 font-medium hover:underline">
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
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900">Verification Failed</CardTitle>
                  <CardDescription className="text-slate-600 mt-2">
                    We could not verify your email address.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {errorMessage ? (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
                  </Alert>
                ) : null}

                <p className="text-sm text-slate-600 text-center">
                  The verification link may have expired or already been used.
                </p>

                <div className="space-y-3">
                  <Button
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white"
                    onClick={() => navigate('/business/signup')}
                  >
                    Try Again
                  </Button>

                  <p className="text-center text-slate-500 text-sm">
                    Already verified?{' '}
                    <Link to="/business/login" className="text-slate-900 font-medium hover:underline">
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
                <div className="mx-auto w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900">Invalid Link</CardTitle>
                  <CardDescription className="text-slate-600 mt-2">
                    This verification link appears to be invalid or incomplete.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 text-center">
                  Please check your email for the correct verification link, or request a new one.
                </p>

                <div className="space-y-3">
                  <Button
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white"
                    onClick={() => navigate('/business/signup')}
                  >
                    Sign Up Again
                  </Button>

                  <p className="text-center text-slate-500 text-sm">
                    Already have an account?{' '}
                    <Link to="/business/login" className="text-slate-900 font-medium hover:underline">
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
