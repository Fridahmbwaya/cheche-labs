"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type QuizResult = {
  correct: boolean;
  correctOption: string;
  explanation: string;
  score: number;
};

type CompletionResult = {
  complete: boolean;
  passed: boolean;
  finalScore: number;
};

type Props = {
  question: string;
  options: string[];
  unitId: string;
  moduleId: string;
  nextUnitId: string | null;
};

export function Quiz({ question, options, unitId, moduleId, nextUnitId }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [completion, setCompletion] = useState<CompletionResult | null>(null);

  async function handleSubmit() {
    if (!selected || loading) return;
    setLoading(true);

    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, moduleId, answer: selected }),
    });
    const data: QuizResult = await res.json();
    setQuizResult(data);

    if (data.correct) {
      const compRes = await fetch("/api/completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId }),
      });
      const compData: CompletionResult = await compRes.json();
      setCompletion(compData);
    }

    setLoading(false);
  }

  function handleRetry() {
    setQuizResult(null);
    setSelected(null);
  }

  if (completion?.complete && completion.passed) {
    return (
      <div className="card p-6 text-center">
        <div className="mb-2 text-4xl">🎉</div>
        <h3 className="text-lg font-bold text-ink">Module complete!</h3>
        <p className="mt-1 text-sm text-mutedFg">
          Final score: {completion.finalScore}%
        </p>
        <a href="/learn" className="btn-accent mt-5 inline-flex">
          Back to dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <p className="section-label mb-3">Knowledge Check</p>
      <p className="font-medium text-ink">{question}</p>

      <div className="mt-4 space-y-2">
        {options.map((option, i) => {
          const isSelected = selected === option;
          const isCorrect = quizResult && option === quizResult.correctOption;
          const isWrong = quizResult && isSelected && !quizResult.correct;

          return (
            <label
              key={i}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
                !quizResult && isSelected && "border-primary bg-lavender",
                !quizResult && !isSelected &&
                  "border-border hover:border-primary/40",
                quizResult && isCorrect && "border-success bg-success/10",
                quizResult && isWrong && "border-red-400 bg-red-50",
                quizResult &&
                  !isCorrect &&
                  !isWrong &&
                  "border-border opacity-50"
              )}
            >
              <input
                type="radio"
                name="quiz"
                value={option}
                checked={isSelected}
                onChange={() => !quizResult && setSelected(option)}
                disabled={!!quizResult}
                className="mt-0.5 accent-primary"
              />
              <span className="text-ink">{option}</span>
            </label>
          );
        })}
      </div>

      {quizResult && (
        <div
          className={cn(
            "mt-4 rounded-xl p-3 text-sm",
            quizResult.correct
              ? "bg-success/10 text-success"
              : "bg-red-50 text-red-700"
          )}
        >
          <p className="font-bold">
            {quizResult.correct ? "Correct!" : "Not quite — try again"}
          </p>
          <p className="mt-1 opacity-90">{quizResult.explanation}</p>
        </div>
      )}

      <div className="mt-5">
        {!quizResult ? (
          <button
            onClick={handleSubmit}
            disabled={!selected || loading}
            className={cn(
              "btn-accent",
              (!selected || loading) && "cursor-not-allowed opacity-50"
            )}
          >
            {loading ? "Checking…" : "Submit answer"}
          </button>
        ) : quizResult.correct && nextUnitId ? (
          <a
            href={`/learn/${moduleId}/${nextUnitId}`}
            className="btn-accent inline-flex"
          >
            Continue →
          </a>
        ) : quizResult.correct && !nextUnitId ? null : (
          <button onClick={handleRetry} className="btn-accent">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
