/**
 * Minimal theme store — Light Mode / Dark Mode only.
 * All complex custom theme / preset / wallpaper / gallery logic has been removed.
 * Theme is applied via Tailwind's `dark` class on <html>.
 * CSS variables in index.css handle all token values.
 */

export interface BoardThemeOverride {
  boardId: string;
  icon?: string;
  coverImage?: string;
  coverColor?: string;
  accentColor?: string;
  backgroundValue?: string;
}

import { create } from 'zustand';

interface ThemeState {
  boardOverrides: Record<string, BoardThemeOverride>;
  setBoardOverride: (userId: string, boardId: string, override: Partial<BoardThemeOverride>) => void;
  clearBoardOverride: (userId: string, boardId: string) => void;
  loadUserPreferences: (userId: string) => void;
  applyActiveTheme: (userId: string | null, workspaceId: string | null, boardId: string | null) => void;
}

const STORAGE_KEY = (userId: string) => `tf_board_overrides_${userId}`;

export const useThemeStore = create<ThemeState>((set) => ({
  boardOverrides: {},

  loadUserPreferences: (userId) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ boardOverrides: parsed.boardOverrides || {} });
      }
    } catch {}
  },

  setBoardOverride: (userId, boardId, override) => {
    set((state) => {
      const existing = state.boardOverrides[boardId] || { boardId };
      const next = {
        ...state.boardOverrides,
        [boardId]: { ...existing, ...override },
      };
      try {
        localStorage.setItem(STORAGE_KEY(userId), JSON.stringify({ boardOverrides: next }));
      } catch {}
      return { boardOverrides: next };
    });
  },

  clearBoardOverride: (userId, boardId) => {
    set((state) => {
      const next = { ...state.boardOverrides };
      delete next[boardId];
      try {
        localStorage.setItem(STORAGE_KEY(userId), JSON.stringify({ boardOverrides: next }));
      } catch {}
      return { boardOverrides: next };
    });
  },

  applyActiveTheme: () => {},
}));
