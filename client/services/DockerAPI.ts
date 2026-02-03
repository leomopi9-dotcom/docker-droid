import axios, { AxiosInstance, AxiosError } from "axios";

export interface Container {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: string;
  Status: string;
  Ports: Port[];
  Labels: Record<string, string>;
  SizeRw?: number;
  SizeRootFs?: number;
  HostConfig: {
    NetworkMode: string;
  };
  NetworkSettings: {
    Networks: Record<string, NetworkInfo>;
  };
  Mounts: Mount[];
}

export interface Port {
  IP?: string;
  PrivatePort: number;
  PublicPort?: number;
  Type: string;
}

export interface Mount {
  Type: string;
  Name?: string;
  Source: string;
  Destination: string;
  Driver?: string;
  Mode: string;
  RW: boolean;
  Propagation: string;
}

export interface NetworkInfo {
  IPAMConfig?: any;
  Links?: string[];
  Aliases?: string[];
  NetworkID: string;
  EndpointID: string;
  Gateway: string;
  IPAddress: string;
  IPPrefixLen: number;
  IPv6Gateway: string;
  GlobalIPv6Address: string;
  GlobalIPv6PrefixLen: number;
  MacAddress: string;
}

export interface DockerImage {
  Id: string;
  ParentId: string;
  RepoTags: string[];
  RepoDigests: string[];
  Created: number;
  Size: number;
  VirtualSize: number;
  SharedSize: number;
  Labels: Record<string, string>;
  Containers: number;
}

export interface Volume {
  Name: string;
  Driver: string;
  Mountpoint: string;
  CreatedAt: string;
  Status?: Record<string, string>;
  Labels: Record<string, string>;
  Scope: string;
  Options?: Record<string, string>;
  UsageData?: {
    Size: number;
    RefCount: number;
  };
}

export interface Network {
  Id: string;
  Name: string;
  Created: string;
  Scope: string;
  Driver: string;
  EnableIPv6: boolean;
  IPAM: {
    Driver: string;
    Options?: Record<string, string>;
    Config: Array<{
      Subnet?: string;
      Gateway?: string;
    }>;
  };
  Internal: boolean;
  Attachable: boolean;
  Ingress: boolean;
  Options: Record<string, string>;
  Labels: Record<string, string>;
}

export interface SystemInfo {
  ID: string;
  Containers: number;
  ContainersRunning: number;
  ContainersPaused: number;
  ContainersStopped: number;
  Images: number;
  Driver: string;
  MemTotal: number;
  Name: string;
  NCPU: number;
  OperatingSystem: string;
  OSType: string;
  Architecture: string;
  DockerRootDir: string;
  ServerVersion: string;
}

export interface ContainerStats {
  cpu_stats: {
    cpu_usage: {
      total_usage: number;
      percpu_usage?: number[];
      usage_in_kernelmode: number;
      usage_in_usermode: number;
    };
    system_cpu_usage: number;
    online_cpus: number;
  };
  precpu_stats: {
    cpu_usage: {
      total_usage: number;
    };
    system_cpu_usage: number;
  };
  memory_stats: {
    usage: number;
    max_usage: number;
    limit: number;
    stats?: Record<string, number>;
  };
  networks?: Record<string, {
    rx_bytes: number;
    tx_bytes: number;
  }>;
}

export interface CreateContainerConfig {
  Image: string;
  Cmd?: string[];
  Env?: string[];
  ExposedPorts?: Record<string, object>;
  HostConfig?: {
    PortBindings?: Record<string, Array<{ HostIp?: string; HostPort: string }>>;
    Binds?: string[];
    Memory?: number;
    NanoCpus?: number;
    RestartPolicy?: {
      Name: string;
      MaximumRetryCount?: number;
    };
  };
  NetworkingConfig?: any;
  Labels?: Record<string, string>;
}

export class DockerAPI {
  private baseUrl: string;
  private axios: AxiosInstance;

  constructor(baseUrl: string = "http://localhost:2375") {
    this.baseUrl = baseUrl;
    this.axios = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private handleError(error: AxiosError): never {
    if (error.response) {
      const message = (error.response.data as any)?.message || error.response.statusText;
      throw new Error(`Docker API Error (${error.response.status}): ${message}`);
    } else if (error.request) {
      throw new Error("Docker API not reachable. Is the Docker daemon running?");
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.axios.get("/_ping");
      return response.data === "OK" || response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async getVersion(): Promise<{ Version: string; ApiVersion: string; Os: string; Arch: string }> {
    try {
      const response = await this.axios.get("/version");
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const response = await this.axios.get("/info");
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async listContainers(all: boolean = true): Promise<Container[]> {
    try {
      const response = await this.axios.get("/containers/json", {
        params: { all },
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getContainer(id: string): Promise<Container> {
    try {
      const response = await this.axios.get(`/containers/${id}/json`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createContainer(config: CreateContainerConfig, name?: string): Promise<{ Id: string; Warnings: string[] }> {
    try {
      const params = name ? { name } : {};
      const response = await this.axios.post("/containers/create", config, { params });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async startContainer(id: string): Promise<void> {
    try {
      await this.axios.post(`/containers/${id}/start`);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status !== 304) {
        this.handleError(axiosError);
      }
    }
  }

  async stopContainer(id: string, timeout: number = 10): Promise<void> {
    try {
      await this.axios.post(`/containers/${id}/stop`, null, {
        params: { t: timeout },
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status !== 304) {
        this.handleError(axiosError);
      }
    }
  }

  async restartContainer(id: string, timeout: number = 10): Promise<void> {
    try {
      await this.axios.post(`/containers/${id}/restart`, null, {
        params: { t: timeout },
      });
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async removeContainer(id: string, force: boolean = false): Promise<void> {
    try {
      await this.axios.delete(`/containers/${id}`, {
        params: { force, v: true },
      });
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getContainerLogs(id: string, tail: number = 100): Promise<string> {
    try {
      const response = await this.axios.get(`/containers/${id}/logs`, {
        params: {
          stdout: true,
          stderr: true,
          tail,
          timestamps: true,
        },
        responseType: "text",
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getContainerStats(id: string, stream: boolean = false): Promise<ContainerStats> {
    try {
      const response = await this.axios.get(`/containers/${id}/stats`, {
        params: { stream },
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async listImages(): Promise<DockerImage[]> {
    try {
      const response = await this.axios.get("/images/json");
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async inspectImage(id: string): Promise<any> {
    try {
      const response = await this.axios.get(`/images/${id}/json`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async pullImage(imageName: string, onProgress?: (progress: number) => void): Promise<void> {
    try {
      const [image, tag = "latest"] = imageName.split(":");
      const response = await this.axios.post("/images/create", null, {
        params: { fromImage: image, tag },
        responseType: "stream",
      });

      return new Promise((resolve, reject) => {
        let progress = 0;
        response.data.on("data", (chunk: Buffer) => {
          try {
            const lines = chunk.toString().split("\n").filter(Boolean);
            for (const line of lines) {
              const data = JSON.parse(line);
              if (data.progressDetail?.current && data.progressDetail?.total) {
                progress = (data.progressDetail.current / data.progressDetail.total) * 100;
                onProgress?.(progress);
              }
              if (data.error) {
                reject(new Error(data.error));
              }
            }
          } catch {
          }
        });

        response.data.on("end", () => {
          onProgress?.(100);
          resolve();
        });

        response.data.on("error", reject);
      });
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async removeImage(id: string, force: boolean = false): Promise<void> {
    try {
      await this.axios.delete(`/images/${id}`, {
        params: { force },
      });
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async listVolumes(): Promise<Volume[]> {
    try {
      const response = await this.axios.get("/volumes");
      return response.data.Volumes || [];
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createVolume(name: string, driver: string = "local"): Promise<Volume> {
    try {
      const response = await this.axios.post("/volumes/create", {
        Name: name,
        Driver: driver,
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async removeVolume(name: string, force: boolean = false): Promise<void> {
    try {
      await this.axios.delete(`/volumes/${name}`, {
        params: { force },
      });
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async listNetworks(): Promise<Network[]> {
    try {
      const response = await this.axios.get("/networks");
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createNetwork(name: string, driver: string = "bridge"): Promise<{ Id: string; Warning: string }> {
    try {
      const response = await this.axios.post("/networks/create", {
        Name: name,
        Driver: driver,
        CheckDuplicate: true,
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async removeNetwork(id: string): Promise<void> {
    try {
      await this.axios.delete(`/networks/${id}`);
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }
}

export default DockerAPI;
