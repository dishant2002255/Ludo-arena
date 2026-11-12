'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is no longer used — the full flow is on /buy-coins
export default function CheckoutRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/buy-coins'); }, []);
  return null;
}
