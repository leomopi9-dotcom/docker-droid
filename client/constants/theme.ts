import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#2E2E2E",
    textSecondary: "#6B6B6B",
    textMuted: "#9A9A9A",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9A9A9A",
    tabIconSelected: "#7A6EAA",
    link: "#7A6EAA",
    backgroundRoot: "#F6F4F1",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#EEEAE5",
    backgroundTertiary: "#E5E1DC",
    accent: {
      mauve: "#7A6EAA",
      olive: "#8A8C68",
      terracotta: "#C47A5A",
      mint: "#A7C4B8",
    },
    state: {
      success: "#7FAF9B",
      warning: "#E1B07E",
      error: "#D17C7C",
    },
  },
  dark: {
    text: "#F6F4F1",
    textSecondary: "#B8B5B0",
    textMuted: "#8A8785",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8A8785",
    tabIconSelected: "#9D93D1",
    link: "#9D93D1",
    backgroundRoot: "#1A1918",
    backgroundDefault: "#252423",
    backgroundSecondary: "#302F2D",
    backgroundTertiary: "#3B3A38",
    accent: {
      mauve: "#9D93D1",
      olive: "#A5A789",
      terracotta: "#D99575",
      mint: "#B8D4C9",
    },
    state: {
      success: "#8FC1AB",
      warning: "#EBC18E",
      error: "#E08D8D",
    },
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  inputHeight: 48,
  buttonHeight: 44,
};

export const BorderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const Typography = {
  h1: {
    fontSize: 48,
    lineHeight: 58,
    fontWeight: "600" as const,
    fontFamily: Platform.select({
      ios: "Fraunces_600SemiBold",
      android: "Fraunces_600SemiBold",
      default: "Fraunces_600SemiBold",
    }),
  },
  h2: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "600" as const,
    fontFamily: Platform.select({
      ios: "Fraunces_600SemiBold",
      android: "Fraunces_600SemiBold",
      default: "Fraunces_600SemiBold",
    }),
  },
  h3: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "600" as const,
    fontFamily: Platform.select({
      ios: "Fraunces_600SemiBold",
      android: "Fraunces_600SemiBold",
      default: "Fraunces_600SemiBold",
    }),
  },
  h4: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "500" as const,
    fontFamily: Platform.select({
      ios: "Inter_500Medium",
      android: "Inter_500Medium",
      default: "Inter_500Medium",
    }),
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
    fontFamily: Platform.select({
      ios: "Inter_500Medium",
      android: "Inter_500Medium",
      default: "Inter_500Medium",
    }),
  },
};

export const Shadows = {
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  hover: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
};

export const Motion = {
  duration: {
    fast: 120,
    normal: 280,
    slow: 500,
  },
  easing: {
    standard: [0.4, 0.0, 0.2, 1],
    enter: "ease-out",
    exit: "ease-in",
  },
  transform: {
    driftY: 12,
    scaleSoft: 0.98,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "Inter_400Regular",
    serif: "Fraunces_400Regular",
    rounded: "Inter_400Regular",
    mono: "ui-monospace",
  },
  default: {
    sans: "Inter_400Regular",
    serif: "Fraunces_400Regular",
    rounded: "Inter_400Regular",
    mono: "monospace",
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Fraunces, Georgia, 'Times New Roman', serif",
    rounded: "Inter, system-ui, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
