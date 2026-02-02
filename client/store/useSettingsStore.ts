import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = "light" | "dark" | "system";

interface SettingsState {
  theme: Theme;
  dockerApiUrl: string;
  autoRefreshInterval: number;
  showContainerLogs: boolean;
  hapticFeedback: boolean;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setDockerApiUrl: (url: string) => Promise<void>;
  setAutoRefreshInterval: (interval: number) => Promise<void>;
  toggleContainerLogs: () => Promise<void>;
  toggleHapticFeedback: () => Promise<void>;
  clearCache: () => Promise<void>;
}

const SETTINGS_KEY = "@app_settings";

const DEFAULT_SETTINGS = {
  theme: "system" as Theme,
  dockerApiUrl: "http://localhost:2375",
  autoRefreshInterval: 5000,
  showContainerLogs: true,
  hapticFeedback: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoading: true,

  loadSettings: async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        set({ ...parsed, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  setTheme: async (theme: Theme) => {
    set({ theme });
    await saveSettings(get());
  },

  setDockerApiUrl: async (url: string) => {
    set({ dockerApiUrl: url });
    await saveSettings(get());
  },

  setAutoRefreshInterval: async (interval: number) => {
    set({ autoRefreshInterval: interval });
    await saveSettings(get());
  },

  toggleContainerLogs: async () => {
    set((state) => ({ showContainerLogs: !state.showContainerLogs }));
    await saveSettings(get());
  },

  toggleHapticFeedback: async () => {
    set((state) => ({ hapticFeedback: !state.hapticFeedback }));
    await saveSettings(get());
  },

  clearCache: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith("@cache_"));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  },
}));

async function saveSettings(state: SettingsState) {
  try {
    const { isLoading, loadSettings, setTheme, setDockerApiUrl, setAutoRefreshInterval, toggleContainerLogs, toggleHapticFeedback, clearCache, ...settings } = state as any;
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}
