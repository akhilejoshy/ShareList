"use client";

import Link from "next/link";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface FilterOption {
  label: string;
  href: string;
  active: boolean;
}

export interface FilterGroup {
  label: string;
  options: FilterOption[];
}

export default function FilterPopover({
  groups,
  activeCount = 0,
}: {
  groups: FilterGroup[];
  activeCount?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <Badge variant="default" className="px-1.5 py-0 text-xs">
                {activeCount}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-72" align="start">
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => (
                  <Link key={option.label} href={option.href} onClick={() => setOpen(false)}>
                    <Badge variant={option.active ? "default" : "secondary"} className="cursor-pointer">
                      {option.label}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
