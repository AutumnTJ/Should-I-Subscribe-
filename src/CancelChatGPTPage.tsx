import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

type QuizState = "landing" | "quiz" | "result";
type Verdict = "keep" | "cancel" | "compare";

interface Question {
  id: number;
  text: string;
  options: string[];
}

interface ScoreDelta {
  keepScore: number;
  cancelScore: number;
  compareFlag: number;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "How often have you actually used ChatGPT Plus recently?",
    options: [
      "Most days",
      "A few times a week",
      "Only once or twice",
      "I barely used it",
    ],
  },
  {
    id: 2,
    text: "When you use it, how important are the paid benefits to what you need?",
    options: [
      "I rely on them regularly",
      "They help sometimes",
      "I am not sure I need them",
      "I could probably use the free version",
    ],
  },
  {
    id: 3,
    text: "How do you currently feel about the monthly cost?",
    options: [
      "It clearly feels worth it",
      "It is probably worth it",
      "I am unsure",
      "It no longer feels worth it",
    ],
  },
  {
    id: 4,
    text: "What best describes your situation right now?",
    options: [
      "I have ongoing work or projects that depend on it",
      "I still use AI, but I may need a different paid tool",
      "The free version may be enough for me",
      "I do not have a strong reason to keep paying",
    ],
  },
];

const SCORE_MAP: ScoreDelta[][] = [
  [
    { keepScore: 2, cancelScore: 0, compareFlag: 0 },
    { keepScore: 1, cancelScore: 0, compareFlag: 0 },
    { keepScore: 0, cancelScore: 1, compareFlag: 0 },
    { keepScore: 0, cancelScore: 2, compareFlag: 0 },
  ],
  [
    { keepScore: 2, cancelScore: 0, compareFlag: 0 },
    { keepScore: 1, cancelScore: 0, compareFlag: 0 },
    { keepScore: 0, cancelScore: 1, compareFlag: 0 },
    { keepScore: 0, cancelScore: 2, compareFlag: 0 },
  ],
  [
    { keepScore: 2, cancelScore: 0, compareFlag: 0 },
    { keepScore: 1, cancelScore: 0, compareFlag: 0 },
    { keepScore: 0, cancelScore: 1, compareFlag: 1 },
    { keepScore: 0, cancelScore: 2, compareFlag: 0 },
  ],
  [
    { keepScore: 2, cancelScore: 0, compareFlag: 0 },
    { keepScore: 0, cancelScore: 0, compareFlag: 2 },
    { keepScore: 0, cancelScore: 2, compareFlag: 0 },
    { keepScore: 0, cancelScore: 2, compareFlag: 0 },
  ],
];

function computeVerdict(answerIndices: number[]): {
  verdict: Verdict;
  keepScore: number;
  cancelScore: number;
  compareFlag: number;
} {
  let keepScore = 0;
  let cancelScore = 0;
  let compareFlag = 0;

  answerIndices.forEach((optionIdx, questionIdx) => {
    const delta = SCORE_MAP[questionIdx][optionIdx];
    keepScore += delta.keepScore;
    cancelScore += delta.cancelScore;
    compareFlag += delta.compareFlag;
  });

  let verdict: Verdict;
  if (compareFlag >= 2) {
    verdict = "compare";
  } else if (keepScore >= 5 && keepScore - cancelScore >= 2) {
    verdict = "keep";
  } else if (cancelScore >= 5 && cancelScore - keepScore >= 2) {
    verdict = "cancel";
  } else {
    verdict = "compare";
  }

  return { verdict, keepScore, cancelScore, compareFlag };
}

const VERDICTS: Record<
  Verdict,
  { title: string; body: string; nextStep: string }
> = {
  keep: {
    title: "Keep for now",
    body: "You appear to be getting enough ongoing value from ChatGPT Plus that cancelling now could create more friction than savings. Keeping it for the next billing period seems reasonable.",
    nextStep:
      "Notice whether you continue using the paid benefits regularly before your next renewal.",
  },
  cancel: {
    title: "Pause or cancel",
    body: "Your answers suggest that ChatGPT Plus may not be earning its place right now. Pausing or cancelling could be a sensible choice, especially if you are rarely using paid benefits.",
    nextStep: "You can always return later if a real need appears again.",
  },
  compare: {
    title: "Compare before deciding",
    body: "You still seem to get some value from AI tools, but it is not clear that ChatGPT Plus is the best paid option for you right now.",
    nextStep:
      "Compare it with the free version or one alternative you already use before making a final decision.",
  },
};

export default function CancelChatGPTPage() {
  const track = useMutation(api.cancelQuizEvents.track);

  const [quizState, setQuizState] = useState<QuizState>("landing");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    track({
      type: "page_viewed",
      timestamp: Date.now(),
      page: "cancel-chatgpt-plus",
    }).catch(() => {});
  }, [track]);

  function handleStart() {
    track({ type: "quiz_started", timestamp: Date.now() }).catch(() => {});
    setQuizState("quiz");
    setCurrentQuestion(0);
    setAnswers([]);
  }

  function handleAnswer(optionIdx: number) {
    const newAnswers = [...answers.slice(0, currentQuestion), optionIdx];

    track({
      type: "question_answered",
      timestamp: Date.now(),
      questionId: currentQuestion + 1,
      selectedOption: QUESTIONS[currentQuestion].options[optionIdx],
    }).catch(() => {});

    if (currentQuestion < QUESTIONS.length - 1) {
      setAnswers(newAnswers);
      setCurrentQuestion(currentQuestion + 1);
    } else {
      const result = computeVerdict(newAnswers);
      setAnswers(newAnswers);
      setVerdict(result.verdict);

      track({
        type: "verdict_generated",
        timestamp: Date.now(),
        verdict: result.verdict,
        keepScore: result.keepScore,
        cancelScore: result.cancelScore,
        compareFlag: result.compareFlag,
        answers: newAnswers.map(
          (idx, qIdx) => QUESTIONS[qIdx].options[idx]
        ),
      }).catch(() => {});

      setQuizState("result");
    }
  }

  function handleBack() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  }

  function handleFeedback(helpful: boolean) {
    if (feedbackSubmitted) return;
    setFeedbackSubmitted(true);

    track({
      type: "feedback_submitted",
      timestamp: Date.now(),
      verdict: verdict ?? undefined,
      helpful,
    }).catch(() => {});
  }

  function handleRestart() {
    setQuizState("landing");
    setCurrentQuestion(0);
    setAnswers([]);
    setVerdict(null);
    setFeedbackSubmitted(false);
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-start px-5 py-16">
      <div className="w-full max-w-md">
        {quizState === "landing" && <Landing onStart={handleStart} />}
        {quizState === "quiz" && (
          <QuizCard
            question={QUESTIONS[currentQuestion]}
            questionIndex={currentQuestion}
            total={QUESTIONS.length}
            onAnswer={handleAnswer}
            onBack={handleBack}
          />
        )}
        {quizState === "result" && verdict !== null && (
          <Result
            verdict={verdict}
            feedbackSubmitted={feedbackSubmitted}
            onFeedback={handleFeedback}
            onRestart={handleRestart}
          />
        )}
      </div>
      <footer className="mt-16 text-stone-400 text-xs text-center">
        Independent decision-support tool. Not affiliated with OpenAI.
      </footer>
    </div>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center">
      <h1 className="text-[1.75rem] font-semibold tracking-tight text-stone-800 leading-snug mb-4">
        Should I Cancel ChatGPT Plus?
      </h1>
      <p className="text-stone-500 text-base leading-relaxed mb-5">
        Answer 4 quick questions to see whether keeping, pausing, or comparing
        your subscription makes the most sense right now.
      </p>
      <p className="text-stone-400 text-sm mb-10">
        No login. No account access. Just a quick reflection based on how you
        actually use it.
      </p>
      <button
        onClick={onStart}
        className="w-full py-3.5 rounded-xl bg-stone-800 text-white text-sm font-medium tracking-wide hover:bg-stone-700 transition-colors"
      >
        Start the 60-second check
      </button>
    </div>
  );
}

function QuizCard({
  question,
  questionIndex,
  total,
  onAnswer,
  onBack,
}: {
  question: Question;
  questionIndex: number;
  total: number;
  onAnswer: (idx: number) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div className="w-16">
          {questionIndex > 0 && (
            <button
              onClick={onBack}
              className="text-stone-400 text-sm hover:text-stone-600 transition-colors"
            >
              ← Back
            </button>
          )}
        </div>
        <span className="text-stone-400 text-sm">
          Question {questionIndex + 1} of {total}
        </span>
        <div className="w-16" />
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl px-6 py-5 mb-5">
        <p className="text-stone-800 text-lg font-medium leading-snug">
          {question.text}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => onAnswer(idx)}
            className="w-full text-left px-5 py-4 rounded-xl border border-stone-200 bg-white text-stone-700 text-sm leading-snug hover:border-stone-400 hover:bg-stone-50 transition-colors"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function Result({
  verdict,
  feedbackSubmitted,
  onFeedback,
  onRestart,
}: {
  verdict: Verdict;
  feedbackSubmitted: boolean;
  onFeedback: (helpful: boolean) => void;
  onRestart: () => void;
}) {
  const v = VERDICTS[verdict];

  return (
    <div>
      <div className="bg-white border border-stone-200 rounded-2xl px-7 py-7 mb-4">
        <h2 className="text-xl font-semibold text-stone-800 mb-3">{v.title}</h2>
        <p className="text-stone-600 text-base leading-relaxed mb-6">{v.body}</p>
        <div className="border-t border-stone-100 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">
            Next step
          </p>
          <p className="text-stone-500 text-sm leading-relaxed">{v.nextStep}</p>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl px-6 py-6 mb-6">
        <p className="text-stone-700 text-sm font-medium mb-4">
          Did this help you feel clearer about your decision?
        </p>
        {feedbackSubmitted ? (
          <p className="text-stone-400 text-sm">
            Thanks — your feedback helps improve this simple decision check.
          </p>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => onFeedback(true)}
              className="flex-1 py-2.5 rounded-lg border border-stone-200 text-stone-700 text-sm hover:bg-stone-50 hover:border-stone-400 transition-colors"
            >
              Yes, it helped
            </button>
            <button
              onClick={() => onFeedback(false)}
              className="flex-1 py-2.5 rounded-lg border border-stone-200 text-stone-700 text-sm hover:bg-stone-50 hover:border-stone-400 transition-colors"
            >
              Not really
            </button>
          </div>
        )}
      </div>

      <div className="text-center">
        <button
          onClick={onRestart}
          className="text-stone-400 text-sm hover:text-stone-600 transition-colors underline underline-offset-4"
        >
          Restart check
        </button>
      </div>
    </div>
  );
}
