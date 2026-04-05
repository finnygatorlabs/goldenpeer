import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { hearingAidApi } from "@/services/api";
import { usePreferences } from "@/context/PreferencesContext";

type AudioRouting = "hearing_aid" | "phone_speaker" | "both";

interface HearingAidStatus {
  connected: boolean;
  device_name: string | null;
  device_brand: string | null;
  device_model: string | null;
  device_id: string | null;
  signal_strength: number;
  battery_left: number | null;
  battery_right: number | null;
  firmware_version: string | null;
  audio_routing: AudioRouting;
  phone_volume: number;
  hearing_aid_volume: number;
  feedback_reduction: boolean;
  echo_cancellation: boolean;
  noise_reduction: boolean;
  low_battery_alert: boolean;
  low_battery_threshold: number;
  last_connected: string | null;
  hearing_aid_id: string | null;
}

interface Brand {
  name: string;
  market_share: number;
  models: string[];
  ios_support: boolean;
  android_support: boolean;
}


function SignalBar({ strength, theme }: { strength: number; theme: any }) {
  const bars = 5;
  const filled = Math.round((strength / 100) * bars);
  const color = strength >= 70 ? "#22C55E" : strength >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <View style={sty.signalWrap}>
      {Array.from({ length: bars }).map((_, i) => (
        <View
          key={i}
          style={[
            sty.signalBar,
            { height: 8 + i * 4, backgroundColor: i < filled ? color : theme.border },
          ]}
        />
      ))}
      <Text style={[sty.signalText, { color: theme.textSecondary }]}>{strength}%</Text>
    </View>
  );
}

function BatteryIndicator({ level, label, theme, ts }: { level: number | null; label: string; theme: any; ts: any }) {
  if (level === null) return null;
  const color = level > 50 ? "#22C55E" : level > 20 ? "#F59E0B" : "#EF4444";
  const icon = level > 50 ? "battery-full" : level > 20 ? "battery-half" : "battery-dead";
  return (
    <View style={sty.batteryRow}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[sty.batteryLabel, { color: theme.text, fontSize: ts.sm }]}>{label}</Text>
      <View style={sty.batteryBarBg}>
        <View style={[sty.batteryBarFill, { width: `${level}%`, backgroundColor: color }]} />
      </View>
      <Text style={[sty.batteryPct, { color: theme.textSecondary, fontSize: ts.xs }]}>{level}%</Text>
    </View>
  );
}

function VolumeSlider({
  label,
  value,
  onChange,
  theme,
  ts,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  theme: any;
  ts: any;
}) {
  const steps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  return (
    <View style={sty.volumeRow}>
      <Text style={[sty.volumeLabel, { color: theme.text, fontSize: ts.sm }]}>{label}</Text>
      <View style={sty.volumeTrack}>
        {steps.map((s) => (
          <Pressable
            key={s}
            onPress={() => onChange(s)}
            style={[
              sty.volumeDot,
              {
                backgroundColor: s <= value ? "#2563EB" : theme.border,
                width: s <= value ? 12 : 8,
                height: s <= value ? 12 : 8,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[sty.volumePct, { color: theme.textSecondary, fontSize: ts.xs }]}>{value}%</Text>
    </View>
  );
}

export default function HearingAidScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { prefs, ts } = usePreferences();

  const [status, setStatus] = useState<HearingAidStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ signal_strength: number; audio_quality: string } | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [scanResults, setScanResults] = useState<Array<{ name: string; brand: string; model: string; signal: number }>>([]);

  function hapticTap() {
    if (prefs.haptic_feedback && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  const fetchStatus = useCallback(async () => {
    if (!user?.token) return;
    try {
      const data = await hearingAidApi.getStatus(user.token);
      setStatus(data);
    } catch {}
    setLoading(false);
  }, [user?.token]);

  useEffect(() => {
    fetchStatus();
    hearingAidApi.getSupportedBrands()
      .then((d) => setBrands(d.brands || []))
      .catch(() => {});
  }, [fetchStatus]);

  async function startScan() {
    hapticTap();
    setScanning(true);
    setScanResults([]);
    setShowBrandPicker(true);
  }

  function selectBrand(brand: Brand) {
    setSelectedBrand(brand);
    setShowBrandPicker(false);
    setShowModelPicker(true);
  }

  async function selectModelAndConnect(model: string) {
    if (!selectedBrand) return;
    setShowModelPicker(false);
    setScanning(true);

    const mockDevices = [
      {
        name: `${selectedBrand.name} ${model}`,
        brand: selectedBrand.name,
        model,
        signal: Math.floor(Math.random() * 25) + 75,
      },
    ];

    await new Promise((r) => setTimeout(r, 2000));
    setScanResults(mockDevices);
    setScanning(false);
  }

  async function connectDevice(device: { name: string; brand: string; model: string; signal: number }) {
    hapticTap();
    setConnecting(true);
    try {
      await hearingAidApi.connect({
        brand: device.brand,
        model: device.model,
      }, user?.token);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setScanResults([]);
      await fetchStatus();
    } catch {
      Alert.alert("Error", "Could not connect. Please check your internet connection.");
    }
    setConnecting(false);
  }

  async function disconnect() {
    hapticTap();
    setDisconnecting(true);
    try {
      await hearingAidApi.disconnect(user?.token);
      await fetchStatus();
    } catch {}
    setDisconnecting(false);
  }

  async function testConnection() {
    hapticTap();
    setTesting(true);
    setTestResult(null);
    try {
      const data = await hearingAidApi.testConnection(user?.token);
      setTestResult(data);
      await fetchStatus();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          data.audio_quality === "excellent" || data.audio_quality === "good"
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning
        );
      }
    } catch {}
    setTesting(false);
  }

  async function updateSetting(key: string, value: any) {
    hapticTap();
    setStatus((prev) => prev ? { ...prev, [key]: value } : prev);
    try {
      await hearingAidApi.updateSettings({ [key]: value }, user?.token);
    } catch {}
  }

  const qualityColors: Record<string, string> = {
    excellent: "#22C55E",
    good: "#3B82F6",
    fair: "#F59E0B",
    poor: "#EF4444",
  };

  if (loading) {
    return (
      <View style={[sty.container, { backgroundColor: theme.background }]}>
        <View style={[sty.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={sty.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[sty.headerTitle, { color: theme.text, fontSize: ts.lg }]}>Hearing Aid</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={sty.loadingWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    );
  }

  return (
    <View style={[sty.container, { backgroundColor: theme.background }]}>
      <View style={[sty.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={sty.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[sty.headerTitle, { color: theme.text, fontSize: ts.lg }]}>Hearing Aid</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[sty.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* CONNECTION STATUS */}
        <View style={[sty.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[sty.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>
            CONNECTION
          </Text>

          {status?.connected ? (
            <View style={sty.connectedCard}>
              <View style={sty.connectedTop}>
                <View style={[sty.connectedIcon, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="ear" size={28} color="#22C55E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[sty.deviceName, { color: theme.text, fontSize: ts.md }]}>
                    {status.device_name}
                  </Text>
                  <Text style={[sty.deviceBrand, { color: theme.textSecondary, fontSize: ts.xs }]}>
                    {status.device_brand} • {status.device_model}
                  </Text>
                  {status.firmware_version && (
                    <Text style={[sty.firmware, { color: theme.textTertiary, fontSize: ts.tiny }]}>
                      Firmware {status.firmware_version}
                    </Text>
                  )}
                </View>
                <View style={[sty.connectedBadge, { backgroundColor: "#DCFCE7" }]}>
                  <View style={[sty.connectedDot, { backgroundColor: "#22C55E" }]} />
                  <Text style={[sty.connectedBadgeText, { fontSize: ts.tiny }]}>Connected</Text>
                </View>
              </View>

              <View style={sty.signalRow}>
                <Text style={[sty.signalLabel, { color: theme.textSecondary, fontSize: ts.xs }]}>Signal Strength</Text>
                <SignalBar strength={status.signal_strength} theme={theme} />
              </View>

              <View style={sty.connectedActions}>
                <Pressable
                  onPress={disconnect}
                  disabled={disconnecting}
                  style={[sty.actionBtn, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }]}
                >
                  {disconnecting ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                      <Text style={[sty.actionBtnText, { color: "#EF4444", fontSize: ts.sm }]}>Disconnect</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  onPress={testConnection}
                  disabled={testing}
                  style={[sty.actionBtn, { backgroundColor: "#DBEAFE", borderColor: "#93C5FD" }]}
                >
                  {testing ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <>
                      <Ionicons name="pulse" size={18} color="#2563EB" />
                      <Text style={[sty.actionBtnText, { color: "#2563EB", fontSize: ts.sm }]}>Test</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {testResult && (
                <View style={[sty.testResultCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                  <View style={sty.testResultRow}>
                    <Ionicons name="checkmark-circle" size={20} color={qualityColors[testResult.audio_quality] || "#22C55E"} />
                    <Text style={[sty.testResultLabel, { color: theme.text, fontSize: ts.sm }]}>Audio Quality</Text>
                    <Text
                      style={[
                        sty.testResultValue,
                        { color: qualityColors[testResult.audio_quality] || "#22C55E", fontSize: ts.sm },
                      ]}
                    >
                      {testResult.audio_quality.charAt(0).toUpperCase() + testResult.audio_quality.slice(1)}
                    </Text>
                  </View>
                  <View style={sty.testResultRow}>
                    <Ionicons name="wifi" size={20} color="#2563EB" />
                    <Text style={[sty.testResultLabel, { color: theme.text, fontSize: ts.sm }]}>Signal</Text>
                    <Text style={[sty.testResultValue, { color: "#2563EB", fontSize: ts.sm }]}>
                      {testResult.signal_strength}%
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={sty.disconnectedCard}>
              <View style={[sty.disconnectedIcon, { backgroundColor: theme.surface }]}>
                <Ionicons name="ear-outline" size={40} color={theme.textTertiary} />
              </View>
              <Text style={[sty.disconnectedTitle, { color: theme.text, fontSize: ts.md }]}>
                No Hearing Aid Connected
              </Text>
              <Text style={[sty.disconnectedSubtitle, { color: theme.textSecondary, fontSize: ts.sm }]}>
                Connect your hearing aid for the best audio experience with SeniorShield
              </Text>
              <Pressable
                onPress={startScan}
                style={[sty.connectBtn, scanning && { opacity: 0.7 }]}
                disabled={scanning}
              >
                {scanning ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="bluetooth" size={20} color="#FFF" />
                    <Text style={[sty.connectBtnText, { fontSize: ts.md }]}>Connect Hearing Aid</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* Scan results */}
          {scanResults.length > 0 && !status?.connected && (
            <View style={sty.scanResults}>
              <Text style={[sty.scanTitle, { color: theme.textSecondary, fontSize: ts.xs }]}>
                DEVICES FOUND
              </Text>
              {scanResults.map((device, i) => (
                <Pressable
                  key={i}
                  onPress={() => connectDevice(device)}
                  disabled={connecting}
                  style={[sty.scanDevice, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                >
                  <View style={[sty.scanDeviceIcon, { backgroundColor: "#DBEAFE" }]}>
                    <Ionicons name="ear" size={22} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[sty.scanDeviceName, { color: theme.text, fontSize: ts.sm }]}>{device.name}</Text>
                    <Text style={[sty.scanDeviceSub, { color: theme.textSecondary, fontSize: ts.xs }]}>
                      Signal: {device.signal}%
                    </Text>
                  </View>
                  {connecting ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <View style={sty.scanConnectBtn}>
                      <Text style={[sty.scanConnectText, { fontSize: ts.xs }]}>Connect</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {scanning && !showBrandPicker && !showModelPicker && (
            <View style={sty.scanningWrap}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={[sty.scanningText, { color: theme.textSecondary, fontSize: ts.sm }]}>
                Scanning for hearing aids...
              </Text>
            </View>
          )}
        </View>

        {/* BATTERY STATUS */}
        {status?.connected && (status.battery_left !== null || status.battery_right !== null) && (
          <View style={[sty.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[sty.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>
              BATTERY STATUS
            </Text>
            <View style={sty.batteryWrap}>
              <BatteryIndicator level={status.battery_left} label="Left Ear" theme={theme} ts={ts} />
              <BatteryIndicator level={status.battery_right} label="Right Ear" theme={theme} ts={ts} />
            </View>
            <View style={[sty.settingRowInner, { borderBottomColor: "transparent" }]}>
              <View style={[sty.settingIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="notifications" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[sty.settingLabel, { color: theme.text, fontSize: ts.sm }]}>
                  Low Battery Alert
                </Text>
                <Text style={[sty.settingSub, { color: theme.textSecondary, fontSize: ts.tiny }]}>
                  Alert when below {status.low_battery_threshold}%
                </Text>
              </View>
              <Switch
                value={status.low_battery_alert}
                onValueChange={(v) => updateSetting("low_battery_alert", v)}
                trackColor={{ false: theme.border, true: "#BFDBFE" }}
                thumbColor={status.low_battery_alert ? "#2563EB" : "#9CA3AF"}
              />
            </View>
          </View>
        )}

        {/* AUDIO ROUTING */}
        <View style={[sty.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[sty.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>
            AUDIO ROUTING
          </Text>
          {(["hearing_aid", "phone_speaker", "both"] as AudioRouting[]).map((route) => {
            const labels: Record<AudioRouting, { title: string; desc: string; icon: string }> = {
              hearing_aid: { title: "Hearing Aid Only", desc: "Audio goes directly to your hearing aid", icon: "ear" },
              phone_speaker: { title: "Phone Speaker", desc: "Audio plays from your phone speaker", icon: "volume-high" },
              both: { title: "Both", desc: "Audio plays from hearing aid and phone", icon: "git-merge" },
            };
            const info = labels[route];
            const isActive = status?.audio_routing === route;
            return (
              <Pressable
                key={route}
                onPress={() => updateSetting("audio_routing", route)}
                style={[sty.routeOption, { borderBottomColor: theme.border }]}
              >
                <View style={[sty.settingIcon, { backgroundColor: isActive ? "#DBEAFE" : theme.surface }]}>
                  <Ionicons name={info.icon as any} size={18} color={isActive ? "#2563EB" : theme.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[sty.settingLabel, { color: theme.text, fontSize: ts.sm }]}>{info.title}</Text>
                  <Text style={[sty.settingSub, { color: theme.textSecondary, fontSize: ts.tiny }]}>{info.desc}</Text>
                </View>
                <Ionicons
                  name={isActive ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={isActive ? "#2563EB" : theme.border}
                />
              </Pressable>
            );
          })}
        </View>

        {/* VOLUME CONTROL */}
        <View style={[sty.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[sty.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>
            VOLUME CONTROL
          </Text>
          <View style={sty.volumeWrap}>
            <VolumeSlider
              label="Phone Volume"
              value={status?.phone_volume ?? 60}
              onChange={(v) => updateSetting("phone_volume", v)}
              theme={theme}
              ts={ts}
            />
            <VolumeSlider
              label="Hearing Aid Volume"
              value={status?.hearing_aid_volume ?? 70}
              onChange={(v) => updateSetting("hearing_aid_volume", v)}
              theme={theme}
              ts={ts}
            />
          </View>
        </View>

        {/* AUDIO PROCESSING */}
        <View style={[sty.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[sty.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>
            AUDIO PROCESSING
          </Text>
          <View style={[sty.settingRowInner, { borderBottomColor: theme.border }]}>
            <View style={[sty.settingIcon, { backgroundColor: "#EDE9FE" }]}>
              <Ionicons name="options" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[sty.settingLabel, { color: theme.text, fontSize: ts.sm }]}>Feedback Reduction</Text>
              <Text style={[sty.settingSub, { color: theme.textSecondary, fontSize: ts.tiny }]}>
                Reduce whistling and buzzing
              </Text>
            </View>
            <Switch
              value={status?.feedback_reduction ?? true}
              onValueChange={(v) => updateSetting("feedback_reduction", v)}
              trackColor={{ false: theme.border, true: "#BFDBFE" }}
              thumbColor={status?.feedback_reduction ? "#2563EB" : "#9CA3AF"}
            />
          </View>
          <View style={[sty.settingRowInner, { borderBottomColor: theme.border }]}>
            <View style={[sty.settingIcon, { backgroundColor: "#EDE9FE" }]}>
              <Ionicons name="mic-off" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[sty.settingLabel, { color: theme.text, fontSize: ts.sm }]}>Echo Cancellation</Text>
              <Text style={[sty.settingSub, { color: theme.textSecondary, fontSize: ts.tiny }]}>
                Remove echo from calls and voice
              </Text>
            </View>
            <Switch
              value={status?.echo_cancellation ?? true}
              onValueChange={(v) => updateSetting("echo_cancellation", v)}
              trackColor={{ false: theme.border, true: "#BFDBFE" }}
              thumbColor={status?.echo_cancellation ? "#2563EB" : "#9CA3AF"}
            />
          </View>
          <View style={[sty.settingRowInner, { borderBottomColor: "transparent" }]}>
            <View style={[sty.settingIcon, { backgroundColor: "#EDE9FE" }]}>
              <Ionicons name="volume-mute" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[sty.settingLabel, { color: theme.text, fontSize: ts.sm }]}>Noise Reduction</Text>
              <Text style={[sty.settingSub, { color: theme.textSecondary, fontSize: ts.tiny }]}>
                Filter out background noise
              </Text>
            </View>
            <Switch
              value={status?.noise_reduction ?? true}
              onValueChange={(v) => updateSetting("noise_reduction", v)}
              trackColor={{ false: theme.border, true: "#BFDBFE" }}
              thumbColor={status?.noise_reduction ? "#2563EB" : "#9CA3AF"}
            />
          </View>
        </View>

        {/* SUPPORTED BRANDS */}
        <View style={[sty.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[sty.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>
            SUPPORTED HEARING AIDS
          </Text>
          <Text style={[sty.brandsIntro, { color: theme.textSecondary, fontSize: ts.xs }]}>
            SeniorShield supports 8 major brands covering 85% of the hearing aid market. Works with MFi (iOS) and ASHA (Android).
          </Text>
          <View style={sty.brandsGrid}>
            {brands.map((brand) => (
              <View key={brand.name} style={[sty.brandChip, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <Ionicons name="ear" size={14} color="#2563EB" />
                <Text style={[sty.brandName, { color: theme.text, fontSize: ts.xs }]}>{brand.name}</Text>
                <Text style={[sty.brandShare, { color: theme.textTertiary, fontSize: ts.tiny }]}>{brand.market_share}%</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* BRAND PICKER MODAL */}
      <Modal visible={showBrandPicker} animationType="slide" transparent>
        <View style={sty.modalOverlay}>
          <View style={[sty.modalContent, { backgroundColor: theme.card }]}>
            <View style={sty.modalHeader}>
              <Text style={[sty.modalTitle, { color: theme.text, fontSize: ts.lg }]}>
                Select Your Brand
              </Text>
              <Pressable
                onPress={() => {
                  setShowBrandPicker(false);
                  setScanning(false);
                }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <FlatList
              data={brands}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => selectBrand(item)}
                  style={[sty.brandPickerItem, { borderBottomColor: theme.border }]}
                >
                  <View style={[sty.settingIcon, { backgroundColor: "#DBEAFE" }]}>
                    <Ionicons name="ear" size={20} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[sty.brandPickerName, { color: theme.text, fontSize: ts.sm }]}>{item.name}</Text>
                    <Text style={[sty.brandPickerModels, { color: theme.textSecondary, fontSize: ts.xs }]}>
                      {item.models.join(", ")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MODEL PICKER MODAL */}
      <Modal visible={showModelPicker} animationType="slide" transparent>
        <View style={sty.modalOverlay}>
          <View style={[sty.modalContent, { backgroundColor: theme.card }]}>
            <View style={sty.modalHeader}>
              <Text style={[sty.modalTitle, { color: theme.text, fontSize: ts.lg }]}>
                Select Your Model
              </Text>
              <Pressable
                onPress={() => {
                  setShowModelPicker(false);
                  setScanning(false);
                }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <Text style={[sty.modalSubtitle, { color: theme.textSecondary, fontSize: ts.sm }]}>
              {selectedBrand?.name} hearing aids
            </Text>
            <FlatList
              data={selectedBrand?.models || []}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => selectModelAndConnect(item)}
                  style={[sty.brandPickerItem, { borderBottomColor: theme.border }]}
                >
                  <View style={[sty.settingIcon, { backgroundColor: "#DBEAFE" }]}>
                    <Ionicons name="headset" size={20} color="#2563EB" />
                  </View>
                  <Text style={[sty.brandPickerName, { color: theme.text, fontSize: ts.sm, flex: 1 }]}>{item}</Text>
                  <Ionicons name="bluetooth" size={18} color="#2563EB" />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const sty = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, gap: 16, paddingTop: 8 },
  section: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  connectedCard: { padding: 16, gap: 14 },
  connectedTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  connectedIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  deviceName: { fontFamily: "Inter_700Bold" },
  deviceBrand: { fontFamily: "Inter_400Regular", marginTop: 2 },
  firmware: { fontFamily: "Inter_400Regular", marginTop: 1 },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectedDot: { width: 6, height: 6, borderRadius: 3 },
  connectedBadgeText: { fontFamily: "Inter_600SemiBold", color: "#166534" },
  signalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  signalLabel: { fontFamily: "Inter_500Medium" },
  signalWrap: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  signalBar: { width: 6, borderRadius: 2 },
  signalText: { fontFamily: "Inter_500Medium", marginLeft: 4 },
  connectedActions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: { fontFamily: "Inter_600SemiBold" },
  testResultCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  testResultRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  testResultLabel: { fontFamily: "Inter_500Medium", flex: 1 },
  testResultValue: { fontFamily: "Inter_700Bold" },

  disconnectedCard: { alignItems: "center", padding: 24, gap: 12 },
  disconnectedIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  disconnectedTitle: { fontFamily: "Inter_700Bold", textAlign: "center" },
  disconnectedSubtitle: { fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  connectBtnText: { fontFamily: "Inter_700Bold", color: "#FFF" },

  scanResults: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  scanTitle: { fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 4 },
  scanDevice: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  scanDeviceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  scanDeviceName: { fontFamily: "Inter_600SemiBold" },
  scanDeviceSub: { fontFamily: "Inter_400Regular", marginTop: 2 },
  scanConnectBtn: { backgroundColor: "#2563EB", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  scanConnectText: { fontFamily: "Inter_600SemiBold", color: "#FFF" },
  scanningWrap: { alignItems: "center", padding: 24, gap: 12 },
  scanningText: { fontFamily: "Inter_500Medium" },

  batteryWrap: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  batteryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  batteryLabel: { fontFamily: "Inter_500Medium", width: 70 },
  batteryBarBg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "#E5E7EB", overflow: "hidden" },
  batteryBarFill: { height: 8, borderRadius: 4 },
  batteryPct: { fontFamily: "Inter_500Medium", width: 36, textAlign: "right" },

  settingRowInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { fontFamily: "Inter_500Medium" },
  settingSub: { fontFamily: "Inter_400Regular", marginTop: 1 },

  routeOption: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 0.5 },

  volumeWrap: { paddingHorizontal: 16, paddingVertical: 12, gap: 16 },
  volumeRow: { gap: 6 },
  volumeLabel: { fontFamily: "Inter_600SemiBold" },
  volumeTrack: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  volumeDot: { borderRadius: 8 },
  volumePct: { fontFamily: "Inter_500Medium", textAlign: "right" },

  brandsIntro: { fontFamily: "Inter_400Regular", paddingHorizontal: 16, paddingBottom: 12, lineHeight: 18 },
  brandsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  brandChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  brandName: { fontFamily: "Inter_600SemiBold" },
  brandShare: { fontFamily: "Inter_400Regular" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%", paddingBottom: 40 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontFamily: "Inter_700Bold" },
  modalSubtitle: { fontFamily: "Inter_400Regular", paddingHorizontal: 20, paddingBottom: 12 },
  brandPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  brandPickerName: { fontFamily: "Inter_600SemiBold" },
  brandPickerModels: { fontFamily: "Inter_400Regular", marginTop: 2 },
});
