import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows, Colors, Motion } from "@/constants/theme";

interface StatCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  color?: string;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function StatCard({ icon, label, value, color, onPress }: StatCardProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const scale = useSharedValue(1);

  const accentColor = color || colors.accent.mauve;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withTiming(Motion.transform.scaleSoft, { duration: Motion.duration.fast });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withTiming(1, { duration: Motion.duration.fast });
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault },
        Shadows.soft,
        animatedStyle,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: accentColor + "12" }]}>
        <Feather name={icon} size={22} color={accentColor} />
      </View>
      <ThemedText type="h2" style={[styles.value, { color: accentColor }]}>
        {value}
      </ThemedText>
      <ThemedText type="caption" style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </ThemedText>
      {onPress ? (
        <View style={styles.arrow}>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  value: {
    marginBottom: 2,
  },
  label: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "500",
  },
  arrow: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    opacity: 0.5,
  },
});
