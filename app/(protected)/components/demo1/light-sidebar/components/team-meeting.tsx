import Link from 'next/link';
import { AvatarGroup } from '@/partials/common/avatar-group';
import { MapPin, Users } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

const TeamMeeting = () => {
  return (
    <Card className="h-full">
      <CardContent className="grow lg:p-7.5 lg:pt-6 p-5">
        <div className="flex items-center justify-between flex-wrap gap-5 mb-7.5">
          <div className="flex flex-col gap-1">
            <span className="text-xl font-semibold text-mono">
              Case Review — D8 Petition
            </span>
            <span className="text-sm font-semibold text-foreground">
              09:00 – 09:30
            </span>
          </div>

          {/* Keep the image as requested */}
          <img
            src={toAbsoluteUrl('/media/brand-logos/zoom.svg')}
            className="size-7"
            alt="Zoom"
          />
        </div>

        <p className="text-sm font-normal text-foreground leading-5.5 mb-8">
          Review AI-drafted D8, consent order outline, and risk flags. <br />
          Confirm HMCTS checklist, assign next actions, and set filing ETA.
        </p>

        <div className="flex rounded-lg bg-accent/50 gap-10 p-5">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-1.5 text-sm font-normal text-foreground">
              <MapPin size={16} className="text-base text-muted-foreground" />
              Location
            </div>
            <div className="text-sm font-medium text-foreground pt-1.5">
              Virtual (Zoom)
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-1.5 text-sm font-normal text-foreground">
              <Users size={16} className="text-base text-muted-foreground" />
              Team
            </div>
            <AvatarGroup
              size="size-[30px]"
              group={[
                { filename: '300-4.png' },  // Solicitor
                { filename: '300-1.png' },  // Paralegal
                { filename: '300-2.png' },  // Reviewer
                {
                  fallback: '+4',
                  variant: 'text-white border-success-soft bg-green-500',
                },
              ]}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-center">
        <Button mode="link" underlined="dashed" asChild>
          <Link href="/matters/lf-2025-001/review">Join Review</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export { TeamMeeting };
