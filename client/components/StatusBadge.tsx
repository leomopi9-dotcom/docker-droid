import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Colors } from "@/constants/theme";

type StatusType = "running" | "exited" | "paused" | "stopped" | "starting" | "error" | "success" | "warning";

interface StatusBadgeProps {
  status: StatusType | string;
  style?: ViewStyle;
}

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const getStatusColor = () => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case "running":
      case "success":
        return colors.state.success;
      case "paused":
      case "warning":
      case "starting":
        return colors.state.warning;
      case "exited":
      case "stopped":
      case "error":
        return colors.state.error;
      default:
        return colors.textMuted;
    }
  };

  const getStatusLabel = () => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case "running":
        return "Running";
      case "exited":
        return "Stopped";
      case "paused":
        return "Paused";
      case "starting":
        return "Starting";
      case "stopping":
        return "Stopping";
      case "error":
        return "Error";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
  };

  const statusColor = getStatusColor();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: statusColor + "20",
          borderColor: statusColor + "40",
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <ThemedText
        type="small"
        style={[styles.text, { color: statusColor }]}
      >
        {getStatusLabel()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});
