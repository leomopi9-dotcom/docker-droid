import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, RefreshControl, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { VMStatusCard } from "@/components/VMStatusCard";
import { StatCard } from "@/components/StatCard";
import { ContainerCard } from "@/components/ContainerCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants/theme";
import { useDockerStore } from "@/store/useDockerStore";
import { useQemuStore } from "@/store/useQemuStore";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const {
    containers,
    images,
    isLoading,
    fetchAll,
    startContainer,
    stopContainer,
    removeContainer,
    selectContainer,
  } = useDockerStore();

  const {
    vmStatus,
    vmStats,
    initialize: initQemu,
    startVM,
    stopVM,
    getVMStats,
  } = useQemuStore();

  useEffect(() => {
    initQemu();
  }, []);

  useEffect(() => {
    if (vmStatus === "running") {
      fetchAll();
      const interval = setInterval(() => {
        getVMStats();
        fetchAll();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [vmStatus]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchAll();
  }, [fetchAll]);

  const recentContainers = containers.slice(0, 3);
  const runningContainers = containers.filter((c) => c.State === "running").length;
  const stoppedContainers = containers.length - runningContainers;

  const handleContainerPress = (container: any) => {
    selectContainer(container);
    navigation.navigate("ContainerDetail", { containerId: container.Id });
  };

  const renderHeader = () => (
    <View>
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <VMStatusCard
          status={vmStatus}
          stats={vmStats}
          onStart={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            startVM();
          }}
          onStop={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            stopVM();
          }}
        />
      </Animated.View>

      {vmStatus === "running" ? (
        <>
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.statsRow}>
            <StatCard
              icon="box"
              label="Running"
              value={runningContainers}
              color={colors.state.success}
              onPress={() => navigation.navigate("Main", { screen: "ContainersTab" })}
            />
            <View style={{ width: Spacing.sm }} />
            <StatCard
              icon="pause-circle"
              label="Stopped"
              value={stoppedContainers}
              color={colors.state.error}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.statsRow}>
            <StatCard
              icon="layers"
              label="Images"
              value={images.length}
              color={colors.accent.olive}
              onPress={() => navigation.navigate("Main", { screen: "ImagesTab" })}
            />
            <View style={{ width: Spacing.sm }} />
            <StatCard
              icon="database"
              label="Total"
              value={containers.length}
              color={colors.accent.terracotta}
            />
          </Animated.View>

          {recentContainers.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="h4" style={styles.sectionTitle}>
                  Recent Containers
                </ThemedText>
                <Pressable
                  onPress={() => navigation.navigate("Main", { screen: "ContainersTab" })}
                  style={styles.seeAllButton}
                >
                  <ThemedText type="caption" style={{ color: colors.accent.mauve }}>
                    See All
                  </ThemedText>
                  <Feather name="chevron-right" size={14} color={colors.accent.mauve} />
                </Pressable>
              </View>
              {recentContainers.map((container, index) => (
                <Animated.View
                  key={container.Id}
                  entering={FadeInDown.duration(300).delay(450 + index * 50)}
                >
                  <ContainerCard
                    container={container}
                    onPress={() => handleContainerPress(container)}
                    onStart={() => startContainer(container.Id)}
                    onStop={() => stopContainer(container.Id)}
                    onRemove={() => removeContainer(container.Id, true)}
                  />
                </Animated.View>
              ))}
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.section}>
              <View style={[styles.quickStartCard, { backgroundColor: theme.backgroundDefault }, Shadows.soft]}>
                <View style={[styles.quickStartIcon, { backgroundColor: colors.accent.mauve + "12" }]}>
                  <Feather name="zap" size={24} color={colors.accent.mauve} />
                </View>
                <View style={styles.quickStartContent}>
                  <ThemedText type="body" style={{ fontWeight: "600", marginBottom: 4 }}>
                    Quick Start
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    Pull an image and create your first container
                  </ThemedText>
                </View>
                <Feather name="arrow-right" size={20} color={colors.textMuted} />
              </View>
            </Animated.View>
          )}
        </>
      ) : vmStatus === "stopped" ? (
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }, Shadows.soft]}>
            <Feather name="info" size={20} color={colors.accent.mauve} />
            <ThemedText type="body" style={[styles.infoText, { color: colors.textSecondary }]}>
              Start the virtual machine to manage Docker containers on your device.
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.md,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={[]}
      renderItem={() => null}
      ListHeaderComponent={renderHeader}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.accent.mauve}
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  infoText: {
    flex: 1,
    marginLeft: Spacing.sm,
    lineHeight: 22,
  },
  quickStartCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  quickStartIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  quickStartContent: {
    flex: 1,
  },
});
