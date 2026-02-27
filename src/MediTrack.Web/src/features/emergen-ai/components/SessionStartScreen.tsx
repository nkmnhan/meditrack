import { useState } from "react";
import { useNavigate } from "react-router";
import { Mic, Brain, Clock, AlertCircle, Loader2 } from "lucide-react";
import { useStartSessionMutation } from "../store/emergenApi";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface SessionStartScreenProps {
  readonly className?: string;
}

/**
 * Entry point for starting a new Emergen AI session.
 * Doctors can optionally select a patient before starting.
 */
export function SessionStartScreen({ className }: SessionStartScreenProps) {
  const navigate = useNavigate();
  const [startSession, { isLoading, error }] = useStartSessionMutation();
  const [patientId, setPatientId] = useState<string>("");

  const handleStartSession = async () => {
    try {
      const result = await startSession({
        patientId: patientId || undefined,
      }).unwrap();

      // Navigate to the live session view
      navigate(`/emergen-ai/session/${result.id}`);
    } catch (startError) {
      console.error("Failed to start session:", startError);
    }
  };

  return (
    <div
      className={clsxMerge(
        "mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8",
        className
      )}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
          <Brain className="h-8 w-8 text-primary-700" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Emergen AI</h1>
        <p className="text-neutral-600 mt-2">
          Your AI-powered medical secretary for real-time clinical assistance
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <FeatureCard
          icon={<Mic className="h-5 w-5" />}
          title="Live Transcription"
          description="Real-time speech-to-text during patient consultations"
        />
        <FeatureCard
          icon={<Brain className="h-5 w-5" />}
          title="AI Suggestions"
          description="Context-aware clinical suggestions and alerts"
        />
        <FeatureCard
          icon={<Clock className="h-5 w-5" />}
          title="Automatic Notes"
          description="Generate structured documentation automatically"
        />
      </div>

      {/* Start Session Form */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          Start New Session
        </h2>

        {/* Patient ID Input (optional) */}
        <div className="mb-6">
          <label
            htmlFor="patientId"
            className="block text-sm font-medium text-neutral-700 mb-2"
          >
            Patient ID (optional)
          </label>
          <input
            id="patientId"
            type="text"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
            placeholder="Enter patient ID or leave blank"
            className={clsxMerge(
              "w-full h-10 rounded-lg border border-neutral-200 px-3 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              "placeholder:text-neutral-400"
            )}
          />
          <p className="text-xs text-neutral-500 mt-1">
            Link this session to a patient for context-aware suggestions
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-error-50 text-error-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Failed to start session. Please try again.</span>
          </div>
        )}

        {/* Start Button */}
        <button
          type="button"
          onClick={handleStartSession}
          disabled={isLoading}
          className={clsxMerge(
            "w-full h-12 rounded-lg font-medium text-white",
            "bg-primary-700 hover:bg-primary-800",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
            "transition-colors flex items-center justify-center gap-2",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              Start Session
            </>
          )}
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
        <h3 className="text-sm font-medium text-neutral-900 mb-2">
          How it works
        </h3>
        <ol className="text-sm text-neutral-600 space-y-1 list-decimal list-inside">
          <li>Click &quot;Start Session&quot; to begin recording</li>
          <li>Speak naturally with your patient</li>
          <li>AI will transcribe and analyze the conversation</li>
          <li>Receive real-time clinical suggestions</li>
          <li>End the session to generate documentation</li>
        </ol>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center text-center p-4 rounded-lg bg-neutral-50">
      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 mb-2">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-neutral-900">{title}</h3>
      <p className="text-xs text-neutral-600 mt-1">{description}</p>
    </div>
  );
}
