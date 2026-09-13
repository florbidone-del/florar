"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";

export type TourStep = { title: string; body: React.ReactNode };

export function OnboardingTour({
  steps,
  onFinish,
}: {
  steps: TourStep[];
  onFinish: () => void;
}) {
  const [i, setI] = useState(0);
  const step = steps[i];
  const isLast = i === steps.length - 1;

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
