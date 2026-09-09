import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '@/components/ui/tab-bar-icon';
import { useTheme } from '@/hooks/use-theme';

const ACTIVE = '#3987e5';
const INACTIVE = '#9aa0ab';

function tabLabel(title: string) {
  function TabLabel({ focused, color }: { focused: boolean; color: string }) {
    return (
      <Text
        style={{
          fontSize: 10,
          color,
          fontFamily: focused ? 'Manrope_600SemiBold' : 'Manrope_500Medium',
        }}>
        {title}
      </Text>
    );
  }
  return TabLabel;
}

export default function TabsLayout() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
          height: 60 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: tabLabel('Home'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="home" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          title: 'Books',
          tabBarLabel: tabLabel('Books'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="albums" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarLabel: tabLabel('Insights'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="pie-chart" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: tabLabel('Settings'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="settings-sharp" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
