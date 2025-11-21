import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';

// İngilizce → Türkçe şehir isimleri
const cityMap: { [key: string]: string } = {
  "Prizren": "Prizren",
  "Pristina": "Priştine",
  "Mamusa": "Mamuşa",
  "Gjilan": "Gilan",
  "Peja": "İpek",
  "Mitrovicë": "Mitroviça",
  "Dragash": "Dragaş",
  "Tirana": "Tiran",
  "Durres": "Dıraç",
  "Saranda": "Saranda",
  "Shëngjin": "Şencin",
  "Shkoder": "İşkodra",
  "Bar": "Bar",
  "Ulcinj": "Ulcin",
  "Skopje": "Üsküp",
  "Tetovo": "Kalkandelen",
  "Gostivar": "Gostivar",
  "Kumanovo": "Kumanova",
  "Komotini": "Gümülcine",
  "Xanthi": "İskeçe",
  "Kardzhali": "Kırcaali",
  "Razgrad": "Razgrad",
  "Shumen": "Şumnu",
  "Istanbul": "İstanbul",
  "Izmir": "İzmir",
  "Canakkale": "Çanakkale",
  "Edirne": "Edirne",
  "Bursa": "Bursa",
  "Konya": "Konya",
  "Gaziantep": "Gaziantep",
  "Ankara": "Ankara",
  "Berlin": "Berlin",
  "Frankfurt": "Frankfurt",
  "Köln": "Köln",
  "Paris": "Paris",
  "Amsterdam": "Amsterdam",
  "Brüksel": "Brüksel",
  "Stockholm": "Stockholm",
  "Orkhon": "Ötüken"
};

const cities = Object.keys(cityMap);

export default function WeatherHeader({ initialCity = "Prizren" }: { initialCity?: string }) {
  const [city, setCity] = useState(initialCity);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://jjygunxzboqsruwyenay.supabase.co/functions/v1/weather?city=${city}`
      );
      const result = await response.json();
      setWeather(result.data);
    } catch (error) {
      console.error("Hava durumu alınamadı:", error);
      setWeather(null); // null yaparak hata halinde uyarı göster
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [city]);

  const handleCitySelect = (selected: string) => {
    setCity(selected);
    setModalVisible(false);
  };

  const renderCityPicker = () => (
    <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>Şehir Seç</Text>
        <FlatList
          data={cities}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleCitySelect(item)} style={styles.cityItem}>
              <Text style={styles.cityName}>{cityMap[item]}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );

  const renderWeatherContent = () => {
    if (loading) {
      return (
        <View style={styles.container}>
          <ActivityIndicator size="small" color="#000" />
        </View>
      );
    }

    if (!weather) {
      return (
        <TouchableOpacity style={styles.container} onPress={() => setModalVisible(true)}>
          <Text style={styles.text}>Hava durumu alınamadı - {cityMap[city]}</Text>
        </TouchableOpacity>
      );
    }

    const temp = weather.main?.temp;
    const description = weather.weather?.[0]?.description;
    const icon = weather.weather?.[0]?.icon;
    const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;

    return (
      <TouchableOpacity style={styles.container} onPress={() => setModalVisible(true)}>
        <Image source={{ uri: iconUrl }} style={styles.icon} />
        <View style={styles.info}>
          <Text style={styles.city}>{cityMap[city]}</Text>
          <Text style={styles.temp}>{temp?.toFixed(0)}°C</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {renderWeatherContent()}
      {renderCityPicker()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 15,
  },
  info: {
    flexDirection: 'column',
  },
  city: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  temp: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
  },
  description: {
    color: 'black',
    fontSize: 14,
    fontStyle: 'italic',
  },
  text: {
    color: 'black',
    fontSize: 16,
  },
  modal: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  cityItem: {
    padding: 15,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  cityName: {
    fontSize: 16,
  },
});