import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Switch,
  FlatList,
  Image,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 50,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4D9E8F',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  rowValue: {
    fontSize: 14,
    color: '#999',
  },
  button: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: '#4D9E8F',
  },
  buttonSecondary: {
    backgroundColor: '#F0F0F0',
  },
  buttonDanger: {
    backgroundColor: '#FFE8E8',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  buttonTextPrimary: {
    color: '#FFF',
  },
  buttonTextSecondary: {
    color: '#333',
  },
  buttonTextDanger: {
    color: '#ED6B4B',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userItemLast: {
    borderBottomWidth: 0,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeActive: {
    backgroundColor: '#E8F5F0',
  },
  badgeInactive: {
    backgroundColor: '#FFE8E8',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#4D9E8F',
  },
  badgeTextInactive: {
    color: '#ED6B4B',
  },
  alertBox: {
    backgroundColor: '#FFF4E6',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE0CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
  },
  alertMessage: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  toggleRowLast: {
    borderBottomWidth: 0,
  },
});

export default function AdminScreen() {
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = React.useState(true);

  const users = [
    {
      id: 1,
      name: 'Juan Garcia',
      email: 'juan@example.com',
      status: 'active',
    },
    {
      id: 2,
      name: 'María López',
      email: 'maria@example.com',
      status: 'active',
    },
    {
      id: 3,
      name: 'Carlos Rodríguez',
      email: 'carlos@example.com',
      status: 'inactive',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Panel Administrativo</Text>

        {/* System Status */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Estado del Sistema</Text>
          <View style={styles.alertBox}>
            <View style={styles.alertIcon}>
              <MaterialIcons name="warning" size={18} color="#D97706" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Mantenimiento programado</Text>
              <Text style={styles.alertMessage}>
                Este domingo a las 02:00 AM
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>152</Text>
              <Text style={styles.statLabel}>Usuarios</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>48h</Text>
              <Text style={styles.statLabel}>Uptime</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>99.9%</Text>
              <Text style={styles.statLabel}>Disponibilidad</Text>
            </View>
          </View>
        </View>

        {/* System Settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Configuración del Sistema</Text>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.rowLabel}>Modo Mantenimiento</Text>
              <Text style={styles.rowValue}>Deshabilitar acceso de usuarios</Text>
            </View>
            <Switch
              value={maintenanceMode}
              onValueChange={setMaintenanceMode}
              trackColor={{ false: '#D0D0D0', true: '#C8E6E0' }}
              thumbColor={maintenanceMode ? '#4D9E8F' : '#F0F0F0'}
            />
          </View>
          <View style={[styles.toggleRow, styles.toggleRowLast]}>
            <View>
              <Text style={styles.rowLabel}>Analytics</Text>
              <Text style={styles.rowValue}>Recolectar datos de uso</Text>
            </View>
            <Switch
              value={analyticsEnabled}
              onValueChange={setAnalyticsEnabled}
              trackColor={{ false: '#D0D0D0', true: '#C8E6E0' }}
              thumbColor={analyticsEnabled ? '#4D9E8F' : '#F0F0F0'}
            />
          </View>
        </View>

        {/* Users Management */}
        <View style={styles.card}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={styles.sectionTitle}>
              Gestión de Usuarios
            </Text>
            <MaterialIcons name="person-add" size={20} color="#4D9E8F" />
          </View>

          {users.map((user, index) => (
            <View
              key={user.id}
              style={[
                styles.userItem,
                index === users.length - 1 && styles.userItemLast,
              ]}
            >
              <View style={styles.userAvatar}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#4D9E8F' }}>
                  {user.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  user.status === 'active' ? styles.badgeActive : styles.badgeInactive,
                ]}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      user.status === 'active' ? '#4D9E8F' : '#ED6B4B',
                  }}
                />
                <Text
                  style={[
                    styles.badgeText,
                    user.status === 'active'
                      ? styles.badgeTextActive
                      : styles.badgeTextInactive,
                  ]}
                >
                  {user.status === 'active' ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Database Management */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Base de Datos</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Última copia de seguridad</Text>
            <Text style={styles.rowValue}>Hace 2 horas</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Tamaño de BD</Text>
            <Text style={styles.rowValue}>245 MB</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Registros hoy</Text>
            <Text style={styles.rowValue}>1,247</Text>
          </View>

          <Pressable style={[styles.button, styles.buttonSecondary]}>
            <MaterialIcons name="download" size={16} color="#333" />
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
              Descargar copia de seguridad
            </Text>
            <MaterialIcons name="chevron-right" size={18} color="#999" />
          </Pressable>
          <Pressable style={[styles.button, styles.buttonSecondary]}>
            <MaterialIcons name="cleaning-services" size={16} color="#333" />
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
              Limpiar caché
            </Text>
            <MaterialIcons name="chevron-right" size={18} color="#999" />
          </Pressable>
        </View>

        {/* API Management */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>API</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Llamadas API hoy</Text>
            <Text style={styles.rowValue}>12,845</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Rate limit</Text>
            <Text style={styles.rowValue}>1000 req/5min</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Estado</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#10B981',
                }}
              />
              <Text style={styles.rowValue}>Operativo</Text>
            </View>
          </View>

          <Pressable style={[styles.button, styles.buttonSecondary]}>
            <MaterialIcons name="refresh" size={16} color="#333" />
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
              Regenerar claves API
            </Text>
            <MaterialIcons name="chevron-right" size={18} color="#999" />
          </Pressable>
        </View>

        {/* Dangerous Actions */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: '#ED6B4B' }]}>
            Acciones Peligrosas
          </Text>
          <Pressable style={[styles.button, styles.buttonDanger]}>
            <MaterialIcons name="warning" size={16} color="#ED6B4B" />
            <Text style={[styles.buttonText, styles.buttonTextDanger]}>
              Reiniciar servidor
            </Text>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonDanger]}>
            <MaterialIcons name="delete-forever" size={16} color="#ED6B4B" />
            <Text style={[styles.buttonText, styles.buttonTextDanger]}>
              Resetear base de datos
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
