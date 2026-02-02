import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants/theme";
import { useDockerStore } from "@/store/useDockerStore";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "ContainerDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = "info" | "logs" | "stats";

export default function ContainerDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [activeTab, setActiveTab] = useState<TabType>("info");

  const {
    selectedContainer,
    isLoading,
    startContainer,
    stopContainer,
    restartContainer,
  } = useDockerStore();

  const container = selectedContainer;

  useEffect(() => {
    navigation.setOptions({
      headerTitle: container?.Names[0]?.replace(/^\//, "") || "Container",
    });
  }, [container]);

  if (!container) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <LoadingSpinner message="Loading container..." />
      </View>
    );
  }

  const isRunning = container.State === "running";
  const ports = container.Ports.filter((p) => p.PublicPort);

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

  const handleAction = async (action: "start" | "stop" | "restart" | "web" | "terminal") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    switch (action) {
      case "start":
        await startContainer(container.Id);
        break;
      case "stop":
        await stopContainer(container.Id);
        break;
      case "restart":
        await restartContainer(container.Id);
        break;
      case "web":
        if (ports.length > 0) {
          navigation.navigate("WebView", {
            url: `http://localhost:${ports[0].PublicPort}`,
            title: container.Names[0]?.replace(/^\//, "") || "Container",
          });
        }
        break;
      case "terminal":
        navigation.navigate("Terminal", { containerId: container.Id });
        break;
    }
  };

  const renderTab = (tab: TabType, label: string, icon: keyof typeof Feather.glyphMap) => (
    <Pressable
      style={[
        styles.tab,
        activeTab === tab && { backgroundColor: colors.accent.mauve + "15" },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTab(tab);
      }}
    >
      <Feather
        name={icon}
        size={16}
        color={activeTab === tab ? colors.accent.mauve : colors.textMuted}
      />
      <ThemedText
        type="caption"
        style={[
          styles.tabLabel,
          { color: activeTab === tab ? colors.accent.mauve : colors.textMuted },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  const renderInfoTab = () => (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }, Shadows.soft]}>
        <View style={styles.infoRow}>
          <ThemedText type="caption" style={{ color: colors.textMuted }}>IMAGE</ThemedText>
          <ThemedText type="body" style={styles.infoValue}>{container.Image}</ThemedText>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
        <View style={styles.infoRow}>
          <ThemedText type="caption" style={{ color: colors.textMuted }}>COMMAND</ThemedText>
          <ThemedText type="caption" style={[styles.codeText, { color: colors.textSecondary }]} numberOfLines={2}>
            {container.Command}
          </ThemedText>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
        <View style={styles.infoRow}>
          <ThemedText type="caption" style={{ color: colors.textMuted }}>STATUS</ThemedText>
          <ThemedText type="body" style={styles.infoValue}>{container.Status}</ThemedText>
        </View>
      </View>

      {ports.length > 0 ? (
        <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault, marginTop: Spacing.sm }, Shadows.soft]}>
          <ThemedText type="caption" style={{ color: colors.textMuted, marginBottom: Spacing.sm }}>EXPOSED PORTS</ThemedText>
          <View style={styles.portsGrid}>
            {ports.map((port, index) => (
              <View key={index} style={[styles.portChip, { backgroundColor: colors.accent.olive + "15" }]}>
                <Feather name="globe" size={12} color={colors.accent.olive} />
                <ThemedText type="caption" style={{ color: colors.accent.olive, marginLeft: 4, fontWeight: "600" }}>
                  {port.PublicPort}:{port.PrivatePort}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {container.Mounts.length > 0 ? (
        <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault, marginTop: Spacing.sm }, Shadows.soft]}>
          <ThemedText type="caption" style={{ color: colors.textMuted, marginBottom: Spacing.sm }}>VOLUMES</ThemedText>
          {container.Mounts.map((mount, index) => (
            <View key={index} style={styles.mountItem}>
              <Feather name="folder" size={14} color={colors.accent.terracotta} />
              <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                <ThemedText type="caption" numberOfLines={1} style={{ color: theme.text }}>
                  {mount.Destination}
                </ThemedText>
                <ThemedText type="caption" style={{ color: colors.textMuted }} numberOfLines={1}>
                  {mount.Source}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );

  const renderLogsTab = () => (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View style={[styles.logsCard, { backgroundColor: isDark ? "#1E1E1E" : "#2D2D2D" }]}>
        <ThemedText type="caption" style={[styles.codeText, { color: "#CCCCCC" }]}>
          {isRunning
            ? "$ docker logs " + container.Names[0]?.replace(/^\//, "") + "\n\nConnecting to container...\nReady for log streaming."
            : "Container is not running.\nStart the container to view logs."}
        </ThemedText>
      </View>
    </Animated.View>
  );

  const renderStatsTab = () => (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }, Shadows.soft]}>
        {isRunning ? (
          <>
            <View style={styles.statRow}>
              <View style={[styles.statIcon, { backgroundColor: colors.accent.mauve + "12" }]}>
                <Feather name="cpu" size={16} color={colors.accent.mauve} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="caption" style={{ color: colors.textMuted }}>CPU Usage</ThemedText>
                <ThemedText type="h4" style={{ color: colors.accent.mauve }}>--</ThemedText>
              </View>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
            <View style={styles.statRow}>
              <View style={[styles.statIcon, { backgroundColor: colors.accent.olive + "12" }]}>
                <Feather name="database" size={16} color={colors.accent.olive} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="caption" style={{ color: colors.textMuted }}>Memory</ThemedText>
                <ThemedText type="h4" style={{ color: colors.accent.olive }}>--</ThemedText>
              </View>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
            <View style={styles.statRow}>
              <View style={[styles.statIcon, { backgroundColor: colors.accent.terracotta + "12" }]}>
                <Feather name="wifi" size={16} color={colors.accent.terracotta} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="caption" style={{ color: colors.textMuted }}>Network I/O</ThemedText>
                <ThemedText type="h4" style={{ color: colors.accent.terracotta }}>--</ThemedText>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyStats}>
            <Feather name="activity" size={32} color={colors.textMuted} />
            <ThemedText type="body" style={{ color: colors.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
              Start the container to view real-time stats
            </ThemedText>
          </View>
        )}
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: Spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.accent.mauve + "12" }]}>
            <Feather name="box" size={28} color={colors.accent.mauve} />
          </View>
          <View style={styles.headerText}>
            <ThemedText type="h3" numberOfLines={1}>
              {container.Names[0]?.replace(/^\//, "")}
            </ThemedText>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <ThemedText type="caption" style={{ color: getStatusColor(), fontWeight: "600" }}>
                {container.State.charAt(0).toUpperCase() + container.State.slice(1)}
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(100)} style={[styles.tabs, { backgroundColor: theme.backgroundDefault }, Shadows.soft]}>
          {renderTab("info", "Info", "info")}
          {renderTab("logs", "Logs", "file-text")}
          {renderTab("stats", "Stats", "activity")}
        </Animated.View>

        {activeTab === "info" && renderInfoTab()}
        {activeTab === "logs" && renderLogsTab()}
        {activeTab === "stats" && renderStatsTab()}
      </ScrollView>

      <Animated.View
        entering={FadeIn.duration(300).delay(200)}
        style={[
          styles.actionsBar,
          { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.sm },
          Shadows.hover,
        ]}
      >
        <Pressable
          style={[styles.actionButton, { backgroundColor: isRunning ? colors.state.error : colors.state.success }]}
          onPress={() => handleAction(isRunning ? "stop" : "start")}
        >
          <Feather name={isRunning ? "square" : "play"} size={20} color="#FFF" />
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.accent.mauve }]}
          onPress={() => handleAction("restart")}
        >
          <Feather name="refresh-cw" size={20} color="#FFF" />
        </Pressable>
        {ports.length > 0 ? (
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.accent.olive }]}
            onPress={() => handleAction("web")}
          >
            <Feather name="globe" size={20} color="#FFF" />
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.accent.terracotta }]}
          onPress={() => handleAction("terminal")}
        >
          <Feather name="terminal" size={20} color="#FFF" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  tabs: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  tabLabel: {
    marginLeft: 6,
    fontWeight: "600",
  },
  infoCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  infoRow: {
    paddingVertical: Spacing.sm,
  },
  infoValue: {
    marginTop: 4,
  },
  infoDivider: {
    height: 1,
  },
  codeText: {
    fontFamily: "monospace",
  },
  portsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  portChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
  },
  mountItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.sm,
  },
  logsCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    minHeight: 200,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  emptyStats: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  actionsBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  actionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.sm,
  },
});
