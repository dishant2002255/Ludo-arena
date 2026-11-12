'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success('Welcome back!');
      router.push(result.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="game-card p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white font-display">Welcome back</h1>
          <p className="text-slate-400 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            icon={<Mail size={16} />}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={16} />}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            required
          />

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" fullWidth loading={isLoading}>
            Sign In
          </Button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Don't have an account?{' '}
          <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            Create one free
          </Link>
        </p>

        {/* Demo credentials */}
        <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-500">
          <p className="font-medium text-slate-400 mb-2">Demo accounts:</p>
          <p>Admin: admin@ludoarena.com / Admin@123456</p>
          <p>User: red@demo.com / Demo@1234</p>
        </div>
      </div>
    </div>
  );
}
