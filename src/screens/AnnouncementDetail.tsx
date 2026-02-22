import React, { useState } from 'react'
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, SafeAreaView, useWindowDimensions, Platform, StatusBar } from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { COLORS, SIZES } from '../theme/theme'
import { IMAGE_STORAGE_URL } from '../config/constants'

type RouteParams = {
  params: {
    id?: number
    title?: string
    announcement_type?: string
    image_url?: string
    content?: string
    created_at?: string
  }
}

const TYPE_LABELS: Record<string, string> = {
  duyuru: 'Duyuru',
  etkinlik: 'Etkinlik',
  onemli: 'Önemli',
}

const TYPE_ICONS: Record<string, string> = {
  duyuru: 'bullhorn',
  etkinlik: 'calendar',
  onemli: 'alert-circle',
}

const BASE_IMAGE_URL = IMAGE_STORAGE_URL

function buildImageUrl(path?: string) {
  if (!path) return undefined
  return /^https?:\/\//i.test(path) ? path : `${BASE_IMAGE_URL}${path}`
}

export default function AnnouncementDetail() {
  const route = useRoute() as RouteParams
  const nav = useNavigation()
  const a = route.params ?? {}

  const [imgFailed, setImgFailed] = useState(false)

  // Responsive measurements
  const { width } = useWindowDimensions()
  const scale = Math.min(1.25, width / 375)
  const imageHeight = Math.min(480, Math.round(width * 0.56))
  const padding = Math.max(12, Math.round(width * 0.04))
  const titleFontSize = Math.round(20 * scale)
  const contentFontSize = Math.round(15 * scale)
  const metaRowColumn = width < 420

  const typeKey = (a.announcement_type || '').toLowerCase()
  const label = TYPE_LABELS[typeKey] ?? (a.announcement_type || '')
  const iconName = TYPE_ICONS[typeKey] ?? 'bullhorn'

  // Small top inset to ensure content doesn't sit too close to the system status/notification bar
  const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 18) : 0

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Math.max(padding / 2, topInset + 6) }]}>
      <View style={[styles.header, { paddingHorizontal: padding }]}> 
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duyuru</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { padding }]}> 
        {a.image_url && !imgFailed ? (
          <Image
            source={{ uri: buildImageUrl(a.image_url) }}
            style={[styles.image, { height: imageHeight }]}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View style={[styles.imagePlaceholder, { height: imageHeight }]}> 
            <MaterialCommunityIcons name={iconName as any} size={Math.round(44 * scale)} color={COLORS.primary} />
          </View>
        )}

        <View style={styles.body}>
          <View style={[styles.metaRow, { flexDirection: metaRowColumn ? 'column' : 'row', alignItems: metaRowColumn ? 'flex-start' : 'center' }]}>
            <Text style={[styles.typeBadge, { fontSize: Math.round(12 * scale), paddingHorizontal: 10, paddingVertical: 6 }]}>{label}</Text>
            {a.created_at ? <Text style={[styles.dateText, { marginTop: metaRowColumn ? 8 : 0 }]}>{new Date(a.created_at).toLocaleString()}</Text> : null}
          </View>
          <Text style={[styles.title, { fontSize: titleFontSize }]} numberOfLines={3}>{a.title}</Text>
          {a.content ? <Text style={[styles.contentText, { fontSize: contentFontSize, lineHeight: Math.round(contentFontSize * 1.6) }]}>{a.content}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { padding: SIZES.padding },
  image: { width: '100%', height: 220, borderRadius: 12, marginBottom: 12 },
  imagePlaceholder: { width: '100%', height: 220, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  body: { paddingHorizontal: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { backgroundColor: '#FEF3F2', color: '#C60000', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontWeight: '700' } as any,
  dateText: { color: '#6B7280', fontSize: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 10 },
  contentText: { color: '#374151', lineHeight: 20 },
})
