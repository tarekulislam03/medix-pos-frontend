import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions, Animated, Easing, Image
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../../core/constants/theme';
import { getBillingRecommendations } from '../services/billingService';

const { width, height } = Dimensions.get('window');

const MENU_OPTIONS = [
    { id: 'orderMore', label: 'What should I order more?' },
    { id: 'orderLess', label: 'What should I stop ordering?' },
    { id: 'topSellers', label: 'Show me top selling items' },
    { id: 'deadStock', label: 'Show me dead stock' },
    { id: 'faqProfit', label: 'How can I increase profit?' },
    { id: 'faqDead', label: 'What is dead stock?' }
];

export default function RecommendationWidget() {
    const [isVisible, setIsVisible] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [backendData, setBackendData] = useState(null);
    const [showOptions, setShowOptions] = useState(false);
    
    // Animations
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(20)).current;
    const scrollViewRef = useRef(null);

    // Typing dot animations
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    const player = useAudioPlayer(require('../../../../assets/receive.mp3'));

    const playReceiveSound = () => {
        try {
            if (player) {
                player.seekTo(0);
                player.play();
            }
        } catch (error) {
            console.log("Audio failed to play:", error);
        }
    };

    const animateDots = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot1, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.timing(dot2, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.timing(dot3, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        ).start();
    };

    const fetchDataAndInit = async () => {
        setMessages([]);
        setShowOptions(false);
        setIsTyping(true);
        animateDots();

        try {
            const res = await getBillingRecommendations();
            if (res && res.success) {
                setBackendData(res.recommendations);
            }
        } catch (error) {
            console.warn("Failed to fetch analytics", error);
        }

        setTimeout(() => {
            setIsTyping(false);
            playReceiveSound();
            setMessages([
                { 
                    id: Date.now().toString(), 
                    type: 'bot', 
                    text: "Hello! I am Medix AI Assistant. I have analyzed your store's recent activity and I have some important insights about your business today. Please check out to save loss an increase profit" 
                }
            ]);
            setTimeout(() => {
                setShowOptions(true);
            }, 400);
        }, 1200);
    };

    const handleOptionSelect = async (option) => {
        setShowOptions(false);

        // Add user message
        const userMsg = { id: Date.now().toString(), type: 'user', text: option.label };
        setMessages(prev => [...prev, userMsg]);

        // Show typing
        setTimeout(() => {
            setIsTyping(true);
            animateDots();
        }, 300);

        // Calculate reply delay
        setTimeout(() => {
            setIsTyping(false);
            playReceiveSound();
            const replyText = generateBotReply(option.id);
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'bot', text: replyText }]);
            
            // Show options again
            setTimeout(() => {
                setShowOptions(true);
            }, 600);

        }, 1200);
    };

    const generateBotReply = (optionId) => {
        if (!backendData) return "I'm sorry, I am having trouble accessing your store database right now. Please try again later.";

        switch (optionId) {
            case 'orderMore':
                if (!backendData.orderMore || backendData.orderMore.length === 0) {
                    return "Good news! None of your high-velocity products are running low right now. Your inventory levels look healthy.";
                }
                let omText = "You need to order these items soon because they are selling fast but running low:\n\n";
                backendData.orderMore.slice(0, 5).forEach(item => {
                    omText += `• ${item.name} (Only ${item.currentStock} left, but ${item.sold} sold recently!)\n`;
                });
                return omText.trim();

            case 'orderLess':
                if (!backendData.orderLess || backendData.orderLess.length === 0) {
                    return "You do not have any severe overstock right now. Excellent inventory management!";
                }
                let olText = "I recommend you stop ordering these items for a while. You have too much stock and they are barely selling:\n\n";
                backendData.orderLess.slice(0, 5).forEach(item => {
                    olText += `• ${item.name} (You have ${item.currentStock} units, but only ${item.soldLast30Days} sold last month)\n`;
                });
                return olText.trim();

            case 'topSellers':
                if (!backendData.highestSelling || backendData.highestSelling.length === 0) {
                    return "I don't have enough sales data from the last 30 days to determine your top sellers yet.";
                }
                let tsText = "Here are your highest selling items from the last 30 days. Keep pushing these!\n\n";
                backendData.highestSelling.slice(0, 5).forEach(item => {
                    tsText += `• ${item.name} (${item.sold} units sold, generating ₹${item.revenue.toFixed(0)})\n`;
                });
                return tsText.trim();

            case 'deadStock':
                if (!backendData.deadStock || backendData.deadStock.length === 0) {
                    return "Great job! You don't have any dead stock. Every product on your shelf has sold at least once in the last 3 months.";
                }
                let dsText = "These items are completely dead. They have not sold a single unit in over 3 months, taking up valuable space and cash:\n\n";
                backendData.deadStock.slice(0, 5).forEach(item => {
                    dsText += `• ${item.name} (${item.quantity} units sitting on shelf)\n`;
                });
                return dsText.trim();

            case 'faqProfit':
                return "To increase profit, you should focus on three things:\n\n1. Stop ordering 'Dead Stock' and 'Overstocked' items immediately.\n2. Run a discount on dead stock to get your cash back quickly.\n3. Make sure you never run out of your 'Top Selling' items so you never miss a sale!";

            case 'faqDead':
                return "Dead stock refers to items in your pharmacy that have not sold a single unit in over 3 months (90 days). It is dangerous because it ties up your cash and takes up physical space that could be used for fast-moving medicines.";

            default:
                return "I'm not sure how to answer that yet.";
        }
    };

    const openPanel = () => {
        setIsVisible(true);
        if (messages.length === 0) {
            fetchDataAndInit();
        }
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(translateYAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true })
        ]).start();
    };

    const closePanel = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(translateYAnim, { toValue: 20, duration: 200, useNativeDriver: true })
        ]).start(() => {
            setIsVisible(false);
        });
    };

    useEffect(() => {
        if (isVisible && scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages, isTyping, showOptions, isVisible]);

    const TypingIndicator = () => (
        <View style={styles.typingContainer}>
            <Animated.View style={[styles.dot, { opacity: dot1 }]} />
            <Animated.View style={[styles.dot, { opacity: dot2 }]} />
            <Animated.View style={[styles.dot, { opacity: dot3 }]} />
        </View>
    );

    return (
        <>
            {!isVisible && (
                <TouchableOpacity style={styles.fab} onPress={openPanel} activeOpacity={0.9}>
                    <Ionicons name="chatbubbles" size={24} color={COLORS.white} />
                </TouchableOpacity>
            )}

            <Modal visible={isVisible} transparent animationType="none" onRequestClose={closePanel}>
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closePanel} />
                    
                    <Animated.View style={[styles.widgetContainer, {
                        opacity: opacityAnim,
                        transform: [
                            { scale: scaleAnim },
                            { translateY: translateYAnim }
                        ]
                    }]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerTitleContainer}>
                                <View style={styles.headerIconBg}>
                                    <Image 
                                        source={require('../../../../assets/medix-app-icon.png')} 
                                        style={{width: '100%', height: '100%'}} 
                                        resizeMode="cover"
                                    />
                                </View>
                                <View>
                                    <Text style={styles.headerTitle}>Medix AI Assistant</Text>
                                    <Text style={styles.headerSubtitle}>● Online & Ready</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={closePanel} style={styles.closeBtn}>
                                <Ionicons name="close" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Chat Area */}
                        <ScrollView 
                            ref={scrollViewRef}
                            style={styles.chatArea} 
                            contentContainerStyle={{ paddingBottom: 40 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {messages.map((msg) => (
                                <View key={msg.id} style={[
                                    styles.messageBubble, 
                                    msg.type === 'user' ? styles.userBubble : styles.botBubble
                                ]}>
                                    <Text style={[
                                        styles.messageText,
                                        msg.type === 'user' ? styles.userMessageText : styles.botMessageText
                                    ]}>{msg.text}</Text>
                                </View>
                            ))}
                            
                            {isTyping && (
                                <View style={[styles.messageBubble, styles.botBubble, { paddingVertical: 14, width: 60 }]}>
                                    <TypingIndicator />
                                </View>
                            )}

                            {/* Options List */}
                            {showOptions && (
                                <View style={styles.optionsContainer}>
                                    <Text style={styles.optionsTitle}>Select an option to ask:</Text>
                                    <View style={styles.optionsWrapper}>
                                        {MENU_OPTIONS.map(option => (
                                            <TouchableOpacity 
                                                key={option.id} 
                                                style={styles.optionChip}
                                                onPress={() => handleOptionSelect(option)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.optionText}>{option.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primaryDark,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 9999,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    widgetContainer: {
        position: 'absolute',
        bottom: SPACING.xl,
        right: SPACING.xl,
        width: Math.min(420, width * 0.9),
        height: Math.min(650, height * 0.8),
        backgroundColor: '#1E2B25', // Dark green matching the image
        borderRadius: 8,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 15,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: '#2A3C34',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIconBg: {
        width: 32,
        height: 32,
        backgroundColor: '#FFFFFF', 
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 11,
        color: '#2DD4BF', // Bright green for "Online & Ready"
        marginTop: 2,
        fontWeight: '500',
    },
    closeBtn: {
        padding: 4,
    },
    chatArea: {
        flex: 1,
        padding: SPACING.lg,
    },
    messageBubble: {
        padding: 14,
        borderRadius: 8,
        marginBottom: SPACING.md,
    },
    botBubble: {
        alignSelf: 'stretch', // Takes full width like the image
        backgroundColor: '#2A3C34',
        borderWidth: 1,
        borderColor: '#364D43',
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#1C5C4A',
        maxWidth: '85%',
    },
    messageText: {
        fontSize: 13,
        lineHeight: 22,
    },
    botMessageText: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    userMessageText: {
        color: '#FFFFFF',
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
    },
    optionsContainer: {
        marginTop: SPACING.sm,
    },
    optionsTitle: {
        fontSize: 13,
        color: '#FFFFFF',
        marginBottom: 12,
        fontWeight: '600',
    },
    optionsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optionChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#4A5D54',
        backgroundColor: 'transparent',
    },
    optionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    }
});
