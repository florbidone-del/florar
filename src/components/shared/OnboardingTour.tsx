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
      <p className="step-label">
        {i + 1} de {steps.length}
      </p>
      <h3>{step.title}</h3>
      <div>{step.body}</div>
      <div className="row" style={{ marginTop: 20 }}>
        <button className="ghost block" onClick={onFinish}>
          Saltear
        </button>
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
    </Modal>
  );
}
