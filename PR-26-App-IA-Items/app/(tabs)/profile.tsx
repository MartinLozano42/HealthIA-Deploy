import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Platform,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { logoutCurrentUser } from '../../controllers/adminController';
import { updateProfileBasics } from '../../controllers/onboardingController';
import { getExerciseHistory, getLastExerciseUpdate, getOnboarding } from '../../services/services/api';

type UserLite = {
  id?: number;
  idUser?: number;
  name?: string;
  username?: string;
  email?: string;
};

type ProfileData = {
  idUser: number;
  displayName: string;
  email: string;
  ageText: string;
  sexText: string;
  heightText: string;
  currentWeightText: string;
  targetWeightText: string;
  goalText: string;
  activityText: string;
  activitySubtitle: string;
  editableName: string;
  editableWeight: string;
  editableHeight: string;
  editableTargetWeight: string;
};

const DEFAULT_PROFILE: ProfileData = {
  idUser: 0,
  displayName: 'Usuario',
  email: 'Sin correo',
  ageText: '-',
  sexText: '-',
  heightText: '-',
  currentWeightText: '-',
  targetWeightText: '-',
  goalText: 'Sin objetivo',
  activityText: 'Sin registros',
  activitySubtitle: 'Aun no hay actividad guardada',
  editableName: '',
  editableWeight: '',
  editableHeight: '',
  editableTargetWeight: '',
};

const parseDateSafe = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateEs = (value: unknown): string => {
  const parsed = parseDateSafe(value);
  if (!parsed) return 'sin fecha';

  return parsed.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const toPositiveNumber = (value: unknown): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

const normalizeHeightToCm = (value: unknown): number | null => {
  const parsed = toPositiveNumber(value);
  if (!parsed) return null;

  // Backends can return meters (1.75) or centimeters (175).
  if (parsed > 3) {
    return Math.round(parsed);
  }

  return Math.round(parsed * 100);
};

const parseDecimalInput = (value: string): number =>
  Number(String(value || '').trim().replace(',', '.'));

const pickFirstDefined = (...values: unknown[]) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');

const normalizeOnboardingPayload = (raw: any): any => {
  if (!raw) return {};

  const unwrapped = raw?.data ?? raw;

  if (Array.isArray(unwrapped)) {
    return unwrapped[0] ?? {};
  }

  if (Array.isArray(unwrapped?.rows)) {
    return unwrapped.rows[0] ?? {};
  }

  return unwrapped;
};

const computeAge = (birthDateRaw: unknown): number | null => {
  const birthDate = parseDateSafe(birthDateRaw);
  if (!birthDate) return null;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  if (age <= 0 || age > 120) return null;
  return age;
};

const sexToLabel = (sexRaw: unknown): string => {
  const sex = String(sexRaw || '').trim().toUpperCase();
  if (sex === 'M') return 'Masculino';
  if (sex === 'F') return 'Femenino';
  if (sex === 'O') return 'Otro';
  return '-';
};

const resolveCurrentUser = async (paramsIdUser?: string): Promise<UserLite | null> => {
  try {
    const userRaw = await AsyncStorage.getItem('user');
    const parsed = userRaw ? (JSON.parse(userRaw) as UserLite) : null;

    const paramId = Number(paramsIdUser || 0);
    if (parsed) {
      return {
        ...parsed,
        id: Number(parsed.id || parsed.idUser || paramId || 0),
      };
    }

    if (paramId) {
      return { id: paramId };
    }

    return null;
  } catch {
    const paramId = Number(paramsIdUser || 0);
    if (paramId) {
      return { id: paramId };
    }
    return null;
  }
};

const buildProfileData = (user: UserLite, onboarding: any, history: any[]): ProfileData => {
  const statsLike =
    onboarding?.userStats ??
    onboarding?.UserStats ??
    onboarding?.stats ??
    onboarding?.userStat ??
    onboarding?.UserStat ??
    onboarding?.profileStats ??
    onboarding?.profile ??
    {};

  // La API retorna birthDate, sex y dietType dentro de "preferences"
  const preferencesLike = onboarding?.preferences ?? {};

  // El usuario base puede venir en onboarding.user
  const userLike = onboarding?.user ?? {};

  const rawWeight = pickFirstDefined(
    onboarding?.currentWeight,
    onboarding?.weight,
    onboarding?.pesoActual,
    onboarding?.peso,
    onboarding?.weightKg,
    statsLike?.currentWeight,
    statsLike?.weight,
    statsLike?.pesoActual,
    statsLike?.peso,
    statsLike?.weightKg,
  );
  const rawHeight = pickFirstDefined(
    onboarding?.height,
    onboarding?.altura,
    onboarding?.heightCm,
    onboarding?.estatura,
    onboarding?.heightMeters,
    statsLike?.height,
    statsLike?.altura,
    statsLike?.heightCm,
    statsLike?.estatura,
    statsLike?.heightMeters,
  );
  const rawTargetWeight = pickFirstDefined(
    onboarding?.targetWeight,
    onboarding?.pesoObjetivo,
    onboarding?.goalWeight,
    statsLike?.targetWeight,
    statsLike?.pesoObjetivo,
    statsLike?.goalWeight,
    onboarding?.objective?.goalValue,
  );
  const rawBirthDate = pickFirstDefined(
    onboarding?.birthDate,
    onboarding?.fechaNacimiento,
    onboarding?.dateOfBirth,
    onboarding?.dob,
    preferencesLike?.birthDate,
    preferencesLike?.fechaNacimiento,
    preferencesLike?.dateOfBirth,
    statsLike?.birthDate,
    statsLike?.fechaNacimiento,
    statsLike?.dateOfBirth,
    statsLike?.dob,
  );
  const rawAge = pickFirstDefined(
    onboarding?.age,
    onboarding?.edad,
    preferencesLike?.age,
    preferencesLike?.edad,
    statsLike?.age,
    statsLike?.edad,
  );
  const rawSex = pickFirstDefined(
    onboarding?.sex,
    onboarding?.sexo,
    onboarding?.gender,
    onboarding?.genero,
    preferencesLike?.sex,
    preferencesLike?.sexo,
    preferencesLike?.gender,
    preferencesLike?.genero,
    userLike?.gender,
    userLike?.sex,
    statsLike?.sex,
    statsLike?.sexo,
    statsLike?.gender,
    statsLike?.genero,
  );

  const weight = toPositiveNumber(rawWeight);
  const heightCm = normalizeHeightToCm(rawHeight);
  const targetWeight = toPositiveNumber(rawTargetWeight);
  const age = toPositiveNumber(rawAge) ?? computeAge(rawBirthDate);

  const sessions = Array.isArray(history) ? history.length : 0;
  const totalMinutes = Array.isArray(history)
    ? history.reduce((acc, row) => acc + (Number(row?.durationMinutes || 0) || 0), 0)
    : 0;
  const mostRecentRegistered = Array.isArray(history)
    ? history
        .map((row) => parseDateSafe(row?.registeredDate))
        .filter((d): d is Date => d instanceof Date)
        .sort((a, b) => b.getTime() - a.getTime())[0]
    : null;

  const formattedMostRecent = mostRecentRegistered
    ? formatDateEs(mostRecentRegistered.toISOString())
    : 'sin registros';

  const displayName = String(
    pickFirstDefined(
      onboarding?.username,
      onboarding?.name,
      onboarding?.nombre,
      onboarding?.fullName,
      onboarding?.full_name,
      userLike?.username,
      userLike?.name,
      statsLike?.username,
      statsLike?.name,
      statsLike?.nombre,
      statsLike?.fullName,
      user?.username,
      user?.name,
      'Usuario',
    )
  );

  const goalText = targetWeight && weight
    ? targetWeight < weight
      ? 'Pérdida de peso'
      : targetWeight > weight
        ? 'Aumento de peso'
        : 'Mantener peso'
    : 'Sin objetivo';

  return {
    idUser: Number(user?.id || user?.idUser || userLike?.id || 0),
    displayName,
    email: String(
      pickFirstDefined(
        onboarding?.email,
        onboarding?.correo,
        userLike?.email,
        statsLike?.email,
        statsLike?.correo,
        user?.email,
        'Sin correo',
      )
    ),
    ageText: age ? `${age} años` : '-',
    sexText: sexToLabel(rawSex),
    heightText: heightCm ? `${Math.round(heightCm)} cm` : '-',
    currentWeightText: weight ? `${weight.toFixed(1)} kg` : '-',
    targetWeightText: targetWeight ? `${targetWeight.toFixed(1)} kg` : '-',
    goalText,
    activityText: sessions ? `${sessions} sesiones` : 'Sin sesiones',
    activitySubtitle: sessions
      ? `${totalMinutes} min acumulados, última: ${formattedMostRecent}`
      : 'Aun no hay actividad guardada',
    editableName: displayName,
    editableWeight: weight ? String(Number(weight.toFixed(1))) : '',
    editableHeight: heightCm ? String(Math.round(heightCm)) : '',
    editableTargetWeight: targetWeight ? String(Number(targetWeight.toFixed(1))) : '',
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 50,
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  profileEmail: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: {
    backgroundColor: '#D6EFD7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#B8DEBD',
  },
  editButtonText: {
    color: '#4D9E8F',
    fontSize: 12,
    fontWeight: '700',
  },
  editButtonDisabled: {
    opacity: 0.7,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#6E6E6E',
    marginBottom: 8,
    fontWeight: '600',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#CFE7CB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FFF',
  },
  fieldInputReadonly: {
    backgroundColor: '#F8FBF6',
    color: '#6A6A6A',
  },
  fieldInputError: {
    borderColor: '#E53935',
    borderWidth: 1,
  },
  fieldError: {
    color: '#E53935',
    fontSize: 12,
    marginTop: 4,
  },
  toast: {
    position: 'absolute',
    bottom: 30,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastSuccess: {
    backgroundColor: '#4D9E8F',
  },
  toastError: {
    backgroundColor: '#E53935',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
  },
  settingValue: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  goalContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  goalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4D9E8F',
  },
  button: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: '#4D9E8F',
  },
  buttonSecondary: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  buttonDanger: {
    backgroundColor: '#FFE8E8',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#FFF',
  },
  buttonTextSecondary: {
    color: '#333',
  },
  buttonTextDanger: {
    color: '#ED6B4B',
  },
  loadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 13,
  },
  errorCard: {
    backgroundColor: '#FFF4F4',
    borderColor: '#FFD9D9',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#A94442',
    fontSize: 13,
  },
});

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ idUser?: string }>();
  const [darkMode, setDarkMode] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<ProfileData>(DEFAULT_PROFILE);
  const [isEditing, setIsEditing] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [nameInput, setNameInput] = React.useState('');
  const [weightInput, setWeightInput] = React.useState('');
  const [heightInput, setHeightInput] = React.useState('');
  const [targetWeightInput, setTargetWeightInput] = React.useState('');
  const [lastExerciseUpdate, setLastExerciseUpdate] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{ name?: string; weight?: string; height?: string; targetWeight?: string }>({});
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastAnim = React.useRef(new Animated.Value(0)).current;

  const showToast = React.useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [toastAnim]);

  const initialLetter = React.useMemo(() => {
    const first = String(profile.displayName || '').trim().charAt(0).toUpperCase();
    return first || 'U';
  }, [profile.displayName]);

  const loadProfile = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await resolveCurrentUser(params.idUser);
      if (!user || !Number(user.id || 0)) {
        setProfile(DEFAULT_PROFILE);
        setError('No se encontró la sesión de usuario. Inicia sesión nuevamente.');
        return;
      }

      const idUser = Number(user.id || 0);
      const [onboardingRaw, exerciseHistory, lastUpdate] = await Promise.all([
        getOnboarding(idUser),
        getExerciseHistory(idUser),
        getLastExerciseUpdate(idUser),
      ]);
      setLastExerciseUpdate(lastUpdate);

      const onboarding = normalizeOnboardingPayload(onboardingRaw);
      console.log('[Profile] onboardingRaw:', JSON.stringify(onboardingRaw));
      console.log('[Profile] onboarding (normalizado):', JSON.stringify(onboarding));
      const nextProfile = buildProfileData({ ...user, id: idUser }, onboarding, exerciseHistory);
      setProfile(nextProfile);
      setNameInput(nextProfile.editableName);
      setWeightInput(nextProfile.editableWeight);
      setHeightInput(nextProfile.editableHeight);
      setTargetWeightInput(nextProfile.editableTargetWeight);
    } catch (loadError) {
      setProfile(DEFAULT_PROFILE);
      setNameInput('');
      setWeightInput('');
      setHeightInput('');
      setTargetWeightInput('');
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  }, [params.idUser]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);



  const handleLogout = async () => {
    await logoutCurrentUser();
    router.replace('/login');
  };

  const handleDeleteAccount = () => {
    Alert.alert('Próximamente', 'La eliminación de cuenta estará disponible en una próxima versión.');
  };

  const handleDownloadData = async () => {
    try {
      const todayMealsRaw = await AsyncStorage.getItem('todayMeals');
      const todayMeals: any[] = todayMealsRaw ? JSON.parse(todayMealsRaw) : [];

      const routineCacheRaw = await AsyncStorage.getItem('exerciseRoutineCache');
      const routineCache = routineCacheRaw ? JSON.parse(routineCacheRaw) : null;

      const now = new Date();
      const dateStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      const year = now.getFullYear();

      const weightKg = parseFloat(profile.currentWeightText);
      const heightCm = parseFloat(profile.heightText);
      const bmi = !isNaN(weightKg) && !isNaN(heightCm) && heightCm > 0
        ? (weightKg / Math.pow(heightCm / 100, 2)).toFixed(1)
        : '-';

      const totalCalories = todayMeals.reduce((sum, m) => sum + Number(m.calories || 0), 0);

      const mealsRows = todayMeals.length > 0
        ? todayMeals.map((m) => `
            <div class="meal-row">
              <div>
                <div class="meal-name">${m.name ?? 'Comida'}</div>
                <div class="meal-time">${m.time ?? ''}</div>
              </div>
              <div class="meal-kcal">${m.calories ?? 0} kcal</div>
            </div>`).join('')
        : '<div class="empty">Sin comidas registradas hoy</div>';

      const caloriesTotalRow = totalCalories > 0 ? `
        <div class="total-row">
          <span>Total calorías hoy</span>
          <span class="total-val">${totalCalories} kcal</span>
        </div>` : '';

      const routineDuration = routineCache?.duration ?? null;
      const routineStr = routineDuration ? `${routineDuration} min` : '-';

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',Arial,sans-serif;background:#F0FAF7;color:#1a1a1a}
    .page{max-width:720px;margin:0 auto;padding-bottom:60px}

    /* Header */
    .header{background:linear-gradient(135deg,#4D9E8F 0%,#3a7d71 100%);padding:48px 40px;text-align:center;position:relative;overflow:hidden}
    .header::before{content:'';position:absolute;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,0.07);top:-80px;right:-60px}
    .header::after{content:'';position:absolute;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.05);bottom:-60px;left:-40px}
    .header-icon{font-size:40px;margin-bottom:12px}
    .header-title{font-size:32px;font-weight:900;color:#fff;letter-spacing:4px;margin-bottom:6px}
    .header-sub{font-size:15px;color:rgba(255,255,255,0.85);margin-bottom:8px}
    .header-date{font-size:12px;color:rgba(255,255,255,0.65);background:rgba(255,255,255,0.15);display:inline-block;padding:4px 14px;border-radius:20px}

    /* Content */
    .content{padding:32px 28px}
    .section{background:#fff;border-radius:20px;padding:26px;margin-bottom:20px;box-shadow:0 4px 16px rgba(0,0,0,0.06)}
    .section-header{display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #E8F5F0}
    .section-icon{width:36px;height:36px;border-radius:10px;background:#E8F5F0;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .section-title{font-size:13px;font-weight:700;color:#4D9E8F;text-transform:uppercase;letter-spacing:1.5px}

    /* Grid */
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
    .field-label{font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}
    .field-value{font-size:17px;font-weight:700;color:#1a1a1a}

    /* Stat cards */
    .stat-card{background:#F0FAF7;border-radius:14px;padding:16px;text-align:center}
    .stat-num{font-size:26px;font-weight:900;color:#4D9E8F}
    .stat-label{font-size:10px;font-weight:600;color:#888;margin-top:4px;text-transform:uppercase}

    /* Goal badge */
    .goal-badge{background:linear-gradient(135deg,#E8F5F0,#D6EEEA);border-radius:12px;padding:16px;text-align:center;margin-top:16px}
    .goal-label{font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
    .goal-value{font-size:20px;font-weight:800;color:#4D9E8F}

    /* Meals */
    .meal-row{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid #F5F5F5}
    .meal-row:last-of-type{border-bottom:none}
    .meal-name{font-size:14px;font-weight:700;color:#1a1a1a}
    .meal-time{font-size:11px;color:#aaa;margin-top:2px}
    .meal-kcal{font-size:15px;font-weight:800;color:#4D9E8F}
    .total-row{display:flex;justify-content:space-between;align-items:center;background:#F0FAF7;border-radius:12px;padding:14px;margin-top:14px;font-size:14px;font-weight:700;color:#333}
    .total-val{font-size:20px;font-weight:900;color:#4D9E8F}
    .empty{text-align:center;color:#ccc;padding:20px;font-size:14px}

    /* Footer */
    .footer{text-align:center;padding:40px 28px 20px;color:#bbb;font-size:12px;line-height:1.8}
    .footer-badge{display:inline-block;background:#E8F5F0;color:#4D9E8F;font-size:12px;font-weight:700;padding:6px 18px;border-radius:999px;margin-bottom:10px}

    @media print{body{background:#fff}.page{max-width:100%}}
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-icon">🌿</div>
    <div class="header-title">HEALTHIA</div>
    <div class="header-sub">Reporte de Datos Personales · GDPR</div>
    <div class="header-date">Generado el ${dateStr}</div>
  </div>

  <div class="content">

    <!-- Personal -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">👤</div>
        <div class="section-title">Información Personal</div>
      </div>
      <div class="grid-2">
        <div><div class="field-label">Nombre</div><div class="field-value">${profile.displayName}</div></div>
        <div><div class="field-label">Correo electrónico</div><div class="field-value" style="font-size:14px">${profile.email}</div></div>
        <div style="margin-top:12px"><div class="field-label">Edad</div><div class="field-value">${profile.ageText}</div></div>
        <div style="margin-top:12px"><div class="field-label">Sexo</div><div class="field-value">${profile.sexText}</div></div>
      </div>
    </div>

    <!-- Physical -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">⚖️</div>
        <div class="section-title">Datos Físicos</div>
      </div>
      <div class="grid-3">
        <div class="stat-card"><div class="stat-num">${profile.currentWeightText}</div><div class="stat-label">Peso actual</div></div>
        <div class="stat-card"><div class="stat-num">${profile.heightText}</div><div class="stat-label">Altura</div></div>
        <div class="stat-card"><div class="stat-num">${bmi}</div><div class="stat-label">IMC</div></div>
      </div>
      <div class="goal-badge">
        <div class="goal-label">Peso objetivo</div>
        <div class="goal-value">${profile.targetWeightText}</div>
      </div>
      <div class="goal-badge" style="margin-top:10px">
        <div class="goal-label">Objetivo</div>
        <div class="goal-value">${profile.goalText}</div>
      </div>
    </div>

    <!-- Activity -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">🏃</div>
        <div class="section-title">Actividad Física</div>
      </div>
      <div class="grid-3">
        <div class="stat-card">
          <div class="stat-num">${profile.activityText.replace(' sesiones','').replace('Sin sesiones','0')}</div>
          <div class="stat-label">Sesiones</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${routineStr}</div>
          <div class="stat-label">Rutina / día</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="font-size:14px;padding-top:4px">${profile.activitySubtitle.split(',')[0] ?? '-'}</div>
          <div class="stat-label">Minutos</div>
        </div>
      </div>
    </div>

    <!-- Meals -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">🥗</div>
        <div class="section-title">Comidas de Hoy</div>
      </div>
      ${mealsRows}
      ${caloriesTotalRow}
    </div>

  </div>

  <div class="footer">
    <div class="footer-badge">🌿 HEALTHIA</div>
    <div>Este documento contiene tu información personal conforme al RGPD/GDPR.</div>
    <div>Generado el ${dateStr} · © ${year} HEALTHIA</div>
  </div>

</div>
</body>
</html>`;

      if (Platform.OS === 'web') {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
          setTimeout(() => win.print(), 600);
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Exportar mis datos HEALTHIA',
            UTI: 'com.adobe.pdf',
          });
        } else {
          await Print.printAsync({ uri });
        }
      }
    } catch {
      Alert.alert('Error', 'No se pudo generar el reporte. Inténtalo nuevamente.');
    }
  };

  const handleEditProfile = async () => {
    if (!profile.idUser) {
      Alert.alert('Error', 'No se encontró el usuario para editar el perfil.');
      return;
    }

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    const errors: { name?: string; weight?: string; height?: string; targetWeight?: string } = {};
    const trimmedName = nameInput.trim();
    const parsedWeightVal = parseDecimalInput(weightInput);
    const parsedHeightVal = parseDecimalInput(heightInput);
    const parsedTargetVal = parseDecimalInput(targetWeightInput);

    if (trimmedName.length < 3) errors.name = 'El nombre debe tener al menos 3 caracteres';
    if (!Number.isFinite(parsedWeightVal) || parsedWeightVal <= 0) errors.weight = 'Ingresa un peso válido';
    else if (parsedWeightVal < 20 || parsedWeightVal > 400) errors.weight = 'El peso debe estar entre 20 y 400 kg';
    if (!Number.isFinite(parsedHeightVal) || parsedHeightVal <= 0) errors.height = 'Ingresa una altura válida';
    else if (parsedHeightVal < 80 || parsedHeightVal > 250) errors.height = 'La altura debe estar entre 80 y 250 cm';
    if (!Number.isFinite(parsedTargetVal) || parsedTargetVal <= 0) errors.targetWeight = 'Ingresa un peso objetivo válido';
    else if (parsedTargetVal < 20 || parsedTargetVal > 400) errors.targetWeight = 'El peso objetivo debe estar entre 20 y 400 kg';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSavingProfile(true);

      const parsedWeight = parsedWeightVal;
      const parsedHeightCm = parsedHeightVal;
      const parsedHeightM = parsedHeightCm / 100;

      await updateProfileBasics({
        idUser: profile.idUser,
        username: nameInput,
        currentWeight: String(parsedWeight),
        height: String(parsedHeightM),
        targetWeight: String(parsedTargetVal),
      });

      setProfile((current) => ({
        ...current,
        displayName: nameInput.trim(),
        currentWeightText: `${parsedWeight.toFixed(1)} kg`,
        heightText: `${Math.round(parsedHeightCm)} cm`,
        targetWeightText: `${parsedTargetVal.toFixed(1)} kg`,
        editableName: nameInput.trim(),
        editableWeight: String(Number(parsedWeight.toFixed(1))),
        editableHeight: String(Math.round(parsedHeightCm)),
        editableTargetWeight: String(Number(parsedTargetVal.toFixed(1))),
      }));
      setIsEditing(false);
      showToast('Perfil actualizado correctamente', 'success');
    } catch (saveError) {
      showToast(saveError instanceof Error ? saveError.message : 'No se pudo guardar el perfil', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#4D9E8F" />
            <Text style={styles.loadingText}>Cargando perfil...</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImage}>
            <Text style={{ fontSize: 40, fontWeight: 'bold', color: '#4D9E8F' }}>
              {initialLetter}
            </Text>
          </View>
          <Text style={styles.profileName}>{profile.displayName}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
        </View>

        {/* Personal Information */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Datos personales</Text>
            <Pressable
              style={[styles.editButton, savingProfile && styles.editButtonDisabled]}
              onPress={handleEditProfile}
              disabled={savingProfile}
            >
              <Text style={styles.editButtonText}>
                {savingProfile ? 'Guardando...' : isEditing ? 'Guardar' : 'Editar'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput
              style={[styles.fieldInput, !isEditing && styles.fieldInputReadonly, !!fieldErrors.name && styles.fieldInputError]}
              value={nameInput}
              onChangeText={(v) => { setNameInput(v); setFieldErrors((e) => ({ ...e, name: undefined })); }}
              editable={isEditing && !savingProfile}
              placeholder="Nombre"
              placeholderTextColor="#A5A5A5"
            />
            {!!fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Peso (kg)</Text>
            <TextInput
              style={[styles.fieldInput, !isEditing && styles.fieldInputReadonly, !!fieldErrors.weight && styles.fieldInputError]}
              value={weightInput}
              onChangeText={(v) => { setWeightInput(v); setFieldErrors((e) => ({ ...e, weight: undefined })); }}
              editable={isEditing && !savingProfile}
              keyboardType="decimal-pad"
              placeholder="Peso"
              placeholderTextColor="#A5A5A5"
            />
            {!!fieldErrors.weight && <Text style={styles.fieldError}>{fieldErrors.weight}</Text>}
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Altura (cm)</Text>
            <TextInput
              style={[styles.fieldInput, !isEditing && styles.fieldInputReadonly, !!fieldErrors.height && styles.fieldInputError]}
              value={heightInput}
              onChangeText={(v) => { setHeightInput(v); setFieldErrors((e) => ({ ...e, height: undefined })); }}
              editable={isEditing && !savingProfile}
              keyboardType="decimal-pad"
              placeholder="Altura"
              placeholderTextColor="#A5A5A5"
            />
            {!!fieldErrors.height && <Text style={styles.fieldError}>{fieldErrors.height}</Text>}
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Edad</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputReadonly]}
              value={profile.ageText}
              editable={false}
            />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Genero</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputReadonly]}
              value={profile.sexText}
              editable={false}
            />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Correo</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputReadonly]}
              value={profile.email}
              editable={false}
            />
          </View>
        </View>

        {/* Goals */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Objetivos</Text>
          <View style={styles.goalContainer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Peso objetivo (kg)</Text>
              <TextInput
                style={[styles.fieldInput, !isEditing && styles.fieldInputReadonly, !!fieldErrors.targetWeight && styles.fieldInputError]}
                value={targetWeightInput}
                onChangeText={(v) => { setTargetWeightInput(v); setFieldErrors((e) => ({ ...e, targetWeight: undefined })); }}
                editable={isEditing && !savingProfile}
                keyboardType="decimal-pad"
                placeholder="Peso objetivo"
                placeholderTextColor="#A5A5A5"
              />
              {!!fieldErrors.targetWeight && <Text style={styles.fieldError}>{fieldErrors.targetWeight}</Text>}
            </View>
          </View>
          <View style={styles.goalContainer}>
            <View>
              <Text style={styles.infoLabel}>Meta calórica</Text>
              <Text style={[styles.settingValue, { marginTop: 4 }]}>
                Objetivo actual
              </Text>
            </View>
            <Text style={styles.goalValue}>{profile.goalText}</Text>
          </View>
          <View style={styles.goalContainer}>
            <View>
              <Text style={styles.infoLabel}>Actividad</Text>
              <Text style={[styles.settingValue, { marginTop: 4 }]}>
                {profile.activitySubtitle}
              </Text>
              {lastExerciseUpdate && (
                <Text style={[styles.settingValue, { marginTop: 2 }]}>
                  Última modificación:{' '}
                  {new Date(lastExerciseUpdate).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              )}
            </View>
            <Text style={styles.goalValue}>{profile.activityText}</Text>
          </View>
        </View>

        {/* Account & Support */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <Pressable style={[styles.settingRow, styles.settingRowLast]} onPress={handleDownloadData}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Descargar mi reporte</Text>
              <Text style={styles.settingValue}>
                Perfil, avances, comidas y más
              </Text>
            </View>
            <MaterialIcons name="download" size={20} color="#4D9E8F" />
          </Pressable>
        </View>

        {/* Action Buttons */}
        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={handleLogout}>
          <Feather name="log-out" size={18} color="#333" />
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
            Cerrar sesión
          </Text>
        </Pressable>
      </ScrollView>

      {toast && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'success' ? styles.toastSuccess : styles.toastError,
            { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
          ]}
        >
          <MaterialIcons
            name={toast.type === 'success' ? 'check-circle' : 'error'}
            size={20}
            color="#fff"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
