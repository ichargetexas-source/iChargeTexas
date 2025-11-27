import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useTheme, COLOR_SCHEMES } from "@/constants/themeContext";
import * as ImagePicker from "expo-image-picker";
import { Check, Upload, Palette, Type, Image as ImageIcon, Save } from "lucide-react-native";

export default function CustomizationScreen() {
  const { theme, colors, setTheme } = useTheme();
  const [businessNameInput, setBusinessNameInput] = useState(theme.businessName);
  const [selectedSchemeId, setSelectedSchemeId] = useState(theme.colorScheme.id);
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState<string | null>(theme.backgroundImage);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);



  const handlePickImage = async () => {
    if (Platform.OS === 'web') {
      Alert.alert("Not Available", "Image upload is not available on web. Please provide an image URL.");
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedBackgroundImage(result.assets[0].uri);
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveBackground = () => {
    Alert.alert(
      "Remove Background",
      "Are you sure you want to remove the background image?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => {
            setSelectedBackgroundImage(null);
            setHasUnsavedChanges(true);
          }
        }
      ]
    );
  };

  const handleSelectColorScheme = (schemeId: string) => {
    setSelectedSchemeId(schemeId);
    setHasUnsavedChanges(true);
  };

  const handleSaveAllChanges = async () => {
    const selectedScheme = COLOR_SCHEMES.find(s => s.id === selectedSchemeId);
    if (!selectedScheme) {
      Alert.alert("Error", "Invalid color scheme selected");
      return;
    }

    if (!businessNameInput.trim()) {
      Alert.alert("Error", "Business name cannot be empty");
      return;
    }

    try {
      await setTheme({
        businessName: businessNameInput.trim(),
        backgroundImage: selectedBackgroundImage,
        colorScheme: selectedScheme,
      });
      setHasUnsavedChanges(false);
      Alert.alert("Success", "All changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Type size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Business Name
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            This name will appear at the top of your application
          </Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.surface, 
              borderColor: colors.border,
              color: colors.text 
            }]}
            value={businessNameInput}
            onChangeText={(text) => {
              setBusinessNameInput(text);
              setHasUnsavedChanges(true);
            }}
            placeholder="Enter business name"
            placeholderTextColor={colors.textTertiary}
          />

        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ImageIcon size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Background Image
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Customize the background of your application
          </Text>
          
          {selectedBackgroundImage ? (
            <View style={styles.imagePreview}>
              <Text style={[styles.imagePreviewText, { color: colors.textSecondary }]}>
                Background image is set
              </Text>
              <TouchableOpacity
                style={[styles.buttonSecondary, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.error,
                  borderWidth: 1 
                }]}
                onPress={handleRemoveBackground}
              >
                <Text style={[styles.buttonTextSecondary, { color: colors.error }]}>
                  Remove Background
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
          
          <TouchableOpacity
            style={[styles.buttonSecondary, { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1 
            }]}
            onPress={handlePickImage}
          >
            <Upload size={20} color={colors.primary} />
            <Text style={[styles.buttonTextSecondary, { color: colors.text, marginLeft: 8 }]}>
              {selectedBackgroundImage ? "Change Background Image" : "Upload Background Image"}
            </Text>
          </TouchableOpacity>
          
          {Platform.OS === 'web' && (
            <Text style={[styles.note, { color: colors.textTertiary }]}>
              Note: Image upload is not available on web
            </Text>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Palette size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Color Scheme
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Choose a color palette for your application
          </Text>
          
          <View style={styles.colorGrid}>
            {COLOR_SCHEMES.map((scheme) => (
              <TouchableOpacity
                key={scheme.id}
                style={[
                  styles.colorCard,
                  { 
                    backgroundColor: colors.surface,
                    borderColor: selectedSchemeId === scheme.id ? colors.primary : colors.border,
                    borderWidth: selectedSchemeId === scheme.id ? 2 : 1,
                  }
                ]}
                onPress={() => handleSelectColorScheme(scheme.id)}
              >
                <View style={styles.colorPreview}>
                  <View style={[styles.colorSwatch, { backgroundColor: scheme.primary }]} />
                  <View style={[styles.colorSwatch, { backgroundColor: scheme.secondary }]} />
                  <View style={[styles.colorSwatch, { backgroundColor: scheme.accent }]} />
                  <View style={[styles.colorSwatch, { backgroundColor: scheme.background }]} />
                </View>
                <View style={styles.colorInfo}>
                  <Text style={[styles.colorName, { color: colors.text }]}>
                    {scheme.name}
                  </Text>
                  {selectedSchemeId === scheme.id && (
                    <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                      <Check size={14} color={colors.white} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.section}>
          <Text style={[styles.previewTitle, { color: colors.text }]}>
            Preview
          </Text>
          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.previewHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.previewHeaderText, { color: colors.text }]}>
                {businessNameInput || "Business Name"}
              </Text>
            </View>
            <View style={styles.previewContent}>
              <View style={[styles.previewButton, { backgroundColor: colors.primary }]}>
                <Text style={[styles.previewButtonText, { color: colors.white }]}>
                  Primary Button
                </Text>
              </View>
              <View style={[styles.previewButton, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.previewButtonText, { color: colors.white }]}>
                  Secondary Button
                </Text>
              </View>
              <View style={[styles.previewCard2, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                <Text style={[styles.previewText, { color: colors.text }]}>
                  Sample Card
                </Text>
                <Text style={[styles.previewTextSecondary, { color: colors.textSecondary }]}>
                  This is how your content will look
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            { 
              backgroundColor: hasUnsavedChanges ? colors.primary : colors.border,
            }
          ]}
          onPress={handleSaveAllChanges}
          disabled={!hasUnsavedChanges}
        >
          <Save size={20} color={colors.white} />
          <Text style={[styles.saveButtonText, { color: colors.white }]}>
            {hasUnsavedChanges ? "Save All Changes" : "No Changes to Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  buttonSecondary: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  colorGrid: {
    gap: 12,
  },
  colorCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  colorPreview: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  colorSwatch: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  colorInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colorName: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreview: {
    marginBottom: 12,
  },
  imagePreviewText: {
    fontSize: 14,
    marginBottom: 8,
  },
  note: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic" as const,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 16,
  },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  previewHeaderText: {
    fontSize: 18,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  previewContent: {
    padding: 16,
    gap: 12,
  },
  previewButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  previewCard2: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  previewText: {
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  previewTextSecondary: {
    fontSize: 12,
  },
  saveButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
});
