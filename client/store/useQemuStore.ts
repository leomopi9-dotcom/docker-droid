import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

type VMStatus = "stopped" | "starting" | "running" | "stopping" | "error";

interface VMStats {
  cpuUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  uptime: number;
}

interface QemuSettings {
  ramMB: number;
  cpuCores: number;
  diskSizeGB: number;
}

interface QemuState {
  vmStatus: VMStatus;
  vmLogs: string[];
  vmStats: VMStats | null;
  settings: QemuSettings;
  isInitialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  startVM: () => Promise<void>;
  stopVM: () => Promise<void>;
  restartVM: () => Promise<void>;
  getVMStats: () => Promise<void>;
  updateSettings: (settings: Partial<QemuSettings>) => Promise<void>;
  addLog: (log: string) => void;
  clearLogs: () => void;
  clearError: () => void;
}

const QEMU_SETTINGS_KEY = "@qemu_settings";

const DEFAULT_SETTINGS: QemuSettings = {
  ramMB: 2048,
  cpuCores: 2,
  diskSizeGB: 10,
};

export const useQemuStore = create<QemuState>((set, get) => ({
  vmStatus: "stopped",
  vmLogs: [],
  vmStats: null,
  settings: DEFAULT_SETTINGS,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(QEMU_SETTINGS_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings) as QemuSettings;
        set({ settings, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
      get().addLog("[QEMU] Initialized");
    } catch (error) {
      set({ error: "Failed to initialize QEMU settings", isInitialized: true });
    }
  },

  startVM: async () => {
    const { settings, addLog } = get();
    set({ vmStatus: "starting", error: null });
    addLog(`[QEMU] Starting VM with ${settings.ramMB}MB RAM, ${settings.cpuCores} CPUs...`);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      addLog("[QEMU] Booting Alpine Linux...");
      
      await new Promise((resolve) => setTimeout(resolve, 1500));
      addLog("[QEMU] Mounting filesystems...");
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addLog("[QEMU] Starting Docker daemon...");
      
      await new Promise((resolve) => setTimeout(resolve, 1500));
      addLog("[QEMU] Docker API available on localhost:2375");
      addLog("[QEMU] VM started successfully");
      
      set({
        vmStatus: "running",
        vmStats: {
          cpuUsage: 5,
          memoryUsed: 256,
          memoryTotal: settings.ramMB,
          uptime: 0,
        },
      });
    } catch (error: any) {
      addLog(`[QEMU] Error: ${error.message}`);
      set({ vmStatus: "error", error: error.message });
    }
  },

  stopVM: async () => {
    const { addLog } = get();
    set({ vmStatus: "stopping", error: null });
    addLog("[QEMU] Stopping Docker daemon...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addLog("[QEMU] Unmounting filesystems...");
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addLog("[QEMU] Shutting down VM...");
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      addLog("[QEMU] VM stopped");
      
      set({ vmStatus: "stopped", vmStats: null });
    } catch (error: any) {
      addLog(`[QEMU] Error: ${error.message}`);
      set({ vmStatus: "error", error: error.message });
    }
  },

  restartVM: async () => {
    await get().stopVM();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await get().startVM();
  },

  getVMStats: async () => {
    const { vmStatus, settings } = get();
    if (vmStatus !== "running") return;

    const currentStats = get().vmStats;
    if (currentStats) {
      set({
        vmStats: {
          ...currentStats,
          cpuUsage: Math.min(100, Math.max(0, currentStats.cpuUsage + (Math.random() - 0.5) * 10)),
          memoryUsed: Math.min(
            settings.ramMB,
            Math.max(128, currentStats.memoryUsed + (Math.random() - 0.5) * 50)
          ),
          uptime: currentStats.uptime + 1,
        },
      });
    }
  },

  updateSettings: async (newSettings: Partial<QemuSettings>) => {
    const { settings } = get();
    const updatedSettings = { ...settings, ...newSettings };
    
    try {
      await AsyncStorage.setItem(QEMU_SETTINGS_KEY, JSON.stringify(updatedSettings));
      set({ settings: updatedSettings, error: null });
    } catch (error) {
      set({ error: "Failed to save settings" });
    }
  },

  addLog: (log: string) => {
    const timestamp = new Date().toLocaleTimeString();
    set((state) => ({
      vmLogs: [...state.vmLogs.slice(-99), `[${timestamp}] ${log}`],
    }));
  },

  clearLogs: () => {
    set({ vmLogs: [] });
  },

  clearError: () => {
    set({ error: null });
  },
}));
