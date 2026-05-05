import { Tabs } from 'expo-router';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { TabsLayoutScreenOptions } from '../../constants/globalStyles';
import { buildTabOptions, TAB_SCREEN_CONFIG } from '../../controllers/tabsController';

const tabOptions: Record<string, any> = buildTabOptions({
  Feather,
  MaterialIcons,
});

export default function TabLayout() {
  return (
    <Tabs screenOptions={TabsLayoutScreenOptions}>
      {TAB_SCREEN_CONFIG.map((screen) => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={tabOptions[screen.name]}
        />
      ))}
      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="meal-ai" options={{ href: null }} />
    </Tabs>
  );
}
