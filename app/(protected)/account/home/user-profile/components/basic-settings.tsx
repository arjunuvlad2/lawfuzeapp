'use client';

import * as React from 'react';
import Link from 'next/link';
import { SquarePen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { PasswordChangeDialog } from '../../../security/components/PasswordChangeDialog';

interface IBasicSettingsProps {
  title: string;
}

const BasicSettings = ({ title }: IBasicSettingsProps) => {
  // Local UI state to control the password dialog
  const [openPassword, setOpenPassword] = React.useState(false);

  return (
    <>
      <Card className="min-w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="public-profile" className="text-sm">Public Profile</Label>
            <Switch id="public-profile" defaultChecked size="sm" />
          </div>
        </CardHeader>

        <CardContent className="kt-scrollable-x-auto pb-3 p-0">
          <Table className="align-middle text-sm text-muted-foreground">
            <TableBody>
              {/* Email row (unchanged) */}
              <TableRow>
                <TableCell className="py-2 min-w-36 text-secondary-foreground font-normal">Email</TableCell>
                <TableCell className="py-2 min-w-60">
                  <Link href="#" className="text-foreground font-normal text-sm hover:text-primary-active">
                    jasontt@studio.co
                  </Link>
                </TableCell>
                <TableCell className="py-2 max-w-16 text-end">
                  <Button variant="ghost" mode="icon">
                    <SquarePen size={16} className="text-blue-500" />
                  </Button>
                </TableCell>
              </TableRow>

              {/* Password row → opens modal */}
              <TableRow>
                <TableCell className="py-2 text-secondary-foreground font-normal">Password</TableCell>
                <TableCell className="py-2 text-secondary-foreground font-normal">
                  Password last changed 2 months ago
                </TableCell>
                <TableCell className="py-2 text-end">
                  <Button
                    variant="ghost"
                    mode="icon"
                    onClick={() => setOpenPassword(true)}  // ← open dialog
                  >
                    <SquarePen size={16} className="text-blue-500" />
                  </Button>
                </TableCell>
              </TableRow>

              {/* ... the rest of your rows stay unchanged ... */}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mount the dialog near the component root */}
      <PasswordChangeDialog open={openPassword} onOpenChange={setOpenPassword} />
    </>
  );
};

export { BasicSettings, type IBasicSettingsProps };
