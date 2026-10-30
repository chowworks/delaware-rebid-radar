"use client";

import { useRef } from "react";

// A button that opens its children in a centered dialog. Closes on the close
// button, Escape, or a click on the backdrop.
export default function Modal({
  label,
  title,
  buttonClass,
  panelClass,
  children,
}: {
  label: React.ReactNode;
  title: string;
  buttonClass: string;
  panelClass: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={buttonClass} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={ref}
        aria-label={title}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className={`m-auto max-h-[min(44rem,calc(100dvh-2rem))] w-[min(46rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px] ${panelClass}`}
      >
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-current/10 px-6 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              aria-label="Close"
              className="rounded-md px-2 py-1 text-xl leading-none opacity-60 hover:opacity-100"
              onClick={() => ref.current?.close()}
            >
              ×
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </dialog>
    </>
  );
}
