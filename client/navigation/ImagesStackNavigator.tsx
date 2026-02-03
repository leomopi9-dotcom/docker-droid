import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ImagesScreen from "@/screens/ImagesScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ImagesStackParamList = {
  Images: undefined;
};

const Stack = createNativeStackNavigator<ImagesStackParamList>();

export default function ImagesStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Images"
        component={ImagesScreen}
        options={{
          headerTitle: "Images",
        }}
      />
    </Stack.Navigator>
  );
}
