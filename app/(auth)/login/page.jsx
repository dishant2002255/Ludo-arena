'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import Input from '@/components/ui/Input';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success('Welcome back!');
      const role = result.user?.role;
      if (role === 'admin' || role === 'main_admin') router.push('/admin/dashboard');
      else if (role === 'sub_admin') router.push('/subadmin');
      else router.push('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-3xl p-7" style={{ background: '#fffdf5', border: '1.5px solid #e8d49a', boxShadow: '0 4px 24px rgba(180,140,0,0.1)' }}>
        <div className="text-center mb-6">
          <h1 className="font-black text-2xl" style={{ color: '#3b2800' }}>Login</h1>
          <p className="text-sm mt-1" style={{ color: '#a09070' }}>Apne account mein login karein</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" placeholder="you@example.com"
            icon={<Mail size={16} />}
            value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />

          <Input label="Password" type="password" placeholder="••••••••"
            icon={<Lock size={16} />}
            value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs font-semibold" style={{ color: '#c9960a' }}>
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full py-3.5 rounded-full font-black text-sm active:scale-95 transition-transform disabled:opacity-50"
            style={{ background: 'linear-gradient(to bottom,#f5c842,#c9960a)', color: '#3b2800', boxShadow: '0 3px 10px rgba(201,150,10,0.3)' }}>
            {isLoading ? 'Logging in…' : 'Login →'}
          </button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: '#a09070' }}>
          Account nahi hai?{' '}
          <Link href="/register" className="font-black" style={{ color: '#c9960a' }}>Register karein</Link>
        </p>

        <div className="mt-5 p-3 rounded-xl text-xs" style={{ background: '#f5e9c8', color: '#7a5a00' }}>
          <p className="font-bold mb-1">Demo accounts:</p>
          <p>Admin: admin@ludoarena.com / Admin@123456</p>
          <p>User: red@demo.com / Demo@1234</p>
        </div>
      </div>
    </div>
  );
}
