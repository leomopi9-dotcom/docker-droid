import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants/theme";
import { useDockerStore } from "@/store/useDockerStore";

export default function CreateContainerScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const { createContainer, isLoading } = useDockerStore();

  const [imageName, setImageName] = useState("");
  const [containerName, setContainerName] = useState("");
  const [port, setPort] = useState("");
  const [envVars, setEnvVars] = useState("");

  const handleCreate = async () => {
    if (!imageName.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const config: any = {
      Image: imageName.trim(),
    };

    if (port) {
      const [hostPort, containerPort = hostPort] = port.split(":");
      config.ExposedPorts = { [`${containerPort}/tcp`]: {} };
      config.HostConfig = {
        PortBindings: {
          [`${containerPort}/tcp`]: [{ HostPort: hostPort }],
        },
      };
    }

    if (envVars.trim()) {
      config.Env = envVars.split("\n").filter((v) => v.trim());
    }

    const containerId = await createContainer(config);
    if (containerId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.md,
      }}
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(300).delay(100)}>
        <ThemedText type="caption" style={[styles.label, { color: colors.textMuted }]}>
          IMAGE *
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: theme.backgroundDefault, 
              color: theme.text, 
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            },
          ]}
          placeholder="e.g., nginx:latest, alpine:3.18"
          placeholderTextColor={colors.textMuted}
          value={imageName}
          onChangeText={setImageName}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={[styles.suggestionsCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.suggestions}>
            {["nginx:latest", "alpine:latest", "redis:alpine", "postgres:15"].map((img) => (
              <Pressable
                key={img}
                style={[styles.suggestionChip, { backgroundColor: colors.accent.mauve + "12" }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setImageName(img);
                }}
              >
                <ThemedText type="caption" style={{ color: colors.accent.mauve }}>
                  {img}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(200)}>
        <ThemedText type="caption" style={[styles.label, { color: colors.textMuted }]}>
          CONTAINER NAME
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: theme.backgroundDefault, 
              color: theme.text, 
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            },
          ]}
          placeholder="Optional: my-container"
          placeholderTextColor={colors.textMuted}
          value={containerName}
          onChangeText={setContainerName}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(300)}>
        <ThemedText type="caption" style={[styles.label, { color: colors.textMuted }]}>
          PORT MAPPING
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: theme.backgroundDefault, 
              color: theme.text, 
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            },
          ]}
          placeholder="e.g., 8080:80"
          placeholderTextColor={colors.textMuted}
          value={port}
          onChangeText={setPort}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
        />
        <ThemedText type="caption" style={[styles.hint, { color: colors.textSecondary }]}>
          Format: HOST_PORT:CONTAINER_PORT
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(400)}>
        <ThemedText type="caption" style={[styles.label, { color: colors.textMuted }]}>
          ENVIRONMENT VARIABLES
        </ThemedText>
        <TextInput
          style={[
            styles.textArea,
            { 
              backgroundColor: theme.backgroundDefault, 
              color: theme.text, 
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            },
          ]}
          placeholder={"KEY=value\nANOTHER_KEY=value"}
          placeholderTextColor={colors.textMuted}
          value={envVars}
          onChangeText={setEnvVars}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <ThemedText type="caption" style={[styles.hint, { color: colors.textSecondary }]}>
          One variable per line
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(500)}>
        <View style={[styles.infoCard, { backgroundColor: colors.accent.mint + "15" }]}>
          <Feather name="info" size={18} color={colors.accent.mint} />
          <ThemedText type="caption" style={[styles.infoText, { color: colors.textSecondary }]}>
            The container will be created but not started automatically.
          </ThemedText>
        </View>

        <Button
          onPress={handleCreate}
          disabled={!imageName.trim() || isLoading}
          style={{ marginTop: Spacing.md }}
        >
          {isLoading ? "Creating..." : "Create Container"}
        </Button>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
  input: {
    height: 52,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    borderWidth: 1,
  },
  hint: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  suggestionsCard: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  suggestionChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  infoText: {
    flex: 1,
    marginLeft: Spacing.sm,
    lineHeight: 18,
  },
});
