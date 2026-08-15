import { PropsWithChildren } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, spacing } from '../lib/theme';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({ children, scroll = true, padded = true, style, refreshing, onRefresh }: ScreenProps) {
  const content = padded ? styles.padded : undefined;

  if (scroll) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[content, style]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          ) : undefined
        }>
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.container, content, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padded: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
