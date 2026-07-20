import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import api from '../services/api';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AdminBillingPanel() {
    const [activeTab, setActiveTab] = useState('setup'); // setup, pending, manage
    
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    
    // Setup State
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [selectedStoreName, setSelectedStoreName] = useState('');
    const [storeDropdownVisible, setStoreDropdownVisible] = useState(false);
    const [planType, setPlanType] = useState('emi'); // emi, full_payment
    const [totalAmount, setTotalAmount] = useState('');
    const [downpayment, setDownpayment] = useState('0');
    const [timelineMonths, setTimelineMonths] = useState('1');
    const [fullPaidAmount, setFullPaidAmount] = useState('');
    const [submittingSetup, setSubmittingSetup] = useState(false);

    // Pending State
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loadingPending, setLoadingPending] = useState(false);

    // Manage State
    const [subscriptions, setSubscriptions] = useState([]);
    const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);

    useEffect(() => {
        fetchStores();
        fetchPending();
    }, []);

    const fetchStores = async () => {
        try {
            const res = await api.get('/admin/billing/stores');
            setStores(res.data.stores || []);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchPending = async () => {
        setLoadingPending(true);
        try {
            const res = await api.get('/admin/billing/pending');
            setPendingApprovals(res.data.pendingApprovals || []);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to fetch pending approvals.");
        }
        setLoadingPending(false);
    };

    const fetchSubscriptions = async () => {
        setLoadingSubscriptions(true);
        try {
            const res = await api.get('/admin/billing/');
            setSubscriptions(res.data.subscriptions || []);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to fetch subscriptions.");
        }
        setLoadingSubscriptions(false);
    };

    const handleSetup = async () => {
        if (!selectedStore || !totalAmount) {
            Alert.alert("Error", "Please fill required fields (Store ID, Total Amount)");
            return;
        }

        const total = parseFloat(totalAmount);
        const dp = parseFloat(downpayment) || 0;
        const months = parseInt(timelineMonths, 10) || 1;

        let schedules = [];
        if (planType === 'full_payment') {
            const paid = parseFloat(fullPaidAmount) || 0;
            const due = total - paid;

            if (paid > 0) {
                schedules.push({
                    dueDate: new Date(),
                    amount: paid,
                    status: 'paid',
                    paidDate: new Date()
                });
            }

            if (due > 0) {
                const dueDate = new Date();
                // TEMPORARY FOR TESTING: Set due date to 15 days ago to trigger the BLOCK screen instantly.
                dueDate.setDate(dueDate.getDate() - 15);
                schedules.push({
                    dueDate: dueDate,
                    amount: due,
                    status: 'pending'
                });
            }
        } else {
            // EMI logic
            const remaining = total - dp;
            const emiAmount = remaining / months;
            
            // If downpayment exists, first schedule is downpayment (due in 15 days ago for testing)
            if (dp > 0) {
                const dpDate = new Date();
                dpDate.setDate(dpDate.getDate() - 15); // TEMPORARY FOR TESTING
                schedules.push({
                    dueDate: dpDate,
                    amount: dp
                });
            }

            for (let i = 0; i < months; i++) {
                const date = new Date();
                // Subsquent EMIs start from today + i months
                date.setMonth(date.getMonth() + i);
                schedules.push({
                    dueDate: date,
                    amount: parseFloat(emiAmount.toFixed(2))
                });
            }
        }

        setSubmittingSetup(true);
        try {
            await api.post('/admin/billing/setup', {
                storeId: selectedStore,
                planType,
                totalAmount: total,
                downpayment: dp,
                timelineMonths: months,
                schedules
            });
            Alert.alert("Success", "Subscription setup successfully.");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to setup subscription.");
        }
        setSubmittingSetup(false);
    };

    const handleConfirm = async (subId, schedId) => {
        try {
            await api.put('/admin/billing/confirm', {
                subscriptionId: subId,
                scheduleId: schedId
            });
            Alert.alert("Success", "Payment confirmed.");
            fetchPending();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to confirm payment.");
        }
    };

    const handleMarkAllPaid = (storeId) => {
        setConfirmAction({
            type: 'markPaid',
            storeId,
            title: "Confirm Action",
            message: "Are you sure you want to mark all schedules as paid for this store?",
            confirmText: "Mark Paid",
            confirmColor: "#1DAB87"
        });
        setConfirmModalVisible(true);
    };

    const handleDeleteSubscription = (storeId) => {
        setConfirmAction({
            type: 'delete',
            storeId,
            title: "Confirm Delete",
            message: "Are you sure you want to completely delete this store's subscription? This cannot be undone.",
            confirmText: "Delete",
            confirmColor: COLORS.error
        });
        setConfirmModalVisible(true);
    };

    const executeConfirmAction = async () => {
        if (!confirmAction) return;
        const { type, storeId } = confirmAction;
        setConfirmModalVisible(false);

        if (type === 'markPaid') {
            try {
                await api.put(`/admin/billing/mark-all-paid/${storeId}`);
                fetchSubscriptions();
            } catch (e) {
                Alert.alert("Error", "Failed to mark as paid");
            }
        } else if (type === 'delete') {
            try {
                await api.delete(`/admin/billing/subscription/${storeId}`);
                fetchSubscriptions();
            } catch (e) {
                Alert.alert("Error", "Failed to delete subscription");
            }
        }
    };

    if (!isAuthenticated) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <View style={{ backgroundColor: '#24312E', padding: 30, borderRadius: 10, width: 350, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}>
                    <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' }}>Super Admin Login</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                        placeholder="Admin Email"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={adminEmail}
                        onChangeText={setAdminEmail}
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                        placeholder="Password"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={adminPassword}
                        onChangeText={setAdminPassword}
                        secureTextEntry
                    />
                    <TouchableOpacity 
                        style={[styles.submitBtn, { marginTop: 15 }]} 
                        onPress={() => {
                            if (adminEmail === 'admin@medix.com' && adminPassword === 'admin123') {
                                setIsAuthenticated(true);
                            } else {
                                Alert.alert("Error", "Invalid Admin Credentials");
                            }
                        }}
                    >
                        <Text style={styles.submitBtnText}>Verify & Enter</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Super Admin Billing Panel</Text>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'setup' && styles.activeTab]}
                    onPress={() => setActiveTab('setup')}
                >
                    <Text style={[styles.tabText, activeTab === 'setup' && styles.activeTabText]}>Setup Store</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                    onPress={() => { setActiveTab('pending'); fetchPending(); }}
                >
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending Approvals</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'manage' && styles.activeTab]}
                    onPress={() => { setActiveTab('manage'); fetchSubscriptions(); }}
                >
                    <Text style={[styles.tabText, activeTab === 'manage' && styles.activeTabText]}>Manage Subscriptions</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {activeTab === 'setup' && (
                    <View style={styles.formCard}>
                        <Text style={styles.label}>Select Store:</Text>
                        <TouchableOpacity 
                            style={styles.dropdownBtn} 
                            onPress={() => setStoreDropdownVisible(true)}
                        >
                            <Text style={[styles.dropdownBtnText, !selectedStoreName && { color: '#999' }]}>
                                {selectedStoreName || "Tap to select a store"}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color="#999" />
                        </TouchableOpacity>

                        {/* Store Selection Modal */}
                        {storeDropdownVisible && (
                            <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => setStoreDropdownVisible(false)}>
                                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStoreDropdownVisible(false)}>
                                    <View style={styles.modalCard}>
                                        <Text style={styles.modalTitle}>Select Store</Text>
                                        <ScrollView style={styles.modalList}>
                                            {stores.map(store => (
                                                <TouchableOpacity 
                                                    key={store._id} 
                                                    style={styles.modalListItem}
                                                    onPress={() => {
                                                        setSelectedStore(store._id);
                                                        setSelectedStoreName(`${store.storeName} (${store.contactNumber})`);
                                                        setStoreDropdownVisible(false);
                                                    }}
                                                >
                                                    <Text style={styles.modalListItemText}>{store.storeName}</Text>
                                                    <Text style={styles.modalListItemSub}>{store.contactNumber}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </TouchableOpacity>
                            </Modal>
                        )}

                        <Text style={styles.label}>Plan Type:</Text>
                        <View style={styles.radioGroup}>
                            <TouchableOpacity style={styles.radioBtn} onPress={() => setPlanType('emi')}>
                                <View style={[styles.radioOuter, planType === 'emi' && styles.radioOuterActive]}>
                                    {planType === 'emi' && <View style={styles.radioInner} />}
                                </View>
                                <Text style={styles.radioLabel}>EMI</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.radioBtn} onPress={() => setPlanType('full_payment')}>
                                <View style={[styles.radioOuter, planType === 'full_payment' && styles.radioOuterActive]}>
                                    {planType === 'full_payment' && <View style={styles.radioInner} />}
                                </View>
                                <Text style={styles.radioLabel}>Full Payment</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Total Amount:</Text>
                        <TextInput 
                            style={styles.input} 
                            keyboardType="numeric" 
                            placeholder="e.g. 10000" 
                            placeholderTextColor="#999"
                            value={totalAmount}
                            onChangeText={setTotalAmount}
                        />

                        {planType === 'full_payment' && (
                            <>
                                <Text style={styles.label}>Paid Amount Till Now (₹):</Text>
                                <TextInput 
                                    style={styles.input} 
                                    keyboardType="numeric" 
                                    placeholder="e.g. 5000 (Leave empty if 0)" 
                                    placeholderTextColor="#999"
                                    value={fullPaidAmount}
                                    onChangeText={setFullPaidAmount}
                                />
                            </>
                        )}

                        {planType === 'emi' && (
                            <>
                                <Text style={styles.label}>Downpayment:</Text>
                                <TextInput 
                                    style={styles.input} 
                                    keyboardType="numeric" 
                                    placeholder="e.g. 2000" 
                                    placeholderTextColor="#999"
                                    value={downpayment}
                                    onChangeText={setDownpayment}
                                />

                                <Text style={styles.label}>Timeline (Months):</Text>
                                <TextInput 
                                    style={styles.input} 
                                    keyboardType="numeric" 
                                    placeholder="e.g. 6" 
                                    placeholderTextColor="#999"
                                    value={timelineMonths}
                                    onChangeText={setTimelineMonths}
                                />
                            </>
                        )}

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSetup} disabled={submittingSetup}>
                            <Text style={styles.submitBtnText}>{submittingSetup ? "Saving..." : "Save Subscription"}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {activeTab === 'pending' && (
                    <View style={styles.listCard}>
                        {loadingPending ? (
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        ) : pendingApprovals.length === 0 ? (
                            <Text style={styles.emptyText}>No pending approvals.</Text>
                        ) : (
                            pendingApprovals.map((item, idx) => (
                                <View key={idx} style={styles.listItem}>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.storeName} ({item.contactNumber})</Text>
                                        <Text style={styles.itemMeta}>Amount: ₹{item.amount}</Text>
                                        <Text style={styles.itemMeta}>Due: {new Date(item.dueDate).toDateString()}</Text>
                                        <Text style={styles.itemUtr}>UTR: {item.utrNumber}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirm(item.subscriptionId, item.scheduleId)}>
                                        <Text style={styles.confirmBtnText}>Confirm</Text>
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'manage' && (
                    <View style={styles.listCard}>
                        {loadingSubscriptions ? (
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        ) : subscriptions.length === 0 ? (
                            <Text style={styles.emptyText}>No active subscriptions found.</Text>
                        ) : (
                            subscriptions.map((sub, idx) => {
                                const allPaid = sub.schedules.every(s => s.status === 'paid');
                                return (
                                    <View key={sub._id || idx} style={styles.listItem}>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemName}>{sub.storeId?.storeName || 'Unknown Store'}</Text>
                                            <Text style={styles.itemMeta}>Plan: {sub.planType === 'full_payment' ? 'Full Payment' : 'EMI'} • ₹{sub.totalAmount}</Text>
                                            <Text style={[styles.itemMeta, { color: allPaid ? COLORS.primary : '#F5A623', fontWeight: 'bold', marginTop: 4 }]}>
                                                Status: {allPaid ? 'Fully Paid' : 'Pending Payments'}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            {!allPaid && (
                                                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#1DAB87' }]} onPress={() => handleMarkAllPaid(sub.storeId?._id)}>
                                                    <Text style={styles.confirmBtnText}>Mark Paid</Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: COLORS.error }]} onPress={() => handleDeleteSubscription(sub.storeId?._id)}>
                                                <Text style={styles.confirmBtnText}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Custom Confirmation Modal */}
            {confirmModalVisible && confirmAction && (
                <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => setConfirmModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalCard, { maxWidth: 350 }]}>
                            <Text style={styles.modalTitle}>{confirmAction.title}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 25, lineHeight: 20 }}>
                                {confirmAction.message}
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                                <TouchableOpacity 
                                    style={[styles.confirmBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]} 
                                    onPress={() => setConfirmModalVisible(false)}
                                >
                                    <Text style={[styles.confirmBtnText, { color: COLORS.white }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.confirmBtn, { backgroundColor: confirmAction.confirmColor }]} 
                                    onPress={executeConfirmAction}
                                >
                                    <Text style={styles.confirmBtnText}>{confirmAction.confirmText}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgDark },
    header: { padding: 20, backgroundColor: '#24312E', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    title: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
    tabs: { flexDirection: 'row', backgroundColor: '#24312E' },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: COLORS.primary },
    tabText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
    activeTabText: { color: COLORS.primary },
    content: { padding: 20 },
    formCard: { backgroundColor: '#24312E', padding: 20, borderRadius: 8 },
    label: { color: COLORS.white, marginBottom: 8, fontSize: 14 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', color: COLORS.white, padding: 12, borderRadius: 6, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    radioGroup: { flexDirection: 'row', marginBottom: 15 },
    radioBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
    radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
    radioOuterActive: { borderColor: COLORS.primary },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
    radioLabel: { color: COLORS.white, marginLeft: 8 },
    submitBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 6, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    listCard: { },
    emptyText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 30 },
    listItem: { backgroundColor: '#24312E', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    itemInfo: { flex: 1 },
    itemName: { color: COLORS.white, fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
    itemMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 2 },
    itemUtr: { color: '#F5A623', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
    confirmBtn: { backgroundColor: '#1DAB87', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 6 },
    confirmBtnText: { color: '#FFF', fontWeight: 'bold' },
    dropdownBtn: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 6, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'space-between' },
    dropdownBtnText: { color: COLORS.white, fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCard: { backgroundColor: '#24312E', width: '100%', maxWidth: 400, borderRadius: 8, maxHeight: '80%', padding: 20 },
    modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    modalList: { flexGrow: 0 },
    modalListItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    modalListItemText: { color: COLORS.white, fontSize: 16, fontWeight: '500' },
    modalListItemSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 }
});
