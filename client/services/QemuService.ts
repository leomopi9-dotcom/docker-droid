/**
 * QemuService - React Native bridge to native QEMU module
 * 
 * This service provides a clean API for controlling QEMU VM from JavaScript.
 * It communicates with the native QemuModule for actual VM operations.
 */

import { NativeModules, NativeEventEmitter, Platform } from "react-native";

// Type definitions for native module
interface QemuNativeModule {
  initialize(): Promise<QemuInitResult>;
  startVM(ramMb: number, cpuCores: number): Promise<QemuStartResult>;
  stopVM(): Promise<QemuStopResult>;
  getStatus(): Promise<QemuStatusResult>;
  getLogs(tail: number): Promise<QemuLogsResult>;
  downloadAlpineIso(): Promise<QemuDownloadResult>;
  checkRequirements(): Promise<QemuRequirementsResult>;
  
  // Constants exported from native
  VM_STATE_STOPPED: string;
  VM_STATE_STARTING: string;
  VM_STATE_RUNNING: string;
  VM_STATE_STOPPING: string;
  VM_STATE_ERROR: string;
  DEFAULT_RAM_MB: number;
  DEFAULT_CPU_CORES: number;
  DOCKER_API_PORT: number;
  SSH_PORT: number;
}

export interface QemuInitResult {
  success: boolean;
  qemuDir: string;
  isoPath: string;
  diskPath: string;
  isoExists: boolean;
  diskExists: boolean;
  romsExists: boolean;
  qemuBinaryExists: boolean;
  qemuBinaryPath: string;
  architecture: string;
}

export interface QemuStartResult {
  success: boolean;
  state: string;
  dockerPort?: number;
  sshPort?: number;
  dockerReady?: boolean;
  message?: string;
}

export interface QemuStopResult {
  success: boolean;
  state: string;
}

export interface QemuStatusResult {
  state: string;
  isRunning: boolean;
  dockerAvailable: boolean;
  dockerPort: number;
  sshPort: number;
}

export interface QemuLogsResult {
  logs: string;
}

export interface QemuDownloadResult {
  success: boolean;
  path: string;
  size: number;
}

export interface QemuRequirementsResult {
  qemuBinaryExists: boolean;
  qemuBinaryPath: string;
  alpineIsoExists: boolean;
  alpineIsoPath: string;
  alpineIsoSize: number;
  diskImageExists: boolean;
  diskImagePath: string;
  diskImageSize: number;
  allRequirementsMet: boolean;
}

export interface QemuEventListener {
  remove: () => void;
}

export type QemuEvent = 
  | "qemu_state_change"
  | "qemu_log"
  | "qemu_download_progress"
  | "qemu_error";

export interface StateChangeEvent {
  state: string;
}

export interface LogEvent {
  log: string;
}

export interface DownloadProgressEvent {
  progress: number;
  status: string;
}

export interface ErrorEvent {
  message: string;
  code?: string;
}

// Get native module
const QemuNative: QemuNativeModule | undefined = 
  Platform.OS === "android" ? NativeModules.QemuModule : undefined;

// Create event emitter for native events
const qemuEventEmitter = QemuNative 
  ? new NativeEventEmitter(NativeModules.QemuModule) 
  : null;

/**
 * Mock implementation for non-Android platforms (web/iOS)
 */
class QemuMockService {
  private state: string = "stopped";
  private logs: string[] = [];

  async initialize(): Promise<QemuInitResult> {
    return {
      success: true,
      qemuDir: "/mock/qemu",
      isoPath: "/mock/qemu/alpine-virt.iso",
      diskPath: "/mock/qemu/alpine-disk.qcow2",
      isoExists: false,
      diskExists: false,
      romsExists: false,
      qemuBinaryExists: false,
      qemuBinaryPath: "",
      architecture: "mock",
    };
  }

  async startVM(ramMb: number, cpuCores: number): Promise<QemuStartResult> {
    this.state = "starting";
    this.logs.push(`Starting VM with ${ramMb}MB RAM, ${cpuCores} CPUs`);
    
    // Simulate startup
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.logs.push("Booting Alpine Linux...");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    this.logs.push("Starting Docker daemon...");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.state = "running";
    this.logs.push("VM started successfully");
    
    return {
      success: true,
      state: this.state,
      dockerPort: 2375,
      sshPort: 2222,
      dockerReady: false,
      message: "Mock VM started (no real QEMU on this platform)",
    };
  }

  async stopVM(): Promise<QemuStopResult> {
    this.state = "stopping";
    this.logs.push("Stopping VM...");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.state = "stopped";
    this.logs.push("VM stopped");
    
    return {
      success: true,
      state: this.state,
    };
  }

  async getStatus(): Promise<QemuStatusResult> {
    return {
      state: this.state,
      isRunning: this.state === "running",
      dockerAvailable: false,
      dockerPort: 2375,
      sshPort: 2222,
    };
  }

  async getLogs(tail: number): Promise<QemuLogsResult> {
    return {
      logs: this.logs.slice(-tail).join("\n"),
    };
  }

  async downloadAlpineIso(): Promise<QemuDownloadResult> {
    throw new Error("Cannot download Alpine ISO on this platform");
  }

  async checkRequirements(): Promise<QemuRequirementsResult> {
    return {
      qemuBinaryExists: false,
      qemuBinaryPath: "",
      alpineIsoExists: false,
      alpineIsoPath: "",
      alpineIsoSize: 0,
      diskImageExists: false,
      diskImagePath: "",
      diskImageSize: 0,
      allRequirementsMet: false,
    };
  }

  addEventListener(_event: QemuEvent, _callback: (data: any) => void): QemuEventListener {
    return { remove: () => {} };
  }

  removeAllListeners() {}
}

/**
 * Real QEMU Service implementation for Android
 */
class QemuRealService {
  private listeners: QemuEventListener[] = [];

  async initialize(): Promise<QemuInitResult> {
    if (!QemuNative) {
      throw new Error("QemuModule is not available");
    }
    return QemuNative.initialize();
  }

  async startVM(
    ramMb: number = QemuNative?.DEFAULT_RAM_MB ?? 2048,
    cpuCores: number = QemuNative?.DEFAULT_CPU_CORES ?? 2
  ): Promise<QemuStartResult> {
    if (!QemuNative) {
      throw new Error("QemuModule is not available");
    }
    return QemuNative.startVM(ramMb, cpuCores);
  }

  async stopVM(): Promise<QemuStopResult> {
    if (!QemuNative) {
      throw new Error("QemuModule is not available");
    }
    return QemuNative.stopVM();
  }

  async getStatus(): Promise<QemuStatusResult> {
    if (!QemuNative) {
      throw new Error("QemuModule is not available");
    }
    return QemuNative.getStatus();
  }

  async getLogs(tail: number = 100): Promise<QemuLogsResult> {
    if (!QemuNative) {
      throw new Error("QemuModule is not available");
    }
    return QemuNative.getLogs(tail);
  }

  async downloadAlpineIso(): Promise<QemuDownloadResult> {
    if (!QemuNative) {
      throw new Error("QemuModule is not available");
    }
    return QemuNative.downloadAlpineIso();
  }

  async checkRequirements(): Promise<QemuRequirementsResult> {
    if (!QemuNative) {
      throw new Error("QemuModule is not available");
    }
    return QemuNative.checkRequirements();
  }

  addEventListener<T>(event: QemuEvent, callback: (data: T) => void): QemuEventListener {
    if (!qemuEventEmitter) {
      return { remove: () => {} };
    }
    
    const subscription = qemuEventEmitter.addListener(event, callback);
    this.listeners.push(subscription as QemuEventListener);
    return subscription as QemuEventListener;
  }

  removeAllListeners() {
    this.listeners.forEach(listener => {
      try {
        listener.remove();
      } catch (e) {
        // Ignore errors when removing listeners
      }
    });
    this.listeners = [];
  }
}

/**
 * Export singleton service based on platform
 */
const QemuService = Platform.OS === "android" && QemuNative
  ? new QemuRealService()
  : new QemuMockService();

export default QemuService;

// Export constants
export const QEMU_CONSTANTS = {
  VM_STATE_STOPPED: QemuNative?.VM_STATE_STOPPED ?? "stopped",
  VM_STATE_STARTING: QemuNative?.VM_STATE_STARTING ?? "starting",
  VM_STATE_RUNNING: QemuNative?.VM_STATE_RUNNING ?? "running",
  VM_STATE_STOPPING: QemuNative?.VM_STATE_STOPPING ?? "stopping",
  VM_STATE_ERROR: QemuNative?.VM_STATE_ERROR ?? "error",
  DEFAULT_RAM_MB: QemuNative?.DEFAULT_RAM_MB ?? 2048,
  DEFAULT_CPU_CORES: QemuNative?.DEFAULT_CPU_CORES ?? 2,
  DOCKER_API_PORT: QemuNative?.DOCKER_API_PORT ?? 2375,
  SSH_PORT: QemuNative?.SSH_PORT ?? 2222,
};
