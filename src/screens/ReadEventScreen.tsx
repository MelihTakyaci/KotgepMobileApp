import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, Dimensions } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';

export default function ReadEventScreen() {
  const route = useRoute();
  const { eventId } = route.params;

  const [haber, setHaber] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Event detayları
      const { data: haberData, error: haberError } = await supabase
        .from('event_details')
        .select('*')
        .eq('event_id', eventId)
        .limit(1)
        .maybeSingle();

      if (haberError) {
        console.error('Haber fetch error:', haberError.message);
      } else {
        setHaber(haberData);
      }

      // Event resimleri
      const { data: imageData, error: imageError } = await supabase
        .from('event_images')
        .select('*')
        .eq('event_id', eventId);

      if (imageError) {
        console.error('Image fetch error:', imageError.message);
      } else {
        console.log("Gelen görseller:", imageData);
        setImages(imageData);
      }

      setLoading(false);
    };

    fetchData();
  }, [eventId]);

  if (loading) {
    return (
      <Layout>
        <ActivityIndicator size="large" color="#2196F3" />
      </Layout>
    );
  }

  if (!haber) {
    return (
      <Layout>
        <Text style={styles.errorText}>Haber bulunamadı.</Text>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Etkinlik Detayları</Text>

        {/* Görseller */}
        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageGallery}>
            {images.map((img, index) => (
              <Image key={index} source={{ uri: img.image_url }} style={styles.image} />
            ))}
          </ScrollView>
        )}

        {/* Açıklama paragrafları */}
        {haber.description1 && <Text style={styles.content}>{haber.description1}</Text>}
        {haber.description2 && <Text style={styles.content}>{haber.description2}</Text>}
        {haber.description3 && <Text style={styles.content}>{haber.description3}</Text>}
      </ScrollView>
    </Layout>
  );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 12,
  },
  imageGallery: {
    marginBottom: 16,
  },
  image: {
    width: screenWidth * 0.8,
    height: 200,
    borderRadius: 10,
    marginRight: 10,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: 'red',
  },
});