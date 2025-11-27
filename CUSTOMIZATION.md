# Customization Features

This application now includes comprehensive customization features for administrators and super administrators.

## Features

### 1. Business Name
- Change the business name that appears at the top of the application
- Updates in real-time across all screens
- Stored persistently in AsyncStorage

### 2. Background Image
- Upload a custom background image for your application
- Supports image selection from device gallery (mobile only)
- Can remove background to return to default
- **Note**: Image upload is currently not available on web platform

### 3. Color Schemes
Choose from 8 professionally designed color palettes:
- **Classic Red** - The original iChargeTexas theme
- **Ocean Blue** - Cool, professional blue tones
- **Forest Green** - Natural, calming green palette
- **Royal Purple** - Bold, luxurious purple theme
- **Sunset Orange** - Warm, energetic orange theme
- **Midnight Blue** - Deep, sophisticated blue-black
- **Rose Gold** - Elegant pink and gold tones
- **Emerald Light** - Light, fresh green theme (light mode)

### 4. Live Preview
- See your changes in real-time with the preview section
- Test how buttons, cards, and text will look with your chosen theme

## How to Access

1. Log in as an admin or super admin
2. Navigate to the "Customization" tab at the bottom of the screen
3. Make your changes
4. Changes are saved automatically and applied immediately

## Technical Implementation

### Theme Context
- Uses `@nkzw/create-context-hook` for state management
- Stores theme settings in AsyncStorage
- Provides theme colors throughout the app via `useTheme()` hook

### Integration
- Theme context wraps the entire application in `app/_layout.tsx`
- Tab layout uses dynamic colors from theme context
- Business name updates automatically in headers

### Files Modified
- `constants/themeContext.tsx` - Theme state management
- `app/_layout.tsx` - Theme context provider
- `app/(tabs)/_layout.tsx` - Dynamic header and tab colors
- `app/(tabs)/customization.tsx` - Customization UI

## Future Enhancements
- Web-based image upload support
- Custom color picker for individual color values
- Logo upload
- Font customization
- Additional theme presets
- Export/import theme configurations

## Multi-Tenancy Support
Each tenant can have their own:
- Business name
- Background image
- Color scheme
- These settings are stored per tenant and persist across sessions
