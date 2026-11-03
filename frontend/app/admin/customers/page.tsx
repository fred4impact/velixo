'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usersService } from '@/services/users.service';

export default function AdminCustomersPage() {
  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: usersService.listCustomers,
  });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black tracking-tight uppercase">Customers</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers?.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Link href={`/admin/customers/${customer.id}`} className="underline-offset-4 hover:underline">
                    {[customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—'}
                  </Link>
                </TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>
                  {customer.emailVerifiedAt ? (
                    <Badge>Verified</Badge>
                  ) : (
                    <Badge variant="secondary">Unverified</Badge>
                  )}
                </TableCell>
                <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
