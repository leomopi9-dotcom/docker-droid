import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  Easing,
  interpolateColor,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows, Colors, Motion } from "@/constants/theme";

type VMStatus = "stopped" | "starting" | "running" | "stopping" | "error";

interface VMStatusCardProps {
  status: VMStatus;
  stats?: {
    cpuUsage: number;
    memoryUsed: number;
    memoryTotal: number;
    uptime: number;
  } | null;
  onStart?: () => void;
  onStop?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function VMStatusCard({ status, stats, onStart, onStop }: VMStatusCardProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const scale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);
  const glowIntensity = useSharedValue(0);

  const isRunning = status === "running";
  const isLoading = status === "starting" || status === "stopping";

  React.useEffect(() => {
    if (isLoading) {
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }

    if (isRunning) {
      glowIntensity.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      glowIntensity.value = withTiming(0, { duration: 300 });
    }
  }, [isLoading, isRunning]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowIntensity.value * 0.15,
  }));

  const handlePressIn = () => {
    scale.value = withTiming(Motion.transform.scaleSoft, { duration: Motion.duration.fast });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: Motion.duration.fast });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isRunning) {
      onStop?.();
    } else {
      onStart?.();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "running":
        return colors.state.success;
      case "starting":
      case "stopping":
        return colors.state.warning;
      case "error":
        return colors.state.error;
      default:
        return colors.textMuted;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "running":
        return "Running";
      case "starting":
        return "Starting...";
      case "stopping":
        return "Stopping...";
      case "error":
        return "Error";
      default:
        return "Stopped";
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }, Shadows.soft]}>
      {isRunning ? (
        <Animated.View style={[styles.glow, glowStyle]}>
          <LinearGradient
            colors={[colors.state.success, "transparent"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      ) : null}

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconContainer, { backgroundColor: colors.accent.mauve + "15" }]}>
            <Feather name="server" size={24} color={colors.accent.mauve} />
          </View>
          <View style={styles.titleContainer}>
            <ThemedText type="h4" style={styles.title}>Alpine Linux VM</ThemedText>
            <ThemedText type="caption" style={{ color: colors.textMuted, marginTop: 2 }}>
              QEMU x86_64 Emulator
            </ThemedText>
          </View>
        </View>
        
        <Animated.View style={[styles.statusBadge, { backgroundColor: getStatusColor() + "15" }, pulseStyle]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <ThemedText type="caption" style={{ color: getStatusColor(), fontWeight: "600" }}>
            {getStatusLabel()}
          </ThemedText>
        </Animated.View>
      </View>

      {isRunning && stats ? (
        <View style={[styles.statsContainer, { borderTopColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
          <View style={styles.statItem}>
            <ThemedText type="caption" style={{ color: colors.textMuted, marginBottom: 4 }}>
              CPU
            </ThemedText>
            <ThemedText type="h4" style={{ color: colors.accent.mauve }}>
              {stats.cpuUsage.toFixed(0)}%
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <View style={styles.statItem}>
            <ThemedText type="caption" style={{ color: colors.textMuted, marginBottom: 4 }}>
              Memory
            </ThemedText>
            <ThemedText type="h4" style={{ color: colors.accent.olive }}>
              {stats.memoryUsed}MB
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <View style={styles.statItem}>
            <ThemedText type="caption" style={{ color: colors.textMuted, marginBottom: 4 }}>
              Uptime
            </ThemedText>
            <ThemedText type="h4" style={{ color: colors.accent.terracotta }}>
              {formatUptime(stats.uptime)}
            </ThemedText>
          </View>
        </View>
      ) : null}

      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isLoading}
        style={[
          styles.button,
          {
            backgroundColor: isRunning ? colors.state.error : colors.state.success,
            opacity: isLoading ? 0.6 : 1,
          },
          buttonAnimatedStyle,
        ]}
      >
        <Feather
          name={isRunning ? "power" : "play"}
          size={18}
          color="#FFF"
          style={styles.buttonIcon}
        />
        <ThemedText style={styles.buttonText}>
          {isLoading
            ? status === "starting"
              ? "Starting VM..."
              : "Stopping VM..."
            : isRunning
            ? "Stop Virtual Machine"
            : "Start Virtual Machine"}
        </ThemedText>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  statsContainer: {
    flexDirection: "row",
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    alignSelf: "stretch",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
  },
});
