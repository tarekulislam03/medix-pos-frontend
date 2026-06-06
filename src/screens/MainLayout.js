import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import Sidebar from '../components/Sidebar';
import MainNavigator from '../navigation/MainNavigator';

import { COLORS } from '../constants/theme';
import { useResponsive } from '../utils/responsive';
import { logoutUser } from '../services/authService';
import { AuthContext } from '../context/AuthContext';

const getOperationalDateStr = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
};

const getOperationalTimeStr = (d) => {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    return `${hoursStr}:${minutes} ${ampm}`;
};

export default function MainLayout() {
    const authContext = React.useContext(AuthContext) || {};
    const { signOut } = authContext;
    const navigation = useNavigation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const r = useResponsive();

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    // Derive active route from the child navigator's state
    const activeRoute = useNavigationState((state) => {
        // state is the parent (AppNavigator) state
        // Find the "Main" route in it
        const mainRoute = state?.routes?.find((r) => r.name === 'Main');
        // The child navigator's state lives under mainRoute.state
        const childState = mainRoute?.state;
        if (childState) {
            const activeIndex = childState.index ?? 0;
            return childState.routes?.[activeIndex]?.name ?? 'Billing';
        }
        return 'Billing';
    });

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.log('Logout API failed, clearing local session anyway');
        } finally {
            if (signOut) await signOut();
        }
    };

    return (
        <View style={styles.container}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <View style={styles.topBarBrand}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={{
                                width: 22,
                                height: 22
                            }}
                            resizeMode="contain"
                        />
                        <Text style={styles.topBarTitle}>MediX POS & ERP</Text>
                    </View>
                </View>

                {/* Top Bar Right: Operational Info */}
                <View style={styles.topBarRight}>
                    <Text style={[styles.topBarOperationalInfo, { fontSize: r.isSmall ? 10 : 12 }]}>
                        {getOperationalDateStr(currentTime)} | {getOperationalTimeStr(currentTime)}
                    </Text>
                </View>
            </View>

            {/* Main Area: Sidebar + Content */}
            <View style={styles.mainArea}>
                <Sidebar
                    activeScreen={activeRoute}
                    onNavigate={(screen) => navigation.navigate('Main', { screen })}
                    onLogout={handleLogout}
                />
                <View style={styles.content}>
                    <MainNavigator />
                </View>
            </View>


        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#24312E',
        height: 36,
        paddingHorizontal: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    topBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    hamburgerBtn: {
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        width: 32,
        height: 26,
    },
    topBarBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 4,
    },
    topBarTitle: {
        fontWeight: '500',
        color: COLORS.white,
        fontSize: 14,
        letterSpacing: 1.0,
    },
    topBarDivider: {
        width: 1,
        height: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginHorizontal: 12,
    },
    topBarScreen: {
        fontWeight: '500',
        color: 'rgba(255,255,255,0.7)',
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 4,
    },
    topBarOperationalInfo: {
        color: 'rgba(255, 255, 255, 0.75)',
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    mainArea: {
        flex: 1,
        flexDirection: 'row',
    },
    content: {
        flex: 1,
    },

});
