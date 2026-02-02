import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import ContainerDetailScreen from "@/screens/ContainerDetailScreen";
import CreateContainerScreen from "@/screens/CreateContainerScreen";
import WebViewScreen from "@/screens/WebViewScreen";
import TerminalScreen from "@/screens/TerminalScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: { screen?: string } | undefined;
  ContainerDetail: { containerId: string };
  CreateContainer: undefined;
  WebView: { url: string; title: string };
  Terminal: { containerId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ContainerDetail"
        component={ContainerDetailScreen}
        options={{
          headerTitle: "Container",
        }}
      />
      <Stack.Screen
        name="CreateContainer"
        component={CreateContainerScreen}
        options={{
          presentation: "modal",
          headerTitle: "Create Container",
        }}
      />
      <Stack.Screen
        name="WebView"
        component={WebViewScreen}
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="Terminal"
        component={TerminalScreen}
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
    </Stack.Navigator>
  );
}
