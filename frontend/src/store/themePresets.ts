export interface CustomThemeColors {
  primary: string;      // Primary brand color
  secondary: string;    // Secondary elements
  accent: string;       // Action buttons / links
  accentHover: string;  // Hover state of accent
  sidebar: string;     // Sidebar background
  card: string;        // Card background
  board: string;       // Default board container background (if not overridden)
  textPrimary: string;  // Main text
  textSecondary: string;// Secondary description text
  textMuted: string;    // Muted timestamps/labels
  border: string;       // Card/Column borders
  success: string;      // Success states
  warning: string;      // Warning badges
  danger: string;       // Error/danger alerts
}

export interface CustomThemeBackground {
  type: 'solid' | 'gradient' | 'pattern' | 'image' | 'glassmorphism';
  value: string; // HEX color, CSS gradient (e.g. linear-gradient(...)), CSS pattern class, or image URL
  preview?: string; // Optional short preview color/gradient representation
}

export interface CustomThemePersonalization {
  borderRadius: string;       // CSS border-radius value (e.g. '0px', '4px', '8px', '12px', '16px')
  sidebarDensity: 'compact' | 'comfortable';
  compactMode: boolean;       // Compresses spacing on cards/lists
  fontFamily: string;         // CSS font-family value
  fontSize: 'small' | 'medium' | 'large';
  animationIntensity: 'none' | 'low' | 'normal' | 'high';
}

export interface CustomTheme {
  id: string;
  name: string;
  isPreset: boolean;
  baseMode: 'light' | 'dark'; // Inherits base Tailwind styling from light/dark modes
  colors: CustomThemeColors;
  background: CustomThemeBackground;
  visualStyle: 'flat' | 'glassmorphism' | 'neumorphism' | 'material' | 'enterprise';
  personalization: CustomThemePersonalization;
}

// Background preset assets
export interface BackgroundPreset {
  id: string;
  name: string;
  category: 'solid' | 'gradient' | 'pattern' | 'glassmorphism' | 'wallpaper' | 'minimalist';
  type: 'solid' | 'gradient' | 'pattern' | 'image' | 'glassmorphism';
  value: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  // Solids
  { id: 'solid-slate', name: 'Charcoal Slate', category: 'solid', type: 'solid', value: '#1e293b' },
  { id: 'solid-lavender', name: 'Lavender Mist', category: 'solid', type: 'solid', value: '#e0e7ff' },
  { id: 'solid-mint', name: 'Fresh Mint', category: 'solid', type: 'solid', value: '#ecfdf5' },
  { id: 'solid-rose', name: 'Soft Rose', category: 'solid', type: 'solid', value: '#fff1f2' },
  { id: 'solid-indigo', name: 'Classic Trello Indigo', category: 'solid', type: 'solid', value: '#3b82f6' },

  // Gradients
  { id: 'grad-sunset', name: 'Sunset Glow', category: 'gradient', type: 'gradient', value: 'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)' },
  { id: 'grad-aurora', name: 'Northern Lights', category: 'gradient', type: 'gradient', value: 'linear-gradient(135deg, #10b981, #06b6d4, #6366f1)' },
  { id: 'grad-ocean', name: 'Deep Sea Blue', category: 'gradient', type: 'gradient', value: 'linear-gradient(135deg, #1e3a8a, #0d9488)' },
  { id: 'grad-lavender-dusk', name: 'Lavender Dusk', category: 'gradient', type: 'gradient', value: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)' },
  { id: 'grad-toxic', name: 'Toxic Cyber', category: 'gradient', type: 'gradient', value: 'linear-gradient(135deg, #111827, #06b6d4, #10b981)' },

  // Patterns (using Tailwind inline gradients / pattern classes)
  { id: 'pat-grid', name: 'Blueprint Grid', category: 'pattern', type: 'pattern', value: 'radial-gradient(circle, #3b82f6 1px, transparent 1px) 0 0/24px 24px, #0f172a' },
  { id: 'pat-dots', name: 'Subtle Dotted', category: 'pattern', type: 'pattern', value: 'radial-gradient(#d1d5db 1px, transparent 1px) 0 0/16px 16px, #f9fafb' },
  { id: 'pat-matrix', name: 'Cyber Matrix', category: 'pattern', type: 'pattern', value: 'linear-gradient(rgba(18, 24, 38, 0.95), rgba(18, 24, 38, 0.95)), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16, 185, 129, 0.1) 2px, rgba(16, 185, 129, 0.1) 4px)' },

  // Glassmorphism background templates
  { id: 'glass-aurora', name: 'Glass Aurora Canvas', category: 'glassmorphism', type: 'glassmorphism', value: 'linear-gradient(135deg, rgba(99, 102, 241, 0.8), rgba(168, 85, 247, 0.8), rgba(236, 72, 153, 0.8))' },
  { id: 'glass-dark-frost', name: 'Deep Frost Canvas', category: 'glassmorphism', type: 'glassmorphism', value: 'linear-gradient(135deg, #0f172a, #1e293b)' },

  // Wallpapers (unspash links optimized for speed and productivity)
  { id: 'wall-workspace', name: 'Focus Study Desk', category: 'wallpaper', type: 'image', value: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=2560&q=85' },
  { id: 'wall-landscape', name: 'Foggy Pine Forest', category: 'wallpaper', type: 'image', value: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=2560&q=85' },
  { id: 'wall-mist', name: 'Alpine Peaks', category: 'wallpaper', type: 'image', value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2560&q=85' },
  { id: 'wall-night', name: 'Starry Sky', category: 'wallpaper', type: 'image', value: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=2560&q=85' },
  { id: 'wall-office', name: 'Minimalist Architecture', category: 'wallpaper', type: 'image', value: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2560&q=85' },
  { id: 'wall-sunset', name: 'Ocean Sunset', category: 'wallpaper', type: 'image', value: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2560&q=85' },
  { id: 'wall-cabin', name: 'Snowy Cabin', category: 'wallpaper', type: 'image', value: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=2560&q=85' },
  { id: 'wall-aurora', name: 'Aurora Lights', category: 'wallpaper', type: 'image', value: 'https://images.unsplash.com/photo-1483168527879-c66136b56105?auto=format&fit=crop&w=2560&q=85' },
  { id: 'wall-neon', name: 'Cyberpunk Tokyo', category: 'wallpaper', type: 'image', value: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=2560&q=85' },
  { id: 'wall-dunes', name: 'Desert Dunes', category: 'wallpaper', type: 'image', value: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=2560&q=85' },

  // Minimalist Wallpapers
  { id: 'min-shapes', name: 'Beige Geometry', category: 'minimalist', type: 'image', value: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&w=2560&q=85' },
  { id: 'min-abstract', name: 'Soft Clay Lines', category: 'minimalist', type: 'image', value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2560&q=85' },
  { id: 'min-curve', name: 'Gradient Flow Waves', category: 'minimalist', type: 'image', value: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=2560&q=85' }
];

export const THEME_PRESETS: CustomTheme[] = [
  // 1. Trello Vibrant
  {
    id: 'preset-trello-vibrant',
    name: 'Trello Vibrant',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#0052cc',
      secondary: '#0747a6',
      accent: '#0065ff',
      accentHover: '#0052cc',
      sidebar: '#0747a6',
      card: '#ffffff',
      board: '#0065ff',
      textPrimary: '#172b4d',
      textSecondary: '#44546f',
      textMuted: '#8590a2',
      border: '#dfe1e6',
      success: '#00875a',
      warning: '#ff991f',
      danger: '#de350b'
    },
    background: { type: 'gradient', value: 'linear-gradient(135deg, #0052cc, #00c7e4)' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '6px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 2. Aurora
  {
    id: 'preset-aurora',
    name: 'Aurora',
    isPreset: true,
    baseMode: 'dark',
    colors: {
      primary: '#10b981',
      secondary: '#0f172a',
      accent: '#06b6d4',
      accentHover: '#10b981',
      sidebar: '#0f172a',
      card: 'rgba(15, 23, 42, 0.65)',
      board: '#0f172a',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#64748b',
      border: 'rgba(16, 185, 129, 0.25)',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    background: { type: 'gradient', value: 'linear-gradient(135deg, #020617, #06b6d4, #0f766e, #1e1b4b)' },
    visualStyle: 'glassmorphism',
    personalization: {
      borderRadius: '12px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'high'
    }
  },
  // 3. Sunset
  {
    id: 'preset-sunset',
    name: 'Sunset Glow',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#ea580c',
      secondary: '#fff7ed',
      accent: '#db2777',
      accentHover: '#be185d',
      sidebar: '#431407',
      card: '#ffffff',
      board: '#ffedd5',
      textPrimary: '#431407',
      textSecondary: '#9a3412',
      textMuted: '#c2410c',
      border: '#fed7aa',
      success: '#16a34a',
      warning: '#d97706',
      danger: '#dc2626'
    },
    background: { type: 'gradient', value: 'linear-gradient(135deg, #ea580c, #f43f5e, #db2777)' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '8px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 4. Ocean
  {
    id: 'preset-ocean',
    name: 'Ocean Breeze',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#0891b2',
      secondary: '#ecfeff',
      accent: '#0d9488',
      accentHover: '#0f766e',
      sidebar: '#083344',
      card: '#ffffff',
      board: '#cffafe',
      textPrimary: '#083344',
      textSecondary: '#155e75',
      textMuted: '#0e7490',
      border: '#a5f3fc',
      success: '#0d9488',
      warning: '#d97706',
      danger: '#e11d48'
    },
    background: { type: 'gradient', value: 'linear-gradient(180deg, #0891b2 0%, #0284c7 100%)' },
    visualStyle: 'material',
    personalization: {
      borderRadius: '4px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 5. Cyberpunk
  {
    id: 'preset-cyberpunk',
    name: 'Cyberpunk 2077',
    isPreset: true,
    baseMode: 'dark',
    colors: {
      primary: '#fde047',
      secondary: '#09090b',
      accent: '#f43f5e',
      accentHover: '#fde047',
      sidebar: '#000000',
      card: '#18181b',
      board: '#09090b',
      textPrimary: '#fde047',
      textSecondary: '#f43f5e',
      textMuted: '#a1a1aa',
      border: '#fde047',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#f43f5e'
    },
    background: { type: 'pattern', value: 'linear-gradient(rgba(18, 24, 38, 0.95), rgba(18, 24, 38, 0.95)), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(254, 224, 71, 0.05) 2px, rgba(254, 224, 71, 0.05) 4px)' },
    visualStyle: 'neumorphism',
    personalization: {
      borderRadius: '0px',
      sidebarDensity: 'compact',
      compactMode: true,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 'small',
      animationIntensity: 'high'
    }
  },
  // 6. Forest
  {
    id: 'preset-forest',
    name: 'Forest Sanctuary',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#15803d',
      secondary: '#f0fdf4',
      accent: '#16a34a',
      accentHover: '#15803d',
      sidebar: '#14532d',
      card: '#ffffff',
      board: '#dcfce7',
      textPrimary: '#14532d',
      textSecondary: '#166534',
      textMuted: '#15803d',
      border: '#bbf7d0',
      success: '#16a34a',
      warning: '#eab308',
      danger: '#ef4444'
    },
    background: { type: 'image', value: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=2560&q=85' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '8px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 7. Lavender
  {
    id: 'preset-lavender',
    name: 'Lavender Mist',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#7c3aed',
      secondary: '#faf5ff',
      accent: '#8b5cf6',
      accentHover: '#7c3aed',
      sidebar: '#2e1065',
      card: '#ffffff',
      board: '#f3e8ff',
      textPrimary: '#2e1065',
      textSecondary: '#5b21b6',
      textMuted: '#7c3aed',
      border: '#e9d5ff',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    background: { type: 'solid', value: '#faf5ff' },
    visualStyle: 'glassmorphism',
    personalization: {
      borderRadius: '16px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 8. Productivity Pro
  {
    id: 'preset-productivity-pro',
    name: 'Productivity Pro',
    isPreset: true,
    baseMode: 'dark',
    colors: {
      primary: '#3b82f6',
      secondary: '#0f172a',
      accent: '#60a5fa',
      accentHover: '#3b82f6',
      sidebar: '#1e293b',
      card: '#1e293b',
      board: '#0f172a',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      border: '#334155',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    background: { type: 'solid', value: '#0f172a' },
    visualStyle: 'enterprise',
    personalization: {
      borderRadius: '4px',
      sidebarDensity: 'compact',
      compactMode: true,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'low'
    }
  },
  // 9. Midnight Neon
  {
    id: 'preset-midnight-neon',
    name: 'Midnight Neon',
    isPreset: true,
    baseMode: 'dark',
    colors: {
      primary: '#d946ef',
      secondary: '#020617',
      accent: '#a855f7',
      accentHover: '#c084fc',
      sidebar: '#000000',
      card: '#090d1f',
      board: '#020617',
      textPrimary: '#fdf4ff',
      textSecondary: '#d946ef',
      textMuted: '#8b5cf6',
      border: '#a855f7',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    background: { type: 'gradient', value: 'linear-gradient(135deg, #090514, #120b29, #020617)' },
    visualStyle: 'glassmorphism',
    personalization: {
      borderRadius: '8px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'high'
    }
  },
  // 10. Coffee Shop
  {
    id: 'preset-coffee-shop',
    name: 'Coffee Shop',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#78350f',
      secondary: '#fdf8f6',
      accent: '#b45309',
      accentHover: '#92400e',
      sidebar: '#451a03',
      card: '#ffffff',
      board: '#fef3c7',
      textPrimary: '#451a03',
      textSecondary: '#78350f',
      textMuted: '#b45309',
      border: '#fde68a',
      success: '#15803d',
      warning: '#d97706',
      danger: '#b91c1c'
    },
    background: { type: 'image', value: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=2560&q=85' },
    visualStyle: 'neumorphism',
    personalization: {
      borderRadius: '12px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 11. Material Design
  {
    id: 'preset-material',
    name: 'Material Design',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#6200ee',
      secondary: '#f5f5f5',
      accent: '#03dac6',
      accentHover: '#018786',
      sidebar: '#ffffff',
      card: '#ffffff',
      board: '#fafafa',
      textPrimary: '#000000',
      textSecondary: '#666666',
      textMuted: '#999999',
      border: '#e0e0e0',
      success: '#4caf50',
      warning: '#ff9800',
      danger: '#f44336'
    },
    background: { type: 'solid', value: '#e0e0e0' },
    visualStyle: 'material',
    personalization: {
      borderRadius: '4px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Roboto', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 12. Discord Inspired
  {
    id: 'preset-discord',
    name: 'Discord Inspired',
    isPreset: true,
    baseMode: 'dark',
    colors: {
      primary: '#5865f2',
      secondary: '#2f3136',
      accent: '#5865f2',
      accentHover: '#4752c4',
      sidebar: '#202225',
      card: '#2f3136',
      board: '#36393f',
      textPrimary: '#ffffff',
      textSecondary: '#b9bbbe',
      textMuted: '#72767d',
      border: '#202225',
      success: '#3ba55d',
      warning: '#faa81a',
      danger: '#ed4245'
    },
    background: { type: 'solid', value: '#36393f' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '8px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 13. Trello Classic
  {
    id: 'preset-trello-classic',
    name: 'Trello Classic',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#026aa7',
      secondary: '#f4f5f7',
      accent: '#5aac44',
      accentHover: '#519839',
      sidebar: '#026aa7',
      card: '#ffffff',
      board: '#0079bf',
      textPrimary: '#172b4d',
      textSecondary: '#5e6c84',
      textMuted: '#8993a4',
      border: '#dfe1e6',
      success: '#61bd4f',
      warning: '#f2d600',
      danger: '#eb5a46'
    },
    background: { type: 'solid', value: '#0079bf' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '3px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 14. Ocean Blue
  {
    id: 'preset-ocean-blue',
    name: 'Ocean Blue',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#0079bf',
      secondary: '#e4f0f6',
      accent: '#298fca',
      accentHover: '#0079bf',
      sidebar: '#1b3a4b',
      card: '#ffffff',
      board: '#e4f0f6',
      textPrimary: '#172b4d',
      textSecondary: '#44546f',
      textMuted: '#8590a2',
      border: '#c5dcfa',
      success: '#00875a',
      warning: '#ff991f',
      danger: '#de350b'
    },
    background: { type: 'gradient', value: 'linear-gradient(180deg, #298fca 0%, #0079bf 100%)' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '6px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 15. Midnight Purple
  {
    id: 'preset-midnight-purple',
    name: 'Midnight Purple',
    isPreset: true,
    baseMode: 'dark',
    colors: {
      primary: '#9c27b0',
      secondary: '#212121',
      accent: '#ba68c8',
      accentHover: '#9c27b0',
      sidebar: '#1a0c24',
      card: '#2d1a3b',
      board: '#12071a',
      textPrimary: '#f3e5f5',
      textSecondary: '#e1bee7',
      textMuted: '#8e24aa',
      border: '#4a148c',
      success: '#4caf50',
      warning: '#ff9800',
      danger: '#f44336'
    },
    background: { type: 'solid', value: '#12071a' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '8px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 16. Monochrome
  {
    id: 'preset-monochrome',
    name: 'Minimal Monochrome',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#000000',
      secondary: '#f3f4f6',
      accent: '#111827',
      accentHover: '#000000',
      sidebar: '#111827',
      card: '#ffffff',
      board: '#ffffff',
      textPrimary: '#111827',
      textSecondary: '#4b5563',
      textMuted: '#9ca3af',
      border: '#e5e7eb',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    background: { type: 'solid', value: '#f9fafb' },
    visualStyle: 'enterprise',
    personalization: {
      borderRadius: '0px',
      sidebarDensity: 'compact',
      compactMode: true,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'none'
    }
  },
  // 17. Notion Inspired
  {
    id: 'preset-notion',
    name: 'Notion Inspired',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#2f3437',
      secondary: '#f7f6f3',
      accent: '#2f3437',
      accentHover: '#0f1417',
      sidebar: '#f7f6f3',
      card: '#ffffff',
      board: '#ffffff',
      textPrimary: '#37352f',
      textSecondary: '#6b6a67',
      textMuted: '#9b9a97',
      border: '#e3e2e0',
      success: '#0f7b4e',
      warning: '#dfab01',
      danger: '#d44339'
    },
    background: { type: 'solid', value: '#ffffff' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '3px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, 'Apple Color Emoji', Arial, sans-serif",
      fontSize: 'medium',
      animationIntensity: 'low'
    }
  },
  // 18. WhatsApp Inspired
  {
    id: 'preset-whatsapp',
    name: 'WhatsApp Chat',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#075e54',
      secondary: '#f0f2f5',
      accent: '#25d366',
      accentHover: '#128c7e',
      sidebar: '#075e54',
      card: '#ffffff',
      board: '#efeae2',
      textPrimary: '#303030',
      textSecondary: '#667781',
      textMuted: '#8696a0',
      border: '#e9edef',
      success: '#25d366',
      warning: '#ffbc38',
      danger: '#ea0038'
    },
    background: { type: 'pattern', value: 'radial-gradient(#8696a0 1px, transparent 1px) 0 0/16px 16px, #efeae2' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '8px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 19. GitHub Dark
  {
    id: 'preset-github-dark',
    name: 'GitHub Dark',
    isPreset: true,
    baseMode: 'dark',
    colors: {
      primary: '#24292f',
      secondary: '#161b22',
      accent: '#238636',
      accentHover: '#2ea44f',
      sidebar: '#0d1117',
      card: '#161b22',
      board: '#0d1117',
      textPrimary: '#c9d1d9',
      textSecondary: '#8b949e',
      textMuted: '#484f58',
      border: '#30363d',
      success: '#238636',
      warning: '#d29922',
      danger: '#f85149'
    },
    background: { type: 'solid', value: '#0d1117' },
    visualStyle: 'enterprise',
    personalization: {
      borderRadius: '6px',
      sidebarDensity: 'compact',
      compactMode: true,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji'",
      fontSize: 'medium',
      animationIntensity: 'low'
    }
  },
  // 20. Aqua Splash
  {
    id: 'preset-aqua-splash',
    name: 'Aqua Splash',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#0ea5e9',
      secondary: '#f0f9ff',
      accent: '#06b6d4',
      accentHover: '#0891b2',
      sidebar: '#0c4a6e',
      card: '#ffffff',
      board: '#e0f2fe',
      textPrimary: '#0369a1',
      textSecondary: '#0284c7',
      textMuted: '#38bdf8',
      border: '#bae6fd',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    background: { type: 'gradient', value: 'linear-gradient(135deg, #0ea5e9, #22d3ee)' },
    visualStyle: 'glassmorphism',
    personalization: {
      borderRadius: '10px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 21. Desert Sand
  {
    id: 'preset-desert-sand',
    name: 'Desert Sand',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#b45309',
      secondary: '#fdfbf7',
      accent: '#c2410c',
      accentHover: '#9a3412',
      sidebar: '#451a03',
      card: '#ffffff',
      board: '#fef3c7',
      textPrimary: '#451a03',
      textSecondary: '#92400e',
      textMuted: '#d97706',
      border: '#fde68a',
      success: '#16a34a',
      warning: '#d97706',
      danger: '#dc2626'
    },
    background: { type: 'solid', value: '#faf7f2' },
    visualStyle: 'neumorphism',
    personalization: {
      borderRadius: '12px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 22. Sakura Blossom
  {
    id: 'preset-sakura',
    name: 'Sakura Blossom',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#db2777',
      secondary: '#fff5f7',
      accent: '#f43f5e',
      accentHover: '#e11d48',
      sidebar: '#4c0519',
      card: '#ffffff',
      board: '#ffe4e6',
      textPrimary: '#4c0519',
      textSecondary: '#9d174d',
      textMuted: '#f43f5e',
      border: '#fecdd3',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    background: { type: 'gradient', value: 'linear-gradient(135deg, #fce7f3, #ffe4e6)' },
    visualStyle: 'glassmorphism',
    personalization: {
      borderRadius: '14px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 23. Retro 80s
  {
    id: 'preset-retro-80s',
    name: 'Retro 80s',
    isPreset: true,
    baseMode: 'dark',
    colors: {
      primary: '#ff007f',
      secondary: '#120136',
      accent: '#00ffff',
      accentHover: '#ff007f',
      sidebar: '#03001e',
      card: '#1f003d',
      board: '#03001e',
      textPrimary: '#00ffff',
      textSecondary: '#ff007f',
      textMuted: '#7300a3',
      border: '#ff007f',
      success: '#00ff66',
      warning: '#ffff00',
      danger: '#ff003c'
    },
    background: { type: 'image', value: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=2560&q=85' },
    visualStyle: 'glassmorphism',
    personalization: {
      borderRadius: '8px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 'medium',
      animationIntensity: 'high'
    }
  },
  // 24. Nordic Frost
  {
    id: 'preset-nordic-frost',
    name: 'Nordic Frost',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#0284c7',
      secondary: '#f0f9ff',
      accent: '#0ea5e9',
      accentHover: '#0284c7',
      sidebar: '#0f172a',
      card: '#ffffff',
      board: '#e0f2fe',
      textPrimary: '#0f172a',
      textSecondary: '#334155',
      textMuted: '#64748b',
      border: '#cbd5e1',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    background: { type: 'image', value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2560&q=85' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '6px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 25. Dracula
  {
    id: 'preset-dracula',
    name: 'Dracula Dark',
    isPreset: true,
    baseMode: 'dark',
    colors: {
      primary: '#bd93f9',
      secondary: '#282a36',
      accent: '#50fa7b',
      accentHover: '#ff79c6',
      sidebar: '#191a21',
      card: '#282a36',
      board: '#282a36',
      textPrimary: '#f8f8f2',
      textSecondary: '#6272a4',
      textMuted: '#6272a4',
      border: '#44475a',
      success: '#50fa7b',
      warning: '#ffb86c',
      danger: '#ff5555'
    },
    background: { type: 'solid', value: '#282a36' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '4px',
      sidebarDensity: 'compact',
      compactMode: true,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 'medium',
      animationIntensity: 'low'
    }
  },
  // 26. Slate Minimal
  {
    id: 'preset-slate-minimal',
    name: 'Slate Minimal',
    isPreset: true,
    baseMode: 'dark',
    colors: {
      primary: '#cbd5e1',
      secondary: '#1e293b',
      accent: '#cbd5e1',
      accentHover: '#f8fafc',
      sidebar: '#0f172a',
      card: '#1e293b',
      board: '#0f172a',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#475569',
      border: '#334155',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    background: { type: 'solid', value: '#0f172a' },
    visualStyle: 'enterprise',
    personalization: {
      borderRadius: '2px',
      sidebarDensity: 'compact',
      compactMode: true,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'none'
    }
  },
  // 27. Mint Fresh
  {
    id: 'preset-mint-fresh',
    name: 'Mint Fresh',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#0d9488',
      secondary: '#f0fdfa',
      accent: '#0f766e',
      accentHover: '#115e59',
      sidebar: '#134e4a',
      card: '#ffffff',
      board: '#ccfbf1',
      textPrimary: '#115e59',
      textSecondary: '#0f766e',
      textMuted: '#14b8a6',
      border: '#99f6e4',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    background: { type: 'solid', value: '#ccfbf1' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '8px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Inter', sans-serif",
      fontSize: 'medium',
      animationIntensity: 'normal'
    }
  },
  // 28. Solarized Light
  {
    id: 'preset-solarized-light',
    name: 'Solarized Light',
    isPreset: true,
    baseMode: 'light',
    colors: {
      primary: '#268bd2',
      secondary: '#eee8d5',
      accent: '#2aa198',
      accentHover: '#268bd2',
      sidebar: '#fdf6e3',
      card: '#fdf6e3',
      board: '#eee8d5',
      textPrimary: '#586e75',
      textSecondary: '#657b83',
      textMuted: '#93a1a1',
      border: '#93a1a1',
      success: '#859900',
      warning: '#b58900',
      danger: '#dc322f'
    },
    background: { type: 'solid', value: '#eee8d5' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '4px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 'medium',
      animationIntensity: 'low'
    }
  },
  // 29. Solarized Dark
  {
    id: 'preset-solarized-dark',
    name: 'Solarized Dark',
    isPreset: true,
    baseMode: 'dark',
    colors: {
      primary: '#268bd2',
      secondary: '#073642',
      accent: '#2aa198',
      accentHover: '#268bd2',
      sidebar: '#002b36',
      card: '#073642',
      board: '#002b36',
      textPrimary: '#839496',
      textSecondary: '#93a1a1',
      textMuted: '#586e75',
      border: '#586e75',
      success: '#859900',
      warning: '#b58900',
      danger: '#dc322f'
    },
    background: { type: 'solid', value: '#002b36' },
    visualStyle: 'flat',
    personalization: {
      borderRadius: '4px',
      sidebarDensity: 'compact',
      compactMode: true,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 'medium',
      animationIntensity: 'low'
    }
  },
  // 30. Cyberpunk Net
  {
    id: 'preset-cyberpunk-net',
    name: 'Cyberpunk Grid',
    isPreset: true,
    baseMode: 'dark',
    colors: {
      primary: '#10b981',
      secondary: '#061616',
      accent: '#f59e0b',
      accentHover: '#10b981',
      sidebar: '#020d0d',
      card: 'rgba(2, 13, 13, 0.75)',
      board: '#061616',
      textPrimary: '#34d399',
      textSecondary: '#10b981',
      textMuted: '#065f46',
      border: '#059669',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    background: { type: 'pattern', value: 'radial-gradient(circle, #059669 1px, transparent 1px) 0 0/24px 24px, #020d0d' },
    visualStyle: 'glassmorphism',
    personalization: {
      borderRadius: '6px',
      sidebarDensity: 'comfortable',
      compactMode: false,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 'medium',
      animationIntensity: 'high'
    }
  }
];
