import React from "react";
import { View, StyleSheet, Switch, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, Motion, BorderRadius } from "@/constants/theme";

interface SettingsRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description?: string;
  value?: string | boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  isDestructive?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SettingsRow({
  icon,
  label,
  description,
  value,
  onPress,
  onToggle,
  isDestructive = false,
}: SettingsRowProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const opacity = useSharedValue(1);

  const isToggle = typeof value === "boolean";
  const textColor = isDestructive ? colors.state.error : theme.text;
  const iconColor = isDestructive ? colors.state.error : colors.accent.mauve;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (onPress) {
      opacity.value = withTiming(0.7, { duration: Motion.duration.fast });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      opacity.value = withTiming(1, { duration: Motion.duration.fast });
    }
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const handleToggle = (newValue: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle?.(newValue);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress && !onToggle}
      style={[styles.container, animatedStyle]}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + "12" }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.textContainer}>
        <ThemedText type="body" style={{ color: textColor }}>
          {label}
        </ThemedText>
        {description ? (
          <ThemedText type="caption" style={{ color: colors.textMuted, marginTop: 2 }}>
            {description}
          </ThemedText>
        ) : null}
      </View>
      {isToggle ? (
        <Switch
          value={value}
          onValueChange={handleToggle}
          trackColor={{ false: colors.textMuted + "40", true: colors.accent.mauve + "60" }}
          thumbColor={value ? colors.accent.mauve : "#FFFFFF"}
          ios_backgroundColor={colors.textMuted + "40"}
        />
      ) : typeof value === "string" ? (
        <View style={styles.valueContainer}>
          <ThemedText type="caption" style={{ color: colors.textMuted }}>
            {value}
          </ThemedText>
          {onPress ? (
            <Feather name="chevron-right" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
          ) : null}
        </View>
      ) : onPress ? (
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});
