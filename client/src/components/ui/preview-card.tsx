/**
 * Preview Card Component
 * Shows rich preview on hover using Radix UI Hover Card
 * Inspired by Linear's hover previews
 */

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import { Separator } from "./separator";
import type { LucideIcon } from "lucide-react";

const HoverCard = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-80 rounded-lg border bg-card p-4 text-card-foreground shadow-lg",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
      "data-[side=bottom]:slide-in-from-top-2",
      "data-[side=left]:slide-in-from-right-2",
      "data-[side=right]:slide-in-from-left-2",
      "data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

interface PreviewItem {
  label: string;
  value: string | React.ReactNode;
  icon?: LucideIcon;
}

interface PreviewCardProps {
  /**
   * The trigger element (e.g., entity name, service title)
   */
  trigger: React.ReactNode;

  /**
   * Title shown in the preview
   */
  title: string;

  /**
   * Subtitle or description
   */
  subtitle?: string;

  /**
   * Status badge
   */
  status?: {
    label: string;
    variant?: "default" | "success" | "warning" | "error";
  };

  /**
   * Array of preview items to display
   */
  items: PreviewItem[];

  /**
   * Optional footer content (e.g., "View details" link)
   */
  footer?: React.ReactNode;

  /**
   * Open delay in ms
   */
  openDelay?: number;

  /**
   * Close delay in ms
   */
  closeDelay?: number;
}

/**
 * Preview Card - Shows rich information on hover
 *
 * @example
 * ```tsx
 * <PreviewCard
 *   trigger={<span className="hover:underline cursor-pointer">Tech Innovations Pvt Ltd</span>}
 *   title="Tech Innovations Pvt Ltd"
 *   subtitle="Private Limited Company"
 *   status={{ label: "Active", variant: "success" }}
 *   items={[
 *     { label: "CIN", value: "U72300DL2022PTC123456" },
 *     { label: "GSTIN", value: "07AABCT1234F1Z5" },
 *     { label: "Compliance Score", value: "85%" },
 *   ]}
 *   footer={<Link to="/entity/1">View full details →</Link>}
 * />
 * ```
 */
export function PreviewCard({
  trigger,
  title,
  subtitle,
  status,
  items,
  footer,
  openDelay = 300,
  closeDelay = 200,
}: PreviewCardProps) {
  return (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent>
        <div className="space-y-3">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold leading-none">{title}</h4>
              {status && (
                <Badge
                  className={cn(
                    status.variant === "success" && "bg-success/10 text-success border-success/20",
                    status.variant === "warning" && "bg-warning/10 text-warning border-warning/20",
                    status.variant === "error" && "bg-error/10 text-error border-error/20"
                  )}
                >
                  {status.label}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>

          <Separator />

          {/* Preview Items */}
          <div className="space-y-2">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="flex items-start justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
                    <span>{item.label}</span>
                  </div>
                  <div className="font-medium text-right">{item.value}</div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {footer && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {footer}
              </div>
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Entity Preview Card - Preconfigured for business entities
 */
export function EntityPreviewCard({
  trigger,
  entity,
  footer,
}: {
  trigger: React.ReactNode;
  entity: {
    name: string;
    type: string;
    cin?: string;
    gstin?: string;
    complianceScore?: number;
    status: string;
  };
  footer?: React.ReactNode;
}) {
  const items: PreviewItem[] = [
    { label: "Entity Type", value: entity.type },
  ];

  if (entity.cin) {
    items.push({ label: "CIN", value: entity.cin });
  }

  if (entity.gstin) {
    items.push({ label: "GSTIN", value: entity.gstin });
  }

  if (entity.complianceScore !== undefined) {
    items.push({
      label: "Compliance Score",
      value: (
        <span
          className={cn(
            "font-semibold",
            entity.complianceScore >= 80 && "text-success",
            entity.complianceScore >= 60 && entity.complianceScore < 80 && "text-warning",
            entity.complianceScore < 60 && "text-error"
          )}
        >
          {entity.complianceScore}%
        </span>
      ),
    });
  }

  return (
    <PreviewCard
      trigger={trigger}
      title={entity.name}
      subtitle="Business Entity"
      status={{
        label: entity.status,
        variant: entity.status.toLowerCase() === "active" ? "success" : "default",
      }}
      items={items}
      footer={footer}
    />
  );
}

/**
 * Service Preview Card - Preconfigured for service requests
 */
export function ServicePreviewCard({
  trigger,
  service,
  footer,
}: {
  trigger: React.ReactNode;
  service: {
    name: string;
    status: string;
    progress?: number;
    deadline?: string;
    assignedTo?: string;
  };
  footer?: React.ReactNode;
}) {
  const items: PreviewItem[] = [
    { label: "Status", value: service.status },
  ];

  if (service.progress !== undefined) {
    items.push({
      label: "Progress",
      value: `${service.progress}%`,
    });
  }

  if (service.deadline) {
    items.push({
      label: "Deadline",
      value: new Date(service.deadline).toLocaleDateString(),
    });
  }

  if (service.assignedTo) {
    items.push({
      label: "Assigned To",
      value: service.assignedTo,
    });
  }

  const statusVariant =
    service.status.toLowerCase() === "completed"
      ? "success"
      : service.status.toLowerCase().includes("pending")
      ? "warning"
      : "default";

  return (
    <PreviewCard
      trigger={trigger}
      title={service.name}
      subtitle="Service Request"
      status={{ label: service.status, variant: statusVariant }}
      items={items}
      footer={footer}
    />
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
