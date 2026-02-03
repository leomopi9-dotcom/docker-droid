import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TextInput, ScrollView, Pressable, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "Terminal">;

interface TerminalLine {
  id: string;
  type: "input" | "output" | "error";
  text: string;
}

export default function TerminalScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [command, setCommand] = useState("");
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: "1",
      type: "output",
      text: "Docker Android Terminal",
    },
    {
      id: "2",
      type: "output",
      text: `Connected to container: ${route.params.containerId.substring(0, 12)}`,
    },
    {
      id: "3",
      type: "output",
      text: "Type 'help' for available commands.\n",
    },
  ]);

  const executeCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    let output: string;
    let isError = false;

    switch (trimmedCmd) {
      case "help":
        output = `Available commands:
  help     - Show this help message
  ls       - List files
  pwd      - Print working directory
  ps       - List processes
  docker   - Docker commands (simulated)
  exit     - Close terminal`;
        break;
      case "ls":
        output = "bin  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var";
        break;
      case "pwd":
        output = "/root";
        break;
      case "ps":
        output = "PID   COMMAND\n  1   /sbin/init\n  12  dockerd\n  45  containerd";
        break;
      case "docker ps":
        output = "CONTAINER ID   IMAGE          STATUS\n" + route.params.containerId.substring(0, 12) + "   alpine:latest   Up 2 minutes";
        break;
      case "docker images":
        output = "REPOSITORY   TAG       IMAGE ID       SIZE\nalpine       latest    c059bfaa849c   5.59MB\nnginx        latest    904b8cb13b93   142MB";
        break;
      case "exit":
        navigation.goBack();
        return;
      case "clear":
        setLines([]);
        return;
      default:
        if (trimmedCmd.startsWith("docker")) {
          output = `docker: '${trimmedCmd.split(" ")[1] || ""}' is not a docker command.\nSee 'docker --help'`;
        } else if (trimmedCmd) {
          output = `sh: ${trimmedCmd}: command not found`;
          isError = true;
        } else {
          return;
        }
    }

    const newLines: TerminalLine[] = [
      ...lines,
      {
        id: Date.now().toString(),
        type: "input",
        text: `$ ${cmd}`,
      },
      {
        id: (Date.now() + 1).toString(),
        type: isError ? "error" : "output",
        text: output,
      },
    ];

    setLines(newLines);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const handleSubmit = () => {
    if (command.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      executeCommand(command);
      setCommand("");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: "#1E1E1E" }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Feather name="x" size={24} color="#FFFFFF" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Terminal</ThemedText>
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
              line.type === "error" && styles.errorLine,
            ]}
          >
            {line.text}
          </ThemedText>
        ))}
      </ScrollView>

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
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
        />
        <Pressable style={styles.sendButton} onPress={handleSubmit}>
          <Feather name="corner-down-left" size={20} color={colors.accent.mauve} />
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
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
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
  },
  errorLine: {
    color: "#F48771",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#252526",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#333333",
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
});
