// store/useTextStore.ts
import { create } from "zustand";
import { User } from "@/model/user";

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user: User | null) => set({ user: user }),
}));