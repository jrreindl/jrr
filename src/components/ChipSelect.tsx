import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { colors, radii, spacing } from '../lib/theme';

interface ChipOption {
  value: string;
  label: string;
  color?: string;
}

interface ChipSelectProps {
  label: string;
  options: ChipOption[];
  value: string | null;
  onChange: (value: string) => void;
  optional?: boolean;
}

export function ChipSelect({ label, options, value, onChange, optional }: ChipSelectProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optionalText}> (optional)</Text> : null}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChange(option.value)}
                style={[
                  styles.chip,
                  selected && {
                    backgroundColor: option.color ?? colors.primary,
                    borderColor: option.color ?? colors.primary,
                  },
                ]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  optionalText: {
    fontWeight: '400',
    textTransform: 'none',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  chipTextSelected: {
    color: '#fff',
  },
});
