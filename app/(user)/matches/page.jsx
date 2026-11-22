'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MatchesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/battles'); }, []);
  return null;
}
