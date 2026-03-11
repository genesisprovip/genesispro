import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

interface DatePickerFieldProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string;
  iconColor?: string;
  /** If true, renders inside an existing inputGroup row (no wrapper) */
  inline?: boolean;
}

export default function DatePickerField({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  iconColor = COLORS.textSecondary,
  inline = false,
}: DatePickerFieldProps) {
  const [show, setShow] = useState(false);

  const parsedDate = value ? new Date(value + 'T12:00:00') : new Date();

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
  };

  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const dt = new Date(dateStr + 'T12:00:00');
    return dt.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const content = (
    <>
      <View style={[styles.inputIcon, { backgroundColor: iconColor + '15' }]}>
        <Calendar size={20} color={iconColor} />
      </View>
      <Text style={[styles.dateText, !value && styles.placeholder]}>
        {value ? formatDisplay(value) : placeholder}
      </Text>
    </>
  );

  if (inline) {
    return (
      <>
        <TouchableOpacity
          style={styles.inlineWrapper}
          onPress={() => setShow(true)}
          activeOpacity={0.7}
        >
          {content}
        </TouchableOpacity>
        {show && (
          <DateTimePicker
            value={parsedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            locale="es-MX"
          />
        )}
      </>
    );
  }

  return (
    <View>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={parsedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          locale="es-MX"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  inlineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inputIcon: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  dateText: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  placeholder: {
    color: COLORS.textSecondary,
  },
});
