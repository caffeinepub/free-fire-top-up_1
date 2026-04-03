import {
  CheckCircle2,
  Crown,
  Home,
  Loader2,
  Package as PackageIcon,
  Settings,
  ShieldCheck,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ApiConfig,
  backendInterface as FullActorInterface,
} from "./backend.d";
import AdminDashboard from "./components/AdminDashboard";
import { useActor } from "./hooks/useActor";

type Package = {
  id: number;
  diamonds: number;
  price: number;
  type: "diamond" | "membership";
  label?: string;
};

const PACKAGES: Package[] = [
  { id: 1, diamonds: 25, price: 40.0, type: "diamond" },
  { id: 2, diamonds: 50, price: 65.0, type: "diamond" },
  { id: 3, diamonds: 115, price: 110.0, type: "diamond" },
  { id: 4, diamonds: 240, price: 210.0, type: "diamond" },
  { id: 5, diamonds: 355, price: 310.0, type: "diamond" },
  { id: 6, diamonds: 1240, price: 1010.0, type: "diamond" },
  {
    id: 7,
    diamonds: 0,
    price: 210.0,
    type: "membership",
    label: "Weekly Membership",
  },
  {
    id: 8,
    diamonds: 0,
    price: 1020.0,
    type: "membership",
    label: "Monthly Membership",
  },
];

const PAYMENT_METHODS = [
  { id: "eSewa", label: "eSewa", color: "#009944" },
  { id: "Khalti", label: "Khalti", color: "#5C2D91" },
  { id: "IME Pay", label: "IME Pay", color: "#EF4444" },
  { id: "Mobile Banking", label: "Mobile Banking", color: "#3B82F6" },
];

const LOADING_STATUSES = [
  "Connecting to server...",
  "Processing your order...",
  "Confirming payment...",
];

const PROVIDER_INSTRUCTIONS: Record<string, string> = {
  Digiflazz:
    "Base URL: https://api.digiflazz.com/v1 | Get API key from digiflazz.com dashboard",
  Apigames: "Base URL: https://apigames.id/api | Register at apigames.id",
  UniPin: "Base URL: https://api.unipin.com/v1 | Apply at unipin.com/partners",
  "Garena Reseller": "Apply at garena.com to become an authorized reseller",
  Custom: "Enter your provider's API endpoint and key",
};

const PROVIDER_DEFAULTS: Record<string, string> = {
  Digiflazz: "https://api.digiflazz.com/v1",
  Apigames: "https://apigames.id/api",
  UniPin: "https://api.unipin.com/v1",
  "Garena Reseller": "https://api.garena.com/v1",
  Custom: "",
};

async function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_SIZE = 800;
      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = reject;
    img.src = url;
  });
}

type BottomTab = "home" | "orders" | "cart" | "account";

export default function App() {
  const { actor } = useActor();
  const fullActor = actor as unknown as FullActorInterface | null;

  // ─── Core state ───
  const [uid, setUid] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string>("eSewa");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(LOADING_STATUSES[0]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTransactionId, setSuccessTransactionId] = useState("");
  const [successSnapshot, setSuccessSnapshot] = useState<{
    uid: string;
    pkg: Package | null;
  } | null>(null);
  const [error, setError] = useState("");
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Payment screen state ───
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(
    null,
  );
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // ─── Admin ───
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [apiConfig, setApiConfigState] = useState<ApiConfig | null>(null);
  const [adminProvider, setAdminProvider] = useState("Digiflazz");
  const [adminApiKey, setAdminApiKey] = useState("");
  const [adminBaseUrl, setAdminBaseUrl] = useState(
    "https://api.digiflazz.com/v1",
  );
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSaved, setAdminSaved] = useState(false);

  // ─── Bottom nav ───
  const [activeTab, setActiveTab] = useState<BottomTab>("home");

  // ─── View routing ───
  const [currentView, setCurrentView] = useState<"main" | "admin">("main");

  // ─── Auth state ───
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
  } | null>(() => {
    try {
      const stored = localStorage.getItem("drn_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // ─── Auth handlers ───
  const handleLogin = () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Please fill in all fields");
      return;
    }
    const user = { name: authEmail.split("@")[0], email: authEmail };
    localStorage.setItem("drn_user", JSON.stringify(user));
    setCurrentUser(user);
    setShowAuthModal(false);
    setAuthEmail("");
    setAuthPassword("");
    setAuthError("");
  };

  const handleRegister = () => {
    if (!authName.trim() || !authEmail.trim() || !authPassword.trim()) {
      setAuthError("Please fill in all fields");
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError("Passwords do not match");
      return;
    }
    const user = { name: authName, email: authEmail };
    localStorage.setItem("drn_user", JSON.stringify(user));
    setCurrentUser(user);
    setShowAuthModal(false);
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthConfirmPassword("");
    setAuthError("");
  };

  const handleLogout = () => {
    localStorage.removeItem("drn_user");
    setCurrentUser(null);
  };

  const openAuth = (mode: "login" | "register" = "login") => {
    setAuthMode(mode);
    setAuthError("");
    setShowAuthModal(true);
  };

  // ─── User orders state ───
  const [userOrders, setUserOrders] = useState<
    Array<{
      id: string;
      playerUID: string;
      packageName: string;
      priceNPR: bigint;
      screenshotData: string;
      status: string;
      timestamp: bigint;
    }>
  >([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const loadUserOrders = useCallback(async () => {
    if (!currentUser) return;
    setOrdersLoading(true);
    try {
      let orders: Array<{
        id: string;
        playerUID: string;
        packageName: string;
        priceNPR: bigint;
        screenshotData: string;
        status: string;
        timestamp: bigint;
      }> = [];

      if (fullActor) {
        try {
          orders = await fullActor.getManualOrders();
        } catch {}
      }

      // Merge localStorage orders
      try {
        const local = JSON.parse(localStorage.getItem("drn_orders") || "[]");
        const localOrders = local.map((o: any) => ({
          id: o.id,
          playerUID: o.playerUID,
          packageName: o.packageName,
          priceNPR: BigInt(o.priceNPR),
          screenshotData: "",
          status: o.status,
          timestamp: BigInt(o.timestamp * 1_000_000),
        }));
        const backendIds = new Set(orders.map((o) => o.id));
        for (const lo of localOrders) {
          if (!backendIds.has(lo.id)) orders.push(lo);
        }
      } catch {}

      setUserOrders(orders);
    } catch (e) {
      console.error("Failed to load orders:", e);
    }
    setOrdersLoading(false);
  }, [fullActor, currentUser]);

  useEffect(() => {
    if (activeTab === "orders" && currentUser) {
      void loadUserOrders();
    }
  }, [activeTab, currentUser, loadUserOrders]);

  // ─── Payment screen handlers ───
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentScreenshot(file);
      const reader = new FileReader();
      reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePaymentScreenOpen = () => {
    if (!uid.trim()) {
      setError("Please enter your Player UID");
      return;
    }
    if (!selectedPackage) {
      setError("Please select a diamond package");
      return;
    }
    setError("");
    setPaymentScreenshot(null);
    setScreenshotPreview(null);
    setShowPaymentScreen(true);
  };

  const handleManualSubmit = useCallback(async () => {
    if (!selectedPackage || !uid) return;
    setIsLoading(true);
    setError("");
    setLoadingStatus(LOADING_STATUSES[0]);
    let statusIdx = 0;
    statusIntervalRef.current = setInterval(() => {
      statusIdx = (statusIdx + 1) % LOADING_STATUSES.length;
      setLoadingStatus(LOADING_STATUSES[statusIdx]);
    }, 1000);

    let screenshotData = "";
    try {
      if (paymentScreenshot) {
        screenshotData = await compressImageToBase64(paymentScreenshot);
      }
    } catch {}

    const localOrderId = `ORD-${Date.now()}`;
    let orderId = localOrderId;

    const pkgName =
      selectedPackage.type === "membership"
        ? selectedPackage.label!
        : `${selectedPackage.diamonds} Diamonds`;

    // Try backend first, fall back to localStorage
    try {
      if (fullActor) {
        orderId = await fullActor.submitManualOrder(
          uid,
          pkgName,
          BigInt(Math.round(selectedPackage.price)),
          screenshotData,
        );
      } else {
        throw new Error("Actor not ready");
      }
    } catch {
      // Save to localStorage as fallback
      try {
        const existing = JSON.parse(localStorage.getItem("drn_orders") || "[]");
        existing.push({
          id: localOrderId,
          playerUID: uid,
          packageName: pkgName,
          priceNPR: Math.round(selectedPackage.price),
          screenshotData: screenshotData,
          status: "Pending",
          timestamp: Date.now(),
        });
        localStorage.setItem("drn_orders", JSON.stringify(existing));
      } catch {}
      orderId = localOrderId;
    }

    if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    setSuccessTransactionId(orderId);
    setSuccessSnapshot({ uid, pkg: selectedPackage });
    setShowPaymentScreen(false);
    setShowSuccess(true);
    setIsLoading(false);
  }, [fullActor, uid, selectedPackage, paymentScreenshot]);

  const handleCloseSuccess = useCallback(() => {
    setShowSuccess(false);
    setUid("");
    setSelectedPackage(null);
    setError("");
    setSuccessTransactionId("");
    setSuccessSnapshot(null);
  }, []);

  // ─── Admin handlers ───
  const loadApiConfig = useCallback(async () => {
    if (!fullActor) return;
    try {
      const config = await fullActor.getApiConfig();
      setApiConfigState(config);
      if (config.provider) {
        setAdminProvider(config.provider);
        setAdminBaseUrl(PROVIDER_DEFAULTS[config.provider] || "");
      }
    } catch (e) {
      console.error("Failed to load api config:", e);
    }
  }, [fullActor]);

  const handleSaveApiConfig = useCallback(async () => {
    if (!fullActor) return;
    setAdminSaving(true);
    setAdminSaved(false);
    try {
      await fullActor.setApiConfig(adminApiKey, adminBaseUrl, adminProvider);
      await loadApiConfig();
      setAdminSaved(true);
      setTimeout(() => setAdminSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save config:", e);
    }
    setAdminSaving(false);
  }, [fullActor, adminApiKey, adminBaseUrl, adminProvider, loadApiConfig]);

  const handleProviderChange = (value: string) => {
    setAdminProvider(value);
    setAdminBaseUrl(PROVIDER_DEFAULTS[value] || "");
  };

  // suppress unused var warning
  void apiConfig;
  void handleProviderChange;

  if (currentView === "admin") {
    return (
      <AdminDashboard actor={fullActor} onBack={() => setCurrentView("main")} />
    );
  }

  const canProceed = Boolean(uid.trim() && selectedPackage);

  // ─── Tab content ───
  const renderTabContent = () => {
    switch (activeTab) {
      case "orders":
        if (!currentUser) {
          return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 px-6">
              <div className="w-20 h-20 rounded-full bg-bz-card border border-bz-border flex items-center justify-center">
                <PackageIcon size={36} className="text-bz-orange opacity-60" />
              </div>
              <h3 className="font-bold text-bz-text text-lg">
                Login to See Orders
              </h3>
              <p className="text-bz-muted text-sm text-center leading-relaxed">
                Please login to view your submitted top-up orders.
              </p>
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="mt-2 px-6 py-2.5 rounded-full bg-bz-orange text-white font-semibold text-sm"
                data-ocid="orders.primary_button"
              >
                Login / Register
              </button>
            </div>
          );
        }
        if (ordersLoading) {
          return (
            <div
              className="flex flex-col items-center justify-center py-20 gap-4"
              data-ocid="orders.loading_state"
            >
              <Loader2 size={32} className="text-bz-orange animate-spin" />
              <p className="text-bz-muted text-sm">Loading your orders...</p>
            </div>
          );
        }
        if (userOrders.length === 0) {
          return (
            <div
              className="flex flex-col items-center justify-center py-20 gap-4 px-6"
              data-ocid="orders.empty_state"
            >
              <div className="w-20 h-20 rounded-full bg-bz-card border border-bz-border flex items-center justify-center">
                <PackageIcon size={36} className="text-bz-orange opacity-60" />
              </div>
              <h3 className="font-bold text-bz-text text-lg">No Orders Yet</h3>
              <p className="text-bz-muted text-sm text-center leading-relaxed">
                Your submitted top-up orders will appear here after you complete
                a purchase.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("home")}
                className="mt-2 px-6 py-2.5 rounded-full bg-bz-orange text-white font-semibold text-sm"
                data-ocid="orders.primary_button"
              >
                Buy Diamonds
              </button>
            </div>
          );
        }
        return (
          <div className="px-4 py-6" data-ocid="orders.list">
            <h2 className="text-bz-text font-bold text-lg mb-4">My Orders</h2>
            <div className="flex flex-col gap-3">
              {userOrders.map((order, idx) => {
                const dateMs = Number(order.timestamp) / 1_000_000;
                const dateStr = new Date(dateMs).toLocaleDateString("en-NP", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                const isCompleted = order.status.toLowerCase() === "completed";
                return (
                  <div
                    key={order.id}
                    className="bg-bz-card rounded-2xl border border-bz-border p-4"
                    data-ocid={`orders.item.${idx + 1}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-bz-text text-base">
                        {order.packageName}
                      </p>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          isCompleted
                            ? "bg-green-900/60 text-green-400"
                            : "bg-orange-900/60 text-orange-400"
                        }`}
                      >
                        {isCompleted ? "Completed" : "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold price-gold">
                          Rs {Number(order.priceNPR).toFixed(2)}
                        </p>
                        <p className="text-xs text-bz-muted mt-0.5">
                          UID: {order.playerUID}
                        </p>
                        <p className="text-xs text-bz-muted mt-0.5">
                          {dateStr}
                        </p>
                      </div>
                      <p className="text-[10px] text-bz-muted font-mono max-w-[80px] truncate text-right">
                        #{order.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case "cart":
        return selectedPackage ? (
          <div className="px-4 py-6">
            <h2 className="text-bz-text font-bold text-lg mb-4">Your Cart</h2>
            <div className="bg-bz-card rounded-2xl border border-bz-border p-5">
              <div className="flex items-center gap-4 mb-4">
                {selectedPackage.type === "membership" ? (
                  <div className="w-14 h-14 flex items-center justify-center">
                    <span className="text-4xl">&#128081;</span>
                  </div>
                ) : (
                  <img
                    src="/assets/generated/blue-diamond-transparent.dim_200x200.png"
                    alt="Diamond"
                    className="w-14 h-14 object-contain"
                  />
                )}
                <div className="flex-1">
                  <p className="font-bold text-bz-text text-base">
                    {selectedPackage.type === "membership"
                      ? selectedPackage.label
                      : `${selectedPackage.diamonds.toLocaleString()} Diamonds`}
                  </p>
                  <p className="text-sm font-bold price-gold">
                    Rs {selectedPackage.price.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="border-t border-bz-border pt-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-bz-muted text-sm">Player UID</span>
                  <span className="text-bz-text text-sm font-semibold">
                    {uid || "Not entered"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-bz-muted text-sm">Total</span>
                  <span className="font-bold price-gold text-base">
                    Rs {selectedPackage.price.toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("home");
                  handlePaymentScreenOpen();
                }}
                disabled={!uid.trim()}
                className="mt-4 w-full py-3 rounded-xl bg-bz-orange text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                data-ocid="cart.submit_button"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-20 gap-4 px-6"
            data-ocid="cart.empty_state"
          >
            <div className="w-20 h-20 rounded-full bg-bz-card border border-bz-border flex items-center justify-center">
              <ShoppingCart size={36} className="text-bz-orange opacity-60" />
            </div>
            <h3 className="font-bold text-bz-text text-lg">Cart is Empty</h3>
            <p className="text-bz-muted text-sm text-center">
              Select a diamond package to add it to your cart.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className="mt-2 px-6 py-2.5 rounded-full bg-bz-orange text-white font-semibold text-sm"
              data-ocid="cart.primary_button"
            >
              Browse Packages
            </button>
          </div>
        );
      case "account":
        return currentUser ? (
          <div className="px-4 py-6">
            <h2 className="text-bz-text font-bold text-lg mb-4">My Account</h2>
            <div className="bg-bz-card rounded-2xl border border-bz-border p-5 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-bz-orange flex items-center justify-center shrink-0">
                  <span className="text-white font-extrabold text-xl">
                    {currentUser.name[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-bz-text text-base">
                    {currentUser.name}
                  </p>
                  <p className="text-bz-muted text-sm">{currentUser.email}</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3 rounded-xl border border-red-800 text-red-400 font-semibold text-sm hover:bg-red-900/30 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 px-6">
            <div className="w-20 h-20 rounded-full bg-bz-card border border-bz-border flex items-center justify-center">
              <User size={36} className="text-bz-orange opacity-60" />
            </div>
            <h3 className="font-bold text-bz-text text-lg">My Account</h3>
            <p className="text-bz-muted text-sm text-center leading-relaxed">
              Sign in to view your order history, manage your account, and track
              deliveries.
            </p>
            <button
              type="button"
              onClick={() => openAuth("login")}
              className="mt-2 px-8 py-2.5 rounded-full bg-bz-orange text-white font-semibold text-sm"
              data-ocid="account.primary_button"
            >
              Login / Register
            </button>
          </div>
        );
      default:
        return <HomeContent />;
    }
  };

  // ─── Home content sub-component ───
  function HomeContent() {
    return (
      <div className="px-4 py-4 pb-2">
        {/* Game label */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-bz-orange" />
          <h2 className="text-bz-text font-bold text-base">
            Free Fire Diamonds
          </h2>
        </div>

        {/* UID Input */}
        <div className="mb-5">
          <label
            htmlFor="player-uid"
            className="block text-xs font-semibold text-bz-muted mb-1.5 uppercase tracking-wide"
          >
            Player UID
          </label>
          <input
            id="player-uid"
            type="text"
            value={uid}
            onChange={(e) => {
              setUid(e.target.value);
              setError("");
            }}
            placeholder="Enter your Free Fire Player UID"
            className="w-full px-4 py-3 rounded-xl border border-bz-border bg-bz-card text-bz-text text-sm placeholder:text-bz-muted focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            data-ocid="topup.input"
          />
        </div>

        {/* Packages label */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full bg-bz-orange" />
          <h2 className="text-bz-text font-bold text-base">Select Package</h2>
        </div>

        {/* Package Grid — 2 columns */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {PACKAGES.map((pkg, idx) => {
            const isSelected = selectedPackage?.id === pkg.id;
            const isMembership = pkg.type === "membership";
            return (
              <div
                key={pkg.id}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                  isSelected
                    ? "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                    : "border-[#21262D] hover:border-orange-500/40"
                }`}
                style={{ background: "#161B22" }}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-white" />
                  </div>
                )}

                {/* Icon */}
                {isMembership ? (
                  <div className="w-14 h-14 flex items-center justify-center">
                    <Crown
                      size={40}
                      className="text-bz-gold"
                      strokeWidth={1.5}
                    />
                  </div>
                ) : (
                  <img
                    src="/assets/generated/blue-diamond-transparent.dim_200x200.png"
                    alt="Diamond"
                    className="w-14 h-14 object-contain"
                  />
                )}

                {/* Name */}
                <p className="text-bz-text font-bold text-sm text-center leading-tight">
                  {isMembership
                    ? pkg.label
                    : `${pkg.diamonds.toLocaleString()} 💎`}
                </p>

                {/* Price */}
                <p className="font-extrabold text-base text-orange-400 text-center">
                  Rs {pkg.price.toFixed(2)}
                </p>

                {/* Order Now Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPackage(pkg);
                    setError("");
                    if (!uid.trim()) {
                      setError("Please enter your Player UID first");
                      return;
                    }
                    setPaymentScreenshot(null);
                    setScreenshotPreview(null);
                    setShowPaymentScreen(true);
                  }}
                  className="w-full mt-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all active:scale-95"
                  data-ocid={`topup.item.${idx + 1}`}
                >
                  Order Now
                </button>
              </div>
            );
          })}
        </div>

        {/* Payment method selector */}
        {selectedPackage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-bz-orange" />
              <h2 className="text-bz-text font-bold text-base">
                Payment Method
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const isActive = selectedPayment === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedPayment(method.id)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? "border-bz-orange bg-orange-900/30 text-orange-400"
                        : "border-bz-border bg-bz-card text-bz-text hover:border-orange-500/40"
                    }`}
                    data-ocid={`topup.radio.${PAYMENT_METHODS.indexOf(method) + 1}`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: method.color }}
                    />
                    {method.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 px-4 py-3 rounded-xl bg-red-900/40 border border-red-700 text-red-400 text-sm font-medium"
              data-ocid="topup.error_state"
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOP-UP NOW button */}
        <button
          type="button"
          onClick={handlePaymentScreenOpen}
          disabled={!canProceed || isLoading}
          className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200 mb-3"
          style={
            canProceed && !isLoading
              ? {
                  background: "#F97316",
                  color: "#fff",
                  boxShadow: "0 4px 16px rgba(249,115,22,0.35)",
                }
              : {
                  background: "#1C2128",
                  color: "#4B5563",
                  cursor: !canProceed ? "not-allowed" : "wait",
                }
          }
          data-ocid="topup.submit_button"
        >
          {isLoading ? (
            <span
              className="flex items-center justify-center gap-2"
              data-ocid="topup.loading_state"
            >
              <Loader2 className="animate-spin h-4 w-4" />
              {loadingStatus}
            </span>
          ) : (
            "TOP-UP NOW"
          )}
        </button>

        {/* Selected summary hint */}
        {selectedPackage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-orange-900/20 border border-orange-700/40 mb-2"
          >
            <div className="flex items-center gap-2">
              {selectedPackage.type === "membership" ? (
                <Crown size={20} className="text-bz-gold" strokeWidth={1.5} />
              ) : (
                <img
                  src="/assets/generated/blue-diamond-transparent.dim_200x200.png"
                  alt="Diamond"
                  className="w-6 h-6 object-contain"
                />
              )}
              <span className="text-bz-text text-sm font-semibold">
                {selectedPackage.type === "membership"
                  ? selectedPackage.label
                  : `${selectedPackage.diamonds.toLocaleString()} Diamonds`}
              </span>
            </div>
            <span className="font-bold price-gold text-sm">
              Rs {selectedPackage.price.toFixed(2)}
            </span>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-jakarta"
      style={{ background: "#0D1117" }}
    >
      {/* ═══ HEADER ═══ */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: "#010409", borderColor: "#21262D" }}
        data-ocid="nav.section"
      >
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "#F97316" }}
            >
              <span className="text-white font-extrabold text-sm leading-none">
                DRN
              </span>
            </div>
            <span className="font-extrabold text-bz-text text-base tracking-tight">
              DRN ML TopUp
            </span>
          </div>

          {/* Login / User button */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-bz-text text-xs font-semibold hidden sm:block">
                {currentUser.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-2 rounded-full border border-bz-border text-bz-muted font-semibold text-xs transition-all duration-150 hover:bg-bz-card"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuth("login")}
              className="px-4 py-2 rounded-full bg-bz-orange text-white font-semibold text-xs transition-all duration-150 hover:bg-bz-orange-dark active:scale-95"
              data-ocid="nav.primary_button"
            >
              Login / Register
            </button>
          )}
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 overflow-y-auto max-w-lg mx-auto w-full pb-20">
        {renderTabContent()}
      </main>

      {/* ═══ BOTTOM NAVIGATION ═══ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{ background: "#010409", borderColor: "#21262D" }}
        data-ocid="nav.tab"
      >
        <div className="max-w-lg mx-auto">
          <div className="grid grid-cols-4 h-16">
            {[
              {
                id: "home" as BottomTab,
                label: "Home",
                icon: Home,
                ocid: "nav.home.tab",
              },
              {
                id: "orders" as BottomTab,
                label: "My Orders",
                icon: PackageIcon,
                ocid: "nav.orders.tab",
              },
              {
                id: "cart" as BottomTab,
                label: "Cart",
                icon: ShoppingCart,
                ocid: "nav.cart.tab",
              },
              {
                id: "account" as BottomTab,
                label: "My Account",
                icon: User,
                ocid: "nav.account.tab",
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 ${
                    isActive
                      ? "text-bz-orange"
                      : "text-bz-muted hover:text-bz-text"
                  }`}
                  data-ocid={tab.ocid}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive ? "text-bz-orange" : ""}
                  />
                  <span
                    className={`text-[10px] font-semibold leading-tight ${
                      isActive ? "text-bz-orange" : "text-bz-muted"
                    }`}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <div className="w-1 h-1 rounded-full bg-bz-orange -mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ═══ PAYMENT MODAL ═══ */}
      <AnimatePresence>
        {showPaymentScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
            }}
            data-ocid="payment.modal"
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="w-full max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col"
              style={{ background: "#161B22", border: "1px solid #21262D" }}
            >
              {/* Modal Header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b shrink-0"
                style={{ borderColor: "#21262D" }}
              >
                <button
                  type="button"
                  onClick={() => setShowPaymentScreen(false)}
                  className="flex items-center gap-1.5 text-bz-muted hover:text-bz-text transition-colors text-sm font-semibold"
                  data-ocid="payment.close_button"
                >
                  ← Back
                </button>
                <h2 className="font-bold text-bz-text text-base">
                  Complete Payment
                </h2>
                <div className="w-12" />
              </div>

              <div className="overflow-y-auto flex-1 px-5 pb-6 pt-4 space-y-4">
                {/* QR Code section */}
                <div className="flex flex-col items-center gap-3 py-2">
                  <div
                    className="rounded-2xl p-3"
                    style={{
                      border: "1px solid #21262D",
                      background: "#0D1117",
                    }}
                  >
                    <img
                      src="/assets/img_20260317_151439-019d41e4-754f-744f-917b-5a2de33ccb10.jpg"
                      alt="eSewa QR Code"
                      width={200}
                      height={200}
                      className="block rounded-lg"
                      style={{ width: 200, height: 200, objectFit: "contain" }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-bz-muted text-xs mb-1">
                      Scan QR or send to eSewa number:
                    </p>
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                      style={{
                        background: "#0D3320",
                        border: "1px solid #1a5c36",
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="font-bold text-green-400 text-lg tracking-widest">
                        9842668372
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order summary */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid #21262D" }}
                >
                  <div
                    className="px-4 py-2 border-b"
                    style={{ background: "#0D1117", borderColor: "#21262D" }}
                  >
                    <span className="text-xs font-semibold text-bz-muted uppercase tracking-wide">
                      Order Summary
                    </span>
                  </div>
                  {[
                    {
                      label: "Player UID",
                      value: uid ? `****${uid.slice(-4)}` : "—",
                    },
                    {
                      label: "Package",
                      value: selectedPackage
                        ? selectedPackage.type === "membership"
                          ? selectedPackage.label!
                          : `${selectedPackage.diamonds.toLocaleString()} Diamonds`
                        : "—",
                      highlight: true,
                    },
                    {
                      label: "Amount",
                      value: selectedPackage
                        ? `Rs ${selectedPackage.price.toFixed(2)}`
                        : "—",
                      price: true,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between items-center px-4 py-3 border-b last:border-0"
                      style={{ borderColor: "#21262D" }}
                    >
                      <span className="text-bz-muted text-sm">{row.label}</span>
                      <span
                        className={`text-sm font-bold ${
                          row.price
                            ? "price-gold text-base"
                            : row.highlight
                              ? "text-orange-400"
                              : "text-bz-text"
                        }`}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Screenshot upload */}
                <div>
                  <p className="text-xs font-semibold text-bz-muted uppercase tracking-wide mb-2">
                    Upload Payment Screenshot
                  </p>
                  <input
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleScreenshotChange}
                    data-ocid="payment.upload_button"
                  />
                  {!screenshotPreview ? (
                    <button
                      type="button"
                      onClick={() => screenshotInputRef.current?.click()}
                      className="w-full py-10 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors"
                      style={{ borderColor: "#21262D" }}
                      data-ocid="payment.dropzone"
                    >
                      <span className="text-2xl">&#128247;</span>
                      <span className="text-bz-muted text-sm font-medium">
                        Tap to upload screenshot
                      </span>
                      <span className="text-bz-muted text-xs">
                        JPG, PNG • Max 5MB
                      </span>
                    </button>
                  ) : (
                    <div
                      className="relative rounded-xl overflow-hidden"
                      style={{ border: "1px solid #21262D" }}
                    >
                      <img
                        src={screenshotPreview}
                        alt="Payment screenshot preview"
                        className="w-full max-h-40 object-contain"
                        style={{ background: "#0D1117" }}
                      />
                      <div
                        className="flex items-center justify-between px-3 py-2 border-t"
                        style={{
                          background: "#161B22",
                          borderColor: "#21262D",
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2
                            size={14}
                            className="text-green-500 shrink-0"
                          />
                          <span className="text-bz-text text-xs truncate">
                            {paymentScreenshot?.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentScreenshot(null);
                            setScreenshotPreview(null);
                            if (screenshotInputRef.current)
                              screenshotInputRef.current.value = "";
                          }}
                          className="shrink-0 ml-2 text-bz-muted hover:text-red-400 text-xs font-semibold transition-colors"
                          data-ocid="payment.cancel_button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="px-4 py-3 rounded-xl text-sm"
                      style={{
                        background: "#2D1515",
                        border: "1px solid #7f1d1d",
                        color: "#fca5a5",
                      }}
                      data-ocid="payment.error_state"
                    >
                      ⚠️ {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleManualSubmit}
                  disabled={isLoading}
                  className="w-full py-4 rounded-xl font-bold text-white text-base transition-all disabled:opacity-70"
                  style={{
                    background: "#F97316",
                    boxShadow: "0 4px 16px rgba(249,115,22,0.35)",
                  }}
                  data-ocid="payment.submit_button"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin h-4 w-4" />
                      {loadingStatus}
                    </span>
                  ) : (
                    "✅ I've Paid — Submit Order"
                  )}
                </motion.button>

                <p className="text-center text-bz-muted text-xs leading-relaxed pb-2">
                  After paying via eSewa, upload your screenshot and tap Submit.
                  Your diamonds will be sent after payment verification.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SUCCESS MODAL ═══ */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
            }}
            data-ocid="success.modal"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="w-full max-w-sm rounded-3xl shadow-xl overflow-hidden"
              style={{ background: "#161B22", border: "1px solid #21262D" }}
            >
              {/* Success header */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-8 flex flex-col items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 18,
                    delay: 0.1,
                  }}
                  className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <CheckCircle2 size={36} className="text-white" />
                </motion.div>
                <h2 className="font-extrabold text-white text-xl">
                  Order Submitted!
                </h2>
                <p className="text-white/80 text-sm text-center">
                  We’ll send your diamonds after verifying your payment.
                </p>
              </div>

              {/* Details */}
              <div className="px-6 py-5">
                <div className="space-y-3 mb-5">
                  {[
                    { label: "Player UID", value: successSnapshot?.uid ?? uid },
                    {
                      label: "Package",
                      value: successSnapshot?.pkg
                        ? successSnapshot.pkg.type === "membership"
                          ? successSnapshot.pkg.label!
                          : `${successSnapshot.pkg.diamonds.toLocaleString()} Diamonds`
                        : "",
                    },
                    {
                      label: "Amount Paid",
                      value: successSnapshot?.pkg
                        ? `Rs ${successSnapshot.pkg.price.toFixed(2)}`
                        : "",
                      price: true,
                    },
                    ...(successTransactionId
                      ? [
                          {
                            label: "Order ID",
                            value: successTransactionId,
                            mono: true,
                          },
                        ]
                      : []),
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between items-center"
                    >
                      <span className="text-bz-muted text-sm">{row.label}</span>
                      <span
                        className={`text-sm font-bold max-w-[55%] text-right break-all ${
                          row.price
                            ? "price-gold"
                            : row.mono
                              ? "font-mono text-xs text-bz-muted"
                              : "text-bz-text"
                        }`}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  className="mb-4 px-4 py-3 rounded-xl text-xs leading-relaxed"
                  style={{
                    background: "#0D3320",
                    border: "1px solid #1a5c36",
                    color: "#4ade80",
                  }}
                >
                  ✅ Manual order saved — diamonds will be sent once your eSewa
                  payment is verified.
                </div>

                <button
                  type="button"
                  onClick={handleCloseSuccess}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm"
                  style={{ background: "#F97316" }}
                  data-ocid="success.close_button"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ API CONFIG MODAL ═══ */}
      <AnimatePresence>
        {adminModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setAdminModalOpen(false);
            }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="w-full max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden"
              style={{ background: "#161B22", border: "1px solid #21262D" }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "#21262D" }}
              >
                <h2 className="font-bold text-bz-text text-base">API Config</h2>
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(false)}
                  className="text-bz-muted hover:text-bz-text transition-colors p-1.5 rounded-lg"
                  data-ocid="admin.close_button"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                <div>
                  <label
                    htmlFor="admin-provider"
                    className="block text-xs font-semibold text-bz-muted uppercase tracking-wide mb-1.5"
                  >
                    Provider
                  </label>
                  <select
                    id="admin-provider"
                    value={adminProvider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3 text-bz-text text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    style={{ background: "#0D1117", borderColor: "#21262D" }}
                    data-ocid="admin.select"
                  >
                    {Object.keys(PROVIDER_DEFAULTS).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  {PROVIDER_INSTRUCTIONS[adminProvider] && (
                    <p className="mt-1.5 text-xs text-bz-muted">
                      {PROVIDER_INSTRUCTIONS[adminProvider]}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="admin-baseurl"
                    className="block text-xs font-semibold text-bz-muted uppercase tracking-wide mb-1.5"
                  >
                    Base URL
                  </label>
                  <input
                    id="admin-baseurl"
                    type="url"
                    value={adminBaseUrl}
                    onChange={(e) => setAdminBaseUrl(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3 text-bz-text text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    style={{ background: "#0D1117", borderColor: "#21262D" }}
                    data-ocid="admin.input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-apikey"
                    className="block text-xs font-semibold text-bz-muted uppercase tracking-wide mb-1.5"
                  >
                    API Key
                  </label>
                  <input
                    id="admin-apikey"
                    type="password"
                    value={adminApiKey}
                    onChange={(e) => setAdminApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full border rounded-xl px-4 py-3 text-bz-text text-sm placeholder:text-bz-muted focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    style={{ background: "#0D1117", borderColor: "#21262D" }}
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setAdminModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border font-semibold text-sm text-bz-muted transition-colors hover:bg-bz-card"
                    style={{ borderColor: "#21262D" }}
                    data-ocid="admin.cancel_button"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveApiConfig}
                    disabled={adminSaving || !adminApiKey.trim()}
                    className="flex-1 py-3 rounded-xl bg-bz-orange text-white font-semibold text-sm disabled:opacity-50 transition-all"
                    data-ocid="admin.save_button"
                  >
                    {adminSaving ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin h-4 w-4" />
                        Saving...
                      </span>
                    ) : adminSaved ? (
                      "Saved ✓"
                    ) : (
                      "Save Config"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ AUTH MODAL ═══ */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAuthModal(false);
            }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="w-full max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden"
              style={{ background: "#161B22", border: "1px solid #21262D" }}
            >
              {/* Modal header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "#21262D" }}
              >
                <h2 className="font-bold text-bz-text text-base">
                  {authMode === "login" ? "Login" : "Create Account"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="text-bz-muted hover:text-bz-text transition-colors p-1.5 rounded-lg"
                  data-ocid="auth.close_button"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                {/* Tab toggle */}
                <div
                  className="flex rounded-xl p-1"
                  style={{ background: "#0D1117" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      authMode === "login"
                        ? "text-bz-text shadow-sm"
                        : "text-bz-muted"
                    }`}
                    style={
                      authMode === "login" ? { background: "#161B22" } : {}
                    }
                    data-ocid="auth.login.tab"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError("");
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      authMode === "register"
                        ? "text-bz-text shadow-sm"
                        : "text-bz-muted"
                    }`}
                    style={
                      authMode === "register" ? { background: "#161B22" } : {}
                    }
                    data-ocid="auth.register.tab"
                  >
                    Register
                  </button>
                </div>

                {/* Register-only: name field */}
                {authMode === "register" && (
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="block text-xs font-semibold text-bz-muted uppercase tracking-wide mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl border text-bz-text text-sm placeholder:text-bz-muted focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      style={{ background: "#0D1117", borderColor: "#21262D" }}
                      id="auth-name"
                      data-ocid="auth.name.input"
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-semibold text-bz-muted uppercase tracking-wide mb-1.5"
                  >
                    Email / Username
                  </label>
                  <input
                    type="text"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Enter email or username"
                    className="w-full px-4 py-3 rounded-xl border text-bz-text text-sm placeholder:text-bz-muted focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    style={{ background: "#0D1117", borderColor: "#21262D" }}
                    id="auth-email"
                    data-ocid="auth.input"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-semibold text-bz-muted uppercase tracking-wide mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 rounded-xl border text-bz-text text-sm placeholder:text-bz-muted focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    style={{ background: "#0D1117", borderColor: "#21262D" }}
                    id="auth-password"
                  />
                </div>

                {/* Confirm password (register only) */}
                {authMode === "register" && (
                  <div>
                    <label
                      htmlFor="auth-confirm"
                      className="block text-xs font-semibold text-bz-muted uppercase tracking-wide mb-1.5"
                    >
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={authConfirmPassword}
                      onChange={(e) => setAuthConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full px-4 py-3 rounded-xl border text-bz-text text-sm placeholder:text-bz-muted focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      style={{ background: "#0D1117", borderColor: "#21262D" }}
                      id="auth-confirm"
                    />
                  </div>
                )}

                {/* Auth error */}
                <AnimatePresence>
                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="px-4 py-3 rounded-xl text-sm"
                      style={{
                        background: "#2D1515",
                        border: "1px solid #7f1d1d",
                        color: "#fca5a5",
                      }}
                      data-ocid="auth.error_state"
                    >
                      ⚠️ {authError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="button"
                  onClick={authMode === "login" ? handleLogin : handleRegister}
                  className="w-full py-3 rounded-xl bg-bz-orange text-white font-bold text-sm transition-all hover:bg-bz-orange-dark active:scale-95"
                  data-ocid="auth.submit_button"
                >
                  {authMode === "login" ? "Login" : "Create Account"}
                </button>

                <p className="text-center text-bz-muted text-xs pb-1">
                  {authMode === "login"
                    ? "Don't have an account? "
                    : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === "login" ? "register" : "login");
                      setAuthError("");
                    }}
                    className="text-bz-orange font-semibold hover:underline"
                  >
                    {authMode === "login" ? "Register" : "Login"}
                  </button>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ FOOTER ═══ */}
      <div className="hidden">
        <button
          type="button"
          onClick={() => setCurrentView("admin")}
          data-ocid="admin.open_modal_button"
        >
          Admin Dashboard
        </button>
        <button
          type="button"
          onClick={() => setAdminModalOpen(true)}
          data-ocid="admin.button"
        >
          API Config
        </button>
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          caffeine.ai
        </a>
      </div>

      {/* Visible footer */}
      <div className="pb-20 pt-3 px-4 text-center">
        <p className="text-xs text-bz-muted">
          © {new Date().getFullYear()} DRN ML TopUp. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-bz-orange hover:underline"
          >
            caffeine.ai
          </a>
        </p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <button
            type="button"
            onClick={() => setCurrentView("admin")}
            className="flex items-center gap-1 text-bz-muted hover:text-bz-orange text-[10px] font-semibold transition-colors"
            data-ocid="footer.admin.open_modal_button"
          >
            <ShieldCheck size={10} />
            Admin Dashboard
          </button>
          <button
            type="button"
            onClick={() => {
              setAdminModalOpen(true);
              loadApiConfig();
            }}
            className="flex items-center gap-1 text-bz-muted hover:text-bz-muted text-[10px] font-semibold transition-colors"
            data-ocid="footer.admin.button"
          >
            <Settings size={10} />
            API Config
          </button>
        </div>
      </div>
    </div>
  );
}
