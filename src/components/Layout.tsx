import React from 'react';
import { View, StyleSheet } from 'react-native';
import Navbar from './Navbar';
import { COLORS, SIZES } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  const insets = useSafeAreaInsets(); // Safe area değerlerini alıyoruz

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Navbar />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: SIZES.padding,
      paddingTop: 0, // üst boşluk verme, zaten insets.top veriliyor
    },
  });