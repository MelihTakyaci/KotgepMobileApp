import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
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

type MagazineIssue = {
  id: number;
  pdf_path: string;
  month: string;
  issue_number: number;
};

const BASE_IMAGE_URL =
  'https://jjygunxzboqsruwyenay.supabase.co/storage/v1/object/public/kotgepfiles/DergiKapak/';
const BASE_PDF_URL =
  'https://jjygunxzboqsruwyenay.supabase.co/storage/v1/object/public/kotgepfiles/Dergi/';

const buildRemoteUrl = (pdfPath: string) =>
  /^https?:\/\//i.test(pdfPath) ? pdfPath : `${BASE_PDF_URL}${pdfPath}`;

export default function LibraryScreen() {
  const [magazines, setMagazines] = useState<MagazineIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);
  const [downloadedUris, setDownloadedUris] = useState<Record<string, string>>({});
  const navigation = useNavigation<any>();

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
        } catch (error) {
          console.log('PDF konumu güncellenemedi:', error);
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
        console.error('Dergi verisi çekilemedi:', error.message);
      } else {
        const list = data ?? [];
        setMagazines(list);
        try {
          await refreshDownloadStatuses(list);
        } catch (statusError) {
          console.log('İndirilen dergiler güncellenemedi:', statusError);
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

    refreshDownloadStatuses(magazines).catch((statusError) =>
      console.log('Dergi listesi değişti, durum yenilenemedi:', statusError)
    );
  }, [magazines, refreshDownloadStatuses]);

  const handleCardPress = async (item: MagazineIssue) => {
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
                navigation.navigate('Ana Sayfa', {
                  screen: 'AnaSayfaAna',
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
                navigation.navigate('Ana Sayfa', {
                  screen: 'AnaSayfaAna',
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
                } catch (statusError) {
                  console.log('Silme sonrası indirme durumu güncellenemedi:', statusError);
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
                } catch (err) {
                  console.error('İndirme başarısız:', err);
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
  };

  const renderItem = ({ item }: { item: MagazineIssue }) => {
    const isDownloading = downloadingIds.includes(item.id);
    const isDownloaded = Boolean(downloadedUris[item.pdf_path]);

    return (
      <TouchableOpacity
        style={[
          styles.magazineCard,
          isDownloading && styles.downloadingCard,
          isDownloaded && styles.downloadedCard,
        ]}
        onPress={() => handleCardPress(item)}
        disabled={isDownloading}
      >
        <Image
          source={{ uri: `${BASE_IMAGE_URL}Dergi-Sayi-${item.id}.png` }}
          style={styles.coverImage}
          resizeMode="cover"
        />
        <Text style={styles.issueText}>
          {isDownloading
            ? 'İndiriliyor...'
            : `Sayı ${item.issue_number} - ${item.month}`}
        </Text>
        {isDownloaded && !isDownloading && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Çevrimdışı hazır</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <Layout>
        <ActivityIndicator size="large" color="#2196F3" />
      </Layout>
    );
  }

  return (
    <Layout>
      <Text style={styles.title}>Tüm Dergiler</Text>
      <FlatList
        data={magazines}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </Layout>
  );
}

const screenWidth = Dimensions.get('window').width;
const itemWidth = screenWidth / 2 - 24;

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 60,
  },
  row: {
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 16,
    textAlign: 'center',
  },
  magazineCard: {
    width: itemWidth,
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    padding: 4,
    margin: 5,
    alignItems: 'center',
  },
  downloadingCard: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  downloadedCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  coverImage: {
    width: '100%',
    height: itemWidth * 1.3,
    borderRadius: 8,
    marginBottom: 8,
  },
  issueText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    textAlign: 'center',
  },
  badge: {
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});