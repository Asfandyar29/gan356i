import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { BluetoothLowEnergy } from "@capgo/capacitor-bluetooth-low-energy";
import { installBluetoothLowEnergyShim } from "@capgo/capacitor-bluetooth-low-energy/dist/esm/shim";
import App from "./App.tsx";
import "./index.css";

// Initialize Web Bluetooth shim for native Android/iOS
try {
  // We force the shim installation on all native platforms
  // This ensures navigator.bluetooth is defined even if Cap checks fail initially
  installBluetoothLowEnergyShim(BluetoothLowEnergy, {
    root: window,
    isNativePlatform: Capacitor.isNativePlatform(),
    // Assume plugin is available if we're on native, otherwise fallback to check
    isPluginAvailable: Capacitor.isNativePlatform() ? true : Capacitor.isPluginAvailable('BluetoothLowEnergy')
  });
  console.log("Web Bluetooth shim initialized. Native:", Capacitor.isNativePlatform());
} catch (e) {
  console.error("Failed to initialize Web Bluetooth shim", e);
}

createRoot(document.getElementById("root")!).render(<App />);
