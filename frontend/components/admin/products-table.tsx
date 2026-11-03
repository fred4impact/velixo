'use client';

import { flexRender, getCoreRowModel, useReactTable, ColumnDef } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { formatPrice } from '@/lib/format';

export function ProductsTable({
  products,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  const columns: ColumnDef<Product>[] = [
    {
      header: 'Image',
      cell: ({ row }) =>
        row.original.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.original.images[0].url} alt="" className="h-10 w-10 object-cover" />
        ) : (
          <div className="h-10 w-10 bg-muted" />
        ),
    },
    { header: 'Name', accessorKey: 'name' },
    { header: 'SKU', accessorKey: 'sku' },
    {
      header: 'Price',
      cell: ({ row }) => formatPrice(row.original.salePrice ?? row.original.regularPrice),
    },
    { header: 'Stock', accessorKey: 'stockQty' },
    {
      header: 'Status',
      cell: ({ row }) =>
        row.original.isArchived ? <Badge variant="secondary">Archived</Badge> : <Badge>Active</Badge>,
    },
    {
      header: '',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(row.original)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({ data: products, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
