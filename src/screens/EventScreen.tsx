import React, { useState } from 'react';
import { FlatList, Image, StyleSheet, View, TouchableOpacity, Text, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../components/Layout';

const eventData = [
  { id: '1', title: 'Yazar Buluşması - Nisan', image: require('../assets/adaptive-icon.png'), content: 'https://kotgep.com/haber/1' },
  { id: '2', title: 'Çocuk Atölyesi', image: require('../assets/adaptive-icon.png'), content: 'https://kotgep.com/haber/2' },

];

export default function EventScreen() {
  const navigation = useNavigation();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleEventTap = (event) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => handleEventTap(item)}
    >
      <Image source={item.image} style={styles.image} />
      <View style={styles.titleOverlay}>
        <Text style={styles.title}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Layout>
      <FlatList
        data={eventData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
      />

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedEvent && (
              <>
                <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('HaberOku', { url: selectedEvent.content });
                  }}
                >
                  <Text style={styles.buttonText}>Haberi Oku</Text>
                </TouchableOpacity>
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    textAlign: 'center',
  },
  modalButton: {
    width: '100%',
    padding: 15,
    borderRadius: 5,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    marginVertical: 5,
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});