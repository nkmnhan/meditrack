import { useState } from "react";
import { Bug, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useSearchKnowledgeMutation } from "../store/claraApi";
import type { KnowledgeSearchResult } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface DevPanelProps {
  readonly className?: string;
}

/**
 * Development-only panel for testing AI features.
 * Provides direct access to knowledge search and other dev utilities.
 */
export function DevPanel({ className }: DevPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>(
    []
  );

  const [searchKnowledge, { isLoading: isSearching }] =
    useSearchKnowledgeMutation();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const result = await searchKnowledge({
        query: searchQuery,
        topK: 5,
        minScore: 0.3,
      }).unwrap();

      setSearchResults(result.results);
    } catch (error) {
      console.error("Knowledge search failed:", error);
    }
  };

  // Only show in development mode
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div
      className={clsxMerge(
        "fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg border border-neutral-200 shadow-lg overflow-hidden",
        className
      )}
    >
      {/* Header - Always Visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-neutral-100 hover:bg-neutral-200 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <Bug className="h-4 w-4" />
          Dev Panel
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-neutral-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-500" />
        )}
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Knowledge Search */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Knowledge Search
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch();
                }}
                placeholder="Search medical knowledge..."
                className="flex-1 h-8 px-2 text-sm rounded border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className={clsxMerge(
                  "h-8 w-8 rounded flex items-center justify-center",
                  "bg-primary-600 text-white hover:bg-primary-700",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-neutral-600">
                Results ({searchResults.length})
              </h3>
              {searchResults.map((result) => (
                <SearchResultCard key={result.chunkId} result={result} />
              ))}
            </div>
          )}

          {/* Environment Info */}
          <div className="pt-2 border-t border-neutral-200">
            <h3 className="text-xs font-medium text-neutral-600 mb-2">
              Environment
            </h3>
            <div className="space-y-1 text-xs text-neutral-500">
              <p>
                Mode:{" "}
                <span className="font-mono">
                  {import.meta.env.MODE}
                </span>
              </p>
              <p>
                API:{" "}
                <span className="font-mono text-xs break-all">
                  {import.meta.env.VITE_CLARA_API_URL || "https://localhost:5005"}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchResultCardProps {
  readonly result: KnowledgeSearchResult;
}

function SearchResultCard({ result }: SearchResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const truncatedContent =
    result.content.length > 100
      ? `${result.content.substring(0, 100)}...`
      : result.content;

  return (
    <div className="p-2 bg-neutral-50 rounded border border-neutral-200 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-neutral-800 truncate">
            {result.documentName}
          </p>
          {result.category && (
            <span className="text-neutral-500">{result.category}</span>
          )}
        </div>
        <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 text-xs">
          {(result.score * 100).toFixed(0)}%
        </span>
      </div>

      <p className="text-neutral-600 mt-1">
        {isExpanded ? result.content : truncatedContent}
      </p>

      {result.content.length > 100 && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary-600 hover:text-primary-700 mt-1"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
