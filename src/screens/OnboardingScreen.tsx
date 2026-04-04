/**
 * OnboardingScreen — shown once after first sign-in.
 * Collects the user's awake window so reminders only fire during the day.
 */
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAppDispatch} from '@/store';
import {completeOnboarding} from '@/store/slices/notificationSlice';
import {syncUserSchedule} from '@/services/supabase/database';
import {supabase} from '@/config/supabase';
import {theme} from '@/theme';

function HourPicker({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  const fmt = (h: number) => {
    const period = h < 12 ? 'AM' : 'PM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${period}`;
  };

  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerRow}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(Math.max(min, value - 1))}>
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.pickerValue}>{fmt(value)}</Text>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(Math.min(max, value + 1))}>
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const [awakeStart, setAwakeStart] = useState(7);
  const [awakeEnd, setAwakeEnd] = useState(22);

  const handleContinue = async () => {
    await AsyncStorage.setItem('onboarding', JSON.stringify({awakeStart, awakeEnd}));
    dispatch(completeOnboarding({awakeStart, awakeEnd}));
    // Sync schedule to Supabase so the Edge Function can send reminders
    const {data: sessionData} = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (uid) {
      syncUserSchedule(uid, 1, awakeStart, awakeEnd).catch(console.warn);
    }
  };

  const totalHours = awakeEnd - awakeStart;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Image
          source={require('@/assets/tem-logo.jpg')}
          style={styles.logo}
        />

        <Text style={styles.title}>Welcome to{'\n'}The Executive Meditator</Text>
        <Text style={styles.subtitle}>
          Let's personalise your reminders so they only arrive during your
          awake hours — never interrupting your rest.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Awake Window</Text>
          <Text style={styles.cardHint}>
            Reminders will be sent only between these hours.
          </Text>

          <HourPicker
            label="I wake up around"
            value={awakeStart}
            onChange={setAwakeStart}
            min={4}
            max={awakeEnd - 1}
          />

          <View style={styles.divider} />

          <HourPicker
            label="I go to sleep around"
            value={awakeEnd}
            onChange={setAwakeEnd}
            min={awakeStart + 1}
            max={23}
          />

          {totalHours > 0 && (
            <Text style={styles.summary}>
              {totalHours} awake hours · reminders will be scheduled within
              this window each day
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How it works</Text>
          <Text style={styles.cardBody}>
            {'Week 1 — Every 60 min: build the initial pattern\n'}
            {'Week 2 — Every 30 min: deepen the groove\n'}
            {'Week 3 — Every 15 min: full integration\n\n'}
            Each reminder invites you to pause for exactly 10 seconds —
            look up to the right with joyful anticipation, breathe, and
            listen. That's it.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>Begin the Journey</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: theme.colors.background},
  scroll: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingBottom: 48,
  },
  logo: {width: 100, height: 100, borderRadius: 20, marginTop: theme.spacing.md},
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  cardHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
  },
  cardBody: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  pickerContainer: {gap: theme.spacing.xs, marginTop: theme.spacing.xs},
  pickerLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 22,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  pickerValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    minWidth: 110,
    textAlign: 'center',
  },
  divider: {height: 1, backgroundColor: theme.colors.divider},
  summary: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  continueBtn: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadow.md,
  },
  continueBtnText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
