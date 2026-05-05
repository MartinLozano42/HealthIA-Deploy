import { Platform, StyleSheet } from "react-native";
import { Colors } from "./theme";
 
export const GlobalStyles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 20
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 20
  },

  text: {
    fontSize: 16,
    color: Colors.light.text
  },

  primaryButton: {
    backgroundColor: Colors.light.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: "center"
  },

  secondaryButton: {
    backgroundColor: Colors.light.secondary,
    padding: 12,
    borderRadius: 10,
    alignItems: "center"
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600"
  },

  card: {
    backgroundColor: Colors.light.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3
  },

  /* ADMIN PANEL */

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },

  statBox: {
    flex: 1,
    backgroundColor: Colors.light.card,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 5
  },

  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.light.text
  },

  filterContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 10
  },

  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.light.secondary
  },

  filterText: {
    color: "white",
    fontWeight: "600"
  },

  statusActive: {
    color: "green",
    fontWeight: "bold"
  },

  statusInactive: {
    color: "red",
    fontWeight: "bold"
  },

  actionButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: Colors.light.primary
  },
searchInput: {
  backgroundColor: Colors.light.card,
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 12,
  marginBottom: 16,
  fontSize: 16,
  color: Colors.light.text,
  borderWidth: 1,
  borderColor: Colors.light.secondary
  },

  adminHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },

  logoutButton: {
    backgroundColor: Colors.light.secondary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },

  logoutText: {
    color: "white",
    fontWeight: "600",
}
});

// Exercise screen specific styles
export const ExerciseStyles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
  },
  sliderContainer: {
    width: "100%",
    paddingVertical: 8,
  },
  sliderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: Colors.light.text,
  },
  sliderTrack: {
    height: 10,
    borderRadius: 10,
    backgroundColor: Colors.light.border,
    justifyContent: "center",
  },
  sliderProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 10,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
  },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: Colors.light.primary,
    position: "absolute",
    top: -7,
  },
  summaryCard: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderRadius: 18,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  summaryIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  summaryCopyColumn: {
    flex: 1,
  },
  summaryCaption: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 2,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    color: "#fff",
  },
  summarySubtext: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
  },
  summarySubtextWithSpacing: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  summaryMetaColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  summaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryMetaText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "600",
  },
  profileMetaContainer: {
    marginTop: 10,
  },
  profileMetaText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: Colors.light.text,
  },
  exerciseTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  exerciseTypeCard: {
    width: "30.3%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  exerciseTypeCardActive: {
    backgroundColor: "rgba(85, 173, 155, 0.14)",
    borderColor: Colors.light.primary,
  },
  exerciseTypeCardInactive: {
    backgroundColor: "rgba(242, 250, 245, 0.9)",
    borderColor: Colors.light.border,
  },
  exerciseTypeIcon: {
    marginBottom: 6,
  },
  exerciseTypeText: {
    fontSize: 12,
    textAlign: "center",
  },
  exerciseTypeTextActive: {
    color: Colors.light.primary,
    fontWeight: "700",
  },
  exerciseTypeTextInactive: {
    color: Colors.light.text,
    fontWeight: "400",
  },
  intensityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  intensityButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  intensityButtonActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  intensityButtonInactive: {
    borderColor: Colors.light.border,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  intensityText: {
    fontWeight: "600",
  },
  intensityTextActive: {
    color: "#fff",
  },
  intensityTextInactive: {
    color: Colors.light.text,
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  durationValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  heartRateInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.light.text,
    fontSize: 16,
  },
  weightTrainingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weightTrainingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
  },
  weightTrainingHint: {
    fontSize: 12,
    color: Colors.light.text,
    marginTop: 6,
  },
  trainingDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  trainingDayButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  trainingDayButtonEnabled: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  trainingDayButtonDisabled: {
    borderColor: Colors.light.border,
    backgroundColor: "rgba(242, 250, 245, 0.9)",
  },
  trainingDayText: {
    fontSize: 14,
    fontWeight: "700",
  },
  trainingDayTextEnabled: {
    color: "#fff",
  },
  trainingDayTextDisabled: {
    color: Colors.light.text,
  },
  primaryActionButton: {
    marginTop: 10,
  },
  primaryActionButtonDisabled: {
    opacity: 0.7,
  },
  secondaryActionButton: {
    marginTop: 10,
  },
  bottomSpacer: {
    height: 80,
  },
});

export const PersonalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  stepText: {
    color: Colors.light.icon,
    fontSize: 14,
    marginBottom: 6,
  },
  progressBarBackground: {
    width: "100%",
    height: 8,
    backgroundColor: Colors.light.border,
    borderRadius: 12,
    marginBottom: 18,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
  },
  subtitle: {
    color: Colors.light.icon,
    fontSize: 15,
    marginBottom: 16,
  },
  subtitleCentered: {
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: Colors.light.inputBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 16,
  },
  inputBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
  },
  dateInputButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateInputText: {
    fontSize: 18,
    color: Colors.light.text,
  },
  dateInputPlaceholder: {
    fontSize: 18,
    color: Colors.light.icon,
  },
  hiddenWebDateInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: "none",
  },
  datePickerWrapper: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.inputBackground,
    padding: 8,
  },
  datePickerDoneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  datePickerDoneText: {
    color: Colors.light.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceButton: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.inputBackground,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: 92,
    alignItems: "center",
  },
  choiceButtonSelected: {
    backgroundColor: Colors.light.secondary,
    borderColor: Colors.light.primary,
  },
  choiceText: {
    fontWeight: "600",
    color: Colors.light.text,
    fontSize: 16,
  },
  choiceTextSelected: {
    color: Colors.light.text,
  },
  activityLevelsList: {
    gap: 10,
  },
  activityLoading: {
    marginVertical: 12,
  },
  foodsLoading: {
    marginTop: 20,
  },
  inlineError: {
    color: "red",
    marginBottom: 8,
  },
  foodsError: {
    color: "red",
    marginTop: 12,
  },
  foodGroup: {
    marginBottom: 16,
  },
  activityOption: {
    backgroundColor: Colors.light.inputBackground,
    borderColor: Colors.light.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activityOptionSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.card,
  },
  activityOptionError: {
    borderColor: "#e53935",
    backgroundColor: "#fff8f8",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#c8c8c8",
  },
  radioCircleSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  activityTitle: {
    fontSize: 18,
    color: Colors.light.text,
    fontWeight: "600",
  },
  activitySubtitle: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  switchCard: {
    marginTop: 14,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 16,
    borderColor: Colors.light.border,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gridTwoColumns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridButton: {
    width: "48%",
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 16,
    borderColor: Colors.light.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    padding: 8,
  },
  gridButtonSelected: {
    backgroundColor: Colors.light.secondary,
    borderColor: Colors.light.primary,
  },
  gridButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: "600",
  },
  gridButtonTextSelected: {
    color: Colors.light.text,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chipSelected: {
    backgroundColor: Colors.light.secondary,
    borderColor: Colors.light.primary,
  },
  chipText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: Colors.light.text,
  },
  doneCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.light.primary,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  doneCheck: {
    color: "white",
    fontSize: 40,
    fontWeight: "700",
  },
  centeredTitle: {
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 10,
  },
  summaryLabel: {
    color: Colors.light.icon,
    fontSize: 14,
  },
  summaryValue: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: "700",
  },
  footerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingTop: 8,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.light.secondary,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.background,
  },
  backButtonText: {
    fontSize: 30,
    color: Colors.light.primary,
    lineHeight: 30,
  },
  continueButton: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  inputError: {
    borderColor: "#e53935",
  },
  fieldErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fdecea",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  fieldErrorText: {
    color: "#e53935",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  fieldHintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#eef0ff",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  fieldHintText: {
    color: "#4a5dbd",
    fontSize: 12,
    fontWeight: "500" as const,
  },
});

export const RegisterStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingTop: 12,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  backText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  form: {
    gap: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    borderColor: "#e0e0e0",
    padding: 14,
  },
  passwordWrapper: {
    borderColor: "#e0e0e0",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  eyeButtonRight: {
    marginLeft: 8,
    padding: 4,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    color: Colors.light.text,
  },
  validationCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 14,
  },
  validationTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 10,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  checkIcon: {
    width: 18,
    fontSize: 14,
    fontWeight: "700",
  },
  checkOk: {
    color: "#2e7d32",
  },
  checkOff: {
    color: "#999",
  },
  checkText: {
    fontSize: 12,
  },
  checkTextOk: {
    color: "#2e7d32",
    fontWeight: "600",
  },
  checkTextOff: {
    color: "#777",
  },
  warningBox: {
    backgroundColor: "#fff4e5",
    borderColor: "#ffd59e",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  warningText: {
    color: "#9a5b00",
    fontSize: 12,
    fontWeight: "600",
  },
  legalText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 20,
    lineHeight: 18,
  },
  link: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    color: "#777",
  },
  loginLink: {
    color: Colors.light.primary,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export const ResetPasswordStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 36,
  },
  title: {
    fontSize: 28,
    color: Colors.light.text,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 18,
  },
  card: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
  },
  label: {
    fontSize: 13,
    color: Colors.light.text,
    marginBottom: 8,
    marginTop: 8,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#fff",
    color: Colors.light.text,
  },
  submitButton: {
    marginTop: 18,
  },
  backToLogin: {
    marginTop: 14,
    textAlign: "center",
    color: Colors.light.primary,
    fontWeight: "700",
  },
});

// Tab layout specific styles
export const TabsLayoutScreenOptions = {
  tabBarActiveTintColor: Colors.light.tabIconSelected,
  tabBarInactiveTintColor: Colors.light.tabIconDefault,
  tabBarLabelStyle: {
    fontSize: 12,
    marginBottom: Platform.OS === "android" ? 3 : 0,
  },
  headerShown: false,
  tabBarStyle: {
    backgroundColor: Colors.light.inputBackground,
    borderTopColor: Colors.light.border,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === "android" ? 8 : 12,
  },
} as const;