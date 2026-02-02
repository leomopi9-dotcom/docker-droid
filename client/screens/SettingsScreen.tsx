import React, { useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { SettingsRow } from "@/components/SettingsRow";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants/theme";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useQemuStore } from "@/store/useQemuStore";
import { useDockerStore } from "@/store/useDockerStore";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const {
    dockerApiUrl,
    hapticFeedback,
    loadSettings,
    setDockerApiUrl,
    toggleHapticFeedback,
    clearCache,
  } = useSettingsStore();

  const { settings: qemuSettings, updateSettings: updateQemuSettings } = useQemuStore();
  const { setDockerApiUrl: updateDockerUrl } = useDockerStore();

  useEffect(() => {
    loadSettings();
  }, []);

  const handleClearCache = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await clearCache();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.md,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(300).delay(100)}>
        <ThemedText type="caption" style={[styles.sectionTitle, { color: colors.textMuted }]}>
          CONNECTION
        </ThemedText>
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }, Shadows.soft]}>
          <SettingsRow
            icon="server"
            label="Docker API"
            description={dockerApiUrl}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(200)}>
        <ThemedText type="caption" style={[styles.sectionTitle, { color: colors.textMuted }]}>
          VIRTUAL MACHINE
        </ThemedText>
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }, Shadows.soft]}>
          <SettingsRow
            icon="cpu"
            label="CPU Cores"
            value={`${qemuSettings.cpuCores} cores`}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <SettingsRow
            icon="database"
            label="Memory"
            value={`${qemuSettings.ramMB} MB`}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <SettingsRow
            icon="hard-drive"
            label="Disk Size"
            value={`${qemuSettings.diskSizeGB} GB`}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(300)}>
        <ThemedText type="caption" style={[styles.sectionTitle, { color: colors.textMuted }]}>
          PREFERENCES
        </ThemedText>
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }, Shadows.soft]}>
          <SettingsRow
            icon="smartphone"
            label="Haptic Feedback"
            description="Vibration on interactions"
            value={hapticFeedback}
            onToggle={(value) => {
              toggleHapticFeedback();
              if (value) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(400)}>
        <ThemedText type="caption" style={[styles.sectionTitle, { color: colors.textMuted }]}>
          STORAGE
        </ThemedText>
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }, Shadows.soft]}>
          <SettingsRow
            icon="trash-2"
            label="Clear Cache"
            description="Remove cached data"
            onPress={handleClearCache}
            isDestructive
          />
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <SettingsRow
            icon="cloud"
            label="Create Test Crash Log"
            description="Write a sample crash log to app storage"
            onPress={async () => {
              try {
                const { QemuModule } = require('react-native').NativeModules;
                const res = await QemuModule.createTestCrashLog();
                alert(`Wrote test log: ${res.path}`);
              } catch (e) {
                alert('Failed to write test log: ' + (e.message || e));
              }
            }}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <SettingsRow
            icon="alert-triangle"
            label="Trigger Native Crash"
            description="Immediately crash the app (for testing)"
            onPress={() => {
              const { Alert, NativeModules } = require('react-native');
              Alert.alert('Confirm', 'This will crash the app to test native crash logging. Continue?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Crash', style: 'destructive', onPress: () => NativeModules.QemuModule.triggerNativeCrash() },
              ]);
            }}
            isDestructive
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(500)}>
        <ThemedText type="caption" style={[styles.sectionTitle, { color: colors.textMuted }]}>
          ABOUT
        </ThemedText>
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }, Shadows.soft]}>
          <SettingsRow
            icon="info"
            label="Version"
            value="1.0.0"
          />
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <SettingsRow
            icon="github"
            label="Source Code"
            description="View on GitHub"
            onPress={() => Linking.openURL("https://github.com")}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(600)} style={styles.footer}>
        <View style={[styles.footerCard, { backgroundColor: colors.accent.mauve + "08" }]}>
          <Feather name="heart" size={16} color={colors.accent.mauve} />
          <ThemedText type="caption" style={{ color: colors.textSecondary, marginLeft: Spacing.sm }}>
            Docker Android
          </ThemedText>
        </View>
        <ThemedText type="caption" style={[styles.footerText, { color: colors.textMuted }]}>
          QEMU + Alpine Linux + Docker Engine
        </ThemedText>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
  section: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    marginLeft: 60,
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: "center",
    paddingBottom: Spacing.xl,
  },
  footerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    marginBottom: Spacing.sm,
  },
  footerText: {
    textAlign: "center",
  },
});
