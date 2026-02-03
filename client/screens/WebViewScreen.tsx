import React, { useState, useRef } from "react";
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "WebView">;

export default function WebViewScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState(route.params.url);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleGoBack = () => {
    if (canGoBack) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      webViewRef.current?.goBack();
    }
  };

  const handleGoForward = () => {
    if (canGoForward) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      webViewRef.current?.goForward();
    }
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.reload();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.backgroundDefault, paddingTop: insets.top },
          Shadows.soft,
        ]}
      >
        <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>

        <View
          style={[
            styles.urlBar,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.accent.mauve} style={{ marginRight: Spacing.xs }} />
          ) : (
            <Feather name="lock" size={14} color={colors.textMuted} style={{ marginRight: Spacing.xs }} />
          )}
          <ThemedText type="small" numberOfLines={1} style={[styles.urlText, { color: colors.textSecondary }]}>
            {currentUrl}
          </ThemedText>
        </View>

        <Pressable style={styles.refreshButton} onPress={handleRefresh}>
          <Feather name="refresh-cw" size={20} color={theme.text} />
        </Pressable>
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: route.params.url }}
        style={styles.webView}
        onNavigationStateChange={(navState) => {
          setCurrentUrl(navState.url);
          setCanGoBack(navState.canGoBack);
          setCanGoForward(navState.canGoForward);
        }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
            <ActivityIndicator size="large" color={colors.accent.mauve} />
          </View>
        )}
      />

      <View
        style={[
          styles.toolbar,
          { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom },
          Shadows.soft,
        ]}
      >
        <Pressable
          style={[styles.toolbarButton, !canGoBack && styles.toolbarButtonDisabled]}
          onPress={handleGoBack}
          disabled={!canGoBack}
        >
          <Feather name="chevron-left" size={24} color={canGoBack ? theme.text : colors.textMuted} />
        </Pressable>
        <Pressable
          style={[styles.toolbarButton, !canGoForward && styles.toolbarButtonDisabled]}
          onPress={handleGoForward}
          disabled={!canGoForward}
        >
          <Feather name="chevron-right" size={24} color={canGoForward ? theme.text : colors.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.toolbarButton} onPress={handleRefresh}>
          <Feather name="share" size={22} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  urlBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: Spacing.sm,
  },
  urlText: {
    flex: 1,
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  toolbarButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarButtonDisabled: {
    opacity: 0.5,
  },
});
