import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../core/services/api';
import { COLORS } from '../../../core/constants/theme';
import { useResponsive } from '../../../core/utils/responsive';

export default function AdminStoresScreen({ navigation }) {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const r = useResponsive();

    // Trial Modal State
    const [trialModalVisible, setTrialModalVisible] = useState(false);
    const [selectedStore, setSelectedStore] = useState(null);
    const [trialConfig, setTrialConfig] = useState({
        startDate: '',
        endDate: '',
        mercyEndDate: ''
    });

    // WhatsApp Modal State
    const [waModalVisible, setWaModalVisible] = useState(false);
    const [waLoading, setWaLoading] = useState(false);
    const [waPhone, setWaPhone] = useState('');
    const [waMessage, setWaMessage] = useState('');

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/billing/stores');
            setStores(res.data.stores || []);
        } catch (error) {
            console.error('Failed to fetch stores', error);
            Alert.alert('Error', 'Failed to load stores');
        } finally {
            setLoading(false);
        }
    };

    const openTrialModal = (store) => {
        setSelectedStore(store);
        
        const now = new Date();
        const start = store.trialStartDate ? new Date(store.trialStartDate) : now;
        const end = store.trialEndDate ? new Date(store.trialEndDate) : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        
        setTrialConfig({
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            mercyEndDate: store.mercyEndDate ? new Date(store.mercyEndDate).toISOString().split('T')[0] : ''
        });
        setTrialModalVisible(true);
    };

    const saveTrialConfig = async () => {
        try {
            await api.put(`/admin/billing/trial/${selectedStore._id || selectedStore.id}`, {
                isTrial: true,
                startDate: trialConfig.startDate,
                endDate: trialConfig.endDate,
                mercyEndDate: trialConfig.mercyEndDate || null
            });
            setTrialModalVisible(false);
            fetchStores();
            Alert.alert('Success', 'Trial updated successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to update trial');
        }
    };

    const removeTrial = async () => {
        try {
            await api.put(`/admin/billing/trial/${selectedStore._id || selectedStore.id}`, {
                isTrial: false
            });
            setTrialModalVisible(false);
            fetchStores();
            Alert.alert('Success', 'Trial removed successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to remove trial');
        }
    };

    const handleToggleBlock = async (store) => {
        const action = store.isBlocked ? 'unblock' : 'block';
        Alert.alert(
            `${action === 'block' ? 'Block' : 'Unblock'} Store?`,
            `Are you sure you want to ${action} ${store.storeName}? This will immediately ${action === 'block' ? 'stop' : 'restore'} their access.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: action === 'block' ? 'destructive' : 'default',
                    onPress: async () => {
                        try {
                            await api.put(`/admin/billing/block/${store._id || store.id}`, {
                                isBlocked: !store.isBlocked
                            });
                            fetchStores();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to toggle block status');
                        }
                    }
                }
            ]
        );
    };

    const openWhatsAppModal = async (store) => {
        setSelectedStore(store);
        setWaModalVisible(true);
        setWaLoading(true);
        setWaPhone('');
        setWaMessage('');
        
        try {
            const res = await api.get(`/analytics/whatsapp-report/${store._id || store.id}`);
            if (res.data?.success) {
                setWaPhone(res.data.data.phone || store.contactNumber || '');
                setWaMessage(res.data.data.message || '');
            } else {
                Alert.alert('Error', 'Failed to generate report');
            }
        } catch (error) {
            console.error('Failed to generate WA report', error);
            Alert.alert('Error', 'Failed to fetch report from server');
        } finally {
            setWaLoading(false);
        }
    };

    const sendWhatsAppMessage = () => {
        if (!waPhone || !waMessage) {
            Alert.alert('Validation Error', 'Phone and message are required');
            return;
        }

        let cleaned = String(waPhone).replace(/[\s\-\+\(\)]/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.slice(1);
        }
        if (cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }

        const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(waMessage)}`;
        Linking.openURL(url).catch(err => {
            console.error("Failed to open WhatsApp URL:", err);
            Alert.alert('Error', 'Could not open WhatsApp.');
        });
    };

    const renderStore = ({ item }) => (
        <View style={styles.storeCard}>
            <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{item.storeName}</Text>
                <Text style={styles.storeMeta}>{item.contactNumber || 'No Number'}</Text>
                <Text style={styles.storeMeta}>Joined: {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            
            <View style={styles.storeActions}>
                <View style={styles.statusGroup}>
                    <Text style={[styles.statusBadge, item.isTrial ? styles.badgeActive : styles.badgeInactive]}>
                        {item.isTrial ? 'Trial Active' : 'No Trial'}
                    </Text>
                    {item.isTrial && (
                        <Text style={styles.expiryText}>
                            Expires: {new Date(item.trialEndDate).toLocaleDateString()}
                            {item.mercyEndDate ? ` (Mercy: ${new Date(item.mercyEndDate).toLocaleDateString()})` : ''}
                        </Text>
                    )}
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openTrialModal(item)}>
                        <Text style={styles.actionBtnText}>{item.isTrial ? 'Manage Trial' : 'Add Trial'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statusGroup}>
                    <Text style={[styles.statusBadge, item.isBlocked ? styles.badgeDanger : styles.badgeSuccess]}>
                        {item.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                    </Text>
                    <TouchableOpacity 
                        style={[styles.actionBtn, item.isBlocked ? styles.btnSuccess : styles.btnDanger]} 
                        onPress={() => handleToggleBlock(item)}
                    >
                        <Text style={styles.actionBtnText}>{item.isBlocked ? 'Resume App' : 'Block App'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statusGroup}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#25D366' }]} 
                        onPress={() => openWhatsAppModal(item)}
                    >
                        <Text style={[styles.actionBtnText, { color: '#fff' }]}>WA Report</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Store Management</Text>
                <TouchableOpacity onPress={fetchStores} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList 
                    data={stores}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    renderItem={renderStore}
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* Trial Modal */}
            <Modal visible={trialModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Configure Trial for {selectedStore?.storeName}</Text>
                        
                        <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
                        <TextInput 
                            style={styles.input} 
                            value={trialConfig.startDate}
                            onChangeText={(t) => setTrialConfig({...trialConfig, startDate: t})}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#777"
                        />

                        <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
                        <TextInput 
                            style={styles.input} 
                            value={trialConfig.endDate}
                            onChangeText={(t) => setTrialConfig({...trialConfig, endDate: t})}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#777"
                        />

                        <Text style={styles.inputLabel}>Mercy End Date (YYYY-MM-DD)</Text>
                        <TextInput 
                            style={styles.input} 
                            value={trialConfig.mercyEndDate}
                            onChangeText={(t) => setTrialConfig({...trialConfig, mercyEndDate: t})}
                            placeholder="Optional: YYYY-MM-DD"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#444' }]} onPress={() => setTrialModalVisible(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            {selectedStore?.isTrial && (
                                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#EF4444' }]} onPress={removeTrial}>
                                    <Text style={styles.modalBtnText}>Remove Trial</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#10B981' }]} onPress={saveTrialConfig}>
                                <Text style={styles.modalBtnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* WhatsApp Modal */}
            <Modal visible={waModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { width: 500, maxWidth: '95%' }]}>
                        <Text style={styles.modalTitle}>Send WhatsApp Report</Text>
                        
                        {waLoading ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#25D366" />
                                <Text style={{ color: COLORS.textMuted, marginTop: 10 }}>Generating report...</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.inputLabel}>Target Phone Number</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={waPhone}
                                    onChangeText={setWaPhone}
                                    placeholder="e.g. 919876543210"
                                    placeholderTextColor="#777"
                                    keyboardType="phone-pad"
                                />

                                <Text style={styles.inputLabel}>Message Content</Text>
                                <TextInput 
                                    style={[styles.input, { height: 250, textAlignVertical: 'top' }]} 
                                    value={waMessage}
                                    onChangeText={setWaMessage}
                                    multiline
                                    placeholder="Type message..."
                                    placeholderTextColor="#777"
                                />

                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#444' }]} onPress={() => setWaModalVisible(false)}>
                                        <Text style={styles.modalBtnText}>Close</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#25D366' }]} onPress={sendWhatsAppMessage}>
                                        <Text style={[styles.modalBtnText, { color: '#000' }]}>Open in WhatsApp Web</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgDark },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.bgSurface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
    refreshBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20 },
    storeCard: { backgroundColor: COLORS.bgSurface, padding: 16, borderRadius: 8, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderWidth: 1, borderColor: COLORS.border },
    storeInfo: { flex: 1, minWidth: 200 },
    storeName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
    storeMeta: { fontSize: 14, color: COLORS.textMuted, marginBottom: 2 },
    storeActions: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
    statusGroup: { alignItems: 'center', gap: 8 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
    badgeActive: { backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#D97706', borderColor: '#D97706', borderWidth: 1 },
    badgeInactive: { backgroundColor: 'rgba(0,0,0,0.05)', color: COLORS.textMuted },
    badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderColor: '#10B981', borderWidth: 1 },
    badgeDanger: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderColor: '#EF4444', borderWidth: 1 },
    expiryText: { fontSize: 12, color: COLORS.textMuted },
    actionBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4 },
    btnDanger: { backgroundColor: '#EF4444' },
    btnSuccess: { backgroundColor: '#10B981' },
    actionBtnText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: 400, maxWidth: '90%', backgroundColor: COLORS.bgCard, borderRadius: 8, padding: 24, borderWidth: 1, borderColor: COLORS.border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 20 },
    inputLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
    input: { backgroundColor: COLORS.bgInput, color: COLORS.textPrimary, padding: 12, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
    modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
    modalBtnText: { color: COLORS.white, fontWeight: '600' }
});
