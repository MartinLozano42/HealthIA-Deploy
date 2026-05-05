import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/theme";

const FEATURES = [
  { icon: "leaf-circle" as const,  label: "Dietas con IA" },
  { icon: "chart-line" as const,   label: "Seguimiento" },
  { icon: "dumbbell" as const,     label: "Ejercicio" },
  { icon: "camera" as const,       label: "Foto → Calorías" },
];

export default function Home() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name="leaf" size={38} color="#fff" />
        </View>

        {/* Title */}
        <Text style={styles.title}>HEALTHIA</Text>
        <Text style={styles.subtitle}>Tu asistente de nutrición inteligente.</Text>
        <Text style={styles.subtitle}>Dietas personalizadas con IA.</Text>

        {/* Image */}
        <View style={styles.imageCard}>
          <Image
            source={require("../assets/images/comida.png")}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        {/* Feature chips */}
        <View style={styles.chipsGrid}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.chip}>
              <MaterialCommunityIcons
                name={f.icon}
                size={16}
                color={Colors.light.primary}
              />
              <Text style={styles.chipText}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.primaryBtnText}>Iniciar sesión</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.secondaryBtnText}>Crear cuenta gratis</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#EAF5F0",
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },

  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#1a1a1a",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 21,
  },

  imageCard: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#fff",
    marginTop: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  image: {
    width: "100%",
    height: "100%",
  },

  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 32,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D6EEEA",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.primary,
  },

  primaryBtn: {
    width: "100%",
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.light.primary,
    backgroundColor: "transparent",
  },
  secondaryBtnText: {
    color: Colors.light.primary,
    fontSize: 16,
    fontWeight: "700",
  },
});
