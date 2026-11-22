'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TournamentsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/battles'); }, []);
  return null;
}
