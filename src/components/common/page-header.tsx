import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  actionHref?: string;
  onAction?: () => void;
};

export function PageHeader({ title, description, actionLabel, actionIcon, actionHref, onAction }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actionLabel ? (
        actionHref ? (
          <Link className={cn(buttonVariants(), "w-fit")} to={actionHref}>
            {actionIcon}
            {actionLabel}
          </Link>
        ) : (
          <Button onClick={onAction}>
            {actionIcon}
            {actionLabel}
          </Button>
        )
      ) : null}
    </div>
  );
}
