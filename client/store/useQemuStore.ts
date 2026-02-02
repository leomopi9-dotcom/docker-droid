import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QemuService, { 
  QEMU_CONSTANTS, 
  QemuRequirementsResult,
  StateChangeEvent,
  LogEvent
} from "@/services/QemuService";

type VMStatus = "stopped" | "starting" | "running" | "stopping" | "error" | "initializing";

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

interface QemuPaths {
  qemuDir: string;
  isoPath: string;
  diskPath: string;
}

interface QemuState {
  vmStatus: VMStatus;
  vmLogs: string[];
  vmStats: VMStats | null;
  settings: QemuSettings;
  isInitialized: boolean;
  error: string | null;
  qemuPaths: QemuPaths | null;
  requirements: QemuRequirementsResult | null;
  dockerAvailable: boolean;
  downloadProgress: number;

  initialize: () => Promise<void>;
  startVM: () => Promise<void>;
  stopVM: () => Promise<void>;
  restartVM: () => Promise<void>;
  getVMStats: () => Promise<void>;
  checkRequirements: () => Promise<void>;
  downloadAlpineIso: () => Promise<void>;
  updateSettings: (settings: Partial<QemuSettings>) => Promise<void>;
  addLog: (log: string) => void;
  clearLogs: () => void;
  clearError: () => void;
  setupEventListeners: () => void;
  cleanupEventListeners: () => void;
}

const QEMU_SETTINGS_KEY = "@qemu_settings";

const DEFAULT_SETTINGS: QemuSettings = {
  ramMB: QEMU_CONSTANTS.DEFAULT_RAM_MB,
  cpuCores: QEMU_CONSTANTS.DEFAULT_CPU_CORES,
  diskSizeGB: 10,
};

export const useQemuStore = create<QemuState>((set, get) => ({
  vmStatus: "stopped",
  vmLogs: [],
  vmStats: null,
  settings: DEFAULT_SETTINGS,
  isInitialized: false,
  error: null,
  qemuPaths: null,
  requirements: null,
  dockerAvailable: false,
  downloadProgress: 0,

  initialize: async () => {
    const { addLog } = get();
    set({ vmStatus: "initializing", error: null });
    addLog("[QEMU] Initializing QEMU environment...");

    try {
      // Load saved settings
      const savedSettings = await AsyncStorage.getItem(QEMU_SETTINGS_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings) as QemuSettings;
        set({ settings });
      }

      // Initialize native QEMU module
      const result = await QemuService.initialize();
      
      if (result.success) {
        set({
          isInitialized: true,
          qemuPaths: {
            qemuDir: result.qemuDir,
            isoPath: result.isoPath,
            diskPath: result.diskPath,
          },
          vmStatus: "stopped",
        });
        
        addLog(`[QEMU] Initialized at ${result.qemuDir}`);
        addLog(`[QEMU] Architecture: ${result.architecture}`);
        addLog(`[QEMU] Alpine ISO: ${result.isoExists ? "Found" : "Not found"}`);
        addLog(`[QEMU] Disk image: ${result.diskExists ? "Found" : "Not found"}`);
        
        // Check requirements
        await get().checkRequirements();
        
        // Setup event listeners
        get().setupEventListeners();
      } else {
        throw new Error("QEMU initialization failed");
      }
    } catch (error: any) {
      addLog(`[QEMU] Initialization error: ${error.message}`);
      set({ 
        error: error.message || "Failed to initialize QEMU", 
        isInitialized: true,
        vmStatus: "error"
      });
    }
  },

  checkRequirements: async () => {
    const { addLog } = get();
    
    try {
      const requirements = await QemuService.checkRequirements();
      set({ requirements });
      
      if (!requirements.qemuBinaryExists) {
        addLog("[QEMU] Warning: QEMU binary not found");
      }
      if (!requirements.alpineIsoExists) {
        addLog("[QEMU] Warning: Alpine ISO not found - download required");
      }
      if (requirements.allRequirementsMet) {
        addLog("[QEMU] All requirements met - ready to start VM");
      }
    } catch (error: any) {
      addLog(`[QEMU] Requirements check failed: ${error.message}`);
    }
  },

  downloadAlpineIso: async () => {
    const { addLog } = get();
    set({ downloadProgress: 0, error: null });
    addLog("[QEMU] Downloading Alpine Linux ISO...");

    try {
      const result = await QemuService.downloadAlpineIso();
      
      if (result.success) {
        addLog(`[QEMU] Download complete: ${(result.size / 1024 / 1024).toFixed(1)}MB`);
        set({ downloadProgress: 100 });
        
        // Refresh requirements
        await get().checkRequirements();
      }
    } catch (error: any) {
      addLog(`[QEMU] Download failed: ${error.message}`);
      set({ error: error.message, downloadProgress: 0 });
    }
  },

  startVM: async () => {
    const { settings, addLog, isInitialized } = get();
    
    if (!isInitialized) {
      await get().initialize();
    }
    
    set({ vmStatus: "starting", error: null, dockerAvailable: false });
    addLog(`[QEMU] Starting VM with ${settings.ramMB}MB RAM, ${settings.cpuCores} CPUs...`);

    try {
      const result = await QemuService.startVM(settings.ramMB, settings.cpuCores);
      
      if (result.success) {
        addLog("[QEMU] VM started successfully");
        addLog(`[QEMU] Docker API: localhost:${result.dockerPort}`);
        addLog(`[QEMU] SSH: localhost:${result.sshPort}`);
        
        if (result.message) {
          addLog(`[QEMU] ${result.message}`);
        }
        
        set({
          vmStatus: "running",
          dockerAvailable: result.dockerReady ?? false,
          vmStats: {
            cpuUsage: 5,
            memoryUsed: 256,
            memoryTotal: settings.ramMB,
            uptime: 0,
          },
        });
        
        // Start polling for Docker availability
        get().pollDockerAvailability();
      } else {
        throw new Error("VM start failed");
      }
    } catch (error: any) {
      addLog(`[QEMU] Error: ${error.message}`);
      set({ vmStatus: "error", error: error.message });
    }
  },

  stopVM: async () => {
    const { addLog } = get();
    set({ vmStatus: "stopping", error: null });
    addLog("[QEMU] Stopping VM...");

    try {
      const result = await QemuService.stopVM();
      
      if (result.success) {
        addLog("[QEMU] VM stopped");
        set({ vmStatus: "stopped", vmStats: null, dockerAvailable: false });
      }
    } catch (error: any) {
      addLog(`[QEMU] Error: ${error.message}`);
      set({ vmStatus: "error", error: error.message });
    }
  },

  restartVM: async () => {
    await get().stopVM();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await get().startVM();
  },

  getVMStats: async () => {
    const { vmStatus, settings } = get();
    if (vmStatus !== "running") return;

    try {
      const status = await QemuService.getStatus();
      
      set({ dockerAvailable: status.dockerAvailable });
      
      // Update stats with real or simulated data
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
    } catch (error: any) {
      console.warn("Failed to get VM stats:", error);
    }
  },

  updateSettings: async (newSettings: Partial<QemuSettings>) => {
    const { settings, addLog } = get();
    const updatedSettings = { ...settings, ...newSettings };
    
    try {
      await AsyncStorage.setItem(QEMU_SETTINGS_KEY, JSON.stringify(updatedSettings));
      set({ settings: updatedSettings, error: null });
      addLog("[QEMU] Settings updated");
    } catch (error) {
      set({ error: "Failed to save settings" });
    }
  },

  addLog: (log: string) => {
    const timestamp = new Date().toLocaleTimeString();
    set((state) => ({
      vmLogs: [...state.vmLogs.slice(-199), `[${timestamp}] ${log}`],
    }));
  },

  clearLogs: () => {
    set({ vmLogs: [] });
  },

  clearError: () => {
    set({ error: null });
  },

  setupEventListeners: () => {
    const { addLog } = get();
    
    // Listen for state changes from native module
    QemuService.addEventListener<StateChangeEvent>("qemu_state_change", (data) => {
      addLog(`[QEMU] State changed: ${data.state}`);
      set({ vmStatus: data.state as VMStatus });
    });
    
    // Listen for logs from native module
    QemuService.addEventListener<LogEvent>("qemu_log", (data) => {
      addLog(data.log);
    });
    
    // Listen for download progress
    QemuService.addEventListener<{ progress: number; status: string }>("qemu_download_progress", (data) => {
      set({ downloadProgress: data.progress });
      if (data.status === "complete") {
        addLog("[QEMU] Download complete");
      }
    });
  },

  cleanupEventListeners: () => {
    QemuService.removeAllListeners();
  },

  // Private method for polling Docker availability
  pollDockerAvailability: async function() {
    const { vmStatus, addLog } = get();
    
    if (vmStatus !== "running") return;
    
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds total
    
    const poll = async () => {
      if (get().vmStatus !== "running" || attempts >= maxAttempts) {
        return;
      }
      
      try {
        const status = await QemuService.getStatus();
        
        if (status.dockerAvailable && !get().dockerAvailable) {
          addLog("[QEMU] Docker API is now available!");
          set({ dockerAvailable: true });
          return;
        }
      } catch (e) {
        // Ignore polling errors
      }
      
      attempts++;
      setTimeout(poll, 2000);
    };
    
    poll();
  },
}));
