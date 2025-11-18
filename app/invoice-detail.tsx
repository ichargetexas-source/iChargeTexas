import { useService } from "@/constants/serviceContext";
import { useMessenger } from "@/constants/messengerContext";
import { ServiceRequest } from "@/constants/types";
import { roadsideServices, isAfterHours, RoadsideService } from "@/constants/serviceData";
import colors from "@/constants/colors";
import { createStripeInvoice } from "@/constants/stripe";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import {
  Truck,
  BatteryCharging,
  MapPin,
  Calendar,
  CreditCard,
  X,
  Copy,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Check,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LineItem = {
  id: string;
  description: string;
  amount: number;
  quantity: number;
};

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const { requests } = useService();
  const { messages: staffMessages } = useMessenger();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const invoice = requests.find((r) => r.id === id);
  
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (invoice?.selectedServices && invoice.selectedServices.length > 0) {
      return invoice.selectedServices.map((service, index) => ({
        id: `service-${index}`,
        description: `${service.serviceName}${service.isAfterHours ? ' (After Hours)' : ''}`,
        amount: service.price,
        quantity: 1,
      }));
    }
    return [];
  });
  
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
  };
  
  const calculateTax = () => {
    return calculateSubtotal() * 0.0825;
  };
  
  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };
  
  const handleAddService = (service: RoadsideService) => {
    const afterHours = isAfterHours();
    const price = afterHours ? service.afterHoursPrice : service.basePrice;
    const totalPrice = price + service.travelFee;
    
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: `${service.name}${afterHours ? ' (After Hours)' : ''}`,
      amount: totalPrice,
      quantity: 1,
    };
    
    setLineItems([...lineItems, newItem]);
    setIsAddingService(false);
    
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  
  const handleRemoveItem = (itemId: string) => {
    Alert.alert(
      "Remove Line Item",
      "Are you sure you want to remove this line item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setLineItems(lineItems.filter(item => item.id !== itemId));
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };
  
  const handleStartEdit = (item: LineItem) => {
    setEditingItemId(item.id);
    setEditDescription(item.description);
    setEditAmount(item.amount.toString());
  };
  
  const handleSaveEdit = (itemId: string) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }
    
    if (!editDescription.trim()) {
      Alert.alert("Invalid Description", "Please enter a description");
      return;
    }
    
    setLineItems(lineItems.map(item => 
      item.id === itemId 
        ? { ...item, description: editDescription.trim(), amount }
        : item
    ));
    
    setEditingItemId(null);
    setEditDescription("");
    setEditAmount("");
    
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditDescription("");
    setEditAmount("");
  };

  if (!invoice) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: "Invoice Not Found",
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invoice not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCreateInvoice = async () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (lineItems.length === 0) {
        Alert.alert("No Line Items", "Please add at least one line item to create an invoice.");
        return;
      }

      const serviceType = invoice.type === "roadside" ? "Roadside Assistance" : "EV Charging";
      
      const invoiceLineItems: Array<{ description: string; amount: number; quantity?: number }> = [
        ...lineItems,
        {
          description: "Tax (8.25%)",
          amount: calculateTax(),
          quantity: 1,
        }
      ];
      
      const totalAmount = calculateTotal();

      console.log("[Invoice] Invoice line items:", JSON.stringify(invoiceLineItems, null, 2));
      console.log("[Invoice] Total amount: $", totalAmount.toFixed(2));

      const allMessengerImages: string[] = [];
      staffMessages.forEach((msg) => {
        if (msg.images && msg.images.length > 0) {
          allMessengerImages.push(...msg.images);
        }
      });
      
      console.log(`[Invoice] Found ${allMessengerImages.length} messenger images to include in invoice`);

      const result = await createStripeInvoice({
        requestId: invoice.id,
        customer: {
          name: invoice.name,
          email: invoice.email,
          phone: invoice.phone,
        },
        serviceType,
        description: `${serviceType} - ${invoice.title}`,
        lineItems: invoiceLineItems,
        totalAmount,
        messengerImages: allMessengerImages.length > 0 ? allMessengerImages : undefined,
      });

      if (result.success && result.invoiceId) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const stripeUrl = `https://dashboard.stripe.com/invoices/${result.invoiceId}`;
        
        try {
          await Linking.openURL(stripeUrl);
          console.log("[Invoice] Opened Stripe invoice URL:", stripeUrl);
        } catch (linkError) {
          console.error("[Invoice] Failed to open Stripe URL:", linkError);
        }

        const itemizedList = invoiceLineItems.map((item, i) => 
          `${i + 1}. ${item.description}: ${item.amount.toFixed(2)}`
        ).join('\n');

        Alert.alert(
          "✅ Invoice Created!",
          `Stripe invoice has been created and sent to ${invoice.email}\n\nTotal: $${totalAmount.toFixed(2)}\n\nItemized:\n${itemizedList}\n\nInvoice ID: ${result.invoiceId}\n\nOpening in Stripe Dashboard...`
        );
      } else {
        Alert.alert(
          "Error Creating Invoice",
          `Failed to create Stripe invoice: ${result.error}\n\nOpening Stripe Dashboard to create manually.`,
          [
            {
              text: "Open Dashboard",
              onPress: async () => {
                const invoiceDescription = `${serviceType} - ${invoice.title} | ${invoice.description || ""}`;
                const invoiceMemo = [
                  `Request ID: ${invoice.id}`,
                  `Service: ${serviceType}`,
                  invoice.description ? `Details: ${invoice.description}` : null,
                  invoice.vehicleInfo ? `Vehicle: ${invoice.vehicleInfo}` : null,
                  invoice.location.address ? `Service Address: ${invoice.location.address}` : `GPS: ${invoice.location.latitude.toFixed(6)}, ${invoice.location.longitude.toFixed(6)}`,
                  `Schedule: ${invoice.preferredDate || "ASAP"}${invoice.preferredTime ? ` at ${invoice.preferredTime}` : ""}`,
                  invoice.adminNote ? `Notes: ${invoice.adminNote}` : null,
                ].filter(Boolean).join("\n");

                const stripeUrl = `https://dashboard.stripe.com/invoices/create?` +
                  `customer_email=${encodeURIComponent(invoice.email)}` +
                  `&customer_name=${encodeURIComponent(invoice.email)}` +
                  `${invoice.phone ? `&customer_phone=${encodeURIComponent(invoice.phone)}` : ""}` +
                  `&description=${encodeURIComponent(invoiceDescription)}` +
                  `&memo=${encodeURIComponent(invoiceMemo)}`;
                
                await Linking.openURL(stripeUrl);
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }
    } catch (error) {
      console.error("[Invoice] Error creating Stripe invoice:", error);
      Alert.alert(
        "Error",
        "Failed to create Stripe invoice. Please try again or create manually in Stripe Dashboard."
      );
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Invoice Details",
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerLeft: () => (
            <TouchableOpacity
              style={styles.headerBackButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color={colors.white} size={24} />
              <Text style={styles.headerBackText}>Back</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.invoiceContainer}>
          <View style={styles.invoiceHeaderSection}>
            <Text style={styles.invoiceTitle}>{invoice.title}</Text>
            <View style={styles.invoiceMetaRow}>
              <View style={[styles.invoiceTypeBadge, { backgroundColor: invoice.type === 'roadside' ? colors.roadside + '20' : colors.charging + '20' }]}>
                {invoice.type === 'roadside' ? (
                  <Truck color={colors.roadside} size={16} />
                ) : (
                  <BatteryCharging color={colors.charging} size={16} />
                )}
                <Text style={[styles.invoiceTypeBadgeText, { color: invoice.type === 'roadside' ? colors.roadside : colors.charging }]}>
                  {invoice.type === 'roadside' ? 'Roadside Assistance' : 'EV Charging'}
                </Text>
              </View>
            </View>
            <Text style={styles.invoiceRequestId}>Request ID: {invoice.id}</Text>
          </View>

          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceSectionTitle}>Customer Information</Text>
            <View style={styles.invoiceInfoRow}>
              <Text style={styles.invoiceInfoLabel}>Name:</Text>
              <Text style={styles.invoiceInfoValue}>{invoice.name}</Text>
            </View>
            <View style={styles.invoiceInfoRow}>
              <Text style={styles.invoiceInfoLabel}>Email:</Text>
              <Text style={styles.invoiceInfoValue}>{invoice.email}</Text>
            </View>
            <View style={styles.invoiceInfoRow}>
              <Text style={styles.invoiceInfoLabel}>Phone:</Text>
              <Text style={styles.invoiceInfoValue}>{invoice.phone}</Text>
            </View>
          </View>

          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceSectionTitle}>Service Details</Text>
            <View style={styles.invoiceInfoRow}>
              <Text style={styles.invoiceInfoLabel}>Description:</Text>
              <Text style={styles.invoiceInfoValue}>{invoice.description}</Text>
            </View>
            {invoice.vehicleInfo && (
              <View style={styles.invoiceInfoRow}>
                <Text style={styles.invoiceInfoLabel}>Vehicle:</Text>
                <Text style={styles.invoiceInfoValue}>{invoice.vehicleInfo}</Text>
              </View>
            )}
            <View style={styles.invoiceInfoRow}>
              <Text style={styles.invoiceInfoLabel}>Spare Tire:</Text>
              <Text style={styles.invoiceInfoValue}>{invoice.hasSpareTire ? 'Yes' : 'No'}</Text>
            </View>
          </View>

          <View style={styles.invoiceSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.invoiceSectionTitle}>Line Items</Text>
              <TouchableOpacity
                style={styles.addServiceButton}
                onPress={() => setIsAddingService(true)}
              >
                <Plus color={colors.white} size={18} />
                <Text style={styles.addServiceButtonText}>Add Service</Text>
              </TouchableOpacity>
            </View>
            
            {lineItems.length === 0 ? (
              <View style={styles.emptyLineItems}>
                <Text style={styles.emptyLineItemsText}>No line items added yet. Click "Add Service" to get started.</Text>
              </View>
            ) : (
              <>
                {lineItems.map((item) => (
                  <View key={item.id} style={styles.lineItemRow}>
                    {editingItemId === item.id ? (
                      <View style={styles.lineItemEditContainer}>
                        <TextInput
                          style={styles.lineItemEditDescription}
                          value={editDescription}
                          onChangeText={setEditDescription}
                          placeholder="Description"
                          placeholderTextColor={colors.textTertiary}
                        />
                        <TextInput
                          style={styles.lineItemEditAmount}
                          value={editAmount}
                          onChangeText={setEditAmount}
                          placeholder="0.00"
                          keyboardType="decimal-pad"
                          placeholderTextColor={colors.textTertiary}
                        />
                        <View style={styles.lineItemEditActions}>
                          <TouchableOpacity
                            style={styles.lineItemSaveButton}
                            onPress={() => handleSaveEdit(item.id)}
                          >
                            <Check color={colors.white} size={16} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.lineItemCancelButton}
                            onPress={handleCancelEdit}
                          >
                            <X color={colors.white} size={16} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.lineItemInfo}>
                          <Text style={styles.lineItemDescription}>{item.description}</Text>
                          <Text style={styles.lineItemQuantity}>Qty: {item.quantity}</Text>
                        </View>
                        <View style={styles.lineItemActions}>
                          <Text style={styles.lineItemPrice}>${item.amount.toFixed(2)}</Text>
                          <TouchableOpacity
                            style={styles.lineItemEditButton}
                            onPress={() => handleStartEdit(item)}
                          >
                            <Edit2 color={colors.primary} size={16} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.lineItemRemoveButton}
                            onPress={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 color={colors.error} size={16} />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                ))}
                
                <View style={styles.invoiceSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal:</Text>
                    <Text style={styles.summaryValue}>${calculateSubtotal().toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tax (8.25%):</Text>
                    <Text style={styles.summaryValue}>${calculateTax().toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryTotalRow}>
                    <Text style={styles.summaryTotalLabel}>Total:</Text>
                    <Text style={styles.summaryTotalValue}>${calculateTotal().toFixed(2)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceSectionTitle}>Location</Text>
            {invoice.location.address && (
              <View style={styles.invoiceInfoRow}>
                <Text style={styles.invoiceInfoLabel}>Address:</Text>
                <Text style={styles.invoiceInfoValue}>{invoice.location.address}</Text>
              </View>
            )}
            <View style={styles.invoiceInfoRow}>
              <Text style={styles.invoiceInfoLabel}>Coordinates:</Text>
              <Text style={styles.invoiceInfoValue}>
                {invoice.location.latitude.toFixed(6)}, {invoice.location.longitude.toFixed(6)}
              </Text>
            </View>
          </View>

          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceSectionTitle}>Schedule</Text>
            <View style={styles.invoiceInfoRow}>
              <Text style={styles.invoiceInfoLabel}>Date:</Text>
              <Text style={styles.invoiceInfoValue}>{invoice.preferredDate || 'ASAP'}</Text>
            </View>
            {invoice.preferredTime && (
              <View style={styles.invoiceInfoRow}>
                <Text style={styles.invoiceInfoLabel}>Time:</Text>
                <Text style={styles.invoiceInfoValue}>{invoice.preferredTime}</Text>
              </View>
            )}
          </View>

          {invoice.adminNote && (
            <View style={styles.invoiceSection}>
              <Text style={styles.invoiceSectionTitle}>Admin Note</Text>
              <Text style={styles.invoiceNoteText}>{invoice.adminNote}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.createInvoiceButton,
              lineItems.length === 0 && styles.createInvoiceButtonDisabled
            ]}
            onPress={handleCreateInvoice}
            activeOpacity={0.8}
            disabled={lineItems.length === 0}
          >
            <CreditCard color={colors.white} size={24} />
            <Text style={styles.createInvoiceButtonText}>Create Stripe Invoice</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <Modal
        visible={isAddingService}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddingService(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Service</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsAddingService(false)}
              >
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.serviceList}>
              {roadsideServices.map((service) => {
                const afterHours = isAfterHours();
                const price = afterHours ? service.afterHoursPrice : service.basePrice;
                const totalPrice = price + service.travelFee;
                
                return (
                  <TouchableOpacity
                    key={service.id}
                    style={styles.serviceItem}
                    onPress={() => handleAddService(service)}
                  >
                    <View style={styles.serviceItemInfo}>
                      <Text style={styles.serviceItemName}>{service.name}</Text>
                      {afterHours && (
                        <Text style={styles.afterHoursBadge}>After Hours</Text>
                      )}
                      <Text style={styles.serviceItemBreakdown}>
                        Base: ${price.toFixed(2)} + Travel: ${service.travelFee.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.serviceItemPrice}>${totalPrice.toFixed(2)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: colors.error,
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
  headerBackButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingRight: 16,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.white,
  },
  invoiceContainer: {
    gap: 20,
  },
  invoiceHeaderSection: {
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 12,
  },
  invoiceMetaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 8,
  },
  invoiceTypeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  invoiceTypeBadgeText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  invoiceRequestId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  invoiceSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  invoiceSectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.primary,
    marginBottom: 12,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  invoiceInfoRow: {
    flexDirection: "row" as const,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "40",
  },
  invoiceInfoLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    width: 120,
  },
  invoiceInfoValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  invoiceServiceRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    marginBottom: 8,
  },
  invoiceServiceInfo: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  invoiceServiceName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },
  invoiceAfterHoursBadge: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.warning,
    backgroundColor: colors.warning + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    textTransform: "uppercase" as const,
  },
  invoiceServicePrice: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.success,
  },
  invoiceTotalRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  invoiceTotalLabel: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  invoiceTotalValue: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  invoiceNoteText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    backgroundColor: colors.surfaceLight,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  createInvoiceButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: "#635BFF",
    borderRadius: 12,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  createInvoiceButtonText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.white,
  },
  createInvoiceButtonDisabled: {
    opacity: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 16,
  },
  addServiceButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.success,
    borderRadius: 8,
  },
  addServiceButtonText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.white,
  },
  emptyLineItems: {
    paddingVertical: 32,
    alignItems: "center" as const,
  },
  emptyLineItemsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center" as const,
  },
  lineItemRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    marginBottom: 8,
  },
  lineItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  lineItemDescription: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 2,
  },
  lineItemQuantity: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  lineItemActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  lineItemPrice: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.success,
    marginRight: 8,
  },
  lineItemEditButton: {
    padding: 8,
    backgroundColor: colors.primary + "20",
    borderRadius: 6,
  },
  lineItemRemoveButton: {
    padding: 8,
    backgroundColor: colors.error + "20",
    borderRadius: 6,
  },
  lineItemEditContainer: {
    flex: 1,
    gap: 8,
  },
  lineItemEditDescription: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineItemEditAmount: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineItemEditActions: {
    flexDirection: "row" as const,
    gap: 8,
  },
  lineItemSaveButton: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.success,
    borderRadius: 8,
    alignItems: "center" as const,
  },
  lineItemCancelButton: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.error,
    borderRadius: 8,
    alignItems: "center" as const,
  },
  invoiceSummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },
  summaryTotalRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end" as const,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  serviceList: {
    maxHeight: 500,
  },
  serviceItem: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceItemName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 4,
  },
  serviceItemBreakdown: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  serviceItemPrice: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.success,
  },
  afterHoursBadge: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.warning,
    backgroundColor: colors.warning + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    textTransform: "uppercase" as const,
    alignSelf: "flex-start" as const,
    marginTop: 4,
  },
});
