import { useRouter } from "expo-router";
import { Text, View, Pressable } from "react-native";
import { GlobalStyles } from "../constants/globalStyles";

export default function Screen1() {

  const router = useRouter();

  return (
    <View style={GlobalStyles.container}>

      <Text style={GlobalStyles.title}>
        Pantalla 1
      </Text>

      <Pressable
        style={GlobalStyles.secondaryButton}
        onPress={() => router.push("/screen2")}
      >
        <Text style={GlobalStyles.buttonText}>
          Ir a pantalla 2
        </Text>
      </Pressable>

    </View>
  );
}