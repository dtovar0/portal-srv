'use client';

/**
 * Ajustes › Importación masiva (Bulk Import).
 * Permite cargar lotes de Usuarios, Áreas o Plataformas mediante archivo CSV o texto estructurado.
 * Incorpora previsualización interactiva con DataTable, validación de formato fila por fila y descarga de plantillas.
 */

import { useId, useMemo, useState } from 'react';
import { api, type BulkImportResult } from '@/lib/api';
import { DataTable, type DataColumn } from '../data-table';
import { Button, Field, FileInput, TextArea } from '../form';
import { Icono } from '../icono';
import { Badge, Card } from '../ui';
import { useToast } from '../toast';

export type EntityType = 'users' | 'areas' | 'platforms';

interface ParsedRow {
  row: number;
  data: Record<string, string>;
  status: 'valid' | 'error';
  error: string | null;
}

/** Texto de la vista previa cuando el área no trae color: toma el del sistema. */
const COLOR_POR_DEFECTO = 'Por defecto';

const PLANTILLAS_LOCALES: Record<EntityType, { filename: string; content: string }> = {
  users: {
    filename: 'plantilla_usuarios.csv',
    content:
      'nombre,correo,rol,areas\n' +
      'Ana Ruiz,ana.ruiz@ejemplo.com,usuario,Finanzas;TI\n' +
      'Carlos Gomez,carlos.gomez@ejemplo.com,admin_area,Finanzas\n' +
      'Maria Lopez,maria.lopez@ejemplo.com,usuario,Operaciones\n',
  },
  areas: {
    filename: 'plantilla_areas.csv',
    content:
      'nombre,descripcion,color,icono\n' +
      // Color vacío: el área toma el color por defecto (sin colores literales en el código).
      'Finanzas,Área contable y financiera,,areas\n' +
      'TI,Tecnologías de la información,,ajustes\n' +
      'Operaciones,Gestión operativa y logística,,panel\n',
  },
  platforms: {
    filename: 'plantilla_plataformas.csv',
    content:
      'nombre,descripcion,area,enlace,icono\n' +
      'Jira,Gestión de proyectos y tareas,TI,https://jira.empresa.com,plataformas\n' +
      'SAP,ERP empresarial,Finanzas,https://sap.empresa.com,catalogo\n' +
      'Slack,Comunicación interna,Operaciones,https://slack.com,usuarios\n',
  },
};

const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { headers: [], rows: [] };

  // Detectar delimitador (coma o punto y coma)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(cur.trim().replace(/^["']|["']$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^["']|["']$/g, ''));
    return result;
  }

  const rawHeaders = splitLine(lines[0]).map((h) => h.toLowerCase().trim());
  const rows = lines.slice(1).map(splitLine);

  return { headers: rawHeaders, rows };
}

export function BulkImportTab() {
  const { avisar } = useToast();
  const [entity, setEntity] = useState<EntityType>('users');
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const fileInputId = useId();
  const textoId = useId();

  // Validación y parseo reactivo de filas
  const parsedRows = useMemo<ParsedRow[]>(() => {
    if (!rawText.trim()) return [];

    // Intento de parseo JSON si empieza con [
    if (rawText.trim().startsWith('[')) {
      try {
        const json = JSON.parse(rawText);
        if (Array.isArray(json)) {
          return json.map((item, idx) => {
            const data: Record<string, string> = {};
            Object.entries(item).forEach(([k, v]) => {
              data[k.toLowerCase()] = String(v ?? '');
            });
            const { valid, error } = validateRow(entity, data);
            return {
              row: idx + 1,
              data,
              status: valid ? 'valid' : 'error',
              error,
            };
          });
        }
      } catch {
        // Fallback a CSV
      }
    }

    const { headers, rows } = parseCsv(rawText);
    if (headers.length === 0) return [];

    return rows.map((r, idx) => {
      const data: Record<string, string> = {};
      headers.forEach((h, hIdx) => {
        data[h] = r[hIdx] || '';
      });

      const { valid, error } = validateRow(entity, data);
      return {
        row: idx + 1,
        data,
        status: valid ? 'valid' : 'error',
        error,
      };
    });
  }, [rawText, entity]);

  function validateRow(
    type: EntityType,
    data: Record<string, string>
  ): { valid: boolean; error: string | null } {
    if (type === 'users') {
      const email = data.correo || data.email;
      const name = data.nombre || data.name;
      const role = (data.rol || data.role || 'usuario').toLowerCase();

      if (!email) return { valid: false, error: 'Falta correo electrónico' };
      if (!PATRON_EMAIL.test(email)) return { valid: false, error: 'Formato de correo no válido' };
      if (!name) return { valid: false, error: 'Falta nombre completo' };
      if (role === 'administrador' || role === 'admin' || role === 'superadmin') {
        return { valid: false, error: 'No se permite rol administrador en carga masiva' };
      }
      return { valid: true, error: null };
    }

    if (type === 'areas') {
      const name = data.nombre || data.name;
      if (!name) return { valid: false, error: 'Falta nombre del área' };
      if (name.length < 2) return { valid: false, error: 'Nombre demasiado corto' };
      return { valid: true, error: null };
    }

    if (type === 'platforms') {
      const name = data.nombre || data.name;
      const desc = data.descripcion || data.description;
      const area = data.area || data.area_name || data.area_id;
      if (!name) return { valid: false, error: 'Falta nombre de la plataforma' };
      if (!desc) return { valid: false, error: 'Falta descripción' };
      if (!area) return { valid: false, error: 'Falta área asignada' };
      return { valid: true, error: null };
    }

    return { valid: true, error: null };
  }

  const validCount = parsedRows.filter((r) => r.status === 'valid').length;
  const errorCount = parsedRows.filter((r) => r.status === 'error').length;

  function descargarPlantilla() {
    const template = PLANTILLAS_LOCALES[entity];
    const blob = new Blob([template.content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = template.filename;
    link.click();
    URL.revokeObjectURL(url);
    avisar('success', `Plantilla de ${entity} descargada.`);
  }

  function handleFileUpload(file: File) {
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setRawText(content || '');
    };
    reader.readAsText(file);
  }

  function limpiar() {
    setRawText('');
    setFileName('');
    setResult(null);
  }

  async function ejecutarImportacion() {
    if (validCount === 0 || importing) return;

    setImporting(true);
    setResult(null);

    const validRecords = parsedRows
      .filter((r) => r.status === 'valid')
      .map((r) => r.data);

    try {
      const res = await api.bulkImport(entity, validRecords, false);
      setResult(res);

      if (res.status === 'success') {
        avisar(
          'success',
          `Importación masiva completada: ${res.created} registros creados exitosamente.`
        );
      } else {
        avisar('error', res.message || 'La importación tuvo observaciones.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la importación.';
      avisar('error', msg);
    } finally {
      setImporting(false);
    }
  }

  // Columnas para DataTable
  const columnas = useMemo<DataColumn<ParsedRow>[]>(() => {
    const cols: DataColumn<ParsedRow>[] = [
      {
        key: 'fila',
        header: 'Fila',
        headerClassName: 'w-16 text-center',
        cellClassName: 'text-center font-bold text-label text-xs',
        cell: (r) => r.row,
      },
    ];

    if (entity === 'users') {
      cols.push(
        {
          key: 'nombre',
          header: 'Nombre',
          cellClassName: 'font-medium text-body-text text-xs',
          cell: (r) => r.data.nombre || r.data.name || '—',
        },
        {
          key: 'correo',
          header: 'Correo',
          cellClassName: 'font-mono text-label text-xs',
          cell: (r) => r.data.correo || r.data.email || '—',
        },
        {
          key: 'rol',
          header: 'Rol',
          cellClassName: 'text-body-text text-xs',
          cell: (r) => r.data.rol || r.data.role || 'usuario',
        },
        {
          key: 'areas',
          header: 'Áreas',
          cellClassName: 'text-label text-xs',
          cell: (r) => r.data.areas || '—',
        }
      );
    } else if (entity === 'areas') {
      cols.push(
        {
          key: 'nombre',
          header: 'Nombre',
          cellClassName: 'font-medium text-body-text text-xs',
          cell: (r) => r.data.nombre || r.data.name || '—',
        },
        {
          key: 'descripcion',
          header: 'Descripción',
          cellClassName: 'text-label text-xs',
          cell: (r) => r.data.descripcion || r.data.description || '—',
        },
        {
          key: 'color',
          header: 'Color',
          cellClassName: 'font-mono text-label text-xs',
          cell: (r) => r.data.color || COLOR_POR_DEFECTO,
        }
      );
    } else {
      cols.push(
        {
          key: 'nombre',
          header: 'Nombre',
          cellClassName: 'font-medium text-body-text text-xs',
          cell: (r) => r.data.nombre || r.data.name || '—',
        },
        {
          key: 'area',
          header: 'Área',
          cellClassName: 'text-body-text text-xs',
          cell: (r) => r.data.area || r.data.area_name || '—',
        },
        {
          key: 'enlace',
          header: 'Enlace',
          cellClassName: 'text-label text-xs truncate max-w-xs',
          cell: (r) => r.data.enlace || r.data.direct_link || '—',
        }
      );
    }

    cols.push({
      key: 'estado',
      header: 'Estado',
      headerClassName: 'text-right',
      cellClassName: 'text-right text-xs',
      cell: (r) =>
        r.status === 'valid' ? (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-success/15 text-success-text">
            ✓ Válido
          </span>
        ) : (
          <span
            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-error/15 text-error-text"
            title={r.error || 'Error'}
          >
            ✕ {r.error}
          </span>
        ),
    });

    return cols;
  }, [entity]);

  return (
    <Card className="flex h-full w-full flex-1 min-h-0 flex-col space-y-5 overflow-y-auto">
      {/* 1. Selector de entidad */}
      <div>
        <h2 className="text-sm font-bold text-body-text mb-2">1. Selecciona la entidad a importar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              setEntity('users');
              limpiar();
            }}
            className={`min-h-12 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              entity === 'users'
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface-container/60 text-body-text border-panel-border/80 hover:bg-surface-container'
            }`}
            aria-pressed={entity === 'users'}
          >
            <Icono nombre="usuarios" tamano="sm" ariaHidden={true} />
            <span>Usuarios y Cuentas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEntity('areas');
              limpiar();
            }}
            className={`min-h-12 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              entity === 'areas'
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface-container/60 text-body-text border-panel-border/80 hover:bg-surface-container'
            }`}
            aria-pressed={entity === 'areas'}
          >
            <Icono nombre="areas" tamano="sm" ariaHidden={true} />
            <span>Áreas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEntity('platforms');
              limpiar();
            }}
            className={`min-h-12 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              entity === 'platforms'
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface-container/60 text-body-text border-panel-border/80 hover:bg-surface-container'
            }`}
            aria-pressed={entity === 'platforms'}
          >
            <Icono nombre="plataformas" tamano="sm" ariaHidden={true} />
            <span>Plataformas</span>
          </button>
        </div>
      </div>

      {/* 2. Guía de formato y plantilla */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-panel-border/80 bg-surface-container/40">
        <div>
          <h3 className="text-xs font-bold text-body-text">Formato esperado para {entity}</h3>
          <p className="text-xs text-label mt-0.5">
            {entity === 'users' && 'Columnas: nombre, correo, rol (usuario/admin_area), areas (separadas por punto y coma).'}
            {entity === 'areas' && 'Columnas: nombre, descripcion, color (#hex), icono (opcional).'}
            {entity === 'platforms' && 'Columnas: nombre, descripcion, area (nombre o ID), enlace, icono.'}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={descargarPlantilla}
          className="min-h-12 text-xs shrink-0"
        >
          <Icono nombre="exportar" tamano="sm" ariaHidden={true} className="mr-1.5" />
          Descargar plantilla CSV
        </Button>
      </div>

      {/* 3. Entrada de datos */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-sm font-bold text-body-text">2. Cargar datos</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInputMode('file')}
              aria-pressed={inputMode === 'file'}
              className={`min-h-12 px-4 py-2 inline-flex items-center justify-center text-xs rounded-lg font-medium transition-colors ${
                inputMode === 'file'
                  ? 'bg-surface-container text-primary-text font-bold shadow-xs'
                  : 'text-label hover:text-body-text'
              }`}
            >
              Archivo CSV
            </button>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              aria-pressed={inputMode === 'text'}
              className={`min-h-12 px-4 py-2 inline-flex items-center justify-center text-xs rounded-lg font-medium transition-colors ${
                inputMode === 'text'
                  ? 'bg-surface-container text-primary-text font-bold shadow-xs'
                  : 'text-label hover:text-body-text'
              }`}
            >
              Pegar texto
            </button>
          </div>
        </div>

        {inputMode === 'file' ? (
          <div>
            <FileInput
              id={fileInputId}
              aria-label="Archivo CSV, texto o JSON a importar"
              accept=".csv,.txt,.json,text/csv,text/plain,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="block w-full"
            />
            {fileName ? (
              <p className="mt-1.5 text-xs text-label">
                Archivo cargado: <span className="font-semibold text-body-text">{fileName}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <Field label="Contenido CSV o JSON">
            <TextArea
              id={textoId}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={PLANTILLAS_LOCALES[entity].content}
              rows={5}
              className="font-mono text-xs"
            />
          </Field>
        )}
      </div>

      {/* 4. Previsualización y validación con DataTable */}
      {parsedRows.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-panel-border/80">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-body-text">3. Previsualización</h2>
              <Badge tone="slate">Total: {parsedRows.length}</Badge>
              <Badge tone="success">Válidos: {validCount}</Badge>
              {errorCount > 0 ? <Badge tone="error">Errores: {errorCount}</Badge> : null}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  limpiar();
                  // El botón desaparece con la vista previa: el foco vuelve a la entrada de datos.
                  requestAnimationFrame(() =>
                    document.getElementById(inputMode === 'file' ? fileInputId : textoId)?.focus());
                }}
                disabled={importing}
              >
                <Icono nombre="cerrar" tamano="sm" ariaHidden={true} className="mr-1.5" />
                Limpiar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={ejecutarImportacion}
                disabled={validCount === 0 || importing}
              >
                <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
                {importing ? 'Importando…' : `Importar ${validCount} registros`}
              </Button>
            </div>
          </div>

          <DataTable
            label="Previsualización de registros a importar"
            columns={columnas}
            rows={parsedRows}
            rowKey={(r) => r.row}
            emptyMessage="No hay registros para mostrar."
          />
        </div>
      ) : null}

      {/* 5. Resumen de ejecución */}
      {result ? (
        <div
          role="status"
          className={`p-4 rounded-xl border ${
            result.status === 'success' && result.errors.length === 0
              ? 'border-success/30 bg-success/5 text-body-text'
              : 'border-aviso/30 bg-aviso/5 text-body-text'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <Icono
              nombre={result.status === 'success' && result.errors.length === 0 ? 'exito' : 'aviso'}
              tamano="sm"
              ariaHidden={true}
            />
            <span>
              {result.created > 0
                ? `Se han importado ${result.created} registros correctamente.`
                : 'Importación finalizada sin altas.'}
            </span>
          </div>

          {result.errors.length > 0 ? (
            <div className="mt-2 text-xs space-y-1">
              <p className="font-semibold text-error-text">Observaciones del servidor:</p>
              <ul className="list-disc list-inside space-y-0.5 text-label">
                {result.errors.map((err, i) => (
                  <li key={i}>
                    Fila {err.row}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
