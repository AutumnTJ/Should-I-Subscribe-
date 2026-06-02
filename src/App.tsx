import { useState, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster, toast } from "sonner";
import CancelChatGPTPage from "./CancelChatGPTPage";

type Verdict = "Subscribe" | "Wait" | "Skip";

type Result = {
  verdict: Verdict;
  reflection: string;
  mightChange: string;
};

const verdictConfig: Record<Verdict, { label: string; color: string; dot: string }> = {
  Subscribe: {
    label: "Subscribe",
    color: "text-emerald-700",
    dot: "bg-emerald-400",
  },
  Wait: {
    label: "Wait",
    color: "text-amber-700",
    dot: "bg-amber-400",
  },
  Skip: {
    label: "Skip",
    color: "text-rose-700",
    dot: "bg-rose-400",
  },
};

export default function App() {
  const path = window.location.pathname;
  if (path === "/" || path === "/cancel-chatgpt-plus") {
    return <CancelChatGPTPage />;
  }
  return <MainApp />;
}

function MainApp() {
  const reflect = useAction(api.subscriptions.reflect);

  const [service, setService] = useState("");
  const [usage, setUsage] = useState("");
  const [hesitation, setHesitation] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  async function handleReflect() {
    if (!service.trim() || !usage.trim()) {
      toast("Please fill in the first two fields.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await reflect({
        service: service.trim(),
        usage: usage.trim(),
        hesitation: hesitation.trim() || undefined,
      });
      setResult(res);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setService("");
    setUsage("");
    setHesitation("");
  }

  const config = result ? verdictConfig[result.verdict] : null;

  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-start px-6 py-20">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-14 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-800 mb-3">
            Should I Subscribe?
          </h1>
          <p className="text-stone-500 text-base leading-relaxed">
            A calm space to feel clear before you pay for something new.
          </p>
        </div>

        {/* Form */}
        {!result && (
          <div className="flex flex-col gap-8">
            <Field
              label="What are you thinking of subscribing to?"
              placeholder="e.g. ChatGPT Plus, Netflix, Canva Pro"
              value={service}
              onChange={setService}
            />
            <Field
              label="How do you think you'll actually use it?"
              placeholder="e.g. I'd use it for work writing a few times a week"
              value={usage}
              onChange={setUsage}
              multiline
            />
            <Field
              label="What's making you hesitate?"
              placeholder="e.g. I'm not sure I'll use it enough"
              value={hesitation}
              onChange={setHesitation}
              optional
            />

            <button
              onClick={handleReflect}
              disabled={loading || !service.trim() || !usage.trim()}
              className="mt-2 w-full py-3.5 rounded-xl bg-stone-800 text-white text-sm font-medium tracking-wide hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Reflecting…
                </span>
              ) : (
                "Reflect"
              )}
            </button>
          </div>
        )}

        {/* Result */}
        {result && config && (
          <div ref={resultRef} className="flex flex-col items-center gap-8 text-center animate-fade-in">
            {/* Verdict */}
            <div className="flex flex-col items-center gap-3">
              <div className={`flex items-center gap-2`}>
                <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                <span className={`text-xs font-semibold uppercase tracking-widest ${config.color}`}>
                  {config.label}
                </span>
              </div>
            </div>

            {/* Reflection */}
            <p className="text-stone-700 text-lg leading-relaxed max-w-sm font-light">
              {result.reflection}
            </p>

            {/* Might change */}
            {result.mightChange && (
              <p className="text-stone-400 text-sm leading-relaxed max-w-xs italic">
                {result.mightChange}
              </p>
            )}

            {/* Reset */}
            <button
              onClick={handleReset}
              className="mt-4 text-stone-400 text-sm hover:text-stone-600 transition-colors underline underline-offset-4"
            >
              Think about another one
            </button>
          </div>
        )}
      </div>

      <Toaster position="bottom-center" />
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  optional,
  multiline,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
  multiline?: boolean;
}) {
  const base =
    "w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-800 placeholder-stone-300 text-sm leading-relaxed focus:outline-none focus:border-stone-400 focus:ring-0 transition-colors resize-none";

  return (
    <div className="flex flex-col gap-2">
      <label className="text-stone-600 text-sm font-medium">
        {label}
        {optional && (
          <span className="ml-2 text-stone-400 font-normal text-xs">optional</span>
        )}
      </label>
      {multiline ? (
        <textarea
          className={base}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          type="text"
          className={base}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
