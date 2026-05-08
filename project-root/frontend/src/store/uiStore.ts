import { create } from "zustand";
import type { LeadStatus } from "../types/lead";

type Theme = "light" | "dark";

type UiState = {
  search: string;
  status: LeadStatus | "ALL";
  selectedLeadId: string | null;
  isAddLeadOpen: boolean;
  theme: Theme;
  setSearch: (search: string) => void;
  setStatus: (status: LeadStatus | "ALL") => void;
  selectLead: (id: string | null) => void;
  setAddLeadOpen: (open: boolean) => void;
  toggleTheme: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  search: "",
  status: "ALL",
  selectedLeadId: null,
  isAddLeadOpen: false,
  theme: "light",
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  selectLead: (selectedLeadId) => set({ selectedLeadId }),
  setAddLeadOpen: (isAddLeadOpen) => set({ isAddLeadOpen }),
  toggleTheme: () =>
    set((state) => {
      const theme = state.theme === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", theme === "dark");
      return { theme };
    })
}));
