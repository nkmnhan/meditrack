import { createContext, useContext, useState, type ReactNode } from "react";
import type { ClaraPageContext } from "@/features/clara/types";

const DEFAULT_PAGE_CONTEXT: ClaraPageContext = { type: "default" };

interface ClaraPanelState {
  readonly isOpen: boolean;
  readonly prefillPrompt: string | null;
  readonly pageContext: ClaraPageContext;
  readonly openPanel: (prefill?: string) => void;
  readonly closePanel: () => void;
  readonly setPageContext: (context: ClaraPageContext) => void;
}

const ClaraPanelContext = createContext<ClaraPanelState | null>(null);

interface ClaraPanelProviderProps {
  readonly children: ReactNode;
}

export function ClaraPanelProvider({ children }: ClaraPanelProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefillPrompt, setPrefillPrompt] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<ClaraPageContext>(DEFAULT_PAGE_CONTEXT);

  const openPanel = (prefill?: string) => {
    setPrefillPrompt(prefill ?? null);
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  return (
    <ClaraPanelContext.Provider
      value={{ isOpen, prefillPrompt, pageContext, openPanel, closePanel, setPageContext }}
    >
      {children}
    </ClaraPanelContext.Provider>
  );
}

export function useClaraPanel(): ClaraPanelState {
  const context = useContext(ClaraPanelContext);
  if (!context) {
    throw new Error("useClaraPanel must be used within a ClaraPanelProvider");
  }
  return context;
}
