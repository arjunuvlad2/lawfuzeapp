import { Fragment } from 'react';
import Link from 'next/link';
import { AvatarGroup } from '@/partials/common/avatar-group';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface IEntryCalloutProps {
  className: string;
}

const EntryCallout = ({ className }: IEntryCalloutProps) => {
  return (
    <Fragment>
      <style>
        {`
          .entry-callout-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/2.png')}');
          }
          .dark .entry-callout-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/2-dark.png')}');
          }
        `}
      </style>

      <Card className={`h-full ${className}`}>
        <CardContent className="p-10 bg-[length:80%] rtl:[background-position:-70%_25%] [background-position:175%_25%] bg-no-repeat entry-callout-bg">
          <div className="flex flex-col justify-center gap-4">
            <AvatarGroup
              size="size-10"
              group={[
                { filename: '300-4.png' },
                { filename: '300-1.png' },
                { filename: '300-2.png' },
                {
                  fallback: 'LF',
                  variant: 'text-white text-xs ring-background bg-primary',
                },
              ]}
            />

            <h2 className="text-xl font-semibold text-mono">
              Connect your team & join <br />
              the{' '}
              <Button mode="link" asChild className="text-xl font-semibold">
                <Link href="/signup">LawFuze Workspace</Link>
              </Button>
            </h2>

            <p className="text-sm font-normal text-secondary-foreground leading-5.5">
              Invite solicitors & staff, configure HMCTS-ready templates, <br />
              and unlock Ask • Draft • Summarise • Compare with <br />
              audit-ready logs, role-based access, and secure sharing.
            </p>
          </div>
        </CardContent>

        <CardFooter className="justify-center">
          <Button mode="link" underlined="dashed" asChild>
            <Link href="/onboarding">Get Started</Link>
          </Button>
        </CardFooter>
      </Card>
    </Fragment>
  );
};

export { EntryCallout, type IEntryCalloutProps };
