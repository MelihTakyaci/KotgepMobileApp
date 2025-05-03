import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Dimensions, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useFocusEffect } from '@react-navigation/native';

export default function HomeScreen() {
  const route = useRoute();
  const webViewRef = useRef(null);
  const [key, setKey] = useState(0); // WebView'i yenilemek için key kullanacağız
  const [loading, setLoading] = useState(true);
  const [currentUri, setCurrentUri] = useState('');
  
  const defaultPdfUrl = 'https://kotgep.com/dergi/Dergi-Sayi-8.pdf';
  
  // Sayfa odaklandığında her zaman çalışacak
  useFocusEffect(
    React.useCallback(() => {
      const params = route.params as { uri?: string } | undefined;
      const newUri = params?.uri || defaultPdfUrl;
      
      // URI değiştiyse veya sayfaya yeni geldiyse WebView'i yenile
      if (newUri !== currentUri || currentUri === '') {
        setCurrentUri(newUri);
        setKey(prevKey => prevKey + 1); // WebView'i yenilemek için key değiştir
        setLoading(true);
      }
      
      return () => {
        // Cleanup fonksiyonu (gerekirse)
      };
    }, [route.params])
  );
  
  // WebView'in yükleme durumunu takip et
  const handleLoadStart = () => {
    setLoading(true);
  };
  
  const handleLoadEnd = () => {
    setLoading(false);
  };
  
  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
      
      <WebView
        key={key} // Key değiştiğinde WebView yeniden oluşturulur
        ref={webViewRef}
        source={{ uri: currentUri }}
        style={styles.webview}
        startInLoadingState={true}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        // PDF'leri daha iyi görüntülemek için ayarlar
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        cacheEnabled={false} // Önbellek sorunlarını önlemek için
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  }
});