import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Platform,
    Animated,
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../core/constants/theme';
import { useResponsive } from '../../../core/utils/responsive';
import Skeleton from '../../../core/components/Skeleton';
import api from '../../../core/services/api';
import { printReceipt } from '../../../core/utils/printReceipt';

export default function AnalyticsScreen({ navigation }) {
    const r = useResponsive();
    const [todaySales, setTodaySales] = useState(0);
    const [monthlySales, setMonthlySales] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [deleteConfirmSale, setDeleteConfirmSale] = useState(null);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const toastTimeout = useRef(null);

    const showToast = useCallback((message, type = 'success') => {
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        setToastMessage(message);
        setToastType(type);
        Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        toastTimeout.current = setTimeout(() => {
            Animated.timing(toastOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
                setToastMessage('');
            });
        }, 3000);
    }, [toastOpacity]);
    
    const [recentSales, setRecentSales] = useState([]);
    const [allSales, setAllSales] = useState([]);
    const [showAllSalesModal, setShowAllSalesModal] = useState(false);
    const [allSalesSearch, setAllSalesSearch] = useState('');
    const [loadingAllSales, setLoadingAllSales] = useState(false);

    const handleViewAllSales = async () => {
        setAllSalesSearch('');
        setShowAllSalesModal(true);
        if (allSales.length <= 10) {
            setLoadingAllSales(true);
            try {
                const res = await api.get('/sales/history', { params: { page: 1, limit: 5000, sort: 'desc' } });
                const resData = res?.data;
                const fullList = Array.isArray(resData) ? resData : (Array.isArray(resData?.data) ? resData.data : (Array.isArray(resData?.invoices) ? resData.invoices : []));
                setAllSales(fullList);
            } catch (error) {
                showToast('Failed to fetch all sales', 'error');
            } finally {
                setLoadingAllSales(false);
            }
        }
    };

    // Custom Daily & Monthly
    const [dailyData, setDailyData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [dailySearch, setDailySearch] = useState('');
    const [monthlySearch, setMonthlySearch] = useState('');
    const [dailyProfitData, setDailyProfitData] = useState([]);
    const [monthlyProfitData, setMonthlyProfitData] = useState([]);
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
                    fontSize: 12,
                    color: COLORS.textPrimary,
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
            const overviewReq = api.get('/sales/analytics-overview').catch(e => null);
            const invoicesReq = api.get('/sales/history', { params: { page: 1, limit: 10, sort: 'desc' } }).catch(e => null);

            const [todayRes, monthRes, overviewRes, invoicesRes] = await Promise.all([todayReq, monthReq, overviewReq, invoicesReq]);

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

            setRecentSales(fullList.slice(0, 10)); 
            setAllSales(fullList); 

            if (overviewRes?.data) {
                setDailyData(overviewRes.data.dailyData || []);
                setMonthlyData(overviewRes.data.monthlyData || []);
                setDailyProfitData(overviewRes.data.dailyProfitData || []);
                setMonthlyProfitData(overviewRes.data.monthlyProfitData || []);
            } else {
                setDailyData([]);
                setMonthlyData([]);
                setDailyProfitData([]);
                setMonthlyProfitData([]);
            }

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

    const handleDeleteSale = (sale) => {
        setDeleteConfirmSale(sale);
    };

    const confirmDelete = async () => {
        const sale = deleteConfirmSale;
        if (!sale) return;
        setDeleteConfirmSale(null);
        try {
            setDeletingId(sale._id);
            await api.delete(`/sales/history/${sale._id}`);
            setRecentSales(prev => prev.filter(s => s._id !== sale._id));
            setAllSales(prev => prev.filter(s => s._id !== sale._id));
            showToast('Sale deleted successfully', 'success');
            fetchAnalytics();
        } catch (error) {
            const msg = error?.message || 'Failed to delete sale';
            showToast(msg, 'error');
        } finally {
            setDeletingId(null);
        }
    };



    return (
        <View style={styles.container}>
            {/* ─── HEADER ─── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Sales Analytics</Text>
                    <Text style={styles.headerSub}>Overview of your business performance</Text>
                </View>
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowMoreModal(true)}>
                    <Ionicons name="bar-chart-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.btnSecondaryText}>More Analytical Info</Text>
                </TouchableOpacity>
            </View>

            {/* ─── CONTENT BODY ─── */}
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={{ gap: 12 }}>
                        <View style={[styles.statsRow, r.isSmall && { flexDirection: 'column' }]}>
                            <View style={[styles.statCard, { height: 80, flex: 1 }]}><Skeleton width="100%" height="100%" /></View>
                            <View style={[styles.statCard, { height: 80, flex: 1 }]}><Skeleton width="100%" height="100%" /></View>
                        </View>
                        <Text style={[styles.sectionTitle, { opacity: 0.20, marginTop: 10 }]}>Recent Sales History</Text>
                        <View style={styles.tableContainer}>
                            <View style={styles.tableHeader}>
                                <View style={[styles.thCell, { flex: 1.5 }]}><Skeleton width="40%" height={10} /></View>
                                <View style={[styles.thCell, { flex: 2 }]}><Skeleton width="50%" height={10} /></View>
                                <View style={[styles.thCell, { flex: 1.2 }]}><Skeleton width="30%" height={10} /></View>
                                <View style={[styles.thCell, { flex: 1.5 }]}><Skeleton width="40%" height={10} /></View>
                                <View style={[styles.thCell, { flex: 2, borderRightWidth: 0 }]}><Skeleton width="40%" height={10} /></View>
                            </View>
                            {[...Array(6)].map((_, i) => (
                                <View key={i} style={[styles.tableRow, { height: 46 }]}>
                                    <View style={[styles.cell, { flex: 1.5 }]}><Skeleton width="50%" height={12} /></View>
                                    <View style={[styles.cell, { flex: 2 }]}><Skeleton width="70%" height={12} /></View>
                                    <View style={[styles.cell, { flex: 1.2 }]}><Skeleton width="40%" height={12} /></View>
                                    <View style={[styles.cell, { flex: 1.5 }]}><Skeleton width="60%" height={12} /></View>
                                    <View style={[styles.cell, { flex: 2, borderRightWidth: 0 }]}><Skeleton width="50%" height={16} /></View>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={{ gap: 12 }}>
                        {/* Stats Cards Row */}
                        <View style={[styles.statsRow, r.isSmall && { flexDirection: 'column' }]}>
                            {/* Today's Sale */}
                            <View style={[styles.statCard, { flex: 1 }]}>
                                <View style={styles.statHeader}>
                                    <View style={[styles.iconBox, { backgroundColor: COLORS.primaryGhost }]}>
                                        <Ionicons name="today" size={16} color={COLORS.primary} />
                                    </View>
                                    <Text style={styles.statLabel}>TODAY'S SALE</Text>
                                </View>
                                <Text style={styles.statValue}>
                                    ₹{Number(todaySales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                            </View>

                            {/* Monthly Sale */}
                            <View style={[styles.statCard, { flex: 1 }]}>
                                <View style={styles.statHeader}>
                                    <View style={[styles.iconBox, { backgroundColor: COLORS.primaryGhost }]}>
                                        <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                                    </View>
                                    <Text style={styles.statLabel}>MONTHLY SALE</Text>
                                </View>
                                <Text style={styles.statValue}>
                                    ₹{Number(monthlySales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                            </View>
                        </View>

                        {/* Recent Sales History Section */}
                        <View style={styles.historySection}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>Recent Sales History</Text>
                                <TouchableOpacity
                                    style={styles.btnSecondary}
                                    onPress={handleViewAllSales}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.btnSecondaryText, { color: COLORS.primary }]}>View All</Text>
                                    <Ionicons name="arrow-forward" size={12} color={COLORS.primary} style={{ marginLeft: 6 }} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.tableContainer}>
                                {/* Table Header */}
                                <View style={styles.tableHeader}>
                                    <View style={[styles.thCell, { flex: 1.5 }]}>
                                        <Text style={styles.th}>Invoice No.</Text>
                                    </View>
                                    <View style={[styles.thCell, { flex: 2 }]}>
                                        <Text style={styles.th}>Date & Time</Text>
                                    </View>
                                    <View style={[styles.thCell, { flex: 1.2, alignItems: 'center' }]}>
                                        <Text style={styles.th}>Method</Text>
                                    </View>
                                    <View style={[styles.thCell, { flex: 1.5, alignItems: 'flex-end' }]}>
                                        <Text style={styles.th}>Total Amount</Text>
                                    </View>
                                    <View style={[styles.thCell, { flex: 2, alignItems: 'center', borderRightWidth: 0 }]}>
                                        <Text style={styles.th}>Actions</Text>
                                    </View>
                                </View>

                                {/* Table Body Rows */}
                                {recentSales.length > 0 ? (
                                    recentSales.map((sale, idx) => {
                                        const invoiceNum = sale.invoice_number ? `#${sale.invoice_number}` : sale._id?.slice(-6).toUpperCase();
                                        const method = String(sale.payment_method || 'CASH').toUpperCase();
                                        const total = Number(sale.grand_total || sale.total || 0).toFixed(2);
                                        const timeStr = new Date(sale.created_at || sale.createdAt || sale.date || new Date()).toLocaleString('en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit', hour12: true
                                        });
                                        return (
                                            <View key={sale._id || idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                                                <View style={[styles.cell, { flex: 1.5 }]}>
                                                    <Text style={styles.cellName} numberOfLines={1}>{invoiceNum}</Text>
                                                </View>
                                                <View style={[styles.cell, { flex: 2 }]}>
                                                    <Text style={styles.cellText}>{timeStr}</Text>
                                                </View>
                                                <View style={[styles.cell, { flex: 1.2, alignItems: 'center' }]}>
                                                    <Text style={styles.cellText}>{method}</Text>
                                                </View>
                                                <View style={[styles.cell, { flex: 1.5, alignItems: 'flex-end' }]}>
                                                    <Text style={[styles.cellText, { fontWeight: '600', color: COLORS.primary }]}>₹{total}</Text>
                                                </View>
                                                <View style={[styles.cell, styles.actionsCell, { flex: 2, borderRightWidth: 0 }]}>
                                                    <TouchableOpacity
                                                        style={[styles.actionBtn, { borderColor: COLORS.warning, backgroundColor: COLORS.warningLight }]}
                                                        onPress={() => navigation.navigate('Billing', { invoice: sale })}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Ionicons name="pencil-outline" size={14} color={COLORS.warning} />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.actionBtn, styles.actionBtnDanger]}
                                                        onPress={() => handleDeleteSale(sale)}
                                                        activeOpacity={0.7}
                                                        disabled={deletingId === sale._id}
                                                    >
                                                        {deletingId === sale._id ? (
                                                            <ActivityIndicator size="small" color={COLORS.error} />
                                                        ) : (
                                                            <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                                                        )}
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={styles.actionBtn}
                                                        onPress={() => printReceipt(sale)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Ionicons name="print-outline" size={14} color={COLORS.primary} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })
                                ) : (
                                    <View style={styles.centerBox}>
                                        <Ionicons name="bar-chart-outline" size={44} color={COLORS.border} />
                                        <Text style={styles.emptyText}>No recent sales found</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* ─── DETAILED REPORTS MODAL ─── */}
            <Modal visible={showMoreModal} animationType="fade" transparent onRequestClose={() => setShowMoreModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { width: r.pick({ small: '95%', medium: '90%', large: '80%', xlarge: 960 }), height: '90%' }]}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={[styles.modalIcon, { backgroundColor: COLORS.primarySoft }]}>
                                    <Ionicons name="bar-chart-outline" size={18} color={COLORS.primary} />
                                </View>
                                <Text style={styles.modalTitle}>Detailed Sales Reports</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowMoreModal(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={18} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Scrollable Report Body */}
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false}>
                            <View style={[styles.reportFlexRow, r.isSmall && { flexDirection: 'column' }]}>
                                {/* Daily Sales Table */}
                                <View style={[styles.reportCol, { flex: 1 }]}>
                                    <View style={styles.reportHeaderWrap}>
                                        <Text style={styles.reportTitle}>Daily Sales</Text>
                                        <View style={styles.searchBox}>
                                            <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
                                            {renderNativePicker('date', dailySearch, setDailySearch)}
                                            {dailySearch.length > 0 && (
                                                <TouchableOpacity onPress={() => setDailySearch('')}>
                                                    <Ionicons name="close-circle" size={14} color={COLORS.textMuted} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>

                                    <View style={[styles.tableContainer, { minHeight: 250, maxHeight: 350 }]}>
                                        <View style={styles.tableHeader}>
                                            <View style={[styles.thCell, { flex: 1 }]}><Text style={styles.th}>Date</Text></View>
                                            <View style={[styles.thCell, { flex: 1, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={styles.th}>Sales Amount</Text></View>
                                        </View>
                                        <ScrollView nestedScrollEnabled style={{ flex: 1 }}>
                                            {dailyData.filter(d => d.date.includes(dailySearch)).slice(0, 30).map((d, idx) => (
                                                <View key={d.date} style={[styles.tableRow, { height: 36 }, idx % 2 === 1 && styles.tableRowAlt]}>
                                                    <View style={[styles.cell, { flex: 1 }]}><Text style={styles.cellText}>{d.date}</Text></View>
                                                    <View style={[styles.cell, { flex: 1, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={[styles.cellText, { fontWeight: '600', color: COLORS.primary }]}>₹{Number(d.total).toFixed(2)}</Text></View>
                                                </View>
                                            ))}
                                            {dailyData.filter(d => d.date.includes(dailySearch)).length === 0 && (
                                                <View style={styles.centerBox}><Text style={styles.emptyText}>No daily sales found</Text></View>
                                            )}
                                        </ScrollView>
                                    </View>
                                </View>

                                {/* Monthly Sales Table */}
                                <View style={[styles.reportCol, { flex: 1 }]}>
                                    <View style={styles.reportHeaderWrap}>
                                        <Text style={styles.reportTitle}>Monthly Sales</Text>
                                        <View style={styles.searchBox}>
                                            <Ionicons name="calendar" size={14} color={COLORS.textMuted} />
                                            {renderNativePicker('month', monthlySearch, setMonthlySearch)}
                                            {monthlySearch.length > 0 && (
                                                <TouchableOpacity onPress={() => setMonthlySearch('')}>
                                                    <Ionicons name="close-circle" size={14} color={COLORS.textMuted} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>

                                    <View style={[styles.tableContainer, { minHeight: 250, maxHeight: 350 }]}>
                                        <View style={styles.tableHeader}>
                                            <View style={[styles.thCell, { flex: 1 }]}><Text style={styles.th}>Month</Text></View>
                                            <View style={[styles.thCell, { flex: 1, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={styles.th}>Sales Amount</Text></View>
                                        </View>
                                        <ScrollView nestedScrollEnabled style={{ flex: 1 }}>
                                            {monthlyData.filter(d => d.month.toLowerCase().includes(monthlySearch.toLowerCase()) || d.monthId.includes(monthlySearch)).slice(0, 15).map((d, idx) => (
                                                <View key={d.monthId} style={[styles.tableRow, { height: 36 }, idx % 2 === 1 && styles.tableRowAlt]}>
                                                    <View style={[styles.cell, { flex: 1 }]}><Text style={styles.cellText}>{d.month}</Text></View>
                                                    <View style={[styles.cell, { flex: 1, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={[styles.cellText, { fontWeight: '600', color: COLORS.primary }]}>₹{Number(d.total).toFixed(2)}</Text></View>
                                                </View>
                                            ))}
                                            {monthlyData.filter(d => d.month.toLowerCase().includes(monthlySearch.toLowerCase()) || d.monthId.includes(monthlySearch)).length === 0 && (
                                                <View style={styles.centerBox}><Text style={styles.emptyText}>No monthly sales found</Text></View>
                                            )}
                                        </ScrollView>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.reportFlexRow, r.isSmall && { flexDirection: 'column' }, { marginTop: 16 }]}>
                                {/* Daily Profit Table */}
                                <View style={[styles.reportCol, { flex: 1 }]}>
                                    <View style={styles.reportHeaderWrap}>
                                        <Text style={styles.reportTitle}>Daily Net Profit</Text>
                                        <View style={styles.searchBox}>
                                            <Ionicons name="trending-up" size={14} color={COLORS.textMuted} />
                                            {renderNativePicker('date', dailySearch, setDailySearch)}
                                            {dailySearch.length > 0 && (
                                                <TouchableOpacity onPress={() => setDailySearch('')}>
                                                    <Ionicons name="close-circle" size={14} color={COLORS.textMuted} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
    
                                    <View style={[styles.tableContainer, { minHeight: 200, maxHeight: 300 }]}>
                                        <View style={styles.tableHeader}>
                                            <View style={[styles.thCell, { flex: 1 }]}><Text style={styles.th}>Date</Text></View>
                                            <View style={[styles.thCell, { flex: 1, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={styles.th}>Net Profit</Text></View>
                                        </View>
                                        <ScrollView nestedScrollEnabled style={{ flex: 1 }}>
                                            {dailyProfitData.filter(d => d.date.includes(dailySearch)).slice(0, 30).map((d, idx) => {
                                                const isPositive = d.profit >= 0;
                                                return (
                                                    <View key={d.date} style={[styles.tableRow, { height: 36 }, idx % 2 === 1 && styles.tableRowAlt]}>
                                                        <View style={[styles.cell, { flex: 1 }]}><Text style={styles.cellText}>{d.date}</Text></View>
                                                        <View style={[styles.cell, { flex: 1, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={[styles.cellText, { fontWeight: '600', color: isPositive ? COLORS.primary : COLORS.error }]}>₹{Number(d.profit).toFixed(2)}</Text></View>
                                                    </View>
                                                );
                                            })}
                                            {dailyProfitData.filter(d => d.date.includes(dailySearch)).length === 0 && (
                                                <View style={styles.centerBox}><Text style={styles.emptyText}>No profit data found</Text></View>
                                            )}
                                        </ScrollView>
                                    </View>
                                </View>

                                {/* Monthly Profit Table */}
                                <View style={[styles.reportCol, { flex: 1 }]}>
                                    <View style={styles.reportHeaderWrap}>
                                        <Text style={styles.reportTitle}>Monthly Net Profit</Text>
                                        <View style={styles.searchBox}>
                                            <Ionicons name="trending-up" size={14} color={COLORS.textMuted} />
                                            {renderNativePicker('month', monthlySearch, setMonthlySearch)}
                                            {monthlySearch.length > 0 && (
                                                <TouchableOpacity onPress={() => setMonthlySearch('')}>
                                                    <Ionicons name="close-circle" size={14} color={COLORS.textMuted} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
    
                                    <View style={[styles.tableContainer, { minHeight: 200, maxHeight: 300 }]}>
                                        <View style={styles.tableHeader}>
                                            <View style={[styles.thCell, { flex: 1 }]}><Text style={styles.th}>Month</Text></View>
                                            <View style={[styles.thCell, { flex: 1, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={styles.th}>Net Profit</Text></View>
                                        </View>
                                        <ScrollView nestedScrollEnabled style={{ flex: 1 }}>
                                            {monthlyProfitData.filter(d => d.month.toLowerCase().includes(monthlySearch.toLowerCase()) || d.monthId.includes(monthlySearch)).slice(0, 15).map((d, idx) => {
                                                const isPositive = d.profit >= 0;
                                                return (
                                                    <View key={d.monthId} style={[styles.tableRow, { height: 36 }, idx % 2 === 1 && styles.tableRowAlt]}>
                                                        <View style={[styles.cell, { flex: 1 }]}><Text style={styles.cellText}>{d.month}</Text></View>
                                                        <View style={[styles.cell, { flex: 1, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={[styles.cellText, { fontWeight: '600', color: isPositive ? COLORS.primary : COLORS.error }]}>₹{Number(d.profit).toFixed(2)}</Text></View>
                                                    </View>
                                                );
                                            })}
                                            {monthlyProfitData.filter(d => d.month.toLowerCase().includes(monthlySearch.toLowerCase()) || d.monthId.includes(monthlySearch)).length === 0 && (
                                                <View style={styles.centerBox}><Text style={styles.emptyText}>No profit data found</Text></View>
                                            )}
                                        </ScrollView>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={[styles.btnSecondary, { minWidth: 100 }]} onPress={() => setShowMoreModal(false)}>
                                <Text style={styles.btnSecondaryText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── ALL SALES HISTORY MODAL ─── */}
            <Modal visible={showAllSalesModal} animationType="fade" transparent onRequestClose={() => setShowAllSalesModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { width: r.pick({ small: '95%', medium: '85%', large: '75%', xlarge: 900 }), height: '90%' }]}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={[styles.modalIcon, { backgroundColor: COLORS.primarySoft }]}>
                                    <Ionicons name="receipt-outline" size={18} color={COLORS.primary} />
                                </View>
                                <Text style={styles.modalTitle}>All Sales History</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowAllSalesModal(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={18} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Search bar inside modal */}
                        <View style={styles.modalFilterBar}>
                            <View style={styles.searchBox}>
                                <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search by invoice no., amount or payment method..."
                                    placeholderTextColor={COLORS.textMuted}
                                    value={allSalesSearch}
                                    onChangeText={setAllSalesSearch}
                                />
                                {allSalesSearch.length > 0 && (
                                    <TouchableOpacity onPress={() => setAllSalesSearch('')}>
                                        <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Scrollable table container */}
                        <View style={[styles.tableContainer, { flex: 1, margin: 12, marginTop: 0 }]}>
                            {/* Table Header */}
                            <View style={styles.tableHeader}>
                                <View style={[styles.thCell, { flex: 1.5 }]}>
                                    <Text style={styles.th}>Invoice No.</Text>
                                </View>
                                <View style={[styles.thCell, { flex: 2 }]}>
                                    <Text style={styles.th}>Date & Time</Text>
                                </View>
                                <View style={[styles.thCell, { flex: 1.2, alignItems: 'center' }]}>
                                    <Text style={styles.th}>Method</Text>
                                </View>
                                <View style={[styles.thCell, { flex: 1.5, alignItems: 'flex-end' }]}>
                                    <Text style={styles.th}>Total Amount</Text>
                                </View>
                                <View style={[styles.thCell, { flex: 2, alignItems: 'center', borderRightWidth: 0 }]}>
                                    <Text style={styles.th}>Actions</Text>
                                </View>
                            </View>

                            {loadingAllSales ? (
                                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50, flex: 1 }} />
                            ) : (
                                <FlatList
                                style={{ flex: 1 }}
                                showsVerticalScrollIndicator={false}
                                data={allSales.filter(sale => {
                                    const q = allSalesSearch.toLowerCase();
                                    if (!q) return true;
                                    const inv = (sale.invoice_number ? `#${sale.invoice_number}` : sale._id?.slice(-6) || '').toLowerCase();
                                    const amt = String(sale.grand_total || sale.total || '');
                                    const method = (sale.payment_method || '').toLowerCase();
                                    return inv.includes(q) || amt.includes(q) || method.includes(q);
                                })}
                                keyExtractor={(sale, idx) => sale._id || String(idx)}
                                initialNumToRender={15}
                                maxToRenderPerBatch={15}
                                windowSize={5}
                                removeClippedSubviews={true}
                                ListEmptyComponent={
                                    <View style={styles.centerBox}>
                                        <Text style={styles.emptyText}>No sales found</Text>
                                    </View>
                                }
                                renderItem={({ item: sale, index: idx }) => {
                                    const invoiceNum = sale.invoice_number ? `#${sale.invoice_number}` : sale._id?.slice(-6).toUpperCase();
                                    const method = String(sale.payment_method || 'CASH').toUpperCase();
                                    const total = Number(sale.grand_total || sale.total || 0).toFixed(2);
                                    const timeStr = new Date(sale.created_at || sale.createdAt || sale.date || new Date()).toLocaleString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit', hour12: true
                                    });
                                    return (
                                        <View style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                                            <View style={[styles.cell, { flex: 1.5 }]}>
                                                <Text style={styles.cellName} numberOfLines={1}>{invoiceNum}</Text>
                                            </View>
                                            <View style={[styles.cell, { flex: 2 }]}>
                                                <Text style={styles.cellText}>{timeStr}</Text>
                                            </View>
                                            <View style={[styles.cell, { flex: 1.2, alignItems: 'center' }]}>
                                                <Text style={styles.cellText}>{method}</Text>
                                            </View>
                                            <View style={[styles.cell, { flex: 1.5, alignItems: 'flex-end' }]}>
                                                <Text style={[styles.cellText, { fontWeight: '600', color: COLORS.primary }]}>₹{total}</Text>
                                            </View>
                                            <View style={[styles.cell, styles.actionsCell, { flex: 2, borderRightWidth: 0 }]}>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, { borderColor: COLORS.warning, backgroundColor: COLORS.warningLight }]}
                                                    onPress={() => { setShowAllSalesModal(false); navigation.navigate('Billing', { invoice: sale }); }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="pencil-outline" size={14} color={COLORS.warning} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, styles.actionBtnDanger]}
                                                    onPress={() => handleDeleteSale(sale)}
                                                    activeOpacity={0.7}
                                                    disabled={deletingId === sale._id}
                                                >
                                                    {deletingId === sale._id ? (
                                                        <ActivityIndicator size="small" color={COLORS.error} />
                                                    ) : (
                                                        <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                                                    )}
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.actionBtn}
                                                    onPress={() => printReceipt(sale)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="print-outline" size={14} color={COLORS.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                }}
                            />)}
                        </View>

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={[styles.btnSecondary, { minWidth: 100 }]} onPress={() => setShowAllSalesModal(false)}>
                                <Text style={styles.btnSecondaryText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── DELETE CONFIRM MODAL ─── */}
            <Modal
                visible={!!deleteConfirmSale}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDeleteConfirmSale(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.deleteModal, { width: r.pick({ small: '90%', medium: 400, large: 400, xlarge: 400 }) }]}>
                        <View style={styles.deleteIconBox}>
                            <Ionicons name="warning-outline" size={32} color={COLORS.error} />
                        </View>
                        <Text style={styles.deleteTitle}>Delete Sale</Text>
                        <Text style={styles.deleteDesc}>
                            Are you sure you want to delete invoice{' '}
                            <Text style={{ fontWeight: '700' }}>
                                {deleteConfirmSale?.invoice_number ? `#${deleteConfirmSale.invoice_number}` : deleteConfirmSale?._id?.slice(-6).toUpperCase()}
                            </Text>
                            ? This will restore stock and revert customer credit. This action cannot be undone.
                        </Text>
                        <View style={styles.deleteActions}>
                            <TouchableOpacity
                                style={[styles.btnSecondary, { flex: 1 }]}
                                onPress={() => setDeleteConfirmSale(null)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.btnSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btnDanger, { flex: 1 }]}
                                onPress={confirmDelete}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="trash-outline" size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                                <Text style={styles.btnDangerText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── IN-APP TOAST ─── */}
            {toastMessage !== '' && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        { opacity: toastOpacity, backgroundColor: toastType === 'success' ? COLORS.success : COLORS.error }
                    ]}
                    pointerEvents="none"
                >
                    <Ionicons
                        name={toastType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                        size={20}
                        color={COLORS.white}
                    />
                    <Text style={styles.toastText}>{toastMessage}</Text>
                </Animated.View>
            )}
        </View>
    );
}

// ─── STYLES ─────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
        padding: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        marginBottom: 10,
    },
    headerTitle: { fontSize: 16, fontWeight: '400', color: COLORS.textPrimary },
    headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    scroll: {
        paddingBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    statCard: {
        backgroundColor: COLORS.white,
        borderRadius: 2,
        padding: 12,
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase' },
    statValue: { fontSize: 22, color: COLORS.textPrimary },
    historySection: {
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    // Table
    tableContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: '#EFF2F1',
        height: 34,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
    },
    thCell: {
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderRightWidth: 0.5,
        borderRightColor: COLORS.border,
        height: '100%',
    },
    th: {
        fontSize: 10,
        fontWeight: '500',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        height: 46,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
    },
    tableRowAlt: {
        backgroundColor: '#F8FAF9',
    },
    cell: {
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderRightWidth: 0.5,
        borderRightColor: COLORS.border,
        height: '100%',
    },
    cellName: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    cellText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    actionsCell: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    actionBtn: {
        width: 28,
        height: 28,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnDanger: {
        backgroundColor: COLORS.errorLight,
        borderColor: COLORS.error,
    },
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 8,
        opacity: 0.20,
    },
    emptyText: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    // Search Box / inputs
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        paddingHorizontal: 8,
        height: 32,
        gap: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 12,
        color: COLORS.textPrimary,
        height: '100%',
        paddingVertical: 0,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    },
    // Buttons
    btnPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
        borderWidth: 0.5,
        borderColor: COLORS.primary,
    },
    btnPrimaryText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.white,
    },
    btnSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 2,
        backgroundColor: COLORS.white,
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    btnSecondaryText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    btnDanger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 2,
        backgroundColor: COLORS.error,
        borderWidth: 0.5,
        borderColor: COLORS.error,
    },
    btnDangerText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.white,
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    modalCard: {
        backgroundColor: COLORS.white,
        borderRadius: 3,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalIcon: {
        width: 32,
        height: 32,
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    modalCloseBtn: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalFilterBar: {
        padding: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        backgroundColor: '#F8FAF9',
    },
    modalFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    // Reports modal layout elements
    reportFlexRow: {
        flexDirection: 'row',
        gap: 12,
    },
    reportCol: {
        gap: 8,
    },
    reportHeaderWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 4,
    },
    reportTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textPrimary,
        textTransform: 'uppercase',
    },
    // Delete modal confirmation specific
    deleteModal: {
        backgroundColor: COLORS.white,
        borderRadius: 3,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        padding: 20,
        alignItems: 'center',
    },
    deleteIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.errorLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    deleteTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    deleteDesc: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
    },
    deleteActions: {
        flexDirection: 'row',
        gap: 8,
        width: '100%',
    },
    // Toast
    toastContainer: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.1)',
        zIndex: 9999,
    },
    toastText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.white,
        flex: 1,
    },
});
