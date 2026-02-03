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
import { DockerImage } from "@/services/DockerAPI";

interface ImageCardProps {
  image: DockerImage;
  onPress?: () => void;
  onRemove?: () => void;
}

const SWIPE_THRESHOLD = 50;
const ACTION_WIDTH = 75;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function ImageCard({ image, onPress, onRemove }: ImageCardProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const contextX = useSharedValue(0);

  const imageName = image.RepoTags?.[0] || "<none>:<none>";
  const [name, tag] = imageName.split(":");

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
      [-ACTION_WIDTH, -20, 0],
      [1, 0.5, 0],
      Extrapolation.CLAMP
    ),
  }));

  const handlePressIn = () => {
    scale.value = withTiming(Motion.transform.scaleSoft, { duration: Motion.duration.fast });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: Motion.duration.fast });
  };

  const handleRemove = () => {
    translateX.value = withSpring(0, { damping: 25, stiffness: 300 });
    if (onRemove) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onRemove();
    }
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.actionsContainer, actionsStyle]}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.state.error }]}
          onPress={handleRemove}
        >
          <Feather name="trash-2" size={20} color="#FFF" />
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
            <View style={[styles.iconContainer, { backgroundColor: colors.accent.olive + "12" }]}>
              <Feather name="layers" size={20} color={colors.accent.olive} />
            </View>
            <View style={styles.titleContainer}>
              <ThemedText type="body" numberOfLines={1} style={styles.name}>
                {name}
              </ThemedText>
              <View style={styles.tagRow}>
                <View style={[styles.tag, { backgroundColor: colors.accent.mauve + "15" }]}>
                  <ThemedText
                    type="caption"
                    style={{ color: colors.accent.mauve, fontWeight: "600" }}
                  >
                    {tag}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.meta, { borderTopColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
            <View style={styles.metaItem}>
              <Feather name="hard-drive" size={12} color={colors.textMuted} />
              <ThemedText type="caption" style={{ color: colors.textSecondary, marginLeft: 4 }}>
                {formatBytes(image.Size)}
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={12} color={colors.textMuted} />
              <ThemedText type="caption" style={{ color: colors.textSecondary, marginLeft: 4 }}>
                {formatDate(image.Created)}
              </ThemedText>
            </View>
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
    width: 60,
    height: "90%",
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
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
  },
  name: {
    fontWeight: "600",
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: "row",
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  meta: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
});
