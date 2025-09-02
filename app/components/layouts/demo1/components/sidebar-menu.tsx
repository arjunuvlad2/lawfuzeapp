'use client';

import { JSX, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MENU_SIDEBAR } from '@/config/menu.config';
import { MenuConfig, MenuItem } from '@/config/types';
import { cn } from '@/lib/utils';
import {
  AccordionMenu,
  AccordionMenuClassNames,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from '@/components/ui/accordion-menu';
import { Badge } from '@/components/ui/badge';

export function SidebarMenu() {
  const pathname = usePathname();

  const matchPath = useCallback(
    (path: string = ''): boolean =>
      !!path && (path === pathname || (path.length > 1 && pathname.startsWith(path))),
    [pathname],
  );

  // Tidy, left-aligned styles (active state is applied via data-[selected=true])
  const classNames: AccordionMenuClassNames = {
    root: 'lg:ps-1 space-y-3',
    group: 'gap-px',
    label: 'uppercase text-xs font-medium text-muted-foreground/70 pt-2.25 pb-px',
    separator: '',
    item:
      'h-9 w-full rounded-md px-2 text-sm font-medium ' +
      'flex items-center gap-2 ' +
      'hover:bg-muted/70 hover:text-foreground ' +
      'data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary ' +
      'transition-colors',
    sub: '',
    subTrigger:
      'h-9 w-full rounded-md px-2 text-sm font-medium ' +
      'flex items-center gap-2 ' +
      'hover:bg-muted/70 hover:text-foreground ' +
      'data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary ' +
      'transition-colors',
    subContent: 'py-0',
    indicator: '',
  };

  const buildMenu = (items: MenuConfig): JSX.Element[] =>
    items.map((item: MenuItem, index: number) =>
      item.heading ? buildMenuHeading(item, index) : item.disabled ? buildMenuItemRootDisabled(item, index) : buildMenuItemRoot(item, index),
    );

  const buildMenuItemRoot = (item: MenuItem, index: number): JSX.Element => {
    if (item.children) {
      return (
        <AccordionMenuSub key={index} value={item.path || `root-${index}`}>
          <AccordionMenuSubTrigger>
            {item.icon && (
              <item.icon className="size-4 shrink-0 text-muted-foreground" data-slot="accordion-menu-icon" />
            )}
            <span className="truncate" data-slot="accordion-menu-title">
              {item.title}
            </span>
          </AccordionMenuSubTrigger>

          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `root-${index}`}
            className="ps-6"
          >
            <AccordionMenuGroup>{buildMenuItemChildren(item.children, 1)}</AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    }

    const active = matchPath(item.path);
    return (
      <AccordionMenuItem key={index} value={item.path || ''}>
        <Link
          href={item.path || '#'}
          className="flex w-full items-center gap-2"
          aria-current={active ? 'page' : undefined}
        >
          {item.icon && (
            <item.icon className="size-4 shrink-0 text-muted-foreground" data-slot="accordion-menu-icon" />
          )}
          <span className="truncate" data-slot="accordion-menu-title">
            {item.title}
          </span>
        </Link>
      </AccordionMenuItem>
    );
  };

  const buildMenuItemRootDisabled = (item: MenuItem, index: number): JSX.Element => (
    <AccordionMenuItem key={index} value={`disabled-${index}`} aria-disabled className="opacity-60">
      {item.icon && (
        <item.icon className="size-4 shrink-0 text-muted-foreground" data-slot="accordion-menu-icon" />
      )}
      <span className="truncate" data-slot="accordion-menu-title">
        {item.title}
      </span>
      <Badge variant="secondary" size="sm" className="ms-auto">Soon</Badge>
    </AccordionMenuItem>
  );

  const buildMenuItemChildren = (items: MenuConfig, level = 0): JSX.Element[] =>
    items.map((item: MenuItem, index: number) =>
      item.disabled ? buildMenuItemChildDisabled(item, index, level) : buildMenuItemChild(item, index, level),
    );

  const buildMenuItemChild = (item: MenuItem, index: number, level = 0): JSX.Element => {
    if (item.children) {
      return (
        <AccordionMenuSub key={index} value={item.path || `child-${level}-${index}`}>
          <AccordionMenuSubTrigger className="text-[13px]">
            {item.collapse ? (
              <span className="text-muted-foreground">
                <span className="hidden [[data-state=open]>span>&]:inline">{item.collapseTitle}</span>
                <span className="inline [[data-state=open]>span>&]:hidden">{item.expandTitle}</span>
              </span>
            ) : (
              <span className="truncate">{item.title}</span>
            )}
          </AccordionMenuSubTrigger>

          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `child-${level}-${index}`}
            className={cn('ps-4', !item.collapse && 'relative')}
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(item.children, item.collapse ? level : level + 1)}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    }

    const active = matchPath(item.path);
    return (
      <AccordionMenuItem key={index} value={item.path || ''} className="text-[13px]">
        <Link
          href={item.path || '#'}
          className="flex w-full items-center gap-2"
          aria-current={active ? 'page' : undefined}
        >
          <span className="truncate">{item.title}</span>
        </Link>
      </AccordionMenuItem>
    );
  };

  const buildMenuItemChildDisabled = (item: MenuItem, index: number, level = 0): JSX.Element => (
    <AccordionMenuItem
      key={index}
      value={`disabled-child-${level}-${index}`}
      className="text-[13px] opacity-60"
      aria-disabled
    >
      <span className="truncate" data-slot="accordion-menu-title">
        {item.title}
      </span>
      <Badge variant="secondary" size="sm" className="ms-auto me-[-10px]">
        Soon
      </Badge>
    </AccordionMenuItem>
  );

  const buildMenuHeading = (item: MenuItem, index: number): JSX.Element => (
    <AccordionMenuLabel key={index}>{item.heading}</AccordionMenuLabel>
  );

  return (
    <div className="kt-scrollable-y-hover flex grow shrink-0 py-5 px-5 lg:max-h-[calc(100vh-5.5rem)]">
      <AccordionMenu
        selectedValue={pathname}
        matchPath={matchPath}
        type="single"
        collapsible
        classNames={classNames}
      >
        {buildMenu(MENU_SIDEBAR)}
      </AccordionMenu>
    </div>
  );
}
