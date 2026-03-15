import { useState, useEffect } from "react";

const STORAGE_KEY = "meditrack-feature-guide";
const LEGACY_KEY = "meditrack-welcome-seen";

interface FeatureGuideState {
  hasInteracted: boolean;
  completedStepIds: string[];
  isDismissed: boolean;
}

const DEFAULT_STATE: FeatureGuideState = {
  hasInteracted: false,
  completedStepIds: [],
  isDismissed: false,
};

function loadState(): FeatureGuideState {
  // Migrate from legacy key if exists
  const legacyValue = localStorage.getItem(LEGACY_KEY);
  if (legacyValue) {
    localStorage.removeItem(LEGACY_KEY);
    const migrated: FeatureGuideState = { ...DEFAULT_STATE, hasInteracted: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_STATE;

  try {
    return JSON.parse(stored) as FeatureGuideState;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: FeatureGuideState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useFeatureGuide(totalSteps: number) {
  const [state, setState] = useState<FeatureGuideState>(loadState);
  const [isOpen, setIsOpen] = useState(false);

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  const isFirstVisit = !state.hasInteracted;
  const completedStepIds = new Set(state.completedStepIds);
  const completionCount = state.completedStepIds.length;
  const isFullyCompleted = completionCount >= totalSteps;

  function openGuide() {
    setIsOpen(true);
    if (!state.hasInteracted) {
      setState(previous => ({ ...previous, hasInteracted: true }));
    }
  }

  function closeGuide() {
    setIsOpen(false);
  }

  function toggleGuide() {
    if (isOpen) {
      closeGuide();
    } else {
      openGuide();
    }
  }

  function markStepCompleted(stepId: string) {
    if (completedStepIds.has(stepId)) return;
    setState(previous => ({
      ...previous,
      completedStepIds: [...previous.completedStepIds, stepId],
    }));
  }

  function dismissGuide() {
    setState(previous => ({ ...previous, isDismissed: true }));
    setIsOpen(false);
  }

  function resetGuide() {
    setState({ ...DEFAULT_STATE, hasInteracted: true });
  }

  return {
    isOpen,
    isFirstVisit,
    isHidden: state.isDismissed,
    completedStepIds,
    completionCount,
    isFullyCompleted,
    openGuide,
    closeGuide,
    toggleGuide,
    markStepCompleted,
    dismissGuide,
    resetGuide,
  };
}
