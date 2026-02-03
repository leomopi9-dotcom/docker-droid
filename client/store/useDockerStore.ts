import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DockerAPI, Container, DockerImage, Volume, Network, SystemInfo } from "@/services/DockerAPI";

interface DockerState {
  containers: Container[];
  images: DockerImage[];
  volumes: Volume[];
  networks: Network[];
  systemInfo: SystemInfo | null;
  isLoading: boolean;
  error: string | null;
  selectedContainer: Container | null;
  dockerApiUrl: string;

  setDockerApiUrl: (url: string) => Promise<void>;
  fetchContainers: () => Promise<void>;
  fetchImages: () => Promise<void>;
  fetchVolumes: () => Promise<void>;
  fetchNetworks: () => Promise<void>;
  fetchSystemInfo: () => Promise<void>;
  fetchAll: () => Promise<void>;
  startContainer: (id: string) => Promise<void>;
  stopContainer: (id: string) => Promise<void>;
  restartContainer: (id: string) => Promise<void>;
  removeContainer: (id: string, force?: boolean) => Promise<void>;
  selectContainer: (container: Container | null) => void;
  pullImage: (imageName: string, onProgress?: (progress: number) => void) => Promise<void>;
  removeImage: (id: string, force?: boolean) => Promise<void>;
  createContainer: (config: any) => Promise<string | null>;
  clearError: () => void;
}

const DOCKER_API_URL_KEY = "@docker_api_url";
const DEFAULT_API_URL = "http://localhost:2375";

export const useDockerStore = create<DockerState>((set, get) => {
  let docker = new DockerAPI(DEFAULT_API_URL);

  return {
    containers: [],
    images: [],
    volumes: [],
    networks: [],
    systemInfo: null,
    isLoading: false,
    error: null,
    selectedContainer: null,
    dockerApiUrl: DEFAULT_API_URL,

    setDockerApiUrl: async (url: string) => {
      try {
        await AsyncStorage.setItem(DOCKER_API_URL_KEY, url);
        docker = new DockerAPI(url);
        set({ dockerApiUrl: url, error: null });
      } catch (error) {
        set({ error: "Failed to save Docker API URL" });
      }
    },

    fetchContainers: async () => {
      set({ isLoading: true, error: null });
      try {
        const containers = await docker.listContainers(true);
        set({ containers, isLoading: false });
      } catch (error: any) {
        set({ error: error.message || "Failed to fetch containers", isLoading: false });
      }
    },

    fetchImages: async () => {
      set({ isLoading: true, error: null });
      try {
        const images = await docker.listImages();
        set({ images, isLoading: false });
      } catch (error: any) {
        set({ error: error.message || "Failed to fetch images", isLoading: false });
      }
    },

    fetchVolumes: async () => {
      set({ isLoading: true, error: null });
      try {
        const volumes = await docker.listVolumes();
        set({ volumes, isLoading: false });
      } catch (error: any) {
        set({ error: error.message || "Failed to fetch volumes", isLoading: false });
      }
    },

    fetchNetworks: async () => {
      set({ isLoading: true, error: null });
      try {
        const networks = await docker.listNetworks();
        set({ networks, isLoading: false });
      } catch (error: any) {
        set({ error: error.message || "Failed to fetch networks", isLoading: false });
      }
    },

    fetchSystemInfo: async () => {
      set({ isLoading: true, error: null });
      try {
        const systemInfo = await docker.getSystemInfo();
        set({ systemInfo, isLoading: false });
      } catch (error: any) {
        set({ error: error.message || "Failed to fetch system info", isLoading: false });
      }
    },

    fetchAll: async () => {
      set({ isLoading: true, error: null });
      try {
        const [containers, images, volumes, networks, systemInfo] = await Promise.all([
          docker.listContainers(true),
          docker.listImages(),
          docker.listVolumes(),
          docker.listNetworks(),
          docker.getSystemInfo(),
        ]);
        set({ containers, images, volumes, networks, systemInfo, isLoading: false });
      } catch (error: any) {
        set({ error: error.message || "Failed to fetch Docker data", isLoading: false });
      }
    },

    startContainer: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        await docker.startContainer(id);
        const containers = get().containers.map((c) =>
          c.Id === id ? { ...c, State: "running" } : c
        );
        set({ containers, isLoading: false });
      } catch (error: any) {
        set({ error: error.message || "Failed to start container", isLoading: false });
      }
    },

    stopContainer: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        await docker.stopContainer(id);
        const containers = get().containers.map((c) =>
          c.Id === id ? { ...c, State: "exited" } : c
        );
        set({ containers, isLoading: false });
      } catch (error: any) {
        set({ error: error.message || "Failed to stop container", isLoading: false });
      }
    },

    restartContainer: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        await docker.restartContainer(id);
        await get().fetchContainers();
      } catch (error: any) {
        set({ error: error.message || "Failed to restart container", isLoading: false });
      }
    },

    removeContainer: async (id: string, force = false) => {
      set({ isLoading: true, error: null });
      try {
        await docker.removeContainer(id, force);
        const containers = get().containers.filter((c) => c.Id !== id);
        set({ containers, isLoading: false });
      } catch (error: any) {
        set({ error: error.message || "Failed to remove container", isLoading: false });
      }
    },

    selectContainer: (container: Container | null) => {
      set({ selectedContainer: container });
    },

    pullImage: async (imageName: string, onProgress?: (progress: number) => void) => {
      set({ isLoading: true, error: null });
      try {
        await docker.pullImage(imageName, onProgress);
        await get().fetchImages();
      } catch (error: any) {
        set({ error: error.message || "Failed to pull image", isLoading: false });
      }
    },

    removeImage: async (id: string, force = false) => {
      set({ isLoading: true, error: null });
      try {
        await docker.removeImage(id, force);
        const images = get().images.filter((img) => img.Id !== id);
        set({ images, isLoading: false });
      } catch (error: any) {
        set({ error: error.message || "Failed to remove image", isLoading: false });
      }
    },

    createContainer: async (config: any) => {
      set({ isLoading: true, error: null });
      try {
        const result = await docker.createContainer(config);
        await get().fetchContainers();
        return result.Id;
      } catch (error: any) {
        set({ error: error.message || "Failed to create container", isLoading: false });
        return null;
      }
    },

    clearError: () => {
      set({ error: null });
    },
  };
});
