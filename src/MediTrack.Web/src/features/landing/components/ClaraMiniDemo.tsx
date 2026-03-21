import { useState } from "react";
import { Sparkles, Mic, Send, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useScrollReveal } from "../hooks/useScrollReveal";

interface DemoMessage {
  readonly role: "doctor" | "patient" | "clara";
  readonly text: string;
}

interface DemoPrompt {
  readonly label: string;
  readonly transcript: DemoMessage[];
  readonly suggestion: string;
  readonly soapPreview: string;
}

const demoPrompts: DemoPrompt[] = [
  {
    label: "Headache consult",
    transcript: [
      { role: "doctor", text: "What brings you in today?" },
      { role: "patient", text: "I've been having headaches for about a week, mostly in the front. Worse in the mornings." },
      { role: "doctor", text: "Any nausea, vision changes, or sensitivity to light?" },
      { role: "patient", text: "No nausea, but bright lights bother me a little." },
    ],
    suggestion: "Consider: Tension-type headache (G44.2). Screen for medication overuse if OTC analgesics used >15 days/month.",
    soapPreview: "S: 1-week frontal headache, worse mornings, mild photosensitivity. No nausea or vision changes.\nO: Vitals stable. No focal neurological deficits.\nA: Tension-type headache (G44.2)\nP: Trial of NSAIDs, sleep hygiene counseling. F/U 2 weeks.",
  },
  {
    label: "Diabetes follow-up",
    transcript: [
      { role: "doctor", text: "How has your blood sugar been since we adjusted the metformin?" },
      { role: "patient", text: "Fasting is around 140, but after meals it spikes to 220 sometimes." },
      { role: "doctor", text: "Are you still walking 30 minutes a day?" },
      { role: "patient", text: "I've been slacking honestly, maybe twice a week." },
    ],
    suggestion: "A1C recheck indicated (last: 8.1%, 3 months ago). Consider adding a GLP-1 agonist if post-prandial control doesn't improve with lifestyle changes.",
    soapPreview: "S: Post-prandial glucose spikes to 220 despite metformin. Fasting ~140. Exercise reduced to 2x/week.\nO: A1C 8.1% (3 months prior). BMI 31.2.\nA: T2DM, suboptimal control (E11.65)\nP: Recheck A1C. Reinforce diet/exercise. Consider GLP-1 RA if no improvement in 4 weeks.",
  },
  {
    label: "Ankle injury",
    transcript: [
      { role: "doctor", text: "Tell me what happened to your ankle." },
      { role: "patient", text: "I stepped off a curb wrong yesterday and it rolled outward. It's swollen and I can barely walk on it." },
      { role: "doctor", text: "Can you move your toes? Any numbness?" },
      { role: "patient", text: "Toes are fine, no numbness. It just hurts a lot on the outside." },
    ],
    suggestion: "Ottawa Ankle Rules: Tenderness at lateral malleolus + inability to bear weight → X-ray indicated to rule out fracture.",
    soapPreview: "S: Inversion injury L ankle yesterday. Lateral swelling, pain with weight-bearing. No numbness.\nO: Edema lateral malleolus. TTP over ATFL. Toe ROM intact. Neurovascularly intact.\nA: L ankle sprain vs. lateral malleolus fracture (S93.401A)\nP: X-ray L ankle AP/lateral/mortise. RICE protocol. Air cast if no fracture.",
  },
];

export function ClaraMiniDemo() {
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [visibleMessageCount, setVisibleMessageCount] = useState(0);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showSoap, setShowSoap] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { ref, isVisible } = useScrollReveal({ threshold: 0.15 });

  const activePrompt = demoPrompts[activePromptIndex];

  const startDemo = (promptIndex: number) => {
    if (isAnimating) return;

    setActivePromptIndex(promptIndex);
    setVisibleMessageCount(0);
    setShowSuggestion(false);
    setShowSoap(false);
    setIsAnimating(true);

    const prompt = demoPrompts[promptIndex];
    const totalMessages = prompt.transcript.length;

    // Reveal messages one by one
    for (let messageIndex = 0; messageIndex < totalMessages; messageIndex++) {
      setTimeout(() => {
        setVisibleMessageCount(messageIndex + 1);
      }, (messageIndex + 1) * 800);
    }

    // Show suggestion after all messages
    setTimeout(() => {
      setShowSuggestion(true);
    }, (totalMessages + 1) * 800);

    // Show SOAP preview after suggestion
    setTimeout(() => {
      setShowSoap(true);
      setIsAnimating(false);
    }, (totalMessages + 2) * 800);
  };

  // Auto-start first demo when section becomes visible
  const hasAutoStarted = visibleMessageCount > 0 || isAnimating;
  if (isVisible && !hasAutoStarted) {
    startDemo(0);
  }

  return (
    <section
      id="clara-demo"
      className="bg-gradient-to-b from-background to-card py-16 md:py-24"
    >
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-accent-500" />
            <span className="text-xs font-semibold text-accent-700">Interactive Demo</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            See Clara in action
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Watch how Clara transcribes a consultation and generates clinical notes in real time.
          </p>
        </div>

        {/* Scenario Selector */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {demoPrompts.map((prompt, promptIndex) => (
            <button
              key={prompt.label}
              onClick={() => startDemo(promptIndex)}
              disabled={isAnimating}
              className={clsxMerge(
                "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                promptIndex === activePromptIndex
                  ? "bg-accent-500 text-white shadow-md"
                  : "border border-border bg-card text-foreground/80 hover:border-accent-200 hover:bg-accent-50",
                isAnimating && "cursor-not-allowed opacity-50"
              )}
            >
              {prompt.label}
            </button>
          ))}
        </div>

        {/* Demo Interface */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left — Transcript */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-error-500" />
                <span className="text-sm font-semibold text-foreground">Live Transcript</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-error-500 animate-blink" />
                <span className="text-xs text-error-600">Recording</span>
              </div>
            </div>
            {/* Messages */}
            <div className="min-h-[280px] space-y-3 p-5">
              {activePrompt.transcript.map((message, messageIndex) => {
                const isMessageVisible = messageIndex < visibleMessageCount;
                const isDoctor = message.role === "doctor";
                return (
                  <div
                    key={`${activePromptIndex}-${messageIndex}`}
                    className={clsxMerge(
                      "rounded-lg p-3 transition-all duration-300",
                      isDoctor ? "bg-primary-50" : "bg-secondary-50",
                      isMessageVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                    )}
                  >
                    <p className={clsxMerge(
                      "text-xs font-semibold",
                      isDoctor ? "text-primary-700" : "text-secondary-700"
                    )}>
                      {isDoctor ? "Dr. Smith" : "Patient"}
                    </p>
                    <p className="mt-1 text-sm text-foreground/80">{message.text}</p>
                  </div>
                );
              })}

              {/* Typing indicator while messages are still appearing */}
              {isAnimating && visibleMessageCount < activePrompt.transcript.length && (
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              )}
            </div>
          </div>

          {/* Right — Clara's Output */}
          <div className="space-y-4">
            {/* Suggestion Card */}
            <div className={clsxMerge(
              "rounded-xl border bg-card shadow-sm transition-all duration-500",
              showSuggestion
                ? "border-accent-200 opacity-100 translate-y-0"
                : "border-border opacity-0 translate-y-4"
            )}>
              <div className="flex items-center gap-2 border-b border-accent-100 bg-accent-50 px-5 py-3 rounded-t-xl">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-primary-700">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-semibold text-accent-700">Clara Suggestion</span>
              </div>
              <div className="p-5">
                <p className="text-sm leading-relaxed text-foreground/80">{activePrompt.suggestion}</p>
              </div>
            </div>

            {/* SOAP Note Preview */}
            <div className={clsxMerge(
              "rounded-xl border bg-card shadow-sm transition-all duration-500",
              showSoap
                ? "border-success-200 opacity-100 translate-y-0"
                : "border-border opacity-0 translate-y-4"
            )}>
              <div className="flex items-center justify-between border-b border-success-100 bg-success-50 px-5 py-3 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-success-600" />
                  <span className="text-sm font-semibold text-success-700">Auto-Generated SOAP Note</span>
                </div>
              </div>
              <div className="p-5">
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">
                  {activePrompt.soapPreview}
                </pre>
              </div>
            </div>

            {/* CTA */}
            <div className={clsxMerge(
              "text-center transition-all duration-500",
              showSoap ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}>
              <Link
                to="/clara/session/demo"
                className={clsxMerge(
                  "inline-flex items-center gap-2 rounded-xl px-6 py-3",
                  "bg-gradient-to-r from-accent-500 to-accent-700 text-sm font-semibold text-white",
                  "shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
                )}
              >
                <Sparkles className="h-4 w-4" />
                Try Full Clara Session
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
