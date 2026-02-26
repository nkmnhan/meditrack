import { useState, useRef, useId } from "react";
import { Search, ChevronDown, X, Loader2 } from "lucide-react";
import { useGetDistinctProvidersQuery } from "../store/appointmentApi";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface ProviderSearchDropdownProps {
  readonly selectedProviderId: string | null;
  readonly onProviderSelect: (providerId: string | null) => void;
}

export function ProviderSearchDropdown({
  selectedProviderId,
  onProviderSelect,
}: ProviderSearchDropdownProps) {
  const [filterTerm, setFilterTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const { data: providers = [], isLoading } = useGetDistinctProvidersQuery();

  const selectedProvider = providers.find(
    (provider) => provider.providerId === selectedProviderId
  );

  const filteredProviders = providers.filter((provider) =>
    provider.providerName.toLowerCase().includes(filterTerm.toLowerCase())
  );

  function handleClear() {
    onProviderSelect(null);
    setFilterTerm("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  function handleSelect(providerId: string) {
    onProviderSelect(providerId);
    setFilterTerm("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  function handleInputChange(value: string) {
    setFilterTerm(value);
    setHighlightedIndex(-1);
    if (!isOpen) setIsOpen(true);
    if (selectedProviderId) {
      onProviderSelect(null);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        setHighlightedIndex((previous) =>
          previous < filteredProviders.length - 1 ? previous + 1 : 0
        );
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        setHighlightedIndex((previous) =>
          previous > 0 ? previous - 1 : filteredProviders.length - 1
        );
        break;
      }
      case "Enter": {
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredProviders.length) {
          handleSelect(filteredProviders[highlightedIndex].providerId);
        }
        break;
      }
      case "Escape": {
        event.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      }
    }
  }

  const hasProviderResults = !isLoading && filteredProviders.length > 0;

  const activeDescendantId =
    isOpen && hasProviderResults && highlightedIndex >= 0 && highlightedIndex < filteredProviders.length
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={isOpen && hasProviderResults ? listboxId : undefined}
          aria-activedescendant={activeDescendantId}
          aria-autocomplete="list"
          aria-label="Search providers"
          value={selectedProvider ? selectedProvider.providerName : filterTerm}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => {
              setIsOpen(false);
              setHighlightedIndex(-1);
            }, 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search provider..."
          className={clsxMerge(
            "w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-16 text-sm",
            "focus:border-primary-500 focus:ring-2 focus:ring-primary-500",
            "sm:w-64"
          )}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {selectedProviderId && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear provider selection"
              className="rounded p-0.5 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className={clsxMerge(
            "h-4 w-4 text-neutral-400 transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg">
          {isLoading && (
            <div role="status" className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading providers...
            </div>
          )}

          {!isLoading && filteredProviders.length === 0 && (
            <div role="status" className="px-4 py-3 text-sm text-neutral-500">
              No providers found
            </div>
          )}

          {!isLoading && filteredProviders.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Provider options"
              className="max-h-60 overflow-y-auto py-1"
            >
              {filteredProviders.map((provider, index) => (
                <li
                  key={provider.providerId}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={provider.providerId === selectedProviderId}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelect(provider.providerId);
                  }}
                  className={clsxMerge(
                    "flex cursor-pointer items-center px-4 py-2 text-sm",
                    "hover:bg-neutral-50",
                    provider.providerId === selectedProviderId && "bg-primary-50 font-medium text-primary-700",
                    index === highlightedIndex && "bg-neutral-100"
                  )}
                >
                  {provider.providerName}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
