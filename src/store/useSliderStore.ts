import { create } from "zustand";

export interface Slide {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  image: string;
  bgColor: string;
}

interface SliderState {
  slides: Slide[];
  setSlides: (slides: Slide[]) => void;
  reset: () => void;
}

export const useSliderStore = create<SliderState>((set) => ({
  slides: [],
  setSlides: (slides) => set({ slides }),
  reset: () => set({ slides: [] }),
}));
