import { useRouter } from "expo-router";
import { Pressable, Text, View ,StyleSheet} from "react-native";
import styled,{ThemeProvider} from "styled-components/native";
import { GlobalStyles } from "../constants/globalStyles";
export default function Screen2()
{
    const router = useRouter()
    return (<View style={GlobalStyles.container}>
        <Text style={GlobalStyles.title}>Pantalla 2</Text>
              <Pressable
                style={GlobalStyles.secondaryButton}
                onPress={() => router.back()}
              >
                <Text style={GlobalStyles.buttonText}>
                  Ir a pantalla 2
                </Text>
              </Pressable>
              </View>)
}