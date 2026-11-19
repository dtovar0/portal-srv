'use client';

/**
 * Compuerta de acceso al Dashboard: los administradores (globales y de área) ven el
 * panel principal; los usuarios comunes son redirigidos al catálogo de plataformas (/platforms).
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './session-provider';
import { Dashboard } from './dashboard';
import { Spinner } from './ui';

export function DashboardGate() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && !session.permissions.is_admin && !session.permissions.is_area_admin) {
      router.replace('/platforms');
    }
  }, [session, router]);

  if (loading) {
    return <Spinner label="Cargando…" />;
  }

  if (session && !session.permissions.is_admin && !session.permissions.is_area_admin) {
    return null;
  }

  return <Dashboard />;
}

