import React, { useEffect, useCallback } from "react";
import { StyleSheet, RefreshControl, FlatList, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ContainerCard } from "@/components/ContainerCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants/theme";
import { useDockerStore } from "@/store/useDockerStore";
import { useQemuStore } from "@/store/useQemuStore";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Container } from "@/services/DockerAPI";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ContainersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const {
    containers,
    isLoading,
    fetchContainers,
    startContainer,
    stopContainer,
    removeContainer,
    selectContainer,
  } = useDockerStore();

  const { vmStatus } = useQemuStore();

  useEffect(() => {
    if (vmStatus === "running") {
      fetchContainers();
    }
  }, [vmStatus]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchContainers();
  }, [fetchContainers]);

  const handleContainerPress = (container: Container) => {
    selectContainer(container);
    navigation.navigate("ContainerDetail", { containerId: container.Id });
  };

  const handleCreateContainer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("CreateContainer");
  };

  const renderItem = ({ item, index }: { item: Container; index: number }) => (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
      <ContainerCard
        container={item}
        onPress={() => handleContainerPress(item)}
        onStart={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          startContainer(item.Id);
        }}
        onStop={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          stopContainer(item.Id);
        }}
        onRemove={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          removeContainer(item.Id, true);
        }}
      />
    </Animated.View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText type="caption" style={{ color: colors.textMuted, letterSpacing: 0.5 }}>
        SWIPE LEFT ON CARDS FOR ACTIONS
      </ThemedText>
    </View>
  );

  const renderEmpty = () => {
    if (vmStatus !== "running") {
      return (
        <EmptyState
          icon="power"
          title="VM Not Running"
          description="Start the virtual machine from the Home tab to manage Docker containers."
        />
      );
    }
    
    if (isLoading) {
      return <LoadingSpinner message="Loading containers..." />;
    }

    return (
      <EmptyState
        icon="box"
        title="No Containers"
        description="Create your first container to get started with Docker on your device."
        actionLabel="Create Container"
        onAction={handleCreateContainer}
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
        data={vmStatus === "running" ? containers : []}
        renderItem={renderItem}
        keyExtractor={(item) => item.Id}
        ListHeaderComponent={vmStatus === "running" && containers.length > 0 ? renderHeader : null}
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
            style={[styles.fab, { backgroundColor: colors.accent.mauve }, Shadows.hover]}
            onPress={handleCreateContainer}
          >
            <Feather name="plus" size={24} color="#FFF" />
          </Pressable>
        </Animated.View>
      ) : null}
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
});
