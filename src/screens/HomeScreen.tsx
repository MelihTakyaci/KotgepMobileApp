import React from 'react';
import { FlatList, Image, StyleSheet, View } from 'react-native';
import Layout from '../components/Layout';

const sampleData = [
    { id: '8', image: require('../assets/Dergi-Sayi-8.png') },
    { id: '7', image: require('../assets/Dergi-Sayi-7.png') },
    { id: '6', image: require('../assets/Dergi-Sayi-6.png') },
    { id: '5', image: require('../assets/Dergi-Sayi-5.png') },
    { id: '4', image: require('../assets/Dergi-Sayi-4.webp') },
    { id: '3', image: require('../assets/Dergi-Sayi-3.png') },
    { id: '2', image: require('../assets/Dergi-Sayi-2.png') },
    { id: '1', image: require('../assets/Dergi-Sayi-1.png') },
];

export default function HomeScreen() {
  const renderItem = ({ item }: { item: { id: string, image: any } }) => (
    <View style={styles.card}>
      <Image source={item.image} style={styles.image} />
    </View>
  );

  return (
    <Layout>
      <FlatList
        data={sampleData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 10,
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2, // Android gölge
    shadowColor: '#000', // iOS gölge
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  image: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
});