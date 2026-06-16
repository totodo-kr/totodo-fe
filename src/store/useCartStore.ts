import { create } from "zustand";

export interface CartItem {
  id: number; // cart_items.id
  product_id: number;
  title: string;
  price: number;
  original_price?: number | null;
  thumbnail_url?: string | null;
  delivery_type: string;
  quantity: number;
  stock?: number | null; // -1 = unlimited
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  setItems: (items: CartItem[]) => void;
  setLoading: (loading: boolean) => void;
  updateItemQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  readonly itemCount: number;
  readonly totalPrice: number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isLoading: false,

  setItems: (items) => set({ items }),
  setLoading: (loading) => set({ isLoading: loading }),

  updateItemQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, quantity } : item
      ),
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  clearCart: () => set({ items: [] }),

  get itemCount() {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  get totalPrice() {
    return get().items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  },
}));
