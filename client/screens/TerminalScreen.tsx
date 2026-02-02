import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, TextInput, ScrollView, Pressable, Keyboard, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useDockerStore } from "@/store/useDockerStore";
import { useQemuStore } from "@/store/useQemuStore";
import DockerAPI from "@/services/DockerAPI";

type RouteProps = RouteProp<RootStackParamList, "Terminal">;

interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "system";
  text: string;
  timestamp?: string;
}

export default function TerminalScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const { dockerApiUrl } = useDockerStore();
  const { vmStatus, dockerAvailable } = useQemuStore();
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const dockerRef = useRef<DockerAPI>(new DockerAPI(dockerApiUrl));
  
  const [command, setCommand] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const containerId = route.params.containerId;
  const containerIdShort = containerId.substring(0, 12);
  
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: "1",
      type: "system",
      text: "╔══════════════════════════════════════════╗",
    },
    {
      id: "2",
      type: "system",
      text: "║     Docker Android Terminal v1.0.0       ║",
    },
    {
      id: "3",
      type: "system",
      text: "╚══════════════════════════════════════════╝",
    },
    {
      id: "4",
      type: "output",
      text: `Container: ${containerIdShort}`,
    },
    {
      id: "5",
      type: "output",
      text: vmStatus === "running" && dockerAvailable 
        ? "Docker API: Connected ✓" 
        : "Docker API: Not available (using simulation)",
    },
    {
      id: "6",
      type: "output",
      text: "Type 'help' for available commands.\n",
    },
  ]);

  // Update Docker API URL when it changes
  useEffect(() => {
    dockerRef.current = new DockerAPI(dockerApiUrl);
  }, [dockerApiUrl]);

  const addLine = useCallback((type: TerminalLine["type"], text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLines(prev => [...prev.slice(-200), { // Keep last 200 lines
      id: Date.now().toString() + Math.random(),
      type,
      text,
      timestamp,
    }]);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, []);

  const executeRealCommand = async (cmd: string): Promise<{ output: string; isError: boolean }> => {
    const docker = dockerRef.current;
    
    try {
      // Create exec instance
      const exec = await docker.createExec(containerId, ["/bin/sh", "-c", cmd]);
      
      // Start exec and get output
      // Note: In real implementation, this would use WebSocket for bidirectional communication
      // For now, we use a simplified approach
      await docker.startExec(exec.Id);
      
      // Poll for exec completion
      let attempts = 0;
      while (attempts < 30) {
        const status = await docker.inspectExec(exec.Id);
        if (!status.Running) {
          // Exec completed
          return {
            output: `Command executed (exit code: ${status.ExitCode})`,
            isError: status.ExitCode !== 0,
          };
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      return { output: "Command timed out", isError: true };
    } catch (error: any) {
      return { 
        output: `Error: ${error.message || "Failed to execute command"}`, 
        isError: true 
      };
    }
  };

  const executeSimulatedCommand = (cmd: string): { output: string; isError: boolean } => {
    const trimmedCmd = cmd.trim().toLowerCase();
    const parts = trimmedCmd.split(/\s+/);
    const baseCmd = parts[0];
    
    // Built-in commands
    switch (baseCmd) {
      case "help":
        return {
          output: `Available commands:
  help          Show this help message
  clear         Clear terminal
  exit          Close terminal
  
Container commands (simulated when Docker not available):
  ls [-la]      List files
  pwd           Print working directory
  ps [aux]      List processes
  cat <file>    Display file contents
  echo <text>   Print text
  whoami        Current user
  hostname      Container hostname
  env           Environment variables
  uname -a      System info
  
Docker commands:
  docker ps     List containers
  docker images List images
  docker info   Docker system info`,
          isError: false,
        };
        
      case "clear":
        setLines([]);
        return { output: "", isError: false };
        
      case "exit":
        navigation.goBack();
        return { output: "", isError: false };
        
      case "ls":
        const lsLong = parts.includes("-la") || parts.includes("-l") || parts.includes("-al");
        if (lsLong) {
          return {
            output: `total 64
drwxr-xr-x    1 root root  4096 Jan 15 10:30 .
drwxr-xr-x    1 root root  4096 Jan 15 10:30 ..
drwxr-xr-x    2 root root  4096 Jan 10 00:00 bin
drwxr-xr-x    5 root root   340 Jan 15 10:30 dev
drwxr-xr-x    1 root root  4096 Jan 15 10:30 etc
drwxr-xr-x    2 root root  4096 Jan 10 00:00 home
drwxr-xr-x    1 root root  4096 Jan 10 00:00 lib
drwxr-xr-x    5 root root  4096 Jan 10 00:00 media
drwxr-xr-x    2 root root  4096 Jan 10 00:00 mnt
drwxr-xr-x    2 root root  4096 Jan 10 00:00 opt
dr-xr-xr-x  182 root root     0 Jan 15 10:30 proc
drwx------    1 root root  4096 Jan 15 10:35 root
drwxr-xr-x    1 root root  4096 Jan 15 10:30 run
drwxr-xr-x    2 root root  4096 Jan 10 00:00 sbin
drwxr-xr-x    2 root root  4096 Jan 10 00:00 srv
dr-xr-xr-x   13 root root     0 Jan 15 10:30 sys
drwxrwxrwt    1 root root  4096 Jan 15 10:35 tmp
drwxr-xr-x    1 root root  4096 Jan 10 00:00 usr
drwxr-xr-x    1 root root  4096 Jan 10 00:00 var`,
            isError: false,
          };
        }
        return {
          output: "bin   dev   etc   home  lib   media mnt   opt   proc  root  run   sbin  srv   sys   tmp   usr   var",
          isError: false,
        };
        
      case "pwd":
        return { output: "/root", isError: false };
        
      case "ps":
        const psAux = parts.includes("aux");
        if (psAux) {
          return {
            output: `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1   8536  3200 ?        Ss   10:30   0:00 /sbin/init
root        12  0.5  2.1 1254320 42880 ?       Ssl  10:30   0:05 dockerd
root        45  0.2  1.0  940564 21264 ?       Ssl  10:30   0:02 containerd
root       128  0.0  0.0   4284   732 pts/0    Ss+  10:35   0:00 /bin/sh`,
            isError: false,
          };
        }
        return {
          output: `  PID TTY      TIME     CMD
    1 ?        00:00:00 init
   12 ?        00:00:05 dockerd
   45 ?        00:00:02 containerd
  128 pts/0    00:00:00 sh`,
          isError: false,
        };
        
      case "whoami":
        return { output: "root", isError: false };
        
      case "hostname":
        return { output: containerIdShort, isError: false };
        
      case "uname":
        return {
          output: "Linux " + containerIdShort + " 5.15.0-alpine #1 SMP x86_64 Linux",
          isError: false,
        };
        
      case "env":
        return {
          output: `PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOSTNAME=${containerIdShort}
HOME=/root
TERM=xterm-256color
DOCKER_HOST=tcp://localhost:2375`,
          isError: false,
        };
        
      case "echo":
        return { output: parts.slice(1).join(" "), isError: false };
        
      case "cat":
        if (parts[1] === "/etc/os-release") {
          return {
            output: `NAME="Alpine Linux"
ID=alpine
VERSION_ID=3.19.1
PRETTY_NAME="Alpine Linux v3.19"
HOME_URL="https://alpinelinux.org/"`,
            isError: false,
          };
        }
        return { output: `cat: ${parts[1] || "missing operand"}: No such file or directory`, isError: true };
        
      case "docker":
        const dockerSubCmd = parts[1];
        switch (dockerSubCmd) {
          case "ps":
            return {
              output: `CONTAINER ID   IMAGE          COMMAND     STATUS         PORTS
${containerIdShort}   alpine:latest  "/bin/sh"   Up 10 minutes  `,
              isError: false,
            };
          case "images":
            return {
              output: `REPOSITORY   TAG       IMAGE ID       SIZE
alpine       latest    c059bfaa849c   7.8MB
nginx        alpine    a6eb2a334a9f   43.2MB
busybox      latest    65ad0d468eb1   4.26MB`,
              isError: false,
            };
          case "info":
            return {
              output: `Client: Docker Engine
 Version:    24.0.7
 Context:    default

Server:
 Containers: 3
  Running: 1
  Paused: 0
  Stopped: 2
 Images: 5
 Server Version: 24.0.7
 Storage Driver: overlay2
 Kernel Version: 5.15.0-alpine`,
              isError: false,
            };
          default:
            return {
              output: `docker: '${dockerSubCmd || ""}' is not a docker command.\nSee 'docker --help'.`,
              isError: true,
            };
        }
        
      default:
        if (trimmedCmd) {
          return {
            output: `sh: ${baseCmd}: command not found`,
            isError: true,
          };
        }
        return { output: "", isError: false };
    }
  };

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    
    // Add to history
    setCommandHistory(prev => [...prev.slice(-50), cmd]);
    setHistoryIndex(-1);
    
    // Display input
    addLine("input", `$ ${cmd}`);
    
    // Handle built-in commands that don't need Docker
    const trimmedCmd = cmd.trim().toLowerCase();
    if (["help", "clear", "exit"].includes(trimmedCmd.split(/\s+/)[0])) {
      const { output, isError } = executeSimulatedCommand(cmd);
      if (output) {
        addLine(isError ? "error" : "output", output);
      }
      return;
    }
    
    // Try real execution if Docker is available
    if (vmStatus === "running" && dockerAvailable) {
      setIsExecuting(true);
      try {
        const { output, isError } = await executeRealCommand(cmd);
        addLine(isError ? "error" : "output", output);
      } catch (error: any) {
        addLine("error", `Execution failed: ${error.message}`);
      } finally {
        setIsExecuting(false);
      }
    } else {
      // Use simulation
      const { output, isError } = executeSimulatedCommand(cmd);
      if (output) {
        addLine(isError ? "error" : "output", output);
      }
    }
  };

  const handleSubmit = () => {
    if (command.trim() && !isExecuting) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      executeCommand(command);
      setCommand("");
    }
  };

  const navigateHistory = (direction: "up" | "down") => {
    if (commandHistory.length === 0) return;
    
    let newIndex: number;
    if (direction === "up") {
      newIndex = historyIndex === -1 
        ? commandHistory.length - 1 
        : Math.max(0, historyIndex - 1);
    } else {
      newIndex = historyIndex === -1 
        ? -1 
        : Math.min(commandHistory.length - 1, historyIndex + 1);
    }
    
    setHistoryIndex(newIndex);
    if (newIndex >= 0 && newIndex < commandHistory.length) {
      setCommand(commandHistory[newIndex]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: "#1E1E1E" }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Feather name="x" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle}>Terminal</ThemedText>
          {vmStatus === "running" && dockerAvailable && (
            <View style={styles.connectedBadge}>
              <View style={styles.connectedDot} />
              <ThemedText style={styles.connectedText}>Live</ThemedText>
            </View>
          )}
        </View>
        <Pressable
          style={styles.clearButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setLines([]);
          }}
        >
          <Feather name="trash-2" size={20} color="#888888" />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.terminal}
        contentContainerStyle={styles.terminalContent}
        keyboardDismissMode="interactive"
      >
        {lines.map((line) => (
          <ThemedText
            key={line.id}
            style={[
              styles.terminalLine,
              line.type === "input" && styles.inputLine,
              line.type === "output" && styles.outputLine,
              line.type === "error" && styles.errorLine,
              line.type === "system" && styles.systemLine,
            ]}
          >
            {line.text}
          </ThemedText>
        ))}
        {isExecuting && (
          <View style={styles.executingContainer}>
            <ActivityIndicator size="small" color="#4EC9B0" />
            <ThemedText style={styles.executingText}>Executing...</ThemedText>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <View style={styles.historyButtons}>
          <Pressable 
            style={styles.historyButton} 
            onPress={() => navigateHistory("up")}
          >
            <Feather name="chevron-up" size={18} color="#666666" />
          </Pressable>
          <Pressable 
            style={styles.historyButton} 
            onPress={() => navigateHistory("down")}
          >
            <Feather name="chevron-down" size={18} color="#666666" />
          </Pressable>
        </View>
        <ThemedText style={styles.prompt}>$</ThemedText>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={command}
          onChangeText={setCommand}
          onSubmitEditing={handleSubmit}
          placeholder="Enter command..."
          placeholderTextColor="#666666"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          blurOnSubmit={false}
          editable={!isExecuting}
        />
        <Pressable 
          style={[styles.sendButton, isExecuting && styles.sendButtonDisabled]} 
          onPress={handleSubmit}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <ActivityIndicator size="small" color={colors.accent.mauve} />
          ) : (
            <Feather name="corner-down-left" size={20} color={colors.accent.mauve} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2D5A2D",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4EC9B0",
    marginRight: 4,
  },
  connectedText: {
    color: "#4EC9B0",
    fontSize: 11,
    fontWeight: "600",
  },
  clearButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  terminal: {
    flex: 1,
  },
  terminalContent: {
    padding: Spacing.md,
  },
  terminalLine: {
    color: "#CCCCCC",
    fontFamily: "monospace",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  inputLine: {
    color: "#4EC9B0",
    fontWeight: "500",
  },
  outputLine: {
    color: "#CCCCCC",
  },
  errorLine: {
    color: "#F48771",
  },
  systemLine: {
    color: "#6A9955",
    fontWeight: "600",
  },
  executingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  executingText: {
    color: "#4EC9B0",
    fontFamily: "monospace",
    fontSize: 14,
    marginLeft: Spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#252526",
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#333333",
  },
  historyButtons: {
    marginRight: Spacing.xs,
  },
  historyButton: {
    padding: 4,
  },
  prompt: {
    color: "#4EC9B0",
    fontFamily: "monospace",
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 44,
    color: "#FFFFFF",
    fontFamily: "monospace",
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
