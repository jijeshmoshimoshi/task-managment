'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">404 - Page Not Found</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        The page you are looking for does not exist or you do not have permission to view it.
      </p>
      <Link href="/" className="mt-6">
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
