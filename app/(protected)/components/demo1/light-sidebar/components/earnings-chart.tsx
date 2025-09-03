import { useEffect, useMemo, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import ApexChart from 'react-apexcharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// --- Base 12-month dummy data (in "thousands GBP") ---
const BASE_12M: number[] = [58, 64, 52, 45, 42, 38, 45, 53, 56, 65, 75, 85];

// Month labels (Jan → Dec). We’ll slice to match the selected range.
const MONTHS: string[] = [
  'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec',
];

type RangeKey = '1' | '3' | '6' | '12';

const EarningsChart = () => {
  // UI state
  const [range, setRange] = useState<RangeKey>('12');
  const [reviewedOnly, setReviewedOnly] = useState(true);

  // Choose the last N points from the base array based on range
  const baseSlice = useMemo(() => {
    const n = parseInt(range, 10);
    return BASE_12M.slice(BASE_12M.length - n);
  }, [range]);

  // Map to categories matching the slice
  const categories = useMemo(() => {
    const n = parseInt(range, 10);
    return MONTHS.slice(MONTHS.length - n);
  }, [range]);

  // Apply a simple factor for "Solicitor-reviewed only"
  // (purely presentational; tweak factor if you want)
  const chartData = useMemo(() => {
    const factor = reviewedOnly ? 0.88 : 1; // ~12% filtered out as not reviewed
    return baseSlice.map((v) => Math.round(v * factor));
  }, [baseSlice, reviewedOnly]);

  // Format helpers
  const gbp = (thousands: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(thousands * 1000); // values are in "thousands"

  const options: ApexOptions = {
    series: [
      {
        name: 'Billables',
        data: chartData,
      },
    ],
    chart: {
      height: 250,
      type: 'area',
      toolbar: { show: false },
      foreColor: 'var(--color-secondary-foreground)',
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: {
      curve: 'smooth',
      show: true,
      width: 3,
      colors: ['var(--color-primary)'],
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: 'var(--color-secondary-foreground)',
          fontSize: '12px',
        },
      },
      crosshairs: {
        position: 'front',
        stroke: { color: 'var(--color-primary)', width: 1, dashArray: 3 },
      },
      tooltip: {
        enabled: false,
        style: { fontSize: '12px' },
      },
    },
    yaxis: {
      min: 0,
      max: 100,           // keep simple 0–100k scale for the dummy data
      tickAmount: 5,
      axisTicks: { show: false },
      labels: {
        style: {
          colors: 'var(--color-secondary-foreground)',
          fontSize: '12px',
        },
        formatter: (v: number) => `£${v}k`,
      },
    },
    tooltip: {
      enabled: true,
      custom({ series, seriesIndex, dataPointIndex, w }) {
        const thousands = series[seriesIndex][dataPointIndex] as number;
        const monthName = w.globals.labels[dataPointIndex] as string;
        const formatted = gbp(thousands);

        return `
          <div class="flex flex-col gap-2 p-3.5">
            <div class="font-medium text-sm text-secondary-foreground">${monthName} Billables</div>
            <div class="flex items-center gap-1.5">
              <div class="font-semibold text-base text-mono">${formatted}</div>
              <span class="rounded-full border border-green-200 font-medium dark:border-green-850 text-success-700 bg-green-100 dark:bg-green-950/30 text-[11px] leading-none px-1.25 py-1">+24%</span>
            </div>
            <div class="text-[11px] text-muted-foreground">
              ${reviewedOnly ? 'Solicitor-reviewed only' : 'All billables'}
            </div>
          </div>
        `;
      },
    },
    markers: {
      size: 0,
      colors: 'var(--color-white)',
      strokeColors: 'var(--color-primary)',
      strokeWidth: 4,
      strokeOpacity: 1,
      fillOpacity: 1,
      hover: { size: 8, sizeOffset: 0 },
    },
    fill: {
      gradient: {
        opacityFrom: 0.25,
        opacityTo: 0,
      },
    },
    grid: {
      borderColor: 'var(--color-border)',
      strokeDashArray: 5,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Billables</CardTitle>
        <div className="flex gap-5">
          <div className="flex items-center gap-2">
            <Label htmlFor="reviewed-only" className="text-sm">
              Solicitor-reviewed only
            </Label>
            <Switch
              id="reviewed-only"
              checked={reviewedOnly}
              onCheckedChange={setReviewedOnly}
              size="sm"
            />
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="w-28">
              <SelectItem value="1">1 month</SelectItem>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
              <SelectItem value="12">12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col justify-end items-stretch grow px-3 py-1">
        <ApexChart
          id="billables_chart"
          options={options}
          series={options.series}
          type="area"
          width="100%"
          height={250}
        />
      </CardContent>
    </Card>
  );
};

export { EarningsChart as BillablesChart, EarningsChart };
