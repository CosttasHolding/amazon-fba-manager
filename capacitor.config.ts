import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.costtasholding.fba-manager",
  appName: "FBA Manager",
  webDir: ".next",
  server: {
    androidScheme: "https",
    url: process.env.CAPACITOR_DEV_URL || "https://amazon-fba-manager-virid.vercel.app",
    cleartext: true,
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0c14",
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
    },
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    backgroundColor: "#0a0c14",
  },
  android: {
    backgroundColor: "#0a0c14",
    allowMixedContent: true,
    captureInput: true,
  },
};

export default config;
