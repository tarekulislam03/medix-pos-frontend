import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../core/services/api';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../../../core/constants/theme';
import { useResponsive } from '../../../core/utils/responsive';

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
    const paidSchedules = schedules.filter(s => s.status === 'paid' && !s.isCustom);
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
                {schedules.filter(s => !s.isCustom).map((item, index) => {
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
    emptyText: { color: COLORS.textMuted, marginTop: 15, fontSize: FONT_SIZES.md },
    header: { 
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        backgroundColor: COLORS.bgCard,
        borderBottomWidth: 1, 
        borderBottomColor: COLORS.borderLight 
    },
    headerTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZES.lg, fontWeight: '600' },
    scrollContent: { padding: SPACING.xl, paddingBottom: 60 },
    
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xl },
    summaryCard: { 
        flex: 1, 
        backgroundColor: COLORS.bgCard, 
        padding: SPACING.lg, 
        borderRadius: RADIUS.lg, 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginHorizontal: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.borderLight
    },
    summaryIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.warningLight, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    summaryLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, marginBottom: 4 },
    summaryValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.lg, fontWeight: '600' },
    
    detailsCard: { 
        backgroundColor: COLORS.bgCard, 
        borderRadius: RADIUS.lg, 
        padding: SPACING.lg, 
        marginBottom: SPACING.xxl,
        borderWidth: 1,
        borderColor: COLORS.borderLight
    },
    cardTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '600', marginBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, paddingBottom: SPACING.sm },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
    detailLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
    detailValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.xs, fontWeight: '500' },
    
    sectionTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '600', marginBottom: SPACING.lg, marginLeft: SPACING.xs },
    scheduleItem: { 
        backgroundColor: COLORS.bgCard, 
        borderRadius: RADIUS.lg, 
        padding: SPACING.lg, 
        marginBottom: SPACING.md, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.borderLight
    },
    scheduleLeft: { flexDirection: 'row', alignItems: 'center' },
    iconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.lg },
    scheduleInfo: { justifyContent: 'center' },
    scheduleAmount: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '600', marginBottom: 2 },
    scheduleDate: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
    scheduleUtr: { color: COLORS.textMuted, fontSize: 10, marginTop: 4, fontStyle: 'italic' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.lg, borderWidth: 1 },
    statusText: { fontSize: 10, fontWeight: '600' }
});
