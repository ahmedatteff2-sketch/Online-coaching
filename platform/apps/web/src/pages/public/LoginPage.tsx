import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { ErrorMessage } from '@/components/ErrorMessage';
import { Logo } from '@/components/Logo';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import { getApiErrorMessage } from '@/lib/apiError';
import { useLanding } from '@/api/landing';

const schema = z.object({
  phone: z.string().min(6, 'Phone is required').max(32),
  password: z.string().min(6, 'Password is required').max(128),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setSession } = useAuthStore();
  const { data: landing } = useLanding();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // If already logged in, redirect to the right dashboard
  useEffect(() => {
    if (user) {
      const dest = user.role === 'ADMIN' ? '/admin/dashboard' : '/member/dashboard';
      navigate(dest, { replace: true });
    }
  }, [user, navigate]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const r = await authApi.login(values);
      setSession({ user: r.user, accessToken: r.accessToken });
      toast.success(`Welcome, ${r.user.fullName.split(' ')[0]}`);
      const intended = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
      const fallback = r.user.role === 'ADMIN' ? '/admin/dashboard' : '/member/dashboard';
      navigate(intended ?? fallback, { replace: true });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form */}
      <div className="flex flex-col px-6 py-10 sm:px-10">
        <Link to="/" className="inline-flex">
          <Logo brand={landing?.settings.brandName ?? 'Coach Pro'} />
        </Link>
        <div className="mx-auto w-full max-w-md flex-1 self-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <h1 className="display text-4xl">Welcome back</h1>
            <p className="mt-1 text-ink-200">Login with your phone and password to continue.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-4">
              <ErrorMessage message={submitError} />

              <Field label="Phone number" htmlFor="phone" error={errors.phone?.message}>
                <Input
                  id="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01025754947"
                  {...register('phone')}
                />
              </Field>

              <Field label="Password" htmlFor="password" error={errors.password?.message}>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                />
              </Field>

              <Button size="lg" type="submit" loading={isSubmitting} fullWidth>
                <LogIn className="h-4 w-4" />
                Login
              </Button>

              <p className="text-center text-xs text-ink-300">
                No public registration. Your coach creates your account.
              </p>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Side art */}
      <div className="relative hidden bg-ink-900 lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-ink-950 via-ink-950/60 to-transparent" />
        <div className="relative flex h-full flex-col justify-end p-10">
          <p className="display text-5xl leading-tight">
            Train smarter.<br />
            <span className="gradient-text">Transform faster.</span>
          </p>
          <p className="mt-3 max-w-md text-ink-200">
            Custom plans, weekly check-ins and full progress tracking — all in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
