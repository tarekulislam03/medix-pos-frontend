import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
    Modal,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { useResponsive } from '../utils/responsive';
import api from '../services/api';
import { printReceipt58mm } from '../utils/printReceipt';

export default function AnalyticsScreen() {
    const r = useResponsive();
    const [todaySales, setTodaySales] = useState(0);
    const [monthlySales, setMonthlySales] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [recentSales, setRecentSales] = useState([]);

    // Custom Daily & Monthly
    const [dailyData, setDailyData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [dailySearch, setDailySearch] = useState('');
    const [monthlySearch, setMonthlySearch] = useState('');
    const [showMoreModal, setShowMoreModal] = useState(false);

    const renderNativePicker = (type, value, setValue) => {
        if (Platform.OS === 'web') {
            return React.createElement('input', {
                type: type,
                value: value,
                onChange: (e) => setValue(e.target.value),
                style: {
                    flex: 1,
                    marginLeft: 8,
                    fontSize: 14,
                    color: '#1f2937',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent'
                }
            });
        }
        return (
            <TextInput
                style={styles.searchInput}
                value={value}
                onChangeText={setValue}
                placeholder={`Search ${type}...`}
                placeholderTextColor={COLORS.textMuted}
            />
        );
    };

    const fetchAnalytics = async () => {
        try {
            const todayReq = api.get('/sales/today').catch(e => null);
            const monthReq = api.get('/sales/monthly').catch(e => null);
            // Use a large limit to allow local aggregation of history for daily/monthly arrays
            const invoicesReq = api.get('/sales/history', { params: { page: 1, limit: 5000, sort: 'desc' } }).catch(e => null);

            const [todayRes, monthRes, invoicesRes] = await Promise.all([todayReq, monthReq, invoicesReq]);

            // Safely extract the monetary value from the response
            const extractValue = (res) => {
                if (!res || !res.data) return 0;
                if (typeof res.data === 'number') return res.data;
                const body = res.data.data || res.data;
                return body?.total_sales;
            };

            setTodaySales(extractValue(todayRes));
            setMonthlySales(extractValue(monthRes));

            const resData = invoicesRes?.data;
            const fullList = Array.isArray(resData)
                ? resData
                : (Array.isArray(resData?.data)
                    ? resData.data
                    : (Array.isArray(resData?.invoices)
                        ? resData.invoices
                        : []));

            setRecentSales(fullList.slice(0, 10)); // Use top 10 for recent

            // Generate aggregate daily/monthly maps locally
            const dMap = {};
            const mMap = {};
            fullList.forEach(sale => {
                const d = new Date(sale.created_at || sale.createdAt || sale.date || new Date());
                const dStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
                const mStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0')].join('-');
                const val = Number(sale.grand_total || sale.total || 0);
                dMap[dStr] = (dMap[dStr] || 0) + val;
                mMap[mStr] = (mMap[mStr] || 0) + val;
            });

            setDailyData(Object.entries(dMap).map(([k, v]) => ({ date: k, total: v })).sort((a, b) => b.date.localeCompare(a.date)));
            setMonthlyData(Object.entries(mMap).map(([k, v]) => ({ month: k, total: v })).sort((a, b) => b.month.localeCompare(a.month)));

        } catch (error) {
            console.log('Failed to fetch analytics:', error?.message || error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAnalytics();
        setRefreshing(false);
    };

    const scrollPadding = r.pick({ small: SPACING.md, medium: SPACING.lg, large: SPACING.xxl, xlarge: SPACING.xxl });
    const statCardStyle = r.isSmall ? { width: '100%', marginBottom: SPACING.md } : { flex: 1 };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingHorizontal: scrollPadding, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }]}>
                <View>
                    <Text style={[styles.headerTitle, { fontSize: r.pick({ small: FONT_SIZES.xl, medium: FONT_SIZES.xxl, large: FONT_SIZES.xxl, xlarge: FONT_SIZES.xxl }) }]}>
                        Sales Analytics
                    </Text>
                    <Text style={styles.headerSub}>Overview of your business performance</Text>
                </View>
                <TouchableOpacity
                    style={styles.moreInfoBtn}
                    onPress={() => setShowMoreModal(true)}
                >
                    <Ionicons name="bar-chart-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.moreInfoBtnText}>More Analytical Info</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scroll, { padding: scrollPadding }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <View style={[styles.statsRow, r.isSmall && { flexDirection: 'column' }]}>
                        {/* Today's Sale */}
                        <View style={[styles.statCard, statCardStyle]}>
                            <View style={styles.statHeader}>
                                <View style={[styles.iconBox, { backgroundColor: COLORS.primaryGhost }]}>
                                    <Ionicons name="today" size={24} color={COLORS.primary} />
                                </View>
                                <Text style={styles.statLabel}>Today's Sale</Text>

                            </View>

                            <Text style={styles.statValue}>
                                ₹{Number(todaySales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                        </View>

                        {/* Monthly Sale */}
                        <View style={[styles.statCard, statCardStyle]}>
                            <View style={styles.statHeader}>
                                <View style={[styles.iconBox, { backgroundColor: COLORS.successLight }]}>
                                    <Ionicons name="calendar-outline" size={24} color={COLORS.success} />
                                </View>
                                <Text style={styles.statLabel}>Monthly Sale</Text>
                            </View>
                            <Text style={styles.statValue}>
                                ₹{Number(monthlySales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </View>
                )}

                {!loading && (
                    <View style={styles.historySection}>
                        <Text style={styles.sectionTitle}>Recent Sales History</Text>
                        {recentSales.length > 0 ? (
                            recentSales.map((sale, idx) => (
                                <View key={sale._id || idx} style={styles.saleRow}>
                                    <View style={styles.saleInfo}>
                                        <Text style={styles.saleId}>Invoice {sale.invoice_number ? `#${sale.invoice_number}` : sale._id.slice(-6).toUpperCase()}</Text>
                                        <Text style={styles.saleDetails}>
                                            ₹{Number(sale.grand_total || sale.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • {String(sale.payment_method || 'CASH').toUpperCase()}
                                        </Text>
                                        <Text style={styles.saleTime}>
                                            {new Date(sale.created_at || sale.createdAt || sale.date || new Date()).toLocaleString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit', hour12: true
                                            })}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.printBtn}
                                        onPress={() => printReceipt58mm(sale)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="print-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.printBtnText}>Print</Text>
                                    </TouchableOpacity>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No recent sales found.</Text>
                        )}
                    </View>
                )}
            </ScrollView>

            <Modal visible={showMoreModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMoreModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Detailed Sales Reports</Text>
                        <TouchableOpacity onPress={() => setShowMoreModal(false)} style={styles.closeModalBtn}>
                            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
                        <View style={[styles.statsRow, { flexDirection: r.isSmall ? 'column' : 'row' }]}>
                            {/* Daily Table */}
                            <View style={[styles.statCard, { flex: 1, padding: SPACING.lg, marginBottom: r.isSmall ? SPACING.md : 0 }]}>
                                <View style={styles.reportHeaderWrap}>
                                    <Text style={styles.reportTitle}>Daily Sales</Text>
                                    <View style={styles.pickerBox}>
                                        <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} />
                                        {renderNativePicker('date', dailySearch, setDailySearch)}
                                        {dailySearch.length > 0 && (
                                            <TouchableOpacity onPress={() => setDailySearch('')}>
                                                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.reportDivider} />
                                {dailyData.filter(d => d.date.includes(dailySearch)).slice(0, 30).map((d) => (
                                    <View key={d.date} style={styles.reportRow}>
                                        <Text style={styles.reportDate}>{d.date}</Text>
                                        <Text style={styles.reportAmount}>₹{Number(d.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                    </View>
                                ))}
                                {dailyData.filter(d => d.date.includes(dailySearch)).length === 0 && (
                                    <Text style={styles.emptyText}>No daily sales found</Text>
                                )}
                            </View>

                            {/* Monthly Table */}
                            <View style={[styles.statCard, { flex: 1, padding: SPACING.lg }]}>
                                <View style={styles.reportHeaderWrap}>
                                    <Text style={styles.reportTitle}>Monthly Sales</Text>
                                    <View style={styles.pickerBox}>
                                        <Ionicons name="calendar" size={16} color={COLORS.textMuted} />
                                        {renderNativePicker('month', monthlySearch, setMonthlySearch)}
                                        {monthlySearch.length > 0 && (
                                            <TouchableOpacity onPress={() => setMonthlySearch('')}>
                                                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.reportDivider} />
                                {monthlyData.filter(d => d.month.includes(monthlySearch)).slice(0, 15).map((d) => (
                                    <View key={d.month} style={styles.reportRow}>
                                        <Text style={styles.reportDate}>{d.month}</Text>
                                        <Text style={styles.reportAmount}>₹{Number(d.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                    </View>
                                ))}
                                {monthlyData.filter(d => d.month.includes(monthlySearch)).length === 0 && (
                                    <Text style={styles.emptyText}>No monthly sales found</Text>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    header: {
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.lg,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    headerSub: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    scroll: {
        paddingBottom: SPACING.xxxl,
    },
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.lg,
    },
    statCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    statValue: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    historySection: {
        marginTop: SPACING.xxl,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },
    saleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        padding: SPACING.lg,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    saleInfo: {
        flex: 1,
    },
    saleId: {
        fontWeight: '800',
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    saleDetails: {
        fontWeight: '700',
        color: COLORS.success,
        fontSize: FONT_SIZES.sm,
        marginBottom: 4,
    },
    saleTime: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    printBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.primaryGhost,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.sm,
    },
    printBtnText: {
        color: COLORS.primary,
        fontWeight: '800',
        fontSize: FONT_SIZES.sm,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: SPACING.xl,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
        flexWrap: 'wrap',
        gap: SPACING.sm
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        minWidth: 200,
    },
    searchInput: {
        flex: 1,
        marginLeft: SPACING.sm,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        outlineStyle: 'none',
    },
    reportTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    reportDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginTop: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    reportRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.bgDark,
    },
    reportDate: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    reportAmount: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '800',
        color: COLORS.success,
    },
    moreInfoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.primaryGhost,
        borderRadius: RADIUS.md,
        gap: SPACING.xs
    },
    moreInfoBtnText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: FONT_SIZES.sm,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.lg,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    closeModalBtn: {
        padding: SPACING.xs,
    },
    reportHeaderWrap: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        flexWrap: 'wrap',
        gap: SPACING.sm
    },
    pickerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgDark,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        minWidth: 140,
    }
});
