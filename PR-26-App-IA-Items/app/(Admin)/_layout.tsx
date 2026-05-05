import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { resolveAdminAccess } from "../../controllers/adminController";

export default function Layout() {
  const params = useLocalSearchParams<{ role?: string }>();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const timeoutId = setTimeout(() => {
      if (!isMounted) return;
      setLoading(false);
      router.replace("/login");
    }, 5000);

    const checkAdmin = async () => {
      try {
        const roleFromParams =
          typeof params.role === "string" ? params.role : "";
        const access = await resolveAdminAccess(roleFromParams);

        if (!isMounted) return;

        if (!access.allowed && access.redirectTo) {
          router.replace(access.redirectTo as never);
        }
      } catch {
        if (!isMounted) return;
        router.replace("/login");
      } finally {
        if (!isMounted) return;
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    checkAdmin();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [params.role]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
