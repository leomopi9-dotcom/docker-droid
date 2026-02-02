import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ContainersScreen from "@/screens/ContainersScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ContainersStackParamList = {
  Containers: undefined;
};

const Stack = createNativeStackNavigator<ContainersStackParamList>();

export default function ContainersStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Containers"
        component={ContainersScreen}
        options={{
          headerTitle: "Containers",
        }}
      />
    </Stack.Navigator>
  );
}
