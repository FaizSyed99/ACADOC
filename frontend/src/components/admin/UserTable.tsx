'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { User } from '../../lib/models/user';
import { format } from 'date-fns';

interface UserTableProps {
  data: User[];
  isLoading?: boolean;
}

export function UserTable({ data, isLoading }: UserTableProps) {
  const columns = React.useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (info) => (
          <div className="font-medium text-slate-900">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: (info) => <div className="text-slate-500">{info.getValue() as string}</div>,
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: (info) => (
          <Badge variant={info.getValue() as any}>{info.getValue() as string}</Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined',
        cell: (info) => (
          <div className="text-slate-500 text-xs">
            {format(new Date(info.getValue() as string), 'MMM dd, yyyy')}
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
