/**
 * SeniorShield Subscription Screen
 * 
 * Displays all 5 payment options:
 * - Stripe (Credit Card) - ACTIVE
 * - Verizon - Coming Soon
 * - AT&T - Coming Soon
 * - T-Mobile - Coming Soon
 * - Medicare Advantage - Coming Soon
 * 
 * Location: app/subscription.tsx
 * 
 * Design Philosophy:
 * - Clear visual hierarchy showing Stripe as the active option
 * - Disabled state for "Coming Soon" options (grayed out)
 * - Large touch targets for senior accessibility
 * - Warm, reassuring copy
 * - Progress indication (step 2 of 3)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

const { width } = Dimensions.get('window');

type PaymentMethod = 'stripe' | 'verizon' | 'att' | 'tmobile' | 'medicare';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
  price: string;
  status: 'active' | 'coming-soon';
  color: string;
  backgroundColor: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'stripe',
    name: 'Credit Card',
    icon: 'card',
    description: 'Pay securely with Visa, Mastercard, or American Express',
    price: '$12.99/month',
    status: 'active',
    color: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  {
    id: 'verizon',
    name: 'Verizon',
    icon: 'phone-portrait',
    description: 'Add to your Verizon bill',
    price: '$5.99/month',
    status: 'coming-soon',
    color: '#D41F16',
    backgroundColor: '#FEE2E2',
  },
  {
    id: 'att',
    name: 'AT&T',
    icon: 'phone-portrait',
    description: 'Add to your AT&T bill',
    price: '$5.99/month',
    status: 'coming-soon',
    color: '#0066CC',
    backgroundColor: '#DBEAFE',
  },
  {
    id: 'tmobile',
    name: 'T-Mobile',
    icon: 'phone-portrait',
    description: 'Add to your T-Mobile bill',
    price: '$5.99/month',
    status: 'coming-soon',
    color: '#E20074',
    backgroundColor: '#FCE7F3',
  },
  {
    id: 'medicare',
    name: 'Medicare Advantage',
    icon: 'shield-checkmark',
    description: 'Covered by your Medicare plan',
    price: 'Free - $5 copay',
    status: 'coming-soon',
    color: '#059669',
    backgroundColor: '#ECFDF5',
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('stripe');
  const [loading, setLoading] = useState(false);

  const handleSelectMethod = (method: PaymentMethod) => {
    const option = PAYMENT_OPTIONS.find((o) => o.id === method);
    if (option?.status === 'coming-soon') {
      Alert.alert(
        'Coming Soon',
        `${option.name} integration is coming soon. We'll notify you when it's available.\n\nFor now, please select Credit Card to get started.`,
        [{ text: 'OK' }]
      );
      return;
    }
    setSelectedMethod(method);
  };

  const handleContinue = async () => {
    if (selectedMethod === 'stripe') {
      // Navigate to Stripe checkout
      // This will be implemented when Stripe environment variables are configured
      try {
        setLoading(true);
        
        // Call backend to create Stripe checkout session
        const response = await api.post('/api/billing/stripe/checkout', {
          userId: user?.id,
          priceId: 'price_monthly', // Will be updated with actual Stripe price ID
          successUrl: 'seniorship://subscription/success',
          cancelUrl: 'seniorship://subscription/cancel',
        });

        if (response.data?.url) {
          // Open Stripe checkout URL
          // For web preview: router.push(response.data.url);
          // For native: use react-native-url-polyfill or expo-web-browser
          Alert.alert(
            'Stripe Checkout',
            'Stripe checkout URL ready. Implementation pending environment variable setup.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        Alert.alert(
          'Error',
          'Failed to initiate checkout. Please try again.',
          [{ text: 'OK' }]
        );
        console.error('Checkout error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleContactSales = (method: PaymentMethod) => {
    const option = PAYMENT_OPTIONS.find((o) => o.id === method);
    Alert.alert(
      'Contact Sales',
      `Interested in ${option?.name} integration?\n\nEmail us at sales@seniorshield.app`,
      [
        {
          text: 'Copy Email',
          onPress: () => {
            // Copy to clipboard
            Alert.alert('Email copied to clipboard');
          },
        },
        { text: 'Cancel' },
      ]
    );
  };

  return (
    <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Payment Method</Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Step 2 of 3</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: '66%' }]} />
        </View>

        {/* Headline */}
        <View style={styles.headlineSection}>
          <Text style={styles.headline}>Unlock Premium Features</Text>
          <Text style={styles.subheadline}>
            Get scam detection, family alerts, and 24/7 voice assistance
          </Text>
        </View>

        {/* Payment Options */}
        <View style={styles.optionsContainer}>
          {PAYMENT_OPTIONS.map((option) => (
            <PaymentOptionCard
              key={option.id}
              option={option}
              isSelected={selectedMethod === option.id}
              onSelect={() => handleSelectMethod(option.id)}
              onContactSales={() => handleContactSales(option.id)}
            />
          ))}
        </View>

        {/* Selected Option Details */}
        {selectedMethod === 'stripe' && (
          <View style={styles.detailsSection}>
            <LinearGradient
              colors={['#EEF2FF', '#E0E7FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.detailsCard}
            >
              <View style={styles.detailsHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#6366F1" />
                <Text style={styles.detailsTitle}>Secure Payment</Text>
              </View>
              <Text style={styles.detailsText}>
                Your payment information is encrypted and secured by Stripe, the world's most trusted payment processor.
              </Text>
              <View style={styles.detailsList}>
                <DetailItem icon="lock-closed" text="256-bit SSL encryption" />
                <DetailItem icon="shield-checkmark" text="PCI DSS compliant" />
                <DetailItem icon="checkmark" text="Money-back guarantee" />
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Billing Info */}
        <View style={styles.billingSection}>
          <Text style={styles.billingLabel}>Billing Details</Text>
          <View style={styles.billingCard}>
            <View style={styles.billingRow}>
              <Text style={styles.billingKey}>Plan</Text>
              <Text style={styles.billingValue}>Premium Monthly</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.billingRow}>
              <Text style={styles.billingKey}>Price</Text>
              <Text style={styles.billingValue}>$12.99/month</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.billingRow}>
              <Text style={styles.billingKey}>Renewal</Text>
              <Text style={styles.billingValue}>Auto-renews monthly</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.billingRow}>
              <Text style={styles.billingKey}>Cancel Anytime</Text>
              <Ionicons name="checkmark" size={20} color="#059669" />
            </View>
          </View>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue to Payment</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

/**
 * Individual Payment Option Card Component
 */
interface PaymentOptionCardProps {
  option: PaymentOption;
  isSelected: boolean;
  onSelect: () => void;
  onContactSales: () => void;
}

function PaymentOptionCard({
  option,
  isSelected,
  onSelect,
  onContactSales,
}: PaymentOptionCardProps) {
  const isComingSoon = option.status === 'coming-soon';

  return (
    <TouchableOpacity
      style={[
        styles.optionCard,
        isSelected && !isComingSoon && styles.optionCardSelected,
        isComingSoon && styles.optionCardDisabled,
      ]}
      onPress={onSelect}
      disabled={isComingSoon}
    >
      {/* Selection Indicator */}
      {!isComingSoon && (
        <View style={styles.selectionIndicator}>
          {isSelected && (
            <View style={styles.selectionDot}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>
      )}

      {/* Coming Soon Badge */}
      {isComingSoon && (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>
      )}

      {/* Card Content */}
      <View style={styles.optionContent}>
        {/* Icon and Name */}
        <View style={styles.optionHeader}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: option.backgroundColor,
                opacity: isComingSoon ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons
              name={option.icon as any}
              size={24}
              color={option.color}
            />
          </View>
          <View style={styles.optionInfo}>
            <Text
              style={[
                styles.optionName,
                isComingSoon && styles.optionNameDisabled,
              ]}
            >
              {option.name}
            </Text>
            <Text
              style={[
                styles.optionDescription,
                isComingSoon && styles.optionDescriptionDisabled,
              ]}
            >
              {option.description}
            </Text>
          </View>
        </View>

        {/* Price and Action */}
        <View style={styles.optionFooter}>
          <Text
            style={[
              styles.optionPrice,
              isComingSoon && styles.optionPriceDisabled,
            ]}
          >
            {option.price}
          </Text>
          {isComingSoon && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={onContactSales}
            >
              <Text style={styles.contactButtonText}>Notify Me</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Detail Item Component (for security details)
 */
interface DetailItemProps {
  icon: string;
  text: string;
}

function DetailItem({ icon, text }: DetailItemProps) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon as any} size={18} color="#6366F1" />
      <Text style={styles.detailItemText}>{text}</Text>
    </View>
  );
}

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
  },
  stepIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // Progress Bar
  progressContainer: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },

  // Headline
  headlineSection: {
    marginBottom: 28,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
  },

  // Options Container
  optionsContainer: {
    marginBottom: 28,
    gap: 12,
  },

  // Option Card
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  optionCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#F8FAFC',
  },
  optionCardDisabled: {
    opacity: 0.6,
  },

  // Selection Indicator
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Coming Soon Badge
  comingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },

  // Option Content
  optionContent: {
    flex: 1,
  },

  // Option Header
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  optionNameDisabled: {
    color: '#94A3B8',
  },
  optionDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  optionDescriptionDisabled: {
    color: '#CBD5E1',
  },

  // Option Footer
  optionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  optionPriceDisabled: {
    color: '#CBD5E1',
  },

  // Contact Button
  contactButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    backgroundColor: '#FFFBEB',
  },
  contactButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },

  // Details Section
  detailsSection: {
    marginBottom: 24,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsList: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItemText: {
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 8,
  },

  // Billing Section
  billingSection: {
    marginBottom: 24,
  },
  billingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  billingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  billingKey: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  billingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },

  // CTA Button
  continueButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Terms
  termsText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
