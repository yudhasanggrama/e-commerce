"use client";

import { create } from "zustand";

type AuthModalState = {
  open: boolean;
  nextAction: (() => Promise<void> | void) | null;
  openModal: (nextAction?: (() => Promise<void> | void)) => void;
  closeModal: () => void;
  consumeNextAction: () => Promise<void>;
};

export const useAuthModalStore = create<AuthModalState>((set, get) => ({
  open: false,
  nextAction: null,

  openModal: (nextAction) => set({ open: true, nextAction: nextAction ?? null }),
  closeModal: () => set({ open: false, nextAction: null }),

  consumeNextAction: async () => {
    const fn = get().nextAction;
    set({ nextAction: null }); // supaya nggak ke-trigger 2x
    if (fn) await fn();
  },
}));
