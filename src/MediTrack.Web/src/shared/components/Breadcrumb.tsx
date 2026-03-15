import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

interface BreadcrumbProps {
  readonly items: readonly BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
              )}
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className={clsxMerge(
                    "text-neutral-500 transition-colors hover:text-neutral-700"
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={clsxMerge(
                    isLast
                      ? "font-medium text-neutral-900"
                      : "text-neutral-500"
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
