import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleGLogo } from '@/components/google-g-logo';

export function GoogleButton({
  onPress,
  loading = false,
  disabled = false,
}: {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [styles.btn, { opacity: isDisabled ? 0.6 : pressed ? 0.9 : 1 }]}>
      <View style={styles.icon}>
        {loading ? <ActivityIndicator size="small" color="#4285F4" /> : <GoogleGLogo size={20} />}
      </View>
      <Text style={styles.label}>{loading ? 'Signing in…' : 'Continue with Google'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dadce0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  icon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#3c4043',
    fontSize: 16,
    fontWeight: '500',
  },
});
