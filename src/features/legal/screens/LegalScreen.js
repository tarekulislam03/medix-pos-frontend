import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity, Linking, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../../core/constants/theme';

export default function LegalScreen() {
    const { width } = useWindowDimensions();
    const isMobile = width < 600;
    const [showPdfModal, setShowPdfModal] = useState(false);

    const handleOpenPDF = () => {
        if (Platform.OS === 'web') {
            setShowPdfModal(true);
        } else {
            Linking.openURL('/registration.pdf').catch(() => {
                alert("PDF document not found or cannot be opened.");
            });
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View>
                        <Text style={styles.title}>Legal Information</Text>
                        <Text style={styles.subtitle}>Terms & Conditions</Text>
                    </View>
                </View>
            </View>

            {/* Content Box */}
            <View style={styles.contentBox}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.heading}>1. Software License & Intellectual Property Rights</Text>
                    <Text style={styles.paragraph}>
                        The Client is granted a non-exclusive, non-transferable, and revocable license to use the Medix Pharmacy ERP & POS Software solely for the purpose of managing its internal pharmacy operations. All intellectual property, including but not limited to the source code, database architecture, user interface design, branding, and trademarks, shall remain the sole and exclusive property of Medix. The Client strictly agrees not to copy, alter, modify, reverse engineer, decompile, redistribute, resell, lease, or commercially exploit the software or any of its constituent parts without acquiring prior written authorization from Medix.
                    </Text>

                    <Text style={styles.heading}>2. Account Access & License Types</Text>
                    <Text style={styles.paragraph}>
                        By possessing active login credentials and accessing the software, the Client acknowledges that their use is governed by one of two statuses: a Full Commercial License or a Free Trial Account. Clients holding a Full Commercial License are fully authorized users who have completed the purchase and possess the official software licensing documents. Conversely, Clients operating under a Free Trial Account are granted temporary access for evaluation purposes only and do not possess official licensing documentation, as a formal commercial purchase has not yet been executed.
                    </Text>

                    <Text style={styles.heading}>3. Free Trial Expiration & Service Blockage</Text>
                    <Text style={styles.paragraph}>
                        For Clients utilizing a Free Trial Account, the temporary access period is strictly time-limited. Upon the expiration of the designated free trial period, the Client is required to purchase an official Full Commercial License to continue utilizing the software's features. Failure to secure an official license by the end of the trial will result in the immediate and automatic blockage of the application. The software will remain entirely inaccessible and locked until an official commercial purchase is finalized and authorized by Medix.
                    </Text>

                    <Text style={styles.heading}>4. Installation, Training & Technical Support</Text>
                    <Text style={styles.paragraph}>
                        Medix is committed to ensuring a smooth onboarding process by providing initial software installation, basic system configuration, and necessary user training to the Client's staff. Medix will also provide reasonable technical support to address critical bugs and usability issues during standard operating hours. Support calls will be received only from 6 PM to 10 PM daily. However, the user can Whatsapp the problem at any time, it will be resolved within 24 hours. Furthermore, Medix reserves the right to periodically deploy software updates, security patches, and new feature enhancements aimed at improving software performance, stability, and security. The Client acknowledges that such maintenance may occasionally necessitate scheduled downtimes and agrees to cooperate during these temporary service interruptions.
                    </Text>

                    <Text style={styles.heading}>5. Client Obligations & Acceptable Use</Text>
                    <Text style={styles.paragraph}>
                        The Client agrees to provide accurate and up-to-date business information required for the proper functioning of the software. It is the absolute responsibility of the Client to maintain adequate hardware infrastructure, a stable internet connection, and to ensure that all user login credentials are kept strictly confidential. The software must be utilized exclusively for lawful business activities. The Client shall not intentionally disrupt the software's network security, inject malicious code, or permit unauthorized third parties to gain access to the administrative dashboard.
                    </Text>

                    <Text style={styles.heading}>6. Data Ownership & Confidentiality</Text>
                    <Text style={styles.paragraph}>
                        All operational data inputted into the software by the Client—including but not limited to financial records, inventory data, supplier details, customer information, and prescription logs—shall remain the exclusive property of the Client. Medix respects the privacy of this data and commits to maintaining strict confidentiality. Medix personnel will only access this data when strictly necessary for technical troubleshooting, system maintenance, software performance monitoring, or when mandated by a lawful order from a recognized government authority.
                    </Text>

                    <Text style={styles.heading}>7. Service Reliability & Limitation of Liability</Text>
                    <Text style={styles.paragraph}>
                        While Medix employs industry best practices to ensure high availability and robust performance, no digital system can be entirely immune to interruptions. The software is provided on an "as-is" and "as-available" basis without absolute guarantees of uninterrupted operation. The Client assumes full responsibility for generating and securely storing periodic backups of their business data. Under no circumstances shall Medix be held liable for any direct, indirect, incidental, or consequential damages—including loss of revenue, data corruption, or business interruption—arising from hardware malfunctions, network outages, user errors, malware attacks, or natural disasters.
                    </Text>

                    <Text style={styles.heading}>8. Suspension & Termination of Service</Text>
                    <Text style={styles.paragraph}>
                        Medix reserves the unilateral right to suspend or permanently terminate the Client's access to the software without prior notice in the event of a material breach of this Agreement. Grounds for immediate termination include, but are not limited to, the use of the software for illegal activities, failure to clear pending subscription dues, or attempting to distribute unauthorized copies of the software. Upon termination, the Client's license is immediately revoked, and they must immediately cease all use of the software.
                    </Text>

                    <Text style={styles.heading}>9. Governing Law & Dispute Resolution</Text>
                    <Text style={styles.paragraph}>
                        This Agreement shall be construed and governed entirely in accordance with the laws of India. Any legal disputes, controversies, or claims arising from or related to the usage of the Medix Pharmacy ERP & POS Software shall be subject to the exclusive jurisdiction of the competent courts located in the district where Medix maintains its principal registered office. This Agreement forms the complete and final understanding between Medix and the Client, superseding all prior oral or written negotiations.
                    </Text>

                    <Text style={styles.heading}>10. Acceptance of Terms & Conditions</Text>
                    <Text style={styles.paragraph}>
                        The ability to view this legal page within the application confirms that the Client has been granted either a Full Commercial License or a Free Trial Account. By accessing and using the software, the Client automatically accepts and agrees to be legally bound by all of the terms and conditions outlined above. Furthermore, the Client acknowledges that these identical agreement terms have been shared, agreed upon, and signed as a binding physical document prior to the deployment of the software.
                    </Text>

                    <Text style={styles.heading}>11. Official Company Documents</Text>
                    <Text style={styles.paragraph}>
                        Below you can find the official government registration and compliance certificates for Medix.
                    </Text>

                    <TouchableOpacity style={styles.pdfButton} onPress={handleOpenPDF}>
                        <Ionicons name="document-attach-outline" size={20} color={COLORS.white} />
                        <Text style={styles.pdfButtonText}>View Government Registration</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* PDF Modal Viewer */}
            <Modal
                visible={showPdfModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPdfModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Government Registration</Text>
                            <TouchableOpacity onPress={() => setShowPdfModal(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        {Platform.OS === 'web' && (
                            <View style={{ flex: 1, backgroundColor: '#E5E7EB' }}>
                                {React.createElement('iframe', {
                                    src: '/registration.pdf',
                                    style: { width: '100%', height: '100%', border: 'none' },
                                    title: 'Government Registration PDF'
                                })}
                            </View>
                        )}
                    </View>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: COLORS.bgSurface,
        height: 52,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    title: {
        fontFamily: FONTS.regular,
        fontSize: 16,
        fontWeight: '400',
        color: COLORS.textPrimary,
    },
    subtitle: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    contentBox: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginTop: 8,
        marginBottom: 20,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: '#CDD5D1',
        overflow: 'hidden',
    },
    scrollContent: {
        padding: 20,
    },
    heading: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        fontWeight: '700',
        color: '#1E2624',
        marginBottom: 8,
    },
    paragraph: {
        fontFamily: FONTS.regular,
        fontSize: 14,
        color: '#263431',
        lineHeight: 22,
        marginBottom: 20,
    },
    pdfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 4,
        marginBottom: 20,
    },
    pdfButtonText: {
        color: COLORS.white,
        fontFamily: FONTS.bold,
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 900,
        height: '90%',
        backgroundColor: COLORS.bgCard,
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.bgSurface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    }
});
