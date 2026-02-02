import React, { useEffect, useCallback, useState } from "react";
import { StyleSheet, RefreshControl, FlatList, View, Pressable, TextInput, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ImageCard } from "@/components/ImageCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants/theme";
import { useDockerStore } from "@/store/useDockerStore";
import { useQemuStore } from "@/store/useQemuStore";
import { DockerImage } from "@/services/DockerAPI";

export default function ImagesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [modalVisible, setModalVisible] = useState(false);
  const [imageName, setImageName] = useState("");
  const [pullProgress, setPullProgress] = useState<number | null>(null);

  const {
    images,
    isLoading,
    fetchImages,
    pullImage,
    removeImage,
  } = useDockerStore();

  const { vmStatus } = useQemuStore();

  useEffect(() => {
    if (vmStatus === "running") {
      fetchImages();
    }
  }, [vmStatus]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchImages();
  }, [fetchImages]);

  const handlePullImage = async () => {
    if (!imageName.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPullProgress(0);
    
    await pullImage(imageName.trim(), (progress) => {
      setPullProgress(progress);
    });
    
    setPullProgress(null);
    setImageName("");
    setModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRemoveImage = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    removeImage(id, true);
  };

  const renderItem = ({ item, index }: { item: DockerImage; index: number }) => (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
      <ImageCard
        image={item}
        onRemove={() => handleRemoveImage(item.Id)}
      />
    </Animated.View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText type="caption" style={{ color: colors.textMuted, letterSpacing: 0.5 }}>
        SWIPE LEFT TO DELETE
      </ThemedText>
    </View>
  );

  const renderEmpty = () => {
    if (vmStatus !== "running") {
      return (
        <EmptyState
          icon="power"
          title="VM Not Running"
          description="Start the virtual machine from the Home tab to manage Docker images."
        />
      );
    }
    
    if (isLoading) {
      return <LoadingSpinner message="Loading images..." />;
    }

    return (
      <EmptyState
        icon="layers"
        title="No Images"
        description="Pull your first Docker image from Docker Hub to get started."
        actionLabel="Pull Image"
        onAction={() => setModalVisible(true)}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        style={styles.list}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.sm,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: Spacing.md,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={vmStatus === "running" ? images : []}
        renderItem={renderItem}
        keyExtractor={(item) => item.Id}
        ListHeaderComponent={vmStatus === "running" && images.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.accent.mauve}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {vmStatus === "running" ? (
        <Animated.View
          entering={FadeIn.duration(300).delay(200)}
          style={[
            styles.fabContainer,
            { bottom: tabBarHeight + Spacing.md },
          ]}
        >
          <Pressable
            style={[styles.fab, { backgroundColor: colors.accent.olive }, Shadows.hover]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setModalVisible(true);
            }}
          >
            <Feather name="download" size={24} color="#FFF" />
          </Pressable>
        </Animated.View>
      ) : null}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
            <ThemedText type="h3">Pull Image</ThemedText>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <ThemedText type="caption" style={{ color: colors.textMuted, marginBottom: Spacing.sm, letterSpacing: 0.5 }}>
              IMAGE NAME
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
              <ThemedText type="caption" style={{ color: colors.textMuted, marginBottom: Spacing.sm }}>
                Popular images:
              </ThemedText>
              <View style={styles.suggestions}>
                {["nginx", "alpine", "redis", "postgres", "node"].map((img) => (
                  <Pressable
                    key={img}
                    style={[styles.suggestionChip, { backgroundColor: colors.accent.mauve + "15" }]}
                    onPress={() => setImageName(img + ":latest")}
                  >
                    <ThemedText type="caption" style={{ color: colors.accent.mauve }}>
                      {img}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {pullProgress !== null ? (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { width: `${pullProgress}%`, backgroundColor: colors.accent.mauve },
                    ]}
                  />
                </View>
                <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                  Pulling image... {pullProgress.toFixed(0)}%
                </ThemedText>
              </View>
            ) : (
              <Button onPress={handlePullImage} disabled={!imageName.trim()} style={{ marginTop: Spacing.md }}>
                Pull Image
              </Button>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  fabContainer: {
    position: "absolute",
    right: Spacing.md,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    padding: Spacing.md,
  },
  input: {
    height: 52,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  suggestionsCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
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
  progressContainer: {
    marginTop: Spacing.lg,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
});
