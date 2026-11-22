'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User } from 'lucide-react';
import Input from '@/components/ui/Input';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.username || form.username.length < 3) errs.username = 'Min 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Only letters, numbers, underscores';
    if (!form.email.includes('@')) errs.email = 'Valid email required';
    if (form.password.length < 6) errs.password = 'Min 6 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    const result = await register(form.username, form.email, form.password);
    if (result.success) {
      toast.success('Account created! Welcome to Ludo Arena.');
      router.push('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-3xl p-7" style={{ background: '#fffdf5', border: '1.5px solid #e8d49a', boxShadow: '0 4px 24px rgba(180,140,0,0.1)' }}>
        <div className="text-center mb-6">
          <h1 className="font-black text-2xl" style={{ color: '#3b2800' }}>Register</h1>
          <p className="text-sm mt-1" style={{ color: '#a09070' }}>Naya account banayein aur khelo!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Username" placeholder="e.g. ludo_king"
            icon={<User size={16} />}
            value={form.username} onChange={e => setForm({...form, username:e.target.value})}
            error={errors.username} required />

          <Input label="Email" type="email" placeholder="you@example.com"
            icon={<Mail size={16} />}
            value={form.email} onChange={e => setForm({...form, email:e.target.value})}
            error={errors.email} required />

          <Input label="Password" type="password" placeholder="Min 6 characters"
            icon={<Lock size={16} />}
            value={form.password} onChange={e => setForm({...form, password:e.target.value})}
            error={errors.password} required />

          <p className="text-xs" style={{ color: '#a09070' }}>
            By registering, you agree to play responsibly. 18+ only.
          </p>

          <button type="submit" disabled={isLoading}
            className="w-full py-3.5 rounded-full font-black text-sm active:scale-95 transition-transform disabled:opacity-50"
            style={{ background: 'linear-gradient(to bottom,#f5c842,#c9960a)', color: '#3b2800', boxShadow: '0 3px 10px rgba(201,150,10,0.3)' }}>
            {isLoading ? 'Creating account…' : '🎲 Register & Play →'}
          </button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: '#a09070' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-black" style={{ color: '#c9960a' }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
