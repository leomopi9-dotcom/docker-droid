import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, Filter, FeTurbulence, FeColorMatrix, Rect } from "react-native-svg";

interface GrainOverlayProps {
  opacity?: number;
}

export function GrainOverlay({ opacity = 0.03 }: GrainOverlayProps) {
  return (
    <View style={[styles.container, { opacity }]} pointerEvents="none">
      <View style={styles.grain} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  grain: {
    flex: 1,
    backgroundColor: "transparent",
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
  },
});
