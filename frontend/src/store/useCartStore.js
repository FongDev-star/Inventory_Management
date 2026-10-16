import { create } from "zustand";

export const useCartStore = create((set) => ({
  items: [],

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === product._id);

      if (existing) {
        if (existing.quantity >= product.stock) return state;
        return {
          items: state.items.map((i) =>
            i.productId === product._id
              ? { ...i, quantity: i.quantity + 1, stock: product.stock }
              : i
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            productId: product._id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            stock: product.stock,
            quantity: 1,
          },
        ],
      };
    }),

  setQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(Math.max(quantity, 1), i.stock) }
          : i
      ),
    })),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),

  clear: () => set({ items: [] }),
}));