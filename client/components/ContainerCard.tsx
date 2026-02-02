import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows, Colors, Motion } from "@/constants/theme";
import { Container } from "@/services/DockerAPI";

interface ContainerCardProps {
  container: Container;
  onPress?: () => void;
  onStart?: () => void;
  onStop?: () => void;
  onRemove?: () => void;
}

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 150;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ContainerCard({
  container,
  onPress,
  onStart,
  onStop,
  onRemove,
}: ContainerCardProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const contextX = useSharedValue(0);

  const containerName = container.Names[0]?.replace(/^\//, "") || "unnamed";
  const isRunning = container.State === "running";
  const ports = container.Ports
    .filter((p) => p.PublicPort)
    .map((p) => `${p.PublicPort}:${p.PrivatePort}`)
    .join(", ");

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newValue = contextX.value + event.translationX;
      translateX.value = Math.max(-ACTION_WIDTH, Math.min(0, newValue));
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-ACTION_WIDTH, { damping: 25, stiffness: 300 });
        runOnJS(triggerHaptic)();
      } else {
        translateX.value = withSpring(0, { damping: 25, stiffness: 300 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-ACTION_WIDTH, -30, 0],
      [1, 0.5, 0],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [-ACTION_WIDTH, 0],
          [1, 0.8],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(Motion.transform.scaleSoft, { duration: Motion.duration.fast });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: Motion.duration.fast });
  };

  const handleAction = (action: (() => void) | undefined) => {
    translateX.value = withSpring(0, { damping: 25, stiffness: 300 });
    if (action) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      action();
    }
  };

  const getStatusColor = () => {
    switch (container.State) {
      case "running":
        return colors.state.success;
      case "paused":
        return colors.state.warning;
      default:
        return colors.state.error;
    }
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.actionsContainer, actionsStyle]}>
        {isRunning ? (
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.state.warning }]}
            onPress={() => handleAction(onStop)}
          >
            <Feather name="pause" size={20} color="#FFF" />
            <ThemedText style={styles.actionText}>Stop</ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.state.success }]}
            onPress={() => handleAction(onStart)}
          >
            <Feather name="play" size={20} color="#FFF" />
            <ThemedText style={styles.actionText}>Start</ThemedText>
          </Pressable>
        )}
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.state.error }]}
          onPress={() => handleAction(onRemove)}
        >
          <Feather name="trash-2" size={20} color="#FFF" />
          <ThemedText style={styles.actionText}>Delete</ThemedText>
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <AnimatedPressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.card,
            { 
              backgroundColor: theme.backgroundDefault,
              borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
            },
            Shadows.soft,
            cardStyle,
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.accent.mauve + "12" }]}>
              <Feather name="box" size={20} color={colors.accent.mauve} />
            </View>
            <View style={styles.titleContainer}>
              <ThemedText type="body" numberOfLines={1} style={styles.name}>
                {containerName}
              </ThemedText>
              <ThemedText type="caption" style={{ color: colors.textMuted }} numberOfLines={1}>
                {container.Image}
              </ThemedText>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          </View>

          <View style={[styles.details, { borderTopColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
            {ports ? (
              <View style={styles.detailChip}>
                <Feather name="globe" size={12} color={colors.accent.olive} />
                <ThemedText type="caption" style={[styles.chipText, { color: colors.textSecondary }]}>
                  {ports}
                </ThemedText>
              </View>
            ) : null}
            <View style={styles.detailChip}>
              <Feather name="clock" size={12} color={colors.textMuted} />
              <ThemedText type="caption" style={[styles.chipText, { color: colors.textMuted }]}>
                {container.Status}
              </ThemedText>
            </View>
          </View>

          <View style={styles.swipeHint}>
            <Feather name="chevron-left" size={14} color={colors.textMuted} style={{ opacity: 0.4 }} />
          </View>
        </AnimatedPressable>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    marginBottom: Spacing.sm,
  },
  actionsContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: Spacing.xs,
  },
  actionButton: {
    width: 68,
    height: "90%",
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.xs,
  },
  actionText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    fontWeight: "600",
    marginBottom: 2,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  chipText: {
    marginLeft: 4,
  },
  swipeHint: {
    position: "absolute",
    right: Spacing.sm,
    top: "50%",
    marginTop: -7,
  },
});
