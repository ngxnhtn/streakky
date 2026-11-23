import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { segmentItem, segmentPill, segmentTrack } from "@streakky/ui/components/segmented";
import { cn } from "@streakky/ui/lib/utils";

/** Tabs drawn as a segmented track; the pill slides to the active tab. Click to switch. */
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      activationMode="manual"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  index,
  count,
  children,
  style,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  /** the active tab's position and the number of tabs, for the sliding pill */
  index: number;
  count: number;
}) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(segmentTrack, className)}
      style={{ "--n": count, "--i": index, ...style } as React.CSSProperties}
      {...props}
    >
      <span aria-hidden="true" className={segmentPill} />
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(segmentItem, className)}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("animate-rise outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
