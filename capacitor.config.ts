import type { CapacitorConfig } from "@capacitor/cli";

/**
 * TrooperPing v1 hybrid shell: Android WebView loads the live Render site.
 * Stripe Checkout stays on web (allowNavigation). Google Play / App Store
 * subscriptions must use native IAP later — Stripe alone is not allowed for
 * digital goods sold inside the store apps.
 */
const config: CapacitorConfig = {
  appId: "com.trooperping.app",
  appName: "TrooperPing",
  webDir: "www",
  server: {
    url: "https://trooper-ping.onrender.com/",
    cleartext: false,
    allowNavigation: [
      "trooper-ping.onrender.com",
      "stripe.com",
      "*.stripe.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0B1B33",
    },
    StatusBar: {
      style: "DARK",
    },
  },
};

export default config;
