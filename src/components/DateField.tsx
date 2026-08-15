import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDate, toIsoDate } from '../lib/dates';
import { colors, radii, spacing } from '../lib/theme';

interface DateFieldProps {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  optional?: boolean;
}

export function DateField({ label, value, onChange, optional }: DateFieldProps) {
  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const dateValue = value ? new Date(`${value}T00:00:00`) : new Date();

  function open() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dateValue,
        mode: 'date',
        onChange: (_event, selected) => {
          if (selected) onChange(toIsoDate(selected));
        },
      });
    } else {
      setShowIOSPicker((prev) => !prev);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optionalText}> (optional)</Text> : null}
      </Text>
      <View style={styles.row}>
        <Pressable style={styles.input} onPress={open}>
          <Text style={value ? styles.value : styles.placeholder}>{value ? formatDate(value) : 'Not set'}</Text>
        </Pressable>
        {value && optional ? (
          <Pressable onPress={() => onChange(null)} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {showIOSPicker && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="inline"
          onChange={(_event, selected) => {
            if (selected) onChange(toIsoDate(selected));
          }}
        />
      ) : null}
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
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  optionalText: {
    fontWeight: '400',
    textTransform: 'none',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  value: {
    fontSize: 16,
    color: colors.text,
  },
  placeholder: {
    fontSize: 16,
    color: colors.textMuted,
  },
  clearButton: {
    paddingHorizontal: spacing.sm,
  },
  clearText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13,
  },
});
