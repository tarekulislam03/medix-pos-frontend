import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { COLORS } from '../constants/theme';
import { useResponsive } from '../utils/responsive';

export default function PaymentScreen() {
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState(null);
    const r = useResponsive();

    useEffect(() => {
        fetchDetails();
    }, []);

    const fetchDetails = async () => {
        try {
            const res = await api.get('/store/billing/details');
            setSubscription(res.data.subscription);
        } catch (error) {
            console.error('Failed to fetch payment details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!subscription) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={60} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyText}>No payment plans found for this store.</Text>
            </View>
        );
    }

    const { planType, totalAmount, downpayment, schedules } = subscription;
    const paidSchedules = schedules.filter(s => s.status === 'paid');
    const totalPaid = paidSchedules.reduce((acc, s) => acc + s.amount, 0);
    const totalDue = totalAmount - totalPaid;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Subscription & Payments</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* Summary Cards */}
                <View style={[styles.summaryRow, r.isSmall && { flexDirection: 'column' }]}>
                    <View style={[styles.summaryCard, r.isSmall && { width: '100%', marginBottom: 15 }]}>
                        <View style={styles.summaryIconBox}>
                            <Ionicons name="wallet-outline" size={24} color="#F5A623" />
                        </View>
                        <View>
                            <Text style={styles.summaryLabel}>Total Due</Text>
                            <Text style={styles.summaryValue}>₹{totalDue.toFixed(2)}</Text>
                        </View>
                    </View>
                    <View style={[styles.summaryCard, r.isSmall && { width: '100%' }]}>
                        <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(29, 171, 135, 0.15)' }]}>
                            <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.summaryLabel}>Total Paid</Text>
                            <Text style={styles.summaryValue}>₹{totalPaid.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Plan Details */}
                <View style={styles.detailsCard}>
                    <Text style={styles.cardTitle}>Plan Details</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Plan Type</Text>
                        <Text style={styles.detailValue}>{planType === 'full_payment' ? 'Full Payment' : 'EMI Plan'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Total Plan Amount</Text>
                        <Text style={styles.detailValue}>₹{totalAmount.toFixed(2)}</Text>
                    </View>
                    {planType === 'emi' && downpayment > 0 && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Downpayment</Text>
                            <Text style={styles.detailValue}>₹{downpayment.toFixed(2)}</Text>
                        </View>
                    )}
                </View>

                {/* Payment History / Schedules */}
                <Text style={styles.sectionTitle}>Payment Schedule & History</Text>
                {schedules.map((item, index) => {
                    let statusColor = '#999';
                    let statusText = 'Pending';
                    let statusIcon = 'time-outline';

                    if (item.status === 'paid') {
                        statusColor = COLORS.primary;
                        statusText = 'Paid';
                        statusIcon = 'checkmark-circle';
                    } else if (item.status === 'uploaded') {
                        statusColor = '#F5A623';
                        statusText = 'In Review';
                        statusIcon = 'sync-circle';
                    } else if (new Date(item.dueDate) < new Date()) {
                        statusColor = COLORS.error;
                        statusText = 'Overdue';
                        statusIcon = 'warning';
                    }

                    return (
                        <View key={item._id} style={styles.scheduleItem}>
                            <View style={styles.scheduleLeft}>
                                <View style={[styles.iconWrapper, { backgroundColor: statusColor + '20' }]}>
                                    <Ionicons name={statusIcon} size={22} color={statusColor} />
                                </View>
                                <View style={styles.scheduleInfo}>
                                    <Text style={styles.scheduleAmount}>₹{item.amount.toFixed(2)}</Text>
                                    <Text style={styles.scheduleDate}>Due: {new Date(item.dueDate).toDateString()}</Text>
                                    {item.utrNumber ? (
                                        <Text style={styles.scheduleUtr}>UTR: {item.utrNumber}</Text>
                                    ) : null}
                                </View>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '40' }]}>
                                <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                            </View>
                        </View>
                    );
                })}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgDark },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark },
    emptyText: { color: 'rgba(255,255,255,0.5)', marginTop: 15, fontSize: 16 },
    header: { padding: 20, backgroundColor: '#24312E', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
    scrollContent: { padding: 20, paddingBottom: 60 },
    
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    summaryCard: { flex: 1, backgroundColor: '#24312E', padding: 20, borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 },
    summaryIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(245, 166, 35, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 4 },
    summaryValue: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
    
    detailsCard: { backgroundColor: '#24312E', borderRadius: 10, padding: 20, marginBottom: 30 },
    cardTitle: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 10 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    detailLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
    detailValue: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
    
    sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 5 },
    scheduleItem: { backgroundColor: '#24312E', borderRadius: 10, padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    scheduleLeft: { flexDirection: 'row', alignItems: 'center' },
    iconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    scheduleInfo: { justifyContent: 'center' },
    scheduleAmount: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    scheduleDate: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
    scheduleUtr: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4, fontStyle: 'italic' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    statusText: { fontSize: 12, fontWeight: 'bold' }
});
