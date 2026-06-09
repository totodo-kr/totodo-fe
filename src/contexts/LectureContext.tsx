"use client";

import { createContext, useContext } from "react";

interface LectureContextValue {
  isEnrolled: boolean;
}

export const LectureContext = createContext<LectureContextValue>({ isEnrolled: false });

export function useLectureContext() {
  return useContext(LectureContext);
}
