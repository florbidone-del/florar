"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/shared/Modal";

export type TourStep = { title: string; body: React.ReactNode; focus?: string };

export function OnboardingTour({
  steps,
  onFinish,
  onStepChange,
}: {
  steps: TourStep[];
  onFinish: () => void;
  onStepChange?: (step: TourStep) => void;
}) {
  const [i, setI] = useState(0);
  const step = steps[i];
  const isLast = i === steps.length - 1;

  useEffect(() => {
    onStepChange?.(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  return (
    <Modal onClose={onFinish}>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          className="ghost small"
          style={{ position: "absolute", top: 0, right: 0 }}
          onClick={onFinish}
        >
          Saltear
        </button>
        <p className="step-label" style={{ marginRight: 70 }}>
          {i + 1} de {steps.length}
        </p>
        <h3>{step.title}</h3>
        <div>{step.body}</div>
        <div className="row" style={{ marginTop: 20 }}>
          {i > 0 && (
            <button className="ghost block" onClick={() => setI((v) => v - 1)}>
              Atrás
            </button>
          )}
          <button
            className="primary block"
            onClick={() => (isLast ? onFinish() : setI((v) => v + 1))}
          >
            {isLast ? "Listo" : "Siguiente"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
