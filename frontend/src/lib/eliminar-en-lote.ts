/**
 * Borrado en lote secuencial (usuarios, áreas y plataformas, FNC-145).
 *
 * Se detiene en el primer error para no seguir con una operación que el
 * servidor está rechazando, y devuelve lo que sí se eliminó para que la
 * pantalla lo informe y lo quite de la selección.
 */
export interface ResultadoLote<T> {
  eliminados: T[];
  error: unknown | null;
}

export async function eliminarEnLote<T>(
  elementos: readonly T[],
  eliminar: (elemento: T) => Promise<unknown>,
): Promise<ResultadoLote<T>> {
  const eliminados: T[] = [];
  for (const elemento of elementos) {
    try {
      await eliminar(elemento);
    } catch (error) {
      return { eliminados, error };
    }
    eliminados.push(elemento);
  }
  return { eliminados, error: null };
}

/** Antepone "N de M eliminados." al error cuando el lote quedó a medias. */
export function mensajeLoteParcial(eliminados: number, total: number, mensaje: string): string {
  return eliminados > 0 ? `Se eliminaron ${eliminados} de ${total}. ${mensaje}` : mensaje;
}
