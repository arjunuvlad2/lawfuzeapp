'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarGroup } from '@/partials/common/avatar-group';
import { Rating } from '@/partials/common/rating';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface IData {
  id: number;
  name: string;
  description: string;
  rating: number;        // 0–5 (supports halves)
  created_at: string;    // e.g., '03 Sep, 2025'
  updated_at: string;    // used for default sort (desc)
  users: Avatar[];
}

/** LawFuze practice squads */
const data: IData[] = [
  {
    id: 1,
    name: 'Family — D8 Petitions',
    description: 'Uncontested divorce D8 & D10 acknowledgements',
    rating: 5,
    created_at: '12 Aug, 2025',
    updated_at: '03 Sep, 2025',
    users: [
      { path: '/media/avatars/300-4.png', fallback: 'SOL' },
      { path: '/media/avatars/300-1.png', fallback: 'PARA' },
      { path: '/media/avatars/300-2.png', fallback: 'REV' },
      { path: '/media/avatars/300-3.png', fallback: 'QA' },
    ],
  },
  {
    id: 2,
    name: 'Family — Consent Orders',
    description: 'Financial consent orders & clean break drafting',
    rating: 4.5,
    created_at: '05 Aug, 2025',
    updated_at: '02 Sep, 2025',
    users: [
      { path: '/media/avatars/300-8.png', fallback: 'SOL' },
      { path: '/media/avatars/300-9.png', fallback: 'REV' },
    ],
  },
  {
    id: 3,
    name: 'Immigration — FLR(M)',
    description: 'Leave to remain applications & bundles',
    rating: 5,
    created_at: '30 Jul, 2025',
    updated_at: '01 Sep, 2025',
    users: [
      { path: '/media/avatars/300-4.png', fallback: 'SOL' },
      { path: '/media/avatars/300-5.png', fallback: 'PARA' },
      { path: '/media/avatars/300-6.png', fallback: 'REV' },
    ],
  },
  {
    id: 4,
    name: 'Traffic — PCN & Speeding',
    description: 'Challenge letters, mitigation & hearings',
    rating: 5,
    created_at: '22 Jul, 2025',
    updated_at: '31 Aug, 2025',
    users: [
      { path: '/media/avatars/300-24.png', fallback: 'SOL' },
      { path: '/media/avatars/300-7.png', fallback: 'PARA' },
    ],
  },
  {
    id: 5,
    name: 'Civil — Small Claims',
    description: 'PAP letters, particulars, directions',
    rating: 4.5,
    created_at: '19 Jul, 2025',
    updated_at: '29 Aug, 2025',
    users: [
      { path: '/media/avatars/300-3.png', fallback: 'SOL' },
      { path: '/media/avatars/300-8.png', fallback: 'PARA' },
      { path: '/media/avatars/300-9.png', fallback: 'REV' },
    ],
  },
  {
    id: 6,
    name: 'Compliance & GDPR',
    description: 'PII redaction, audit logs, risk flags',
    rating: 5,
    created_at: '15 Jul, 2025',
    updated_at: '28 Aug, 2025',
    users: [
      { path: '/media/avatars/300-6.png', fallback: 'QA' },
      { path: '/media/avatars/300-5.png', fallback: 'REV' },
    ],
  },
  {
    id: 7,
    name: 'Client Intake',
    description: 'Matter creation, KYC & conflict checks',
    rating: 4,
    created_at: '10 Jul, 2025',
    updated_at: '25 Aug, 2025',
    users: [
      { path: '/media/avatars/300-10.png', fallback: 'OPS' },
      { path: '/media/avatars/300-11.png', fallback: 'OPS' },
      { path: '/media/avatars/300-12.png', fallback: 'OPS' },
    ],
  },
  {
    id: 8,
    name: 'Research & Citations',
    description: 'OSCOLA, authorities & case summaries',
    rating: 3.5,
    created_at: '06 Jul, 2025',
    updated_at: '21 Aug, 2025',
    users: [
      { path: '/media/avatars/300-13.png', fallback: 'LIB' },
      { path: '/media/avatars/300-14.png', fallback: 'REV' },
    ],
  },
  {
    id: 9,
    name: 'Landlord & Tenant',
    description: 'Section 8/21 notices & possession',
    rating: 5,
    created_at: '02 Jul, 2025',
    updated_at: '18 Aug, 2025',
    users: [
      { path: '/media/avatars/300-15.png', fallback: 'SOL' },
      { path: '/media/avatars/300-16.png', fallback: 'PARA' },
    ],
  },
  {
    id: 10,
    name: 'Employment — ET1/ET3',
    description: 'Claim responses, bundles, schedules',
    rating: 4,
    created_at: '28 Jun, 2025',
    updated_at: '15 Aug, 2025',
    users: [
      { path: '/media/avatars/300-17.png', fallback: 'SOL' },
      { path: '/media/avatars/300-18.png', fallback: 'PARA' },
      { path: '/media/avatars/300-19.png', fallback: 'REV' },
    ],
  },
  {
    id: 11,
    name: 'Wills & Probate',
    description: 'Will drafting & probate forms',
    rating: 5,
    created_at: '24 Jun, 2025',
    updated_at: '12 Aug, 2025',
    users: [
      { path: '/media/avatars/300-20.png', fallback: 'SOL' },
      { path: '/media/avatars/300-21.png', fallback: 'PARA' },
    ],
  },
  {
    id: 12,
    name: 'Corporate — Contracts',
    description: 'Redlines, comparisons & clause risk',
    rating: 4,
    created_at: '19 Jun, 2025',
    updated_at: '10 Aug, 2025',
    users: [
      { path: '/media/avatars/300-22.png', fallback: 'SOL' },
      { path: '/media/avatars/300-23.png', fallback: 'REV' },
    ],
  },
  {
    id: 13,
    name: 'Court e-Filing',
    description: 'HMCTS portals & returns handling',
    rating: 3.5,
    created_at: '14 Jun, 2025',
    updated_at: '08 Aug, 2025',
    users: [
      { path: '/media/avatars/300-24.png', fallback: 'OPS' },
      { path: '/media/avatars/300-25.png', fallback: 'OPS' },
    ],
  },
  {
    id: 14,
    name: 'Templates & Governance',
    description: 'Prompt/version control & approvals',
    rating: 5,
    created_at: '10 Jun, 2025',
    updated_at: '05 Aug, 2025',
    users: [
      { path: '/media/avatars/300-26.png', fallback: 'ADM' },
      { path: '/media/avatars/300-27.png', fallback: 'REV' },
      { path: '/media/avatars/300-28.png', fallback: 'QA' },
    ],
  },
  {
    id: 15,
    name: 'Billing & Ops',
    description: 'Time tracking, invoices & payouts',
    rating: 4,
    created_at: '06 Jun, 2025',
    updated_at: '02 Aug, 2025',
    users: [
      { path: '/media/avatars/300-29.png', fallback: 'FIN' },
      { path: '/media/avatars/300-30.png', fallback: 'OPS' },
    ],
  },
];

const Teams = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'updated_at', desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const columns = useMemo<ColumnDef<IData>[]>(
    () => [
      {
        accessorKey: 'id',
        accessorFn: (row) => row.id,
        header: () => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 48,
        meta: { cellClassName: '' },
      },
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Team" column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-2">
            <span className="leading-none font-medium text-sm text-mono hover:text-primary">
              {row.original.name}
            </span>
            <span className="text-sm text-secondary-foreground font-normal leading-3">
              {row.original.description}
            </span>
          </div>
        ),
        enableSorting: true,
        size: 280,
        meta: {
          skeleton: (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-[125px]" />
              <Skeleton className="h-2.5 w-[90px]" />
            </div>
          ),
        },
      },
      {
        id: 'rating',
        accessorFn: (row) => row.rating,
        header: ({ column }) => (
          <DataGridColumnHeader title="Rating" column={column} />
        ),
        cell: ({ row }) => (
          <Rating
            rating={Math.floor(row.original.rating)}
            round={row.original.rating % 1}
          />
        ),
        enableSorting: true,
        size: 135,
        meta: { skeleton: <Skeleton className="h-5 w-[60px]" /> },
      },
      {
        id: 'updated_at',
        accessorFn: (row) => row.updated_at,
        header: ({ column }) => (
          <DataGridColumnHeader title="Last Modified" column={column} />
        ),
        cell: ({ row }) => row.original.updated_at,
        enableSorting: true,
        size: 135,
        meta: { skeleton: <Skeleton className="h-5 w-[70px]" /> },
      },
      {
        id: 'users',
        accessorFn: (row) => row.users,
        header: ({ column }) => (
          <DataGridColumnHeader title="Members" column={column} />
        ),
        cell: ({ row }) => (
          <AvatarGroup group={row.original.users} size="size-8" />
        ),
        enableSorting: true,
        size: 135,
        meta: { skeleton: <Skeleton className="h-6 w-[75px]" /> },
      },
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
    getRowId: (row: IData) => String(row.id),
    state: { pagination, sorting, rowSelection },
    columnResizeMode: 'onChange',
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={filteredData?.length || 0}
      tableLayout={{
        columnsPinnable: true,
        columnsMovable: true,
        columnsVisibility: true,
        cellBorder: true,
      }}
    >
      <Card>
        <CardHeader className="py-3.5">
          <CardTitle>Teams</CardTitle>
          <CardToolbar className="relative">
            <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search teams or practice areas…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 w-40"
            />
            {searchQuery.length > 0 && (
              <Button
                mode="icon"
                variant="ghost"
                className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X />
              </Button>
            )}
          </CardToolbar>
        </CardHeader>

        <CardTable>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>

        <CardFooter>
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
};

export { Teams };
