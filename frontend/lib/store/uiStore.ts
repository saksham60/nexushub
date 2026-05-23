import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  activeModule: string | null;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setActiveModule: (module: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      activeModule: null,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setActiveModule: (module) => set({ activeModule: module }),
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }), // only persist sidebarCollapsed
    }
  )
);
