import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, DeviceEventEmitter, Platform, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../core/services/api';
import { COLORS } from '../../../core/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function BillingEnforcer({ children }) {
    const [billingStatus, setBillingStatus] = useState('active'); // active, warning, blocked
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [utrNumber, setUtrNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [warningDismissed, setWarningDismissed] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Store previous states to detect transitions reliably
    const prevScheduleRef = React.useRef(null);
    const prevStatusRef = React.useRef('active');

    useEffect(() => {
        fetchBillingStatus();
        const timer = setInterval(() => {
            fetchBillingStatus(true);
        }, 10000); // Check every 10 seconds
        return () => clearInterval(timer);
    }, []);

    const fetchBillingStatus = async (isPolling = false) => {
        try {
            const res = await api.get('/store/billing/status');
            if (res.data) {
                setBillingStatus(res.data.status);
                setSchedule(res.data.schedule);
            }
        } catch (error) {
            console.log("Failed to fetch billing status:", error);
            // If failed, assume active to not mistakenly block user on network error
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitUtr = async () => {
        if (!utrNumber.trim()) {
            Alert.alert("Error", "Please enter a valid UTR number.");
            return;
        }
        try {
            setSubmitting(true);
            await api.post('/store/billing/pay', {
                scheduleId: schedule._id,
                utrNumber: utrNumber.trim()
            });
            Alert.alert("Success", "Payment details submitted. Waiting for admin confirmation.");
            // Update local state to show 'uploaded'
            setSchedule(prev => ({ ...prev, paymentStatus: 'uploaded' }));
        } catch (error) {
            console.error("Submit UTR error:", error);
            Alert.alert("Error", "Failed to submit UTR. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.bgDark, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const showModal = (billingStatus === 'blocked') || (billingStatus === 'warning' && !warningDismissed);

    return (
        <View style={{ flex: 1 }}>
            {children}

            {showModal && schedule && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
                    <View style={styles.overlay}>
                        <View style={styles.card}>
                            {billingStatus === 'warning' && (
                                <Pressable style={styles.closeBtn} onPress={() => setWarningDismissed(true)}>
                                    <Ionicons name="close" size={24} color="#A0B2AD" />
                                </Pressable>
                            )}
                            
                            <View style={styles.header}>
                                <Ionicons 
                                    name={billingStatus === 'blocked' ? "lock-closed" : "warning"} 
                                    size={40} 
                                    color={billingStatus === 'blocked' ? COLORS.error : "#F5A623"} 
                                    style={{ marginBottom: 10 }}
                                />
                                <Text style={styles.title}>
                                    {billingStatus === 'blocked' ? "App Access Blocked" : "Payment Reminder"}
                                </Text>
                            </View>

                            <View style={styles.body}>
                                {(() => {
                                    const dueDate = new Date(schedule.dueDate);
                                    const blockDate = new Date(dueDate);
                                    blockDate.setDate(dueDate.getDate() + (schedule.blockDays || 10));
                                    
                                    // Format dates like "31 Jul 2026"
                                    const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
                                    const formattedDueDate = dueDate.toLocaleDateString('en-IN', dateOptions);
                                    const formattedBlockDate = blockDate.toLocaleDateString('en-IN', dateOptions);

                                    const now = new Date();
                                    const diffDays = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
                                    
                                    let message = "";
                                    if (schedule.isCustom) {
                                        message = `Till ${formattedDueDate} you are safe. Please pay the due amount.`;
                                    } else if (billingStatus === 'blocked') {
                                        message = `Your payment was due on ${formattedDueDate}. Please clear your dues immediately to regain access to the app.`;
                                    } else if (billingStatus === 'warning') {
                                        if (diffDays > 0) {
                                            message = `Your payment was due on ${formattedDueDate}. You have until ${formattedBlockDate} to pay before your app access is blocked.`;
                                        } else if (diffDays === 0) {
                                            message = `Your payment is due today, ${formattedDueDate}. You have until ${formattedBlockDate} to pay before app access is blocked.`;
                                        } else {
                                            message = `Your upcoming payment is due on ${formattedDueDate}. You will have until ${formattedBlockDate} to pay before app access is blocked.`;
                                        }
                                    }
                                    
                                    return <Text style={styles.message}>{message}</Text>;
                                })()}

                                <View style={styles.amountBox}>
                                    <Text style={styles.amountLabel}>Amount Due:</Text>
                                    <Text style={styles.amountValue}>₹{schedule.amount}</Text>
                                </View>
                                <View style={styles.amountBox}>
                                    <Text style={styles.amountLabel}>Due Date:</Text>
                                    <Text style={styles.amountValue}>{new Date(schedule.dueDate).toDateString()}</Text>
                                </View>

                                {schedule.isCustom ? null : schedule.paymentStatus === 'uploaded' ? (
                                    <View style={styles.waitingBox}>
                                        <Ionicons name="time-outline" size={24} color="#F5A623" />
                                        <Text style={styles.waitingText}>Payment UTR uploaded. Waiting for confirmation from Admin.</Text>
                                    </View>
                                ) : (
                                    <View style={styles.paymentSection}>
                                        {schedule.upiId ? (
                                            <View style={styles.qrContainer}>
                                                <Image 
                                                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${schedule.upiId}&pn=Admin&am=${schedule.amount}&cu=INR`)}` }}
                                                    style={styles.qrCode}
                                                />
                                                <Text style={styles.payInstruction}>Please scan the QR or pay via UPI ({schedule.upiId}) and enter the UTR number below:</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.payInstruction}>Please pay via UPI and enter the UTR number below:</Text>
                                        )}
                                        
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter UTR Number"
                                            placeholderTextColor={COLORS.textMuted || '#7A8E89'}
                                            value={utrNumber}
                                            onChangeText={setUtrNumber}
                                        />
                                        
                                        <Pressable 
                                            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                                            onPress={handleSubmitUtr}
                                            disabled={submitting}
                                        >
                                            <Text style={styles.submitBtnText}>
                                                {submitting ? "Submitting..." : "Submit Payment Details"}
                                            </Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: COLORS.bgCard || '#FFFFFF',
        borderRadius: 8,
        width: 400,
        maxWidth: '95%',
        borderWidth: 1,
        borderColor: COLORS.border || '#CDD5D1',
        overflow: 'hidden',
        position: 'relative',
    },
    closeBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10,
    },
    header: {
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border || '#CDD5D1',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary || '#1C2B2A',
    },
    body: {
        padding: 20,
    },
    message: {
        fontSize: 13,
        color: COLORS.textSecondary || '#4A5C58',
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 15,
    },
    amountBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border || '#CDD5D1',
    },
    amountLabel: {
        fontSize: 14,
        color: COLORS.textSecondary || '#4A5C58',
        fontWeight: '500',
    },
    amountValue: {
        fontSize: 14,
        color: COLORS.textPrimary || '#1C2B2A',
        fontWeight: 'bold',
    },
    paymentSection: {
        marginTop: 15,
    },
    qrContainer: {
        alignItems: 'center',
        marginBottom: 15,
    },
    qrCode: {
        width: 120,
        height: 120,
        marginBottom: 10,
    },
    payInstruction: {
        fontSize: 13,
        color: COLORS.textSecondary || '#4A5C58',
        marginBottom: 10,
        textAlign: 'center',
    },
    input: {
        backgroundColor: COLORS.bgInput || '#F8FAF9',
        borderWidth: 1,
        borderColor: COLORS.border || '#CDD5D1',
        borderRadius: 6,
        padding: 10,
        fontSize: 14,
        color: COLORS.textPrimary || '#1C2B2A',
        marginBottom: 15,
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    submitBtnText: {
        color: COLORS.white || '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    waitingBox: {
        marginTop: 15,
        backgroundColor: 'rgba(217, 119, 6, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(217, 119, 6, 0.3)',
        padding: 12,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },
    waitingText: {
        flex: 1,
        marginLeft: 10,
        color: '#FBBF24',
        fontSize: 13,
        fontWeight: '500',
    }
});
