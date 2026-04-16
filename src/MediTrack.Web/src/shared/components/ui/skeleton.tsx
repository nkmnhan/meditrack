import { clsxMerge } from "@/shared/utils/clsxMerge";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsxMerge("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
