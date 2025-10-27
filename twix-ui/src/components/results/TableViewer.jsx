import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

const TableViewer = ({ data, onCellClick, selectedCell }) => {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Transform the data into a flat structure suitable for the table
  const flattenedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    const result = [];
    data.forEach((record, recordIndex) => {
      if (record.content && Array.isArray(record.content)) {
        record.content.forEach((item) => {
          if (item.type === 'table' && item.content && Array.isArray(item.content)) {
            item.content.forEach((row, rowIndex) => {
              result.push({
                ...row,
                _recordId: record.id,
                _recordIndex: recordIndex,
                _rowIndex: rowIndex,
              });
            });
          }
        });
      }
    });
    return result;
  }, [data]);

  // Generate columns from the data
  const columns = useMemo(() => {
    if (flattenedData.length === 0) return [];
    
    const allKeys = new Set();
    flattenedData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (!key.startsWith('_')) {
          allKeys.add(key);
        }
      });
    });

    return Array.from(allKeys).map(key => ({
      accessorKey: key,
      header: key,
      cell: ({ getValue, row, column }) => {
        const value = getValue();
        const cellKey = `${row.original._recordIndex}_${row.original._rowIndex}_${column.id}`;
        const isSelected = selectedCell === cellKey;
        
        return (
          <div
            onClick={() => onCellClick && onCellClick({
              value,
              column: column.id,
              row: row.original,
              cellKey
            })}
            className={`cursor-pointer hover:bg-blue-50 p-2 rounded ${
              isSelected ? 'bg-yellow-200 ring-2 ring-yellow-400' : ''
            }`}
          >
            {value === 'missing' || value === null || value === undefined ? (
              <span className="text-gray-400 italic">missing</span>
            ) : value === 'N/A' ? (
              <span className="text-gray-400">N/A</span>
            ) : (
              String(value)
            )}
          </div>
        );
      },
    }));
  }, [flattenedData, selectedCell, onCellClick]);

  const table = useReactTable({
    data: flattenedData,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!data || flattenedData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        <p>No table data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="mr-2">📊</span>
            Table Viewer
          </h3>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search all columns..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                const csv = [
                  columns.map(col => col.header).join(','),
                  ...flattenedData.map(row => 
                    columns.map(col => {
                      const value = row[col.accessorKey];
                      return `"${String(value).replace(/"/g, '""')}"`;
                    }).join(',')
                  )
                ].join('\n');
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'table_data.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center space-x-1">
                      <span>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </span>
                      <span className="text-gray-400">
                        {{
                          asc: '↑',
                          desc: '↓',
                        }[header.column.getIsSorted()] ?? '↕'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-100"
          >
            ⏮
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-100"
          >
            ←
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-100"
          >
            →
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-100"
          >
            ⏭
          </button>
        </div>
        <div className="text-sm text-gray-700">
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount()} | Total: {flattenedData.length} rows
        </div>
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="px-3 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[5, 10, 20, 50, 100].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default TableViewer;
