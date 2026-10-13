import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Circle, Loader2, Play, X } from "lucide-react";

interface WorkflowStep {
  id: string;
  functionId: string;
  functionName: string;
  status: "pending" | "running" | "completed" | "error";
  startedAt?: number;
  completedAt?: number;
}

interface WorkflowProgress {
  workflowId: string;
  workflowName: string;
  steps: WorkflowStep[];
  currentStepIndex: number;
  status: "idle" | "running" | "completed" | "error";
}

declare global {
  interface Window {
    OSAutomotor?: {
      getWorkflowProgress: () => Promise<
        { success: boolean; progress: WorkflowProgress | null; error?: string }
      >;
      closeProgressWindow: () => Promise<{ success: boolean; error?: string }>;
    };
  }
}

export function App() {
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [_debugStatus, setDebugStatus] = useState<string>("Ready");
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("");
  const prevStatusRef = useRef<string>("");

  const fetchProgress = useCallback(async () => {
    if (!globalThis.OSAutomotor?.getWorkflowProgress) {
      setDebugStatus("API Missing in fetch");
      return;
    }

    try {
      const result = await globalThis.OSAutomotor.getWorkflowProgress();
      if (result.success && result.progress) {
        setProgress(result.progress);
        setError(null);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 100);
    return () => clearInterval(interval);
  }, [fetchProgress]);

  useEffect(() => {
    if (!progress) return;
    const runningStep = progress.steps.find((s) => s.status === "running");
    const currentKey = `${progress.status}-${runningStep?.functionName ?? ""}-${progress.currentStepIndex}`;
    if (prevStatusRef.current !== currentKey) {
      prevStatusRef.current = currentKey;
      if (progress.status === "completed") {
        setLiveAnnouncement(`Workflow completed: ${progress.workflowName}`);
      } else if (progress.status === "error") {
        setLiveAnnouncement(`Workflow failed: ${progress.workflowName}`);
      } else if (runningStep) {
        setLiveAnnouncement(
          `Running step ${progress.currentStepIndex + 1} of ${progress.steps.length}: ${runningStep.functionName}`,
        );
      }
    }
  }, [progress]);

  const handleClose = async () => {
    setDebugStatus("Closing...");
    console.log("[WorkflowProgress] handleClose called");
    console.log(
      "[WorkflowProgress] window.OSAutomotor exists:",
      !!globalThis.OSAutomotor,
    );
    console.log(
      "[WorkflowProgress] closeProgressWindow exists:",
      !!globalThis.OSAutomotor?.closeProgressWindow,
    );

    try {
      if (globalThis.OSAutomotor?.closeProgressWindow) {
        setDebugStatus("Calling API...");
        console.log(
          "[WorkflowProgress] Calling OSAutomotor.closeProgressWindow()",
        );
        const result = await globalThis.OSAutomotor.closeProgressWindow();
        setDebugStatus(`API Result: ${JSON.stringify(result)}`);
        console.log("[WorkflowProgress] closeProgressWindow result:", result);
      } else {
        setDebugStatus("Fallback window.close");
        console.log("[WorkflowProgress] Fallback to window.close()");
        globalThis.close();
      }
    } catch (error) {
      setDebugStatus(`Error: ${String(error)}`);
      console.error("[WorkflowProgress] Failed to close window status message:", error);
      console.log("[WorkflowProgress] Emergency fallback to window.close()");
      globalThis.close(); // Fallback
    }
  };

  const getStatusIcon = (status: WorkflowStep["status"]) => {
    switch (status) {
      case "completed":
        return <Check className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden="true" />;
      case "running":
        return (
          <Loader2
            className="h-5 w-5 text-white animate-spin motion-reduce:animate-none"
            strokeWidth={2.5}
            aria-hidden="true"
          />
        );
      case "error":
        return <AlertCircle className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden="true" />;
      default:
        return <Circle className="h-5 w-5 text-zinc-400" strokeWidth={2} aria-hidden="true" />;
    }
  };

  const getStepStyles = (status: WorkflowStep["status"]) => {
    switch (status) {
      case "completed":
        return "bg-zinc-800 border-zinc-700";
      case "running":
        return "bg-zinc-800 border-zinc-600";
      case "error":
        return "bg-zinc-900 border-zinc-700";
      default:
        return "bg-zinc-950 border-zinc-800";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Live Region for Screen Readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-3">
          <div
            role="status"
            aria-label={`Status: ${progress?.status ?? "idle"}`}
            className={`h-2.5 w-2.5 rounded-full motion-reduce:animate-none ${
              progress?.status === "running"
                ? "bg-white animate-pulse"
                : progress?.status === "completed"
                ? "bg-white"
                : progress?.status === "error"
                ? "bg-zinc-400"
                : "bg-zinc-700"
            }`}
          />
          <h1 className="text-base font-semibold tracking-tight truncate max-w-[240px]">
            {progress?.workflowName || "Workflow Progress"}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-2 rounded-md hover:bg-zinc-800 transition-colors relative z-50 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          style={{ MozWindowDragging: "no-drag" } as React.CSSProperties}
          title="Close"
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {error
          ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <AlertCircle className="h-12 w-12 text-zinc-400 mb-4" aria-hidden="true" />
              <p className="text-sm text-zinc-400">{error}</p>
            </div>
          )
          : !progress
          ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 className="h-12 w-12 text-zinc-400 mb-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <p className="text-sm text-zinc-400">Loading...</p>
            </div>
          )
          : progress.steps.length === 0
          ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Play className="h-12 w-12 text-zinc-400 mb-4" aria-hidden="true" />
              <p className="text-sm text-zinc-400">No steps</p>
            </div>
          )
          : (
            <ol role="list" aria-label="Workflow Steps" className="space-y-2.5">
              {progress.steps.map((step, index) => (
                <li
                  key={step.id}
                  role="listitem"
                  aria-current={step.status === "running" ? "step" : undefined}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                    getStepStyles(step.status)
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        step.status === "completed"
                          ? "bg-white/15"
                          : step.status === "running"
                          ? "bg-white/10"
                          : "bg-zinc-900"
                      }`}
                    >
                      {getStatusIcon(step.status)}
                    </div>
                    {index < progress.steps.length - 1 && (
                      <div
                        className={`w-0.5 h-5 mt-1.5 ${
                          step.status === "completed"
                            ? "bg-zinc-700"
                            : "bg-zinc-850"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p
                      className={`text-base font-medium truncate mb-1 ${
                        step.status === "pending"
                          ? "text-zinc-400"
                          : "text-white"
                      }`}
                    >
                      {step.functionName || step.functionId}
                    </p>
                    {step.functionName &&
                      step.functionName !== step.functionId && (
                      <p className="text-xs text-zinc-400 truncate font-mono">
                        {step.functionId}
                      </p>
                    )}
                  </div>
                  {step.completedAt && step.startedAt && (
                    <span className="text-xs text-zinc-400 pt-1 font-mono">
                      {((step.completedAt - step.startedAt) / 1000).toFixed(1)}s
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
      </main>

      {/* Footer */}
      {progress && (
        <footer className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-950">
          <div
            role="progressbar"
            aria-valuenow={progress.steps.filter((s) => s.status === "completed").length}
            aria-valuemin={0}
            aria-valuemax={progress.steps.length}
            aria-label="Workflow progress"
            className="flex items-center justify-between text-xs"
          >
            <span className="text-zinc-400 font-medium">
              {progress.steps.filter((s) => s.status === "completed").length} /
              {" "}
              {progress.steps.length} steps
            </span>
            <span className="uppercase text-[10px] tracking-widest font-semibold text-zinc-400">
              {progress.status}
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
