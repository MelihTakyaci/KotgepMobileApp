import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme/theme';
import { WEATHER_FUNCTION_URL } from '../config/constants';

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

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type IconPair = {
  day: IconName;
  night: IconName;
};

const defaultIcons: IconPair = {
  day: 'weather-cloudy',
  night: 'weather-night-partly-cloudy',
};

const weatherIconMap: Record<string, IconPair> = {
  thunderstorm: { day: 'weather-lightning-rainy', night: 'weather-lightning-rainy' },
  drizzle: { day: 'weather-rainy', night: 'weather-rainy' },
  rain: { day: 'weather-pouring', night: 'weather-pouring' },
  snow: { day: 'weather-snowy-heavy', night: 'weather-snowy-heavy' },
  mist: { day: 'weather-fog', night: 'weather-fog' },
  smoke: { day: 'weather-fog', night: 'weather-fog' },
  haze: { day: 'weather-hazy', night: 'weather-hazy' },
  dust: { day: 'weather-windy-variant', night: 'weather-windy-variant' },
  fog: { day: 'weather-fog', night: 'weather-fog' },
  sand: { day: 'weather-windy', night: 'weather-windy' },
  ash: { day: 'weather-windy-variant', night: 'weather-windy-variant' },
  squall: { day: 'weather-windy', night: 'weather-windy' },
  tornado: { day: 'weather-tornado', night: 'weather-tornado' },
  clear: { day: 'weather-sunny', night: 'weather-night' },
  clouds: { day: 'weather-cloudy', night: 'weather-night-partly-cloudy' },
};

const resolveWeatherIcon = (condition?: string, iconCode?: string): IconName => {
  const normalized = condition?.toLowerCase() ?? '';
  const iconSet = weatherIconMap[normalized];
  const isNight = iconCode?.includes('n');

  if (!iconSet) {
    return isNight ? defaultIcons.night : defaultIcons.day;
  }

  return isNight ? iconSet.night : iconSet.day;
};

export default function WeatherHeader({ initialCity = 'Prizren' }: { initialCity?: string }) {
  const [city, setCity] = useState(initialCity);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setWeather(null);
      const response = await fetch(`${WEATHER_FUNCTION_URL}?city=${city}`);
      const result = await response.json();
      setWeather(result.data);
    } catch {
      setWeather(null);
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
              <Text style={styles.cityName}>{cityMap[item] ?? item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );

  const renderWeatherContent = () => {
    const localizedCity = cityMap[city] ?? city;
    const condition = weather?.weather?.[0]?.main;
    const iconCode = weather?.weather?.[0]?.icon;
    const iconName = resolveWeatherIcon(condition, iconCode);
    const iconColor = iconCode?.includes('n') ? '#1D4ED8' : COLORS.primary;

    const content = (
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => setModalVisible(true)}>
        <View style={styles.leftContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name={iconName} size={40} color={iconColor} />
          </View>
          <View>
            <Text style={styles.city}>{localizedCity}</Text>
            {weather?.weather?.[0]?.description && (
              <Text style={styles.description}>{weather.weather[0].description}</Text>
            )}
          </View>
        </View>
        <View style={styles.tempGroup}>
          {weather?.main?.temp ? (
            <Text style={styles.temp}>{weather.main.temp.toFixed(0)}°C</Text>
          ) : loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.errorLabel}>-</Text>
          )}
        </View>
      </TouchableOpacity>
    );

    if (loading && !weather) {
      return (
        <View style={[styles.card, styles.centerContent]}>
          <ActivityIndicator size="small" color={COLORS.text} />
        </View>
      );
    }

    if (!weather) {
      return (
        <TouchableOpacity
          style={[styles.card, styles.centerContent]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.errorLabel}>Hava durumu alınamadı - {localizedCity}</Text>
        </TouchableOpacity>
      );
    }

    return content;
  };

  return (
    <>
      {renderWeatherContent()}
      {renderCityPicker()}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  city: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  description: {
    fontSize: 14,
    color: COLORS.muted,
    textTransform: 'capitalize',
  },
  tempGroup: {
    minWidth: 64,
    alignItems: 'flex-end',
  },
  temp: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  errorLabel: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  centerContent: {
    justifyContent: 'center',
  },
  modal: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: COLORS.text,
  },
  cityItem: {
    padding: 15,
    borderBottomColor: COLORS.secondary,
    borderBottomWidth: 1,
  },
  cityName: {
    fontSize: 16,
    color: COLORS.text,
  },
});