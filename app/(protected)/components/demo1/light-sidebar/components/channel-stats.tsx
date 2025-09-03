'use client';

import { Fragment } from 'react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart3,
  FileText,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface IChannelStatsItem {
  icon: React.ElementType;
  info: string;
  desc: string;
  path?: string;
  /** Tailwind classes for the gradient badge behind the icon */
  iconGradient: string; // e.g., "from-emerald-400 to-emerald-600"
}

type IChannelStatsItems = Array<IChannelStatsItem>;

const ChannelStats = () => {
  const items: IChannelStatsItems = [
    {
      icon: BarChart3,
      info: '128',
      desc: 'Active matters',
      path: '/matters',
      iconGradient: 'from-emerald-400 to-emerald-600',
    },
    {
      icon: FileText,
      info: '1,204',
      desc: 'AI drafts (30d)',
      path: '/documents',
      iconGradient: 'from-fuchsia-500 to-indigo-600',
    },
    {
      icon: ShieldCheck,
      info: '96%',
      desc: 'HMCTS acceptance',
      path: '/analytics/filings',
      iconGradient: 'from-amber-400 to-orange-600',
    },
    {
      icon: Clock,
      info: '3m 12s',
      desc: 'Median draft time',
      path: '/analytics/ai-usage',
      iconGradient: 'from-sky-400 to-blue-600',
    },
    // You can swap any of the above with these alternates:
    // {
    //   icon: Users,
    //   info: '42',
    //   desc: 'New client intakes (7d)',
    //   path: '/intake',
    //   iconGradient: 'from-rose-400 to-pink-600',
    // },
    // {
    //   icon: CreditCard,
    //   info: '£4.12',
    //   desc: 'AI cost per matter',
    //   path: '/analytics/costs',
    //   iconGradient: 'from-violet-400 to-purple-600',
    // },
    // {
    //   icon: AlertTriangle,
    //   info: '7',
    //   desc: 'SLA breaches (7d)',
    //   path: '/analytics/slas',
    //   iconGradient: 'from-lime-400 to-emerald-600',
    // },
  ];

  const renderItem = (item: IChannelStatsItem, index: number) => {
    const Icon = item.icon;
    return (
      <Card key={index}>
        <CardContent className="p-0 flex flex-col justify-between gap-6 h-full bg-cover rtl:bg-[left_top_-1.7rem] bg-[right_top_-1.7rem] bg-no-repeat channel-stats-bg">
          {/* Colorful gradient icon badge */}
          <div className="mt-4 ms-5">
            <div
              className={[
                'size-9 rounded-xl p-2 shadow-sm ring-1 ring-black/5',
                'bg-gradient-to-br', // gradient direction
                item.iconGradient, // colors from item
              ].join(' ')}
            >
              <Icon className="w-5 h-5 text-white" aria-hidden />
            </div>
          </div>

          <div className="flex flex-col gap-1 pb-4 px-5">
            <span className="text-3xl font-semibold text-mono">{item.info}</span>
            <span className="text-sm font-normal text-muted-forehead">
              {item.desc}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Fragment>
      <style>
        {`
          .channel-stats-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/bg-3.png')}');
          }
          .dark .channel-stats-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/bg-3-dark.png')}');
          }
        `}
      </style>

      {items.map((item, index) => renderItem(item, index))}
    </Fragment>
  );
};

export { ChannelStats, type IChannelStatsItem, type IChannelStatsItems };
