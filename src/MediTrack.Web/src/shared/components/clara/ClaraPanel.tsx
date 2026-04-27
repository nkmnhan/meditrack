import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, Mic, Send, ArrowRight } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useClaraPanel } from "./ClaraPanelContext";
import { claraSuggestions } from "@/features/clara/data/clara-suggestions";
import { useAskClaraMutation } from "@/features/clara/store/claraApi";

interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

function formatMessageContent(content: string): React.ReactNode {
  const lines = content.split("\n");
  return lines.map((line, lineIndex) => {
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

export function ClaraPanel() {
  const { isOpen, prefillPrompt, pageContext, closePanel } = useClaraPanel();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [askClara] = useAskClaraMutation();

  const handleSendMessage = async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || isThinking) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: trimmedText },
    ]);
    setInputValue("");
    setIsThinking(true);

    try {
      const result = await askClara({
        question: trimmedText,
        patientId: pageContext.patientId,
      }).unwrap();
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: result.answer },
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
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
    if (pageContext.patientId) {
      navigate(`/clara?patientId=${pageContext.patientId}`);
    } else {
      navigate("/clara");
    }
  };

  const handleOverlayClick = () => {
    closePanel();
  };

  const handlePanelClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  useEffect(() => {
    if (isOpen && prefillPrompt) {
      handleSendMessage(prefillPrompt);
    }
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prefillPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setMessages([]);
        setInputValue("");
        setIsThinking(false);
      }, 300);
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
          "flex flex-col bg-card shadow-lg",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        onClick={handlePanelClick}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">Clara</h2>
            <p className="text-xs text-muted-foreground">
              {pageContext.patientName
                ? `Assisting with ${pageContext.patientName}`
                : "AI Medical Secretary"}
            </p>
          </div>
          <button
            onClick={closePanel}
            className={clsxMerge(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              "text-muted-foreground hover:bg-muted hover:text-foreground/80",
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
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-foreground/20">
              <Mic className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">
                {pageContext.patientName
                  ? `Start Session with ${pageContext.patientName}`
                  : "Start Clinical Session"}
              </p>
              <p className="text-xs text-white/80">
                Record and transcribe patient encounters
              </p>
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0" />
          </button>

          {/* Suggestion chips — shown when no messages and not waiting */}
          {messages.length === 0 && !isThinking && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Try asking
              </p>
              {claraSuggestions
                .filter(
                  (suggestion) =>
                    !suggestion.relevantContexts ||
                    pageContext.type === "default" ||
                    suggestion.relevantContexts.includes(pageContext.type)
                )
                .map((suggestion) => {
                  const SuggestionIcon = suggestion.icon;
                  return (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion.prompt)}
                      disabled={isThinking}
                      className={clsxMerge(
                        "flex w-full items-center gap-3 rounded-lg border border-border p-3",
                        "bg-card text-left transition-all",
                        "hover:border-accent-300 hover:shadow-sm",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    >
                      <div
                        className={clsxMerge(
                          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                          "bg-muted text-foreground/80"
                        )}
                      >
                        <SuggestionIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {suggestion.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.category}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Thinking indicator — shown before first message arrives */}
          {messages.length === 0 && isThinking && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-accent-50 px-3 py-2 text-sm text-muted-foreground">
                Clara is thinking…
              </div>
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
                      "max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm",
                      message.role === "user"
                        ? "bg-primary-50 text-primary-800"
                        : "bg-accent-50 text-foreground dark:text-foreground"
                    )}
                  >
                    {formatMessageContent(message.content)}
                  </div>
                </div>
              ))}

              {/* Typing indicator — shown after ≥1 message while waiting */}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-accent-50 px-3 py-2 text-sm text-muted-foreground">
                    Clara is thinking…
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-border px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ask Clara anything…"
              disabled={isThinking}
              className={clsxMerge(
                "h-10 flex-1 rounded-lg border border-border bg-input text-foreground px-3 text-sm",
                "placeholder:text-muted-foreground",
                "focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isThinking}
              className={clsxMerge(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                "bg-accent-500 text-white transition-colors hover:bg-accent-700",
                "disabled:cursor-not-allowed disabled:opacity-50"
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
