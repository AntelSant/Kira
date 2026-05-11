import React from 'react';
import { EmptyState } from './EmptyState';

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  actions?: React.ReactNode;
  title?: string;
}

export function DataTable<T>({ 
  columns, 
  data, 
  keyField, 
  loading = false, 
  emptyMessage = 'No hay datos disponibles',
  actions,
  title
}: DataTableProps<T>) {
  
  if (loading) {
    return (
      <div className="table-card">
        {title && (
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{title}</h2>
            {actions && <div className="card-actions">{actions}</div>}
          </div>
        )}
        <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="table-card">
      {(title || actions) && (
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', paddingBottom: '24px' }}>
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions" style={{ display: 'flex', gap: '0.5rem' }}>{actions}</div>}
        </div>
      )}
      
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index} style={{ width: col.width, textAlign: col.align || 'left' }}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  <EmptyState message={emptyMessage} />
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={String(row[keyField])}>
                  {columns.map((col, index) => (
                    <td key={index} style={{ textAlign: col.align || 'left' }}>
                      {col.cell ? col.cell(row) : (col.accessorKey ? String(row[col.accessorKey]) : '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
