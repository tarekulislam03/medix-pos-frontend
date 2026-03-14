import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Dimensions,
    Image,
    PixelRatio,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from '../constants/theme';
import GradientButton from '../components/GradientButton';
import { loginUser, registerUser } from '../services/authService';
import { useResponsive } from '../utils/responsive';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
    const { signIn } = React.useContext(AuthContext);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const r = useResponsive();

    const handleAuth = async () => {
        if (!phone.trim() || !password.trim()) {
            setError('Please enter phone and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await loginUser({ phone, password });

            if (response?.token) {
                // Pass storeId object (contains storeName, storePhone) if available
                await signIn(response.token, response.user?.storeId);
            } else {
                setError('Authentication failed. No token received.');
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    // Responsive card width
    const cardWidth = r.pick({
        small: '90%',
        medium: 380,
        large: 420,
        xlarge: 440,
    });

    const cardPadding = r.pick({
        small: SPACING.xl,
        medium: SPACING.xxl,
        large: SPACING.xxxl,
        xlarge: SPACING.xxxl,
    });

    const logoSize = r.pick({ small: 52, medium: 60, large: 68, xlarge: 72 });
    const logoIconSize = r.pick({ small: 28, medium: 32, large: 36, xlarge: 38 });
    const inputHeight = r.pick({ small: 46, medium: 50, large: 52, xlarge: 54 });

    return (
        <LinearGradient
            colors={[COLORS.bgDark, '#E0F2F1', COLORS.bgDark]}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                {/* Decorative background elements */}
                <View style={[styles.decorCircle, styles.circle1]} />
                <View style={[styles.decorCircle, styles.circle2]} />

                <View style={[styles.card, { width: cardWidth, padding: cardPadding }]}>
                    {/* Logo / Brand */}
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={{ width: logoSize * 1.5, height: logoSize * 1.5 }}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={[styles.brand, { fontSize: r.pick({ small: FONT_SIZES.xxl, medium: FONT_SIZES.xxxl, large: FONT_SIZES.xxxl, xlarge: FONT_SIZES.xxxl }) }]}>MediX</Text>
                    <Text style={styles.subtitle}>Login to your store</Text>

                    {/* Error */}
                    {error ? (
                        <View style={styles.errorBox}>
                            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* Phone Input */}
                    <View style={[styles.inputGroup, { height: inputHeight }]}>
                        <Ionicons
                            name="call-outline"
                            size={18}
                            color={COLORS.textMuted}
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            placeholderTextColor={COLORS.textMuted}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {/* Password Input */}
                    <View style={[styles.inputGroup, { height: inputHeight }]}>
                        <Ionicons
                            name="lock-closed-outline"
                            size={18}
                            color={COLORS.textMuted}
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={COLORS.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={18}
                                color={COLORS.textMuted}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Auth Button */}
                    <GradientButton
                        title="Sign In"
                        onPress={handleAuth}
                        loading={loading}
                        style={styles.authBtn}
                        icon={<Ionicons name="log-in-outline" size={20} color={COLORS.white} />}
                    />

                    <Text style={styles.footerText}>
                        MediX POS v1.0 • Secure Authentication
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    decorCircle: {
        position: 'absolute',
        borderRadius: 999,
        opacity: 0.1,
    },
    circle1: {
        width: 500,
        height: 500,
        backgroundColor: COLORS.primaryLight,
        top: -100,
        right: -100,
    },
    circle2: {
        width: 400,
        height: 400,
        backgroundColor: COLORS.accent,
        bottom: -80,
        left: -80,
    },
    card: {
        maxWidth: 500,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.lg,
    },
    logoContainer: {
        marginBottom: SPACING.lg,
    },
    logoGradient: {
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brand: {
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginBottom: SPACING.xxl,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.errorLight,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.sm,
        marginBottom: SPACING.md,
        width: '100%',
        gap: SPACING.sm,
    },
    errorText: {
        color: COLORS.error,
        fontSize: FONT_SIZES.sm,
        fontWeight: '500',
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.md,
        width: '100%',
        marginBottom: SPACING.md,
    },
    inputIcon: {
        marginRight: SPACING.sm,
    },
    input: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
    },
    authBtn: {
        width: '100%',
        marginTop: SPACING.md,
    },
    toggleContainer: {
        marginTop: SPACING.xl,
    },
    toggleText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.sm,
    },
    toggleAction: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    footerText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.xxl,
        letterSpacing: 0.5,
    },
});
