import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { DATABASE_NAME, runMigrations } from '../src/db';
import { colors } from '../src/lib/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Suspense fallback={<LoadingScreen />}>
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={runMigrations} useSuspense>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '600' },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.background },
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="plants/new" options={{ title: 'Add Plant', presentation: 'modal' }} />
              <Stack.Screen name="plants/[id]/index" options={{ title: '' }} />
              <Stack.Screen name="plants/[id]/edit" options={{ title: 'Edit Plant', presentation: 'modal' }} />
              <Stack.Screen
                name="plants/[id]/journal-new"
                options={{ title: 'Add Journal Entry', presentation: 'modal' }}
              />
              <Stack.Screen
                name="plants/[id]/harvest-new"
                options={{ title: 'Log Harvest', presentation: 'modal' }}
              />
              <Stack.Screen name="tasks/new" options={{ title: 'New Task', presentation: 'modal' }} />
              <Stack.Screen name="beds/new" options={{ title: 'Add Bed', presentation: 'modal' }} />
              <Stack.Screen name="beds/[id]/index" options={{ title: '' }} />
              <Stack.Screen name="beds/[id]/edit" options={{ title: 'Edit Bed', presentation: 'modal' }} />
              <Stack.Screen
                name="photo/[id]"
                options={{ title: '', presentation: 'fullScreenModal', headerStyle: { backgroundColor: '#000' } }}
              />
              <Stack.Screen name="+not-found" />
            </Stack>
          </SQLiteProvider>
        </Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
