import { ButtonLink } from '@/components/form';
import { Brand } from '@/components/brand';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui';

/** 404 del frontend. Sustituye a templates/errors/404.html. */
export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="max-w-md w-full text-center space-y-6 rounded-2xl border border-panel-border bg-panel-fill p-8 shadow-2xl">
        <Brand size="lg" className="items-center" />
        <div className="mx-auto flex size-20 items-center justify-center rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-brand/10 to-accent/10 shadow-xs">
          <p className="text-3xl font-black tabular-nums tracking-wider text-primary-text">404</p>
        </div>
        <PageHeader
          title="Página no encontrada"
          description="La dirección no existe o el recurso se ha movido."
          className="text-center sm:flex-col sm:items-center"
        />
        <div className="pt-2 flex justify-center">
          <ButtonLink href="/" variant="primary">
            Volver al inicio
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
