/**
 * Preparación común de Vitest (DIS-094).
 *
 * `findBy*` y `waitFor` esperan hasta 3 s en lugar de 1 s: con la máquina
 * cargada (p. ej. pytest en paralelo) la prueba del buscador global de
 * `marco-admin.test.tsx` fallaba sin defecto real. Solo alarga lo que tarda en
 * fallar una prueba que de verdad falla.
 */
import { configure } from '@testing-library/react';

export const ESPERA_ASINCRONA_MS = 3000;

configure({ asyncUtilTimeout: ESPERA_ASINCRONA_MS });
