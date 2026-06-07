import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

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
      {loading ? (
        <ActivityIndicator color="#4285F4" />
      ) : (
        <>
          <GoogleGLogo size={20} />
          <Text style={styles.label}>Continue with Google</Text>
        </>
      )}
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
  label: {
    color: '#3c4043',
    fontSize: 16,
    fontWeight: '500',
  },
});
