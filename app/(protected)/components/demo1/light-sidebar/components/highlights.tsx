import { DropdownMenu4 } from '@/partials/dropdown-menu/dropdown-menu-4';
import { RemixiconComponentType } from '@remixicon/react';
import {
  ArrowDown,
  ArrowUp,
  EllipsisVertical,
  type LucideIcon,
  Landmark,
  FileText,
  Users,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface IHighlightsRow {
  icon: LucideIcon | RemixiconComponentType;
  text: string;
  total: number;
  /** Optional human-friendly string to display instead of raw number */
  display?: string; // e.g., "1,204 docs", "312 filings"
  stats: number;
  increase: boolean; // true -> ArrowUp (green), false -> ArrowDown (red)
}
type IHighlightsRows = Array<IHighlightsRow>;

interface IHighlightsItem {
  badgeColor: string;
  label: string;
}
type IHighlightsItems = Array<IHighlightsItem>;

interface IHighlightsProps {
  limit?: number;
}

const Highlights = ({ limit }: IHighlightsProps) => {
  // ---- LawFuze analytics content ----
  const rows: IHighlightsRows = [
    {
      icon: Landmark,
      text: 'HMCTS e-Filing',
      total: 312,
      display: '312 filings',
      stats: 4.1,
      increase: true,
    },
    {
      icon: FileText,
      text: 'AI Drafts',
      total: 1204,
      display: '1,204 docs',
      stats: 8.2,
      increase: true,
    },
    {
      icon: Users,
      text: 'Client Intakes',
      total: 42,
      display: '42 intakes',
      stats: 5.0,
      increase: true,
    },
    {
      icon: ShieldCheck,
      text: 'Solicitor Reviews',
      total: 87,
      display: '87 reviews',
      stats: 1.3,
      increase: true,
    },
    {
      icon: AlertTriangle,
      text: 'SLA Breaches',
      total: 7,
      display: '7 breaches',
      stats: 0.7,
      increase: false, // down is good here
    },
  ];

  const items: IHighlightsItems = [
    { badgeColor: 'bg-green-500', label: 'Accepted' },
    { badgeColor: 'bg-destructive', label: 'Returned' },
    { badgeColor: 'bg-violet-500', label: 'Pending' },
  ];

  const renderRow = (row: IHighlightsRow, index: number) => {
    return (
      <div
        key={index}
        className="flex items-center justify-between flex-wrap gap-2"
      >
        <div className="flex items-center gap-1.5">
          <row.icon className="size-4.5 text-muted-foreground" />
          <span className="text-sm font-normal text-mono">{row.text}</span>
        </div>
        <div className="flex items-center text-sm font-medium text-foreground gap-6">
          <span className="lg:text-right">
            {row.display ?? row.total.toLocaleString()}
          </span>
          <span className="flex items-center justify-end gap-1">
            {row.increase ? (
              <ArrowUp className="text-green-500 size-4" />
            ) : (
              <ArrowDown className="text-destructive size-4" />
            )}
            {row.stats}%
          </span>
        </div>
      </div>
    );
  };

  const renderItem = (item: IHighlightsItem, index: number) => {
    return (
      <div key={index} className="flex items-center gap-1.5">
        <BadgeDot className={item.badgeColor} />
        <span className="text-sm font-normal text-foreground">
          {item.label}
        </span>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Highlights</CardTitle>
        <DropdownMenu4
          trigger={
            <Button variant="ghost" mode="icon">
              <EllipsisVertical />
            </Button>
          }
        />
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-5 lg:p-7.5 lg:pt-4">
        {/* Top summary */}
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-normal text-secondary-foreground">
            30-day billables
          </span>
          <div className="flex items-center gap-2.5">
            <span className="text-3xl font-semibold text-mono">£295.7k</span>
            <Badge size="sm" variant="success" appearance="light">
              +2.7%
            </Badge>
          </div>
        </div>

        {/* Outcome mix bars */}
        <div className="flex items-center gap-1 mb-1.5">
          <div className="bg-green-500 h-2 w-full max-w-[60%] rounded-xs"></div>
          <div className="bg-destructive h-2 w-full max-w-[25%] rounded-xs"></div>
          <div className="bg-violet-500 h-2 w-full max-w-[15%] rounded-xs"></div>
        </div>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-4 mb-1">
          {items.map((item, index) => renderItem(item, index))}
        </div>

        <div className="border-b border-input"></div>

        {/* Rows */}
        <div className="grid gap-3">{rows.slice(0, limit).map(renderRow)}</div>
      </CardContent>
    </Card>
  );
};

export {
  Highlights,
  type IHighlightsRow,
  type IHighlightsRows,
  type IHighlightsItem,
  type IHighlightsItems,
  type IHighlightsProps,
};
