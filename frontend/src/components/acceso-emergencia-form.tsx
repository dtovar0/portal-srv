'use client';

/**
 * Acceso de emergencia (ADR-009 6A): correo y contraseña contra `POST /auth/local`.
 * Sin enlace visible desde `/login`; el fallo es siempre el mismo mensaje (SEC-AUTH-09).
 */

import { FormularioLoginLocal } from './formulario-login-local';
import { PageHeader } from './page-header';
import { Card } from './ui';

export function AccesoEmergenciaForm() {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <PageHeader
            title="Acceso de emergencia"
            description="Solo para la cuenta de emergencia del portal"
            className="text-center sm:flex-col sm:items-center"
          />
        </div>
        <Card className="space-y-5 rounded-2xl border border-panel-border bg-panel-fill p-6 sm:p-8 shadow-2xl">
          <FormularioLoginLocal />
        </Card>
      </div>
    </div>
  );
}
