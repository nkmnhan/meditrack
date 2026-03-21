import { useNavigate } from "react-router-dom";
import { BookOpen, Check, ChevronRight } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { FEATURE_GUIDE_STEPS } from "./FeatureGuideData";

interface FeatureGuidePanelProps {
  readonly completedStepIds: Set<string>;
  readonly completionCount: number;
  readonly onStepClick: (stepId: string) => void;
  readonly onDismiss: () => void;
  readonly onClose: () => void;
}

export function FeatureGuidePanel({
  completedStepIds,
  completionCount,
  onStepClick,
  onDismiss,
  onClose,
}: FeatureGuidePanelProps) {
  const navigate = useNavigate();
  const totalSteps = FEATURE_GUIDE_STEPS.length;
  const progressPercent = totalSteps > 0 ? (completionCount / totalSteps) * 100 : 0;

  function handleStepClick(stepId: string, navigateTo: string) {
    onStepClick(stepId);
    onClose();
    navigate(navigateTo);
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary-700" />
          <h3 className="text-sm font-bold text-foreground">Quick Tour</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Explore MediTrack at your own pace</p>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-border">
            <div
              className="h-1.5 rounded-full bg-primary-700 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">
            {completionCount}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Step cards */}
      <div className="max-h-[50vh] overflow-y-auto px-2 py-2">
        <div className="space-y-1">
          {FEATURE_GUIDE_STEPS.map((step) => {
            const isCompleted = completedStepIds.has(step.id);
            const StepIcon = step.icon;

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id, step.navigateTo)}
                className={clsxMerge(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                  isCompleted
                    ? "bg-muted border-border hover:bg-muted/80"
                    : "border-transparent hover:bg-muted hover:border-border"
                )}
              >
                {/* Icon */}
                <div
                  className={clsxMerge(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
                    isCompleted ? "bg-success-50" : step.iconBg
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-success-600" />
                  ) : (
                    <StepIcon className={clsxMerge("h-4 w-4", step.iconColor)} />
                  )}
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p
                    className={clsxMerge(
                      "text-sm font-medium",
                      isCompleted ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight
                  className={clsxMerge(
                    "h-4 w-4 flex-shrink-0",
                    isCompleted ? "text-border" : "text-muted-foreground"
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <button
          onClick={onDismiss}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Don't show again
        </button>
      </div>
    </div>
  );
}
