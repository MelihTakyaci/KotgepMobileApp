// HomeScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../components/Layout';
import { RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { fetchLatestMagazine } from '../services/fetchLatestMagazine';
import fetchAnnouncements from '../services/fetchAnnouncements';
import WeatherHeader from '../components/WeatherHeader';
import { COLORS, SIZES } from '../theme/theme';
import { IMAGE_STORAGE_URL, PDF_STORAGE_URL } from '../config/constants';

// ─── Module-level helpers & sub-components ───────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  duyuru: 'bullhorn',
  etkinlik: 'calendar',
  onemli: 'alert-circle',
};

const buildImageUrl = (path?: string) =>
  path && /^https?:\/\//i.test(path) ? path : `${IMAGE_STORAGE_URL}${path}`;

const buildRemoteUrl = (pdfPath?: string) =>
  pdfPath && /^https?:\/\//i.test(pdfPath) ? pdfPath : `${PDF_STORAGE_URL}${pdfPath}`;

// Extracted to module scope so it is never re-created on HomeScreen re-renders.
// Keeping it here prevents React from unmounting/remounting every AnnouncementImage
// on each parent render (which would also lose the `failed` state).
const AnnouncementImage: React.FC<{ uri?: string; style?: any; type?: string }> = ({ uri, style, type }) => {
  const [failed, setFailed] = useState(false);
  const typeKey = (type || '').toLowerCase();
  const iconName = TYPE_ICONS[typeKey] ?? 'image-off';

  if (!uri || failed) {
    return (
      <View style={[styles.announcementImagePlaceholder, style || {}]}>
        <View style={styles.announcementIconWrap}>
          <MaterialCommunityIcons name={iconName as any} size={28} color={COLORS.muted} />
        </View>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: buildImageUrl(uri) }}
      style={[styles.announcementImage, style || {}]}
      onError={() => setFailed(true)}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────

// Home hub UI: hero, announcements, events, programs, magazine highlight, optional weather

type Announcement = {
  id: number;
  title: string;
  type?: string; // "New" | "Event" | "Announcement" (mapped from announcement_type)
  image_url?: string;
  content?: string;
  is_published?: boolean;
  created_at?: string;
};

type EventPhoto = { id: number; src?: string; title?: string };

type Magazine = { id: number; issue_number?: number; month?: string; pdf_path?: string };

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const responsiveAnnouncementWidth = Math.max(260, Math.round(width * 0.68));
  const heroLogoSize = Math.min(120, Math.round(width * 0.18));
  const magCoverWidth = Math.min(160, Math.round(width * 0.28));
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [eventsPhotos, setEventsPhotos] = useState<EventPhoto[]>([]);
  const [latestMagazine, setLatestMagazine] = useState<Magazine | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Announcements: use shared service for clarity and reuse
      try {
        const annData = await fetchAnnouncements(8);
        setAnnouncements(
          annData.map((a) => ({
            id: a.id,
            title: a.title,
            type: a.announcement_type,
            image_url: a.image_url,
            content: a.content,
            is_published: a.is_published,
            created_at: a.created_at,
          }))
        );
      } catch (e) {
        setAnnouncements([]);
      }

      // Events: try 'events' table (cover image + id + title) or fallback to event_photos
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, cover_image, title')
        .order('id', { ascending: false })
        .limit(12);
      if (eventsData && eventsData.length) {
        setEventsPhotos((eventsData as any[]).map((p) => ({ id: p.id, src: p.cover_image, title: p.title })));
      } else {
        // fallback to older event_photos table
        const { data: photosData } = await supabase
          .from('event_photos')
          .select('id, src')
          .order('id', { ascending: false })
          .limit(12);
        if (photosData) {
          setEventsPhotos((photosData as any[]).map((p) => ({ id: p.id, src: p.src })));
        } else {
          setEventsPhotos([
            { id: 1, src: undefined },
            { id: 2, src: undefined },
            { id: 3, src: undefined },
          ]);
        }
      }

      // Latest magazine: use service helper to centralize logic
      try {
        const mag = await fetchLatestMagazine();
        if (mag) setLatestMagazine(mag as Magazine);
      } catch (e) {
        // magazine unavailable — UI shows fallback
      }
    } catch (err) {
      // network error — UI shows empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };


  const goToLibraryRead = () => {
    if (latestMagazine && latestMagazine.pdf_path) {
      const remote = buildRemoteUrl(latestMagazine.pdf_path);
      navigation.navigate('LibraryTab', {
        screen: 'PdfReader',
        params: { mode: 'online', uri: remote, storageKey: latestMagazine.pdf_path },
      });
      return;
    }
    // fallback: just switch to the Library tab
    navigation.navigate('LibraryTab');
  };

  /**
   * Open the Library stack focused on the "Genç Kalemler" archive/section.
   * Passing a `section` param lets the Library screen optionally filter or highlight
   * the requested collection. The Library stack must handle `route.params.section`.
   */
  const goToLibraryArchive = (section = 'genc_kalemler') => {
    navigation.navigate('LibraryTab', {
      screen: 'Library',
      params: { section },
    });
  };

  const renderAnnouncement = useCallback(({ item }: { item: Announcement }) => (
    <TouchableOpacity
      style={[styles.announcementCard, { width: responsiveAnnouncementWidth }]}
      activeOpacity={0.88}
      onPress={() => navigation.navigate('AnnouncementDetail', { ...item })}
    >
      <View style={styles.announcementImagePlaceholder}>
        <AnnouncementImage uri={item.image_url} type={item.type} />
      </View>
      <View style={styles.announcementBody}>
        <Text numberOfLines={2} style={styles.announcementTitle}>{item.title}</Text>
        {item.type && (
          <View style={[styles.badge, styles.badgeSmall]}>
            <Text style={styles.badgeTextSmall}>
              {item.type?.toLowerCase() === 'duyuru'
                ? 'Duyuru'
                : item.type?.toLowerCase() === 'etkinlik'
                ? 'Etkinlik'
                : item.type?.toLowerCase() === 'onemli'
                ? 'Önemli'
                : item.type}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), [responsiveAnnouncementWidth, navigation]);

  const renderEventItem = useCallback(({ item }: { item: EventPhoto }) => (
    <TouchableOpacity
      style={styles.eventPhotoCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('NewsTab', { screen: 'HaberOku', params: { eventId: item.id } })}
    >
      {item.src ? (
        <Image source={{ uri: item.src }} style={styles.eventPhoto} />
      ) : (
        <View style={styles.eventPlaceholder} />
      )}
    </TouchableOpacity>
  ), [navigation]);

  return (
    <Layout>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      {/* Hero / intro */}
      <View style={styles.hero}>
        <View style={styles.heroInner}>
          <Image source={require('../assets/genckalemler.png')} style={[styles.heroLogo, { width: heroLogoSize, height: heroLogoSize }]} resizeMode="contain" />
          <Text style={styles.heroTitle}>KOTGEP — Genç Kalemler</Text>
          <Text style={styles.heroSubtitle}>Kosova’da yaşayan Türk gençlerinin eğitim, kültür ve sosyal becerilerini geliştirerek topluma aktif katkı sağlamalarına destek olan dinamik bir gençlik platformu.</Text>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => goToLibraryArchive()}>
              <Text style={styles.primaryButtonText}>Dergiyi Oku</Text>
            </TouchableOpacity>
              <TouchableOpacity style={styles.ghostButton} onPress={() => navigation.navigate('NewsTab')}> 
              <Text style={styles.ghostButtonText}>Haberler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Announcements */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Duyurular</Text>
          <TouchableOpacity onPress={() => navigation.navigate('NewsTab')}>
            <Text style={styles.sectionAction}>Tümü</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator size="small" />
        ) : announcements && announcements.length ? (
          <FlatList
            data={announcements}
            renderItem={renderAnnouncement}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i) => i.id.toString()}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            contentContainerStyle={{ paddingVertical: 8 }}
            removeClippedSubviews
          />
        ) : (
          <View style={{ paddingVertical: 18, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280' }}>Henüz gösterilecek duyuru yok.</Text>
          </View>
        )}
      </View>

      {/* Event gallery */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Etkinlikler</Text>
          <TouchableOpacity onPress={() => navigation.navigate('NewsTab')}>
            <Text style={styles.sectionAction}>Tümü</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={eventsPhotos}
          renderItem={renderEventItem}
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(i) => i.id.toString()}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          contentContainerStyle={{ paddingVertical: 8 }}
          removeClippedSubviews
        />
      </View>

      {/* Our Mission - Misyonumuz */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Misyonumuz</Text>
        </View>
        <View style={styles.missionCard}>
          <View style={styles.missionIconContainer}>
            <MaterialCommunityIcons name="flag" size={32} color="#C60000" />
          </View>
          <View style={styles.missionContent}>
            <Text style={styles.missionText}>
              Kosova'da yaşayan Türk gençlerinin eğitim, kültür ve sosyal becerilerini geliştirerek 
              topluma aktif katkı sağlamalarına destek olan dinamik bir gençlik platformuyuz.
            </Text>
            <View style={styles.missionPoints}>
              <View style={styles.missionPoint}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#22C55E" />
                <Text style={styles.missionPointText}>Eğitim ve Kültür</Text>
              </View>
              <View style={styles.missionPoint}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#22C55E" />
                <Text style={styles.missionPointText}>Sosyal Gelişim</Text>
              </View>
              <View style={styles.missionPoint}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#22C55E" />
                <Text style={styles.missionPointText}>Toplumsal Katılım</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Magazine highlight */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Genç Kalemler</Text>
          <TouchableOpacity onPress={() => goToLibraryArchive()}>
            <Text style={styles.sectionAction}>Arşiv</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.magazineHighlight}>
            {loading ? (
            <ActivityIndicator size="small" />
          ) : latestMagazine ? (
            <>
              {latestMagazine ? (
                <Image
                  source={{ uri: buildImageUrl(`Dergi-Sayi-${latestMagazine.id}.png`) }}
                  style={[styles.magCoverPlaceholder, { width: magCoverWidth, height: Math.round(magCoverWidth * 1.36) }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.magCoverPlaceholder, { width: magCoverWidth, height: Math.round(magCoverWidth * 1.36) }]} />
              )}
              <View style={styles.magMeta}>
                <Text style={styles.magLabel}>Son Sayı</Text>
                <Text style={styles.magTitle}>{`Sayı ${latestMagazine.issue_number ?? ''} — ${latestMagazine.month ?? ''}`}</Text>
                <TouchableOpacity style={styles.readNowButton} onPress={goToLibraryRead}>
                  <Text style={styles.readNowText}>Oku</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={{ color: '#6B7280' }}>Son sayı bulunamadı.</Text>
          )}
        </View>
      </View>

      {/* Optional: weather widget (uses WeatherHeader component with city picker) */}
      <View style={[styles.section, { marginBottom: 80 }]}> 
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hava Durumu</Text>
        </View>
        <WeatherHeader initialCity="Prizren" />
      </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingTop: SIZES.padding, paddingBottom: 40 },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 18,
    shadowColor: 'rgba(2,6,23,0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
    overflow: 'hidden',
  },
  heroInner: {
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#F8FAFC',
  },
  heroLogo: {
    width: 84,
    height: 84,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  heroSubtitle: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  heroActions: { flexDirection: 'row', gap: 10 },
  primaryButton: {
    backgroundColor: '#C60000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 8,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  ghostButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  ghostButtonText: { color: '#111827', fontWeight: '700' },

  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionAction: { color: '#6B7280', fontWeight: '600' },

  // Announcements
  announcementCard: {
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: 'rgba(2,6,23,0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  announcementImagePlaceholder: { height: 120, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  announcementImage: { width: '100%', height: '100%' },
  announcementIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  announcementBody: { padding: 12 },
  announcementTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeSmall: { backgroundColor: '#FEF3F2', marginTop: 6, alignSelf: 'flex-start' },
  badgeTextSmall: { color: '#C60000', fontWeight: '700', fontSize: 12 },

  // Events
  eventPhotoCard: { width: 120, height: 86, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  eventPhoto: { width: '100%', height: '100%' },
  eventPlaceholder: { flex: 1, backgroundColor: '#E5E7EB' },

  // Mission
  missionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    shadowColor: 'rgba(2,6,23,0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  missionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  missionContent: {
    gap: 16,
  },
  missionText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    fontWeight: '500',
  },
  missionPoints: {
    gap: 12,
  },
  missionPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  missionPointText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },

  // Magazine
  magazineHighlight: { backgroundColor: '#fff', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center', shadowColor: 'rgba(2,6,23,0.04)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 14, elevation: 2 },
  magCoverPlaceholder: { width: 110, height: 150, backgroundColor: '#F3F4F6', borderRadius: 8 },
  magMeta: { flex: 1 },
  magLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 6 },
  magTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 10 },
  readNowButton: { backgroundColor: '#C60000', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  readNowText: { color: '#fff', fontWeight: '700' },

  // Weather
  weatherCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: 'rgba(2,6,23,0.04)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 14, elevation: 1 },
  weatherLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherTemp: { fontSize: 22, fontWeight: '800', color: '#111827' },
  weatherCity: { color: '#6B7280', fontSize: 13 },
  weatherRight: { alignItems: 'flex-end' },
  weatherDesc: { color: '#6B7280' },
});