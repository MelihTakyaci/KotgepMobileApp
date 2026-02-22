import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import {
  downloadPdf,
  deletePdf,
  findExistingPdfUri,
  getLocalPdfPath,
} from '../hooks/useDownloadedMagazines';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme/theme';
import { IMAGE_STORAGE_URL, PDF_STORAGE_URL } from '../config/constants';

type MagazineIssue = {
  id: number;
  pdf_path: string;
  month: string;
  issue_number: number;
};

const BASE_IMAGE_URL = IMAGE_STORAGE_URL;
const BASE_PDF_URL = PDF_STORAGE_URL;

const buildRemoteUrl = (pdfPath: string) =>
  /^https?:\/\//i.test(pdfPath) ? pdfPath : `${BASE_PDF_URL}${pdfPath}`;

export default function LibraryScreen() {
  const [magazines, setMagazines] = useState<MagazineIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);
  const [downloadedUris, setDownloadedUris] = useState<Record<string, string>>({});
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(320, width - SIZES.padding * 2);
  // Minimum 2 columns for phones; 3+ for tablets/large screens
  // Breakpoints: >=1200 -> 4, >=900 -> 3, otherwise 2
  const responsiveNumColumns = width >= 1200 ? 4 : width >= 900 ? 3 : 2;
  const cardGapLocal = 16;
  const computedCardWidth = Math.floor((contentWidth - cardGapLocal * (responsiveNumColumns - 1)) / responsiveNumColumns);
  const offlineCount = useMemo(() => Object.keys(downloadedUris).length, [downloadedUris]);
  const latestIssue = magazines[0];

  const refreshDownloadStatuses = useCallback(async (issues: MagazineIssue[]) => {
    if (!issues.length) {
      setDownloadedUris({});
      return;
    }

    const checks = await Promise.all(
      issues.map(async (issue) => {
        try {
          const hit = await findExistingPdfUri(issue.pdf_path);
          return hit ? ([issue.pdf_path, hit.uri] as const) : null;
        } catch {
          return null;
        }
      })
    );

    const next: Record<string, string> = {};
    checks.forEach((entry) => {
      if (entry) {
        const [key, uri] = entry;
        next[key] = uri;
      }
    });

    setDownloadedUris(next);
  }, []);

  useEffect(() => {
    const fetchMagazines = async () => {
      const { data, error } = await supabase
        .from('magazine_issues')
        .select('id, pdf_path, month, issue_number')
        .order('id', { ascending: false });

      if (error) {
        // fetch failed — UI shows empty state
      } else {
        const list = data ?? [];
        setMagazines(list);
        try {
          await refreshDownloadStatuses(list);
        } catch {
          // download status refresh failed — non-critical
        }
      }

      setLoading(false);
    };

    fetchMagazines();
  }, [refreshDownloadStatuses]);

  useEffect(() => {
    if (!magazines.length) {
      setDownloadedUris({});
      return;
    }

    refreshDownloadStatuses(magazines).catch(() => {});
  }, [magazines, refreshDownloadStatuses]);

  const handleCardPress = useCallback(async (item: MagazineIssue) => {
    const existing = await findExistingPdfUri(item.pdf_path);
    const isDownloaded = !!existing;
    const isDownloading = downloadingIds.includes(item.id);
    if (isDownloading) return;

    const remoteUrl = buildRemoteUrl(item.pdf_path);

    Alert.alert(
      `Sayı ${item.issue_number} - ${item.month}`,
      'Ne yapmak istiyorsunuz?',
      [
        isDownloaded
          ? {
              text: 'Oku',
              onPress: () =>
                navigation.navigate('LibraryTab', {
                  screen: 'PdfReader',
                  params: {
                    mode: 'offline',
                    uri: existing?.uri ?? getLocalPdfPath(item.pdf_path),
                    storageKey: item.pdf_path,
                  },
                }),
            }
          : {
              text: 'Online Oku',
              onPress: () =>
                navigation.navigate('LibraryTab', {
                  screen: 'PdfReader',
                  params: { mode: 'online', uri: remoteUrl, storageKey: item.pdf_path },
                }),
            },
        isDownloaded
          ? {
              text: 'Sil',
              onPress: async () => {
                await deletePdf(item.pdf_path);
                try {
                  await refreshDownloadStatuses(magazines);
                } catch {
                  // non-critical refresh failure
                }
              },
            }
          : {
              text: 'İndir',
              onPress: async () => {
                setDownloadingIds((prev) => [...prev, item.id]);
                try {
                  await downloadPdf(item.pdf_path, remoteUrl);
                  Alert.alert('İndirme tamamlandı', 'Dergi başarıyla indirildi.');
                  await refreshDownloadStatuses(magazines);
                } catch {
                  Alert.alert('Hata', 'PDF indirilirken bir sorun oluştu.');
                } finally {
                  setDownloadingIds((prev) => prev.filter((id) => id !== item.id));
                }
              },
            },
        { text: 'İptal', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [navigation, magazines, downloadedUris, refreshDownloadStatuses]);

  const renderItem = useCallback(({ item }: { item: MagazineIssue }) => {
    const isDownloading = downloadingIds.includes(item.id);
    const isDownloaded = Boolean(downloadedUris[item.pdf_path]);
    const isNewest = latestIssue?.id === item.id;
    const coverSource = { uri: `${BASE_IMAGE_URL}Dergi-Sayi-${item.id}.png` };

    const badgeContent = () => {
      if (isDownloading) {
        return (
          <View style={[styles.badge, styles.badgeNeutral]}>
            <ActivityIndicator size="small" color="#F8FAFC" style={styles.badgeSpinner} />
            <Text style={styles.badgeText}>İndiriliyor</Text>
          </View>
        );
      }

      if (isDownloaded) {
        return (
          <View style={[styles.badge, styles.badgeSuccess]}>
            <MaterialCommunityIcons name="check-circle" size={14} color="#22C55E" />
            <Text style={[styles.badgeText, styles.badgeTextSuccess]}>Çevrimdışı</Text>
          </View>
        );
      }

      if (isNewest) {
        return (
          <View style={[styles.badge, styles.badgeHighlight]}>
            <MaterialCommunityIcons name="star" size={14} color="#FACC15" />
            <Text style={[styles.badgeText, styles.badgeTextHighlight]}>Yeni</Text>
          </View>
        );
      }

      return <View style={styles.badgePlaceholder} />;
    };

    return (
      <TouchableOpacity
        style={[styles.card, { width: computedCardWidth }, isDownloading && styles.cardDisabled]}
        onPress={() => handleCardPress(item)}
        disabled={isDownloading}
        activeOpacity={0.92}
      >
        <ImageBackground
          source={coverSource}
          style={[styles.cardImage, { height: Math.round(computedCardWidth * 1.4) }]}
          imageStyle={styles.cardImageRadius}
          defaultSource={require('../assets/placeholder.png')}
        >
          <View style={styles.cardOverlay}>
            <View style={styles.cardTopRow}>
              {badgeContent()}
              <MaterialCommunityIcons name="dots-horizontal" size={18} color="rgba(248,250,252,0.7)" />
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.cardTitle} numberOfLines={2}>{`Sayı ${item.issue_number}`}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {isDownloading ? 'İndiriliyor…' : item.month}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  }, [downloadingIds, downloadedUris, latestIssue, computedCardWidth, handleCardPress]);

  if (loading) {
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
        data={magazines}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={responsiveNumColumns}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={responsiveNumColumns > 1 ? styles.row : undefined}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.brandBanner}>
              <View style={styles.brandBannerHalo} />
              <View style={styles.brandBannerHaloSecondary} />
              <View style={styles.brandBannerContent}>
                <View style={styles.brandBannerBadge}>
                  <MaterialCommunityIcons name="feather" size={14} color="#1D4ED8" />
                  <Text style={styles.brandBannerBadgeText}>KOTGEP</Text>
                </View>
                <Image
                  source={require('../assets/genckalemler.png')}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
                <Text style={styles.brandBannerTitle}>Genç Kalemler</Text>
                <Text style={styles.brandBannerTagline}>Genç fikirler, tek dokunuş uzağınızda.</Text>
                {offlineCount > 0 && (
                  <View style={styles.brandBannerPill}>
                    <MaterialCommunityIcons name="download" size={16} color="#1F2937" />
                    <Text style={styles.brandBannerPillText}>{`${offlineCount} çevrimdışı`}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.screenTitle}>Tüm Dergiler</Text>
            <Text style={styles.screenSubtitle}>
              Genç yazarların her sayısı, tek yerden erişilebilir.
            </Text>
            {latestIssue && (
              <TouchableOpacity
                style={styles.latestCard}
                onPress={() => void handleCardPress(latestIssue)}
                activeOpacity={0.88}
              >
                <View style={styles.latestIconWrap}>
                  <MaterialCommunityIcons
                    name="bookmark-multiple-outline"
                    size={22}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.latestTextBlock}>
                  <Text style={styles.latestLabel}>Son Sayı</Text>
                  <Text style={styles.latestValue}>{`Sayı ${latestIssue.issue_number}`}</Text>
                  <Text style={styles.latestMeta}>{latestIssue.month}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={<View style={styles.footerSpacer} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-search-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>Hiç dergi bulunamadı</Text>
            <Text style={styles.emptySubtitle}>
              Yeni sayılar yüklendiğinde burada göreceksiniz.
            </Text>
          </View>
        }
      />
    </Layout>
  );
}

const screenWidth = Dimensions.get('window').width;
const contentWidth = screenWidth - SIZES.padding * 2;
const cardGap = 16;
const cardWidth = (contentWidth - cardGap) / 2;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 96,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  listHeader: {
    marginBottom: 24,
  },
  brandBanner: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 26,
    marginBottom: 24,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    shadowColor: 'rgba(15,23,42,0.1)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
    position: 'relative',
  },
  brandBannerHalo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#E2E8F0',
    top: -120,
    right: -80,
    opacity: 0.5,
  },
  brandBannerHaloSecondary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#CBD5F5',
    bottom: -80,
    left: -60,
    opacity: 0.35,
  },
  brandBannerContent: {
    alignItems: 'center',
  },
  brandBannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 999,
  },
  brandBannerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  brandLogo: {
    width: '100%',
    height: 120,
  },
  brandBannerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  brandBannerTagline: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
  },
  brandBannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(107,114,128,0.1)',
    gap: 6,
  },
  brandBannerPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  screenSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.muted,
  },
  latestCard: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  latestIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  latestTextBlock: {
    flex: 1,
  },
  latestLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    letterSpacing: 0.2,
  },
  latestValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  latestMeta: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  card: {
    width: cardWidth,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
    marginBottom: 20,
  },
  cardDisabled: {
    opacity: 0.65,
  },
  cardImage: {
    width: '100%',
    height: cardWidth * 1.4,
    justifyContent: 'flex-end',
  },
  cardImageRadius: {
    borderRadius: 20,
  },
  cardOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(15,23,42,0.42)',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: {
    marginTop: 18,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    lineHeight: 22,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(248,250,252,0.7)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeNeutral: {
    backgroundColor: 'rgba(148,163,184,0.25)',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(34,197,94,0.18)',
  },
  badgeHighlight: {
    backgroundColor: 'rgba(250,204,21,0.18)',
  },
  badgeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  badgeTextSuccess: {
    color: '#22C55E',
  },
  badgeTextHighlight: {
    color: '#FACC15',
  },
  badgePlaceholder: {
    width: 92,
    height: 28,
  },
  badgeSpinner: {
    marginRight: 6,
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
    marginTop: 16,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerSpacer: {
    height: 48,
  },
});