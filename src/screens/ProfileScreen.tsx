import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Layout from '../components/Layout';

export default function ProfileScreen() {
  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.text}>Profil Ekranı</Text>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
  },
});