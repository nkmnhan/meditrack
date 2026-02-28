import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, Mic, Send, ArrowRight } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useClaraPanel } from "./ClaraPanelContext";
import {
  claraSuggestions,
  mockConversations,
  type MockMessage,
} from "@/features/clara/data/clara-suggestions";

interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export function ClaraPanel() {
  const { isOpen, prefillPrompt, closePanel } = useClaraPanel();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle prefill prompt when panel opens
  useEffect(() => {
    if (isOpen && prefillPrompt) {
      handleSendMessage(prefillPrompt);
    }
    if (isOpen) {
      // Focus input when panel opens (slight delay for animation)
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prefillPrompt]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const findMockResponse = (userMessage: string): string => {
    // Try to match against known suggestions
    for (const suggestion of claraSuggestions) {
      if (userMessage === suggestion.prompt) {
        const conversation = mockConversations[suggestion.id];
        if (conversation) {
          const assistantMessage = conversation.find(
            (message: MockMessage) => message.role === "assistant"
          );
          if (assistantMessage) return assistantMessage.content;
        }
      }
    }
    return "I'm Clara, your AI medical secretary. This is a demo — in production, I'll connect to your clinical knowledge base and patient records to provide evidence-based assistance. Try clicking one of the suggestion chips above for a sample interaction.";
  };

  const handleSendMessage = (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const userMessage: ChatMessage = { role: "user", content: trimmedText };
    const assistantResponse: ChatMessage = {
      role: "assistant",
      content: findMockResponse(trimmedText),
    };

    setMessages((previous) => [...previous, userMessage, assistantResponse]);
    setInputValue("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleSuggestionClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleStartSession = () => {
    closePanel();
    navigate("/clara");
  };

  const handleOverlayClick = () => {
    closePanel();
  };

  const handlePanelClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  // Reset messages when panel closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setMessages([]);
        setInputValue("");
      }, 300); // Wait for close animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={clsxMerge(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={handleOverlayClick}
        aria-hidden={!isOpen}
      />

      {/* Slide-in panel */}
      <div
        role="dialog"
        aria-label="Clara AI Assistant"
        aria-modal="true"
        className={clsxMerge(
          "fixed inset-y-0 right-0 z-50",
          "w-[85vw] sm:max-w-[440px]",
          "flex flex-col bg-white shadow-lg",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        onClick={handlePanelClick}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-neutral-900">Clara</h2>
            <p className="text-xs text-neutral-500">AI Medical Secretary</p>
          </div>
          <button
            onClick={closePanel}
            className={clsxMerge(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700",
              "transition-colors"
            )}
            aria-label="Close Clara panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Start Clinical Session banner */}
          <button
            onClick={handleStartSession}
            className={clsxMerge(
              "mb-4 flex w-full items-center gap-3 rounded-lg p-3",
              "bg-gradient-to-r from-accent-500 to-accent-700",
              "text-white transition-opacity hover:opacity-90"
            )}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
              <Mic className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Start Clinical Session</p>
              <p className="text-xs text-white/80">
                Record and transcribe patient encounters
              </p>
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0" />
          </button>

          {/* Suggestion chips (show only when no messages) */}
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Try asking
              </p>
              {claraSuggestions.map((suggestion) => {
                const SuggestionIcon = suggestion.icon;
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion.prompt)}
                    className={clsxMerge(
                      "flex w-full items-center gap-3 rounded-lg border border-neutral-200 p-3",
                      "bg-white text-left transition-all",
                      "hover:border-accent-300 hover:shadow-sm"
                    )}
                  >
                    <div
                      className={clsxMerge(
                        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                        "bg-neutral-50 text-neutral-700"
                      )}
                    >
                      <SuggestionIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {suggestion.label}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {suggestion.category}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={clsxMerge(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={clsxMerge(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      message.role === "user"
                        ? "bg-primary-50 text-primary-800"
                        : "bg-accent-50 text-neutral-900"
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {formatMessageContent(message.content)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar (sticky bottom) */}
        <div className="border-t border-neutral-200 px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ask Clara anything..."
              className={clsxMerge(
                "flex-1 h-10 rounded-lg border border-neutral-200 px-3 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500",
                "placeholder:text-neutral-500"
              )}
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className={clsxMerge(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                "bg-accent-500 text-white",
                "transition-colors hover:bg-accent-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

/**
 * Simple markdown-like formatting for mock messages.
 * Handles bold (**text**), headings, and table-like structures.
 */
function formatMessageContent(content: string): React.ReactNode {
  const lines = content.split("\n");

  return lines.map((line, lineIndex) => {
    // Bold text: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const formattedParts = parts.map((part, partIndex) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={partIndex} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    return (
      <span key={lineIndex}>
        {lineIndex > 0 && "\n"}
        {formattedParts}
      </span>
    );
  });
}
