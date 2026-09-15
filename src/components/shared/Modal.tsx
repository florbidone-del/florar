"use client";

import { useBackToClose } from "@/lib/useBackToClose";

export function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useBackToClose(onClose);

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">{children}</div>
    </div>
  );
}
