import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <LinearGradient
          colors={[colors.accent.mauve + "20", colors.accent.mint + "10"]}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={[styles.iconContainer, { backgroundColor: colors.accent.mauve + "10" }]}>
          <Feather name={icon} size={36} color={colors.accent.mauve} />
        </View>
      </View>
      
      <ThemedText type="h3" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.description, { color: colors.textSecondary }]}
      >
        {description}
      </ThemedText>
      
      {actionLabel && onAction ? (
        <Button onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    paddingTop: Spacing.xl * 2,
  },
  iconWrapper: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
  iconGradient: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -10,
    left: -10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.lg,
    maxWidth: 280,
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: Spacing.xl,
  },
});
