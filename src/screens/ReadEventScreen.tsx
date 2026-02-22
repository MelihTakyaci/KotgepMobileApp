import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { Ionicons } from '@expo/vector-icons';

export default function ReadEventScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { eventId } = route.params;

  const [haber, setHaber] = useState<any | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const { width } = useWindowDimensions();
  const imageWidth = Math.min(1100, Math.round(width * 0.9));
  const [imageSizes, setImageSizes] = useState<Record<string, { w: number; h: number }>>({});
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

      if (!haberError) {
        setHaber(haberData);
      }

      // Event resimleri
      const { data: imageData, error: imageError } = await supabase
        .from('event_images')
        .select('*')
        .eq('event_id', eventId);

      if (!imageError) {
        setImages(imageData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [eventId]);

  // Measure remote image intrinsic sizes so we can render them responsively
  useEffect(() => {
    if (!images || !images.length) return;
    images.forEach((img) => {
      const uri = img?.image_url;
      if (!uri || imageSizes[uri]) return;
      Image.getSize(
        uri,
        (w, h) => setImageSizes((s) => ({ ...s, [uri]: { w, h } })),
        () => {
          // ignore errors - keep fallback
        }
      );
    });
  }, [images]);

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
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text style={styles.backButtonText}>Geri</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Etkinlik Detayları</Text>

        {/* Görseller */}
        {images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageGallery}
            contentContainerStyle={{ paddingHorizontal: 8, alignItems: 'center' }}
          >
            {images.map((img, index) => {
              const uri = img.image_url;
              const intrinsic = uri ? imageSizes[uri] : undefined;
              const height = intrinsic ? Math.round((intrinsic.h / intrinsic.w) * imageWidth) : Math.round(imageWidth * 9 / 16);
              const clampedHeight = Math.max(120, Math.min(900, height));
              return (
                <Image
                  key={index}
                  source={{ uri }}
                  style={[styles.image, { width: imageWidth, height: clampedHeight }]}
                  resizeMode="cover"
                />
              );
            })}
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

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 8,
    fontWeight: '600',
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