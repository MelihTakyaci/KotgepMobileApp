import React, { useState, useEffect } from 'react';
import { FlatList, Image, StyleSheet, View, TouchableOpacity, Text, Modal, Alert, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Layout from '../components/Layout';
import * as FileSystem from 'expo-file-system';

const sampleData = [
  { id: '8', image: require('../assets/Dergi-Sayi-8.png'), 
    pdfUrl: 'https://kotgep.com/dergi/Dergi-Sayi-8.pdf' },
  { id: '7', image: require('../assets/Dergi-Sayi-7.png'), 
    pdfUrl: 'https://kotgep.com/dergi/Dergi-Sayi-7.pdf' },
  { id: '6', image: require('../assets/Dergi-Sayi-6.png'), 
    pdfUrl: 'https://kotgep.com/dergi/Dergi-Sayi-6.pdf' },
  { id: '5', image: require('../assets/Dergi-Sayi-5.png'), 
    pdfUrl: 'https://kotgep.com/dergi/Dergi-Sayi-5.pdf' },
  { id: '4', image: require('../assets/Dergi-Sayi-4.webp'), 
    pdfUrl: 'https://kotgep.com/dergi/Dergi-Sayi-4.pdf' },
  { id: '3', image: require('../assets/Dergi-Sayi-3.png'), 
    pdfUrl: 'https://kotgep.com/dergi/Dergi-Sayi-3.pdf' },
  { id: '2', image: require('../assets/Dergi-Sayi-2.png'), 
    pdfUrl: 'https://kotgep.com/dergi/Dergi-Sayi-2.pdf' },
  { id: '1', image: require('../assets/Dergi-Sayi-1.png'), 
    pdfUrl: 'https://kotgep.com/dergi/Dergi-Sayi-1.pdf' },
];

export default function LibraryScreen() {
  const navigation = useNavigation();
  const [selectedMagazine, setSelectedMagazine] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [downloadedMagazines, setDownloadedMagazines] = useState({});
  const [downloadingMagazines, setDownloadingMagazines] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [downloadAnimations] = useState({});
  
  
  // Dergi boyutları (tahmin) - gerçek boyutlar için ön istek yapılabilir
  const estimatedSizes = {
    '1': 10000000, '2': 12000000, '3': 11500000, '4': 13000000,
    '5': 14000000, '6': 12500000, '7': 11000000, '8': 15000000
  };

  // İndirilen dergileri yükle
  useEffect(() => {
    loadDownloadedMagazines();
  }, []);

  // AsyncStorage'dan indirilen dergileri yükle
  const loadDownloadedMagazines = async () => {
    try {
      const downloadedData = await AsyncStorage.getItem('downloadedMagazines');
      if (downloadedData) {
        setDownloadedMagazines(JSON.parse(downloadedData));
      }
    } catch (error) {
      console.error('İndirilen dergiler yüklenirken hata oluştu:', error);
    }
  };

  // İndirme animasyonunu oluştur
  const getDownloadAnimation = (magazineId) => {
    if (!downloadAnimations[magazineId]) {
      downloadAnimations[magazineId] = new Animated.Value(0);
    }
    return downloadAnimations[magazineId];
  };

  // İndirme ilerlemesini kontrol eden ve düzelten fonksiyon
  const normalizeProgress = (written, total) => {
    // Eğer total 0 veya geçersizse, tahmini boyutları kullan
    if (!total || total <= 0) {
      return 0;
    }
    
    // Doğru değeri 0-1 arasında sınırla
    const progress = Math.min(Math.max(written / total, 0), 1);
    return progress;
  };

  // İndirme ilerlemesini izleme fonksiyonu
  const onDownloadProgress = (magazineId, downloadProgress) => {
    try {
      // İndirme ilerlemesini hesapla ve sınırla
      const written = downloadProgress.totalBytesWritten || 0;
      const total = downloadProgress.totalBytesExpectedToWrite || estimatedSizes[magazineId] || 10000000;
      
      const progress = normalizeProgress(written, total);
      
      // State'i güncelle
      setDownloadProgress(prev => ({
        ...prev,
        [magazineId]: progress
      }));
      
      // Animasyonu güncelle
      Animated.timing(getDownloadAnimation(magazineId), {
        toValue: progress,
        duration: 200,
        useNativeDriver: false
      }).start();
      
      // Debug
      console.log(`İndirme ${magazineId}: ${written}/${total} = %${Math.round(progress * 100)}`);
    } catch (error) {
      console.error('İlerleme güncellenirken hata:', error);
    }
  };

  // Dergi indirme fonksiyonu
  const downloadMagazine = async (magazine) => {
    const magazineId = magazine.id;
    
    // Zaten indiriliyor mu kontrol et
    if (downloadingMagazines[magazineId]) {
      Alert.alert('Bilgi', `Dergi Sayı ${magazineId} zaten indiriliyor.`);
      return;
    }
    
    try {
      // İndirme durumunu güncelle
      setDownloadingMagazines(prev => ({
        ...prev,
        [magazineId]: true
      }));
      
      // İndirme ilerlemesini sıfırla
      setDownloadProgress(prev => ({
        ...prev,
        [magazineId]: 0
      }));
      
      // Animasyon değerini sıfırla
      getDownloadAnimation(magazineId).setValue(0);
      
      const fileUri = `${FileSystem.documentDirectory}Dergi-Sayi-${magazineId}.pdf`;
      
      // İndirme işlemini başlat
      const downloadResumable = FileSystem.createDownloadResumable(
        magazine.pdfUrl,
        fileUri,
        {},
        (progress) => {
          if (progress && typeof progress === 'object') {
            onDownloadProgress(magazineId, progress);
          }
        }
      );
      
      setModalVisible(false); // İndirme başladığında modalı kapat
      
      // İndirmeyi yürüt
      const { uri } = await downloadResumable.downloadAsync();
      
      // İndirme %100 olarak işaretle
      setDownloadProgress(prev => ({
        ...prev,
        [magazineId]: 1
      }));
      
      // %100 animasyonunu göster
      Animated.timing(getDownloadAnimation(magazineId), {
        toValue: 1,
        duration: 200,
        useNativeDriver: false
      }).start();
      
      // Kısa bir gecikme ekleyerek animasyonun tamamlanmasını sağla
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // İndirilen dergi listesini güncelle
      const updatedDownloads = {
        ...downloadedMagazines,
        [magazineId]: { uri, timestamp: Date.now() }
      };
      
      setDownloadedMagazines(updatedDownloads);
      await AsyncStorage.setItem('downloadedMagazines', JSON.stringify(updatedDownloads));
      
      Alert.alert('Başarılı', `Dergi Sayı ${magazineId} indirildi.`);
    } catch (error) {
      console.error('İndirme hatası:', error);
      Alert.alert('Hata', 'Dergi indirilirken bir hata oluştu.');
    } finally {
      // İndirme durumunu güncelle
      setDownloadingMagazines(prev => {
        const updated = { ...prev };
        delete updated[magazineId];
        return updated;
      });
      
      // İndirme ilerlemesini temizle
      setDownloadProgress(prev => {
        const updated = { ...prev };
        delete updated[magazineId];
        return updated;
      });
      
      // Animasyon değerini temizle
      if (downloadAnimations[magazineId]) {
        downloadAnimations[magazineId].setValue(0);
      }
    }
  };

  // İndirmeyi iptal et
  const cancelDownload = async (magazineId) => {
    // Bu fonksiyonu şu an kullanmıyoruz ama gerekirse ekleyebiliriz
    // FileSystem'de iptal işlemi eklenmeli
    setDownloadingMagazines(prev => {
      const updated = { ...prev };
      delete updated[magazineId];
      return updated;
    });
    
    setDownloadProgress(prev => {
      const updated = { ...prev };
      delete updated[magazineId];
      return updated;
    });
  };

  // Dergiyi sil
  const deleteMagazine = async (magazineId) => {
    try {
      const updatedDownloads = { ...downloadedMagazines };
      
      // Dosyayı sil
      if (updatedDownloads[magazineId] && updatedDownloads[magazineId].uri) {
        await FileSystem.deleteAsync(updatedDownloads[magazineId].uri);
      }
      
      // Listeden kaldır
      delete updatedDownloads[magazineId];
      
      setDownloadedMagazines(updatedDownloads);
      await AsyncStorage.setItem('downloadedMagazines', JSON.stringify(updatedDownloads));
      
      Alert.alert('Başarılı', `Dergi Sayı ${magazineId} silindi.`);
      setModalVisible(false);
    } catch (error) {
      console.error('Silme hatası:', error);
      Alert.alert('Hata', 'Dergi silinirken bir hata oluştu.');
    }
  };

  // Dergiyi oku - Ana sayfaya yönlendir
  const readMagazine = (magazine, isLocal = false) => {
    const pdfUri = isLocal
      ? downloadedMagazines[magazine.id].uri
      : magazine.pdfUrl;
      
    navigation.navigate('Ana Sayfa', { uri: pdfUri });
    setModalVisible(false);
  };

  // Dergiye tıklandığında
  const handleMagazineTap = (magazine) => {
    // Eğer indiriliyor ise modal gösterme, sadece bilgi ver
    if (downloadingMagazines[magazine.id]) {
      const progress = downloadProgress[magazine.id] || 0;
      const progressPercent = Math.round(progress * 100);
      
      Alert.alert(
        'İndiriliyor', 
        `Dergi Sayı ${magazine.id} indiriliyor... (${progressPercent > 0 ? '%' + progressPercent : 'Başlatılıyor...'})`
      );
      return;
    }
    
    setSelectedMagazine(magazine);
    setModalVisible(true);
  };

  const renderItem = ({ item }) => {
    const isDownloaded = downloadedMagazines[item.id];
    const isDownloading = downloadingMagazines[item.id];
    const progress = downloadProgress[item.id] || 0;
    const progressAnimation = getDownloadAnimation(item.id);
    
    const progressHeight = progressAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['100%', '0%']
    });
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => handleMagazineTap(item)}
      >
        <Image source={item.image} style={styles.image} />
        
        {/* İndirme ilerlemesi overlay'i */}
        {isDownloading && (
          <View style={styles.downloadingContainer}>
            <Animated.View 
              style={[
                styles.progressOverlay,
                { height: progressHeight }
              ]}
            />
            <Text style={styles.progressText}>
              %{Math.round(progress * 100)}
            </Text>
          </View>
        )}
        
        {/* İndirilmiş işareti */}
        {isDownloaded && !isDownloading && (
          <View style={styles.downloadBadge}>
            <Icon name="check" size={18} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Layout>
      <FlatList
        data={sampleData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        extraData={[downloadedMagazines, downloadingMagazines, downloadProgress]} // Tüm değişiklikler için yeniden render'la
      />

      {/* Popup Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedMagazine && (
              <>
                <Text style={styles.modalTitle}>Dergi Sayı {selectedMagazine.id}</Text>
                
                {downloadedMagazines[selectedMagazine.id] ? (
                  // İndirilmiş dergi seçenekleri
                  <>
                    <TouchableOpacity 
                      style={styles.modalButton}
                      onPress={() => readMagazine(selectedMagazine, true)}
                    >
                      <Text style={styles.buttonText}>Oku</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.deleteButton]}
                      onPress={() => deleteMagazine(selectedMagazine.id)}
                    >
                      <Text style={styles.buttonText}>Sil</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  // İndirilmemiş dergi seçenekleri
                  <>
                    <TouchableOpacity 
                      style={styles.modalButton}
                      onPress={() => readMagazine(selectedMagazine)}
                    >
                      <Text style={styles.buttonText}>Online Oku</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.downloadButton]}
                      onPress={() => downloadMagazine(selectedMagazine)}
                      disabled={downloadingMagazines[selectedMagazine.id]}
                    >
                      <Text style={styles.buttonText}>
                        {downloadingMagazines[selectedMagazine.id] ? 'İndiriliyor...' : 'İndir'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>İptal</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  downloadBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    width: '100%',
  },
  progressText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButton: {
    width: '100%',
    padding: 15,
    borderRadius: 5,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    marginVertical: 5,
  },
  downloadButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});