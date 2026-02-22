import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../components/Layout';
import WeatherHeader from '../components/WeatherHeader';
import { supabase } from '../services/supabase';
import { COLORS, SIZES } from '../theme/theme';

type EventItem = {
  id: number;
  title: string;
  cover_image: string;
};

export default function EventScreen() {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  // Minimum 2 columns for phones; 3+ for tablets/large screens
  // Breakpoints: >=1200 -> 4, >=900 -> 3, otherwise 2
  const responsiveNumColumns = width >= 1200 ? 4 : width >= 900 ? 3 : 2;
  const itemGap = 16;
  const itemWidth = Math.floor((width - SIZES.padding * 2 - itemGap * (responsiveNumColumns - 1)) / responsiveNumColumns);
  const itemHeight = Math.max(160, Math.round(itemWidth * 0.7));

  const fetchEvents = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }

    const { data, error } = await supabase
      .from('events')
      .select('id, title, cover_image')
      .order('id', { ascending: false });

    if (!error && data) {
      setEvents(data as EventItem[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents({ silent: true });
  };

  const handleEventPress = useCallback((eventId: number) => {
    navigation.navigate('HaberOku', { eventId });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: EventItem }) => (
    <TouchableOpacity
      style={[styles.card, { width: itemWidth, height: itemHeight }]}
      activeOpacity={0.9}
      onPress={() => handleEventPress(item.id)}
    >
      <ImageBackground
        source={{ uri: item.cover_image }}
        style={[styles.cardImage, { height: itemHeight }]}
        imageStyle={styles.cardImageRadius}
        defaultSource={require('../assets/placeholder.png')}
      >
        <View style={styles.cardOverlay} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={3}>
            {item.title}
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  ), [itemWidth, itemHeight, handleEventPress]);

  if (loading && !events.length) {
    return (
      <Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <FlatList
        key={responsiveNumColumns}
        data={events}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={responsiveNumColumns}
        columnWrapperStyle={responsiveNumColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <WeatherHeader initialCity="Prizren" />
          </View>
        }
  ListFooterComponent={<View style={styles.footerSpacer} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Gösterilecek içerik yok</Text>
            <Text style={styles.emptySubtitle}>
              Yeni haberler yüklendiğinde burada görünecek.
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 24,
  },
  listContent: {
    paddingVertical: 24,
    paddingBottom: 32,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  card: {
    height: 210,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  cardImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardImageRadius: {
    borderRadius: SIZES.radius,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SIZES.padding,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  footerSpacer: {
    height: 24,
  },
});