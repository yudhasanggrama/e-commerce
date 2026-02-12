"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
  slug?: string;
};

type CartState = {
  cart: CartItem[];

  // ✅ hydration flag
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;

  setStock: (id: string, stock: number) => void;

  itemCount: () => number;
  subtotal: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],

      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      addToCart: (item, quantity = 1) => {
        set((state) => {
          const existing = state.cart.find((x) => x.id === item.id);
          const addQty = Math.max(1, quantity);
          const maxStock = Math.max(0, item.stock);

          if (existing) {
            const nextQty = Math.min(existing.quantity + addQty, maxStock);
            return {
              cart: state.cart.map((x) =>
                x.id === item.id ? { ...x, ...item, quantity: nextQty } : x
              ),
            };
          }

          return {
            cart: [...state.cart, { ...item, quantity: Math.min(addQty, maxStock) }],
          };
        });
      },

      updateQuantity: (id, quantity) => {
        set((state) => ({
          cart: state.cart.map((x) => {
            if (x.id !== id) return x;
            const next = Math.max(1, quantity);
            return { ...x, quantity: Math.min(next, Math.max(0, x.stock)) };
          }),
        }));
      },

      removeFromCart: (id) =>
        set((state) => ({ cart: state.cart.filter((x) => x.id !== id) })),

      clearCart: () => set({ cart: [] }),

      setStock: (id, stock) => {
        set((state) => ({
          cart: state.cart.map((x) => {
            if (x.id !== id) return x;
            const nextQty = Math.min(x.quantity, Math.max(0, stock));
            return { ...x, stock, quantity: nextQty };
          }),
        }));
      },

      itemCount: () => get().cart.reduce((sum, x) => sum + x.quantity, 0),
      subtotal: () => get().cart.reduce((sum, x) => sum + x.price * x.quantity, 0),
    }),
    {
      name: "phonecommerce-cart-v1",
      version: 1,

      // ✅ ini yang penting
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
