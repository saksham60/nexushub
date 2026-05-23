import { create } from "zustand";

interface WorkspaceState {
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedWorkspaceId: null,
  setSelectedWorkspaceId: (id) => set({ selectedWorkspaceId: id }),
}));
