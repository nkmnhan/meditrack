import { useEffect, useRef, useState } from "react";

interface UseScrollRevealOptions {
  readonly threshold?: number;
  readonly rootMargin?: string;
}

interface UseScrollRevealResult<T extends HTMLElement> {
  readonly ref: React.RefObject<T | null>;
  readonly isVisible: boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(options: UseScrollRevealOptions = {}): UseScrollRevealResult<T> {
  const { threshold = 0.1, rootMargin = "0px" } = options;
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return { ref, isVisible };
}
