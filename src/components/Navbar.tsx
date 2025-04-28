import React from 'react';
import { View, Text, Image, StyleSheet, TextInput } from 'react-native';
import { COLORS, SIZES } from '../theme/theme';

export default function Navbar() {
  return (
    <View style={styles.navbar}>
      {/* Sol taraf: Logo ve Yazı */}
      <View style={styles.leftContainer}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>KOTGEP</Text>
      </View>

      {/* Sağ taraf: Arama Kutusu */}
      <TextInput
        style={styles.searchInput}
        placeholder="Ara..."
        placeholderTextColor="#999"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    height: 70,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  searchInput: {
    height: 36,
    width: 140,
    borderBottomColor: '#f0f0f0',
    borderBottomWidth:1,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
  },
});