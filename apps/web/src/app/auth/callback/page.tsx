'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { getGitHubLoginUrl } from '../../../lib/api';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuth() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDesc = searchParams.get('error_description');

      if (error) {
        setStatus('error');
        setErrorMessage(errorDesc || error || 'Access was denied during GitHub sign-in.');
        return;
      }

      if (!code || !state) {
        // Direct navigation with no params
        router.replace('/dashboard');
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/auth/github/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          let errorText = `Authentication failed (${res.status})`;
          try {
            const json = await res.json();
            if (json?.error?.message) errorText = json.error.message;
          } catch {
            // Ignore non-json
          }
          throw new Error(errorText);
        }

        const data = await res.json();
        const returnTo = data?.data?.return_to || '/dashboard';

        setStatus('success');
        setTimeout(() => {
          window.location.href = returnTo;
        }, 800);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message || 'Failed to complete authentication.');
      }
    }

    handleAuth();
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      {status === 'loading' && (
        <div className="space-y-4">
          <Loader2 className="w-10 h-10 text-teal-400 animate-spin mx-auto" />
          <h2 className="text-xl font-semibold text-white">Completing Sign-In...</h2>
          <p className="text-sm text-gray-400">Verifying security tokens with GitHub and initializing session.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
          <h2 className="text-xl font-semibold text-white">Welcome back!</h2>
          <p className="text-sm text-gray-400">Sign-in successful. Redirecting to your destination...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="max-w-md p-6 rounded-2xl bg-gray-900 border border-red-500/30 space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-xl font-semibold text-white">Authentication Failed</h2>
          <p className="text-sm text-gray-400">{errorMessage}</p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href={getGitHubLoginUrl('/dashboard')}
              className="flex-1 py-2.5 px-4 bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold text-sm rounded-lg transition"
            >
              Try Signing In Again
            </a>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Return Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
          <Loader2 className="w-10 h-10 text-teal-400 animate-spin mx-auto" />
          <p className="text-sm text-gray-400 mt-4">Loading authorization...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
