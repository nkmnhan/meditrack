import { createContext, useContext, type ReactNode } from "react";

interface DemoContextValue {
  readonly isDemo: true;
}

const DemoContext = createContext<DemoContextValue | null>(null);

interface DemoProviderProps {
  readonly children: ReactNode;
}

export function DemoProvider({ children }: DemoProviderProps) {
  return (
    <DemoContext.Provider value={{ isDemo: true }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoMode(): { isDemo: boolean } {
  const context = useContext(DemoContext);
  return { isDemo: context?.isDemo ?? false };
}
