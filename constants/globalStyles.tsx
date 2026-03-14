import { StyleSheet } from "react-native";
import { Colors, Fonts } from "./theme";
import styled,{ThemeProvider} from "styled-components/native";

const Title= styled.Text`
  font-size: 28px;
  font-weight: bold;
  color: ${Colors.light.text};
`;
const container= styled.View`
  flex: 1;
  background-color: ${Colors.light.background};
    padding: 20px;  
`;
const primaryButton= styled.Pressable`
  background-color: ${Colors.light.primary};
    padding: 14px;
    border-radius: 12px;
    align-items: center;
`;
const secondaryButton= styled.Pressable`

    background-color: ${Colors.light.secondary};
    padding: 12px;
    border-radius: 10px;
    align-items: center;
`;
const buttonText= styled.Text`
    color: white;
    font-size: 16px;

    font-weight: 600;
`;
const card= styled.View`
    background-color: ${Colors.light.card};
    padding: 20px;
    border-radius: 16px;
`;



export const GlobalStyles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 20
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
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
    borderRadius: 16
  }
});