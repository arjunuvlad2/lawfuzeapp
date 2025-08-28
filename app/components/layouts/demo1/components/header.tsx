'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SearchDialog } from '@/partials/dialogs/search/search-dialog';
import { AppsDropdownMenu } from '@/partials/topbar/apps-dropdown-menu';
import { ChatSheet } from '@/partials/topbar/chat-sheet';
import { NotificationsSheet } from '@/partials/topbar/notifications-sheet';
import { UserDropdownMenu } from '@/partials/topbar/user-dropdown-menu';
import {
  Bell,
  LayoutGrid,
  Menu,
  MessageCircleMore,
  Search,
  SquareChevronRight,
} from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Container } from '@/components/common/container';
import { StoreClientTopbar } from '@/app/(protected)/store-client/components/common/topbar';
import { Breadcrumb } from './breadcrumb';
import { MegaMenuMobile } from './mega-menu-mobile';
import { SidebarMenu } from './sidebar-menu';
import { motion } from 'framer-motion';

export function Header() {
  const [isSidebarSheetOpen, setIsSidebarSheetOpen] = useState(false);
  const [isMegaMenuSheetOpen, setIsMegaMenuSheetOpen] = useState(false);

  const pathname = usePathname();
  const mobileMode = useIsMobile();

  const scrollPosition = useScrollPosition();
  const headerSticky: boolean = scrollPosition > 0;

  // Close sheet when route changes
  useEffect(() => {
    setIsSidebarSheetOpen(false);
    setIsMegaMenuSheetOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'header fixed top-0 z-10 start-0 flex items-stretch shrink-0 border-b border-transparent bg-background end-0 pe-[var(--removed-body-scroll-bar-size,0px)]',
        headerSticky && 'border-b border-border',
      )}
    >
      <Container className="flex items-stretch lg:gap-4">
        {/* HeaderLogo */}
        <div className="flex gap-1 lg:hidden items-center gap-2.5">
          <Link href="/" className="shrink-0">
            <motion.div
              initial="hidden"
              animate="visible"
              className="flex items-center gap-3"
            >
              {/* Glowing Bolt Part */}
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                width={50}
                height={50}
                initial={{ rotate: -30, scale: 0.8, opacity: 0 }}
                animate={{ rotate: 0, scale: 1.1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 8,
                  delay: 0.3,
                }}
              >
                <motion.path
                  d="M52 10 L42 40 H60 L38 90 L48 50 H30 Z"
                  fill="url(#boltGradient)"
                  stroke="white"
                  strokeWidth={1}
                  initial={{ pathLength: 0, scale: 0.8, rotate: -10, opacity: 0 }}
                  animate={{
                    pathLength: 1,
                    scale: [1, 1.05, 0.95, 1],
                    opacity: 1,
                    rotate: 0,
                    filter: [
                      "drop-shadow(0 0 4px #00f6ff)",
                      "drop-shadow(0 0 12px #00f6ff)",
                      "drop-shadow(0 0 4px #00f6ff)"
                    ]
                  }}
                  transition={{
                    pathLength: { duration: 1.2, ease: "easeInOut" },
                    scale: {
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "loop",
                      ease: "easeInOut"
                    },
                    filter: {
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "loop",
                      ease: "easeInOut"
                    },
                    opacity: { duration: 0.6, delay: 0.3 }
                  }}
                />

                <defs>
                  <linearGradient id="boltGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#00ffff" />
                    <stop offset="100%" stopColor="#0090ff" />
                  </linearGradient>
                </defs>
              </motion.svg>

             
            </motion.div>
          </Link>
          <div className="flex items-center">
            {mobileMode && (
              <Sheet
                open={isSidebarSheetOpen}
                onOpenChange={setIsSidebarSheetOpen}
              >
                <SheetTrigger asChild>
                  <Button variant="ghost" mode="icon">
                    <Menu className="text-muted-foreground/70" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="p-0 gap-0 w-[275px]"
                  side="left"
                  close={false}
                >
                  <SheetHeader className="p-0 space-y-0" />
                  <SheetBody className="p-0 overflow-y-auto">
                    <SidebarMenu />
                  </SheetBody>
                </SheetContent>
              </Sheet>
            )}
            {mobileMode && (
              <Sheet
                open={isMegaMenuSheetOpen}
                onOpenChange={setIsMegaMenuSheetOpen}
              >
                <SheetTrigger asChild>
                  <Button variant="ghost" mode="icon">
                    <SquareChevronRight className="text-muted-foreground/70" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="p-0 gap-0 w-[275px]"
                  side="left"
                  close={false}
                >
                  <SheetHeader className="p-0 space-y-0" />
                  <SheetBody className="p-0 overflow-y-auto">
                    <MegaMenuMobile />
                  </SheetBody>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        {/* Main Content (MegaMenu or Breadcrumbs) */}
        {pathname.startsWith('/account') ? (
          <Breadcrumb />
        ) : (
          !mobileMode
        )}

        {/* HeaderTopbar */}
        <div className="flex items-center gap-3 ml-auto">
          {pathname.startsWith('/store-client') ? (
            <StoreClientTopbar />
          ) : (
            <>
              {!mobileMode && (
                <SearchDialog
                  trigger={
                    <Button
                      variant="ghost"
                      mode="icon"
                      shape="circle"
                      className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                    >
                      <Search className="size-4.5!" />
                    </Button>
                  }
                />
              )}
              <NotificationsSheet
                trigger={
                  <Button
                    variant="ghost"
                    mode="icon"
                    shape="circle"
                    className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                  >
                    <Bell className="size-4.5!" />
                  </Button>
                }
              />
              <ChatSheet
                trigger={
                  <Button
                    variant="ghost"
                    mode="icon"
                    shape="circle"
                    className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                  >
                    <MessageCircleMore className="size-4.5!" />
                  </Button>
                }
              />
              <AppsDropdownMenu
                trigger={
                  <Button
                    variant="ghost"
                    mode="icon"
                    shape="circle"
                    className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                  >
                    <LayoutGrid className="size-4.5!" />
                  </Button>
                }
              />
              <UserDropdownMenu
                trigger={
                  <img
                    className="size-9 rounded-full border-2 border-green-500 shrink-0 cursor-pointer"
                    src={toAbsoluteUrl('/media/avatars/300-2.png')}
                    alt="User Avatar"
                  />
                }
              />
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
