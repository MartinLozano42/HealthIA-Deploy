/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

/* Colores principales del design system */
const primary = '#55AD9B';
const secondary = '#95D2B3';
const backgroundLight = '#F1F8E8';
const accent = '#D8EFD3';

/* Dark mode equivalente */
const darkBackground = '#0F1A17';
const darkCard = '#1B2A26';

export const Colors = {
  light: {
    text: '#1E2A28',

    /* fondo general app */
    background: backgroundLight,

    /* color principal botones */
    primary: primary,

    /* botones secundarios */
    secondary: secondary,

    /* tarjetas y bloques */
    card: accent,

    /* color iconos */
    icon: '#5A6B68',

    /* tabs */
    tabIconDefault: '#8FA9A3',
    tabIconSelected: primary,

    /* estados */
    success: '#4CAF50',
    warning: '#F4A261',
    error: '#E76F51',

    /* inputs */
    border: '#D8EFD3',
    inputBackground: '#FFFFFF',
  },

  dark: {
    text: '#F1F5F4',

    background: darkBackground,

    primary: primary,
    secondary: secondary,

    card: darkCard,

    icon: '#B6C7C3',

    tabIconDefault: '#6F8781',
    tabIconSelected: primary,

    success: '#6BD18B',
    warning: '#F7B267',
    error: '#FF7A7A',

    border: '#2F4742',
    inputBackground: '#1F2F2B',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
