import {
  CheckCircle2,
  Eye,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  backendInterface as FullActorInterface,
  ManualOrder,
} from "../backend.d";

interface AdminDashboardProps {
  actor: FullActorInterface | null;
  waitForActor: () => Promise<FullActorInterface | null>;
  onBack: () => void;
}

const ADMIN_PASSWORD = "MAYALAXMI@6";
const SESSION_KEY = "adminAuth";

function formatTimestamp(ts: bigint | number): string {
  const ms =
    typeof ts === "bigint" ? Number(ts / BigInt(1_000_000)) : Number(ts);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

interface DisplayOrder {
  id: string;
  playerUID: string;
  packageName: string;
  priceNPR: bigint;
  screenshotData: string;
  status: string;
  timestamp: bigint;
  source: "backend" | "local";
}

function getLocalOrders(): DisplayOrder[] {
  try {
    const raw = localStorage.getItem("drn_orders");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsed.map((o: any) => ({
      id: String(o.id ?? ""),
      playerUID: String(o.playerUID ?? ""),
      packageName: String(o.packageName ?? ""),
      priceNPR: BigInt(Math.round(Number(o.priceNPR ?? 0))),
      screenshotData: String(o.screenshotData ?? ""),
      status: String(o.status ?? "Pending"),
      timestamp:
        BigInt(Math.round(Number(o.timestamp ?? 0))) * BigInt(1_000_000),
      source: "local" as const,
    }));
  } catch {
    return [];
  }
}

export default function AdminDashboard({
  actor,
  waitForActor,
  onBack,
}: AdminDashboardProps) {
  const [isAuthed, setIsAuthed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "true",
  );
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  // Keep a stable ref to waitForActor so we can call it in effects without
  // re-creating every time actor changes
  const waitForActorRef = useRef(waitForActor);
  useEffect(() => {
    waitForActorRef.current = waitForActor;
  }, [waitForActor]);

  const actorRef = useRef<FullActorInterface | null>(actor);
  useEffect(() => {
    actorRef.current = actor;
    if (actor) {
      setIsConnected(true);
      setIsConnecting(false);
    }
  }, [actor]);

  /**
   * Core order-fetching function.
   * Strategy:
   *  1. If actor is available immediately, use it.
   *  2. If not, poll via waitForActor (up to 30 seconds).
   *  3. Fetch ALL orders via getManualOrders() — no user filter.
   *  4. Always merge localStorage fallback orders.
   */
  const loadOrders = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setFetchError("");

    const allOrders: DisplayOrder[] = [];
    const seenIds = new Set<string>();

    // Resolve actor — use ref first (instant), then wait up to 30s
    let resolvedActor = actorRef.current;
    if (!resolvedActor) {
      setIsConnecting(true);
      resolvedActor = await waitForActorRef.current();
      if (resolvedActor) {
        actorRef.current = resolvedActor;
        setIsConnected(true);
        setIsConnecting(false);
      } else {
        setIsConnecting(false);
        setIsConnected(false);
      }
    }

    // Fetch from backend (ALL orders, global)
    if (resolvedActor) {
      try {
        const backendOrders: ManualOrder[] =
          await resolvedActor.getManualOrders();
        for (const o of backendOrders) {
          allOrders.push({
            id: o.id,
            playerUID: o.playerUID,
            packageName: o.packageName,
            priceNPR: o.priceNPR,
            screenshotData: o.screenshotData,
            status: o.status,
            timestamp: o.timestamp,
            source: "backend",
          });
          seenIds.add(o.id);
        }
        setIsConnected(true);
      } catch (e) {
        console.error("getManualOrders failed:", e);
        setIsConnected(false);
        setFetchError(
          "Could not reach the server. Showing locally saved orders only. Tap REFRESH ALL to retry.",
        );
      }
    } else {
      setFetchError(
        "Server not connected after 30s. Showing locally saved orders. Tap REFRESH ALL to retry.",
      );
    }

    // Always merge localStorage orders (covers any fallback submissions)
    const localOrders = getLocalOrders();
    for (const lo of localOrders) {
      if (!seenIds.has(lo.id)) {
        allOrders.push(lo);
        seenIds.add(lo.id);
      }
    }

    // Sort newest first
    allOrders.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
    setOrders(allOrders);
    if (showLoader) setLoading(false);
  }, []); // stable — uses refs internally

  // Load when authenticated
  useEffect(() => {
    if (isAuthed) {
      void loadOrders(true);
    }
  }, [isAuthed, loadOrders]);

  // Re-fetch when actor prop transitions from null → available
  useEffect(() => {
    if (actor && isAuthed) {
      // Actor just became available — silently refresh to pick up backend orders
      void loadOrders(false);
    }
  }, [actor, isAuthed, loadOrders]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!isAuthed) return;
    const interval = setInterval(() => {
      void loadOrders(false);
    }, 15_000);
    return () => clearInterval(interval);
  }, [isAuthed, loadOrders]);

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setIsAuthed(true);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthed(false);
    setPasswordInput("");
    onBack();
  };

  const handleMarkCompleted = useCallback(
    async (orderId: string, isLocal: boolean) => {
      setCompletingId(orderId);

      if (!isLocal) {
        let resolvedActor = actorRef.current;
        if (!resolvedActor) resolvedActor = await waitForActorRef.current();
        if (!resolvedActor) {
          alert("Backend not connected. Please refresh and try again.");
          setCompletingId(null);
          return;
        }
        try {
          await resolvedActor.markOrderCompleted(orderId);
        } catch (e) {
          console.error("markOrderCompleted failed:", e);
        }
      }

      // Update localStorage too (for local-only orders or sync)
      try {
        const raw = localStorage.getItem("drn_orders");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updated = parsed.map((o: any) =>
              o.id === orderId ? { ...o, status: "Completed" } : o,
            );
            localStorage.setItem("drn_orders", JSON.stringify(updated));
          }
        }
      } catch {}

      await loadOrders(false);
      setCompletingId(null);
    },
    [loadOrders],
  );

  const pendingCount = orders.filter((o) => o.status !== "Completed").length;
  const completedCount = orders.filter((o) => o.status === "Completed").length;

  // ─── Password Gate ───
  if (!isAuthed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 font-rajdhani"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,176,0,0.07) 0%, #0A0A0A 70%)",
        }}
        data-ocid="admin.page"
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="w-full max-w-sm"
        >
          <div className="flex justify-center mb-8">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,176,0,0.15) 0%, rgba(255,106,0,0.1) 100%)",
                border: "2px solid rgba(255,176,0,0.3)",
                boxShadow: "0 0 30px rgba(255,176,0,0.15)",
              }}
            >
              <ShieldCheck size={36} className="text-neon-gold" />
            </div>
          </div>

          <h1 className="font-orbitron font-black text-2xl text-center text-neon-gold text-glow-gold-sm mb-2 tracking-widest">
            ADMIN ACCESS
          </h1>
          <p className="text-gamer-muted text-center font-rajdhani text-sm mb-8">
            Enter your admin password to continue
          </p>

          <div
            className="rounded-2xl border p-8"
            style={{
              background: "#0D1117",
              borderColor: "rgba(255,176,0,0.2)",
              boxShadow: "0 0 40px rgba(0,0,0,0.5)",
            }}
          >
            <label
              htmlFor="admin-pw"
              className="font-rajdhani font-semibold text-gamer-body text-xs tracking-widest uppercase block mb-2"
            >
              Password
            </label>
            <div className="relative mb-4">
              <input
                id="admin-pw"
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter admin password"
                className="w-full bg-gamer-card border border-gamer-border rounded-xl px-4 py-3 pr-12 text-gamer-heading font-rajdhani text-base focus:outline-none focus:border-neon-gold/60 transition-colors placeholder:text-gamer-muted"
                data-ocid="admin.input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gamer-muted hover:text-neon-gold transition-colors p-1"
                aria-label="Toggle password visibility"
                data-ocid="admin.toggle"
              >
                <Eye size={16} />
              </button>
            </div>

            <AnimatePresence>
              {passwordError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 font-rajdhani text-sm mb-4 flex items-center gap-2"
                  data-ocid="admin.error_state"
                >
                  <span>⚠️</span> {passwordError}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={handleLogin}
              disabled={!passwordInput.trim()}
              className="w-full py-4 rounded-xl font-orbitron font-black text-sm tracking-widest text-neutral-900 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: passwordInput.trim()
                  ? "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6A00 100%)"
                  : "#2A303A",
                color: passwordInput.trim() ? "#111" : "#6F7785",
                boxShadow: passwordInput.trim()
                  ? "0 0 20px rgba(255,176,0,0.35)"
                  : "none",
              }}
              data-ocid="admin.submit_button"
            >
              🔓 UNLOCK DASHBOARD
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full mt-3 py-3 rounded-xl border border-gamer-border text-gamer-muted font-orbitron font-bold text-xs tracking-widest hover:border-gamer-body hover:text-gamer-body transition-all duration-200"
              data-ocid="admin.cancel_button"
            >
              ← BACK TO SITE
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Dashboard ───
  return (
    <div
      className="min-h-screen bg-gamer-bg text-gamer-heading font-rajdhani"
      data-ocid="admin.page"
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-gamer-border"
        style={{
          background: "rgba(10,10,10,0.96)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "rgba(255,176,0,0.12)",
                border: "1px solid rgba(255,176,0,0.3)",
              }}
            >
              <ShieldCheck size={16} className="text-neon-gold" />
            </div>
            <div className="min-w-0">
              <div className="font-orbitron font-black text-sm tracking-widest text-neon-gold truncate">
                ADMIN DASHBOARD
              </div>
              <div className="font-rajdhani text-gamer-muted text-xs truncate">
                DRN ML TopUp — Global View
              </div>
            </div>
          </div>

          {/* Connection status indicator */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-orbitron font-bold tracking-wider shrink-0"
            style={
              isConnecting
                ? {
                    background: "rgba(234,179,8,0.1)",
                    border: "1px solid rgba(234,179,8,0.3)",
                    color: "#EAB308",
                  }
                : isConnected
                  ? {
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      color: "#22C55E",
                    }
                  : {
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#EF4444",
                    }
            }
            data-ocid="admin.connection_status"
          >
            {isConnecting ? (
              <>
                <Loader2 size={10} className="animate-spin" />
                CONNECTING...
              </>
            ) : isConnected ? (
              <>
                <Wifi size={10} />
                CONNECTED
              </>
            ) : (
              <>
                <WifiOff size={10} />
                OFFLINE
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* WhatsApp Help & Support */}
            <a
              href="https://wa.me/9779743964075"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border font-orbitron font-bold text-xs tracking-widest transition-all border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:border-green-500/60 hover:text-green-300"
              data-ocid="admin.whatsapp_button"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="13"
                height="13"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="hidden sm:inline">HELP &amp; SUPPORT</span>
            </a>

            {/* Refresh All */}
            <button
              type="button"
              onClick={() => loadOrders(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gamer-border bg-gamer-card hover:border-neon-gold/50 text-gamer-body hover:text-neon-gold font-orbitron font-bold text-xs tracking-widest transition-all disabled:opacity-50"
              data-ocid="admin.button"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">REFRESH ALL</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-orbitron font-bold text-xs tracking-widest transition-all"
              data-ocid="admin.close_button"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">LOGOUT</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-3 gap-4 mb-10"
        >
          {[
            {
              label: "Total Orders",
              value: orders.length,
              color: "#FFB000",
              glow: "rgba(255,176,0,0.3)",
              icon: "📋",
            },
            {
              label: "Pending",
              value: pendingCount,
              color: "#FFA500",
              glow: "rgba(255,165,0,0.3)",
              icon: "⏳",
            },
            {
              label: "Completed",
              value: completedCount,
              color: "#22C55E",
              glow: "rgba(34,197,94,0.3)",
              icon: "✅",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border p-5 flex flex-col items-center gap-2"
              style={{
                background: "#0D1117",
                borderColor: `rgba(${
                  stat.color === "#22C55E"
                    ? "34,197,94"
                    : stat.color === "#FFA500"
                      ? "255,165,0"
                      : "255,176,0"
                },0.2)`,
                boxShadow: `0 0 20px ${stat.glow}20`,
              }}
            >
              <span className="text-2xl">{stat.icon}</span>
              <span
                className="font-orbitron font-black text-3xl"
                style={{
                  color: stat.color,
                  textShadow: `0 0 12px ${stat.glow}`,
                }}
              >
                {loading ? (
                  <Loader2 size={24} className="animate-spin mx-auto" />
                ) : (
                  stat.value
                )}
              </span>
              <span className="font-rajdhani text-gamer-muted text-xs tracking-widest uppercase">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Orders Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-orbitron font-black text-xl text-neon-gold text-glow-gold-sm tracking-widest">
              ALL USER ORDERS
            </h2>
            <div
              className="px-3 py-1 rounded-full text-xs font-orbitron font-bold tracking-wider"
              style={{
                background: "rgba(255,176,0,0.1)",
                color: "#FFB000",
                border: "1px solid rgba(255,176,0,0.2)",
              }}
            >
              {orders.length} TOTAL
            </div>
          </div>

          {/* Error / info banner */}
          {fetchError && (
            <div
              className="mb-6 px-4 py-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 font-rajdhani text-sm flex items-center justify-between gap-2"
              data-ocid="admin.error_state"
            >
              <span className="flex items-center gap-2">
                <span>⚠️</span> {fetchError}
              </span>
              <button
                type="button"
                onClick={() => setFetchError("")}
                className="text-yellow-400 hover:text-yellow-200 text-xs font-bold shrink-0"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div
              className="flex flex-col items-center justify-center py-24 gap-4 text-gamer-muted font-rajdhani"
              data-ocid="admin.loading_state"
            >
              <Loader2 className="animate-spin h-8 w-8 text-neon-gold" />
              <span className="text-sm">
                {isConnecting
                  ? "Connecting to server (up to 30s)..."
                  : "Fetching all orders from all users..."}
              </span>
            </div>
          ) : orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 gap-5"
              data-ocid="admin.empty_state"
            >
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl"
                style={{
                  background: "#0D1117",
                  border: "2px dashed rgba(255,176,0,0.2)",
                }}
              >
                📭
              </div>
              <div className="text-center">
                <p className="font-orbitron font-bold text-gamer-muted text-sm tracking-widest">
                  NO ORDERS YET
                </p>
                <p className="font-rajdhani text-gamer-muted text-sm mt-1">
                  Orders from all users will appear here after submission
                </p>
              </div>
              {!isConnected && !isConnecting && (
                <button
                  type="button"
                  onClick={() => loadOrders(true)}
                  className="px-5 py-2.5 rounded-xl font-orbitron font-bold text-xs tracking-widest text-neon-gold border border-neon-gold/30 bg-neon-gold/5 hover:bg-neon-gold/10 transition-all"
                >
                  RETRY CONNECTION
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-4" data-ocid="admin.list">
              {orders.map((order, idx) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.04 }}
                  className="rounded-2xl border overflow-hidden"
                  style={{
                    background: "#0D1117",
                    borderColor:
                      order.status === "Completed"
                        ? "rgba(34,197,94,0.25)"
                        : "rgba(255,176,0,0.2)",
                    boxShadow:
                      order.status === "Completed"
                        ? "0 0 16px rgba(34,197,94,0.05)"
                        : "0 0 16px rgba(255,176,0,0.05)",
                  }}
                  data-ocid={`admin.item.${idx + 1}`}
                >
                  {/* Order header row */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gamer-border/60"
                    style={{ background: "#111318" }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Order ID badge */}
                      <span
                        className="px-2.5 py-1 rounded-lg font-orbitron font-bold text-xs tracking-wider"
                        style={{
                          background: "rgba(255,176,0,0.1)",
                          color: "#FFB000",
                          border: "1px solid rgba(255,176,0,0.25)",
                        }}
                      >
                        {order.id.slice(0, 16)}
                      </span>
                      {/* Source badge */}
                      {order.source === "local" && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-orbitron font-bold tracking-wider"
                          style={{
                            background: "rgba(100,100,255,0.12)",
                            color: "#a5b4fc",
                            border: "1px solid rgba(100,100,255,0.25)",
                          }}
                        >
                          LOCAL
                        </span>
                      )}
                      {/* Status badge */}
                      {order.status === "Completed" ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-orbitron font-black tracking-wider text-green-400"
                          style={{
                            background: "rgba(34,197,94,0.1)",
                            border: "1px solid rgba(34,197,94,0.3)",
                          }}
                          data-ocid={`admin.success_state.${idx + 1}`}
                        >
                          <CheckCircle2 size={11} />
                          COMPLETED
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-orbitron font-black tracking-wider"
                          style={{
                            background: "rgba(255,165,0,0.1)",
                            border: "1px solid rgba(255,165,0,0.35)",
                            color: "#FFA500",
                          }}
                          data-ocid={`admin.loading_state.${idx + 1}`}
                        >
                          ⏳ PENDING
                        </span>
                      )}
                    </div>
                    <span className="font-rajdhani text-gamer-muted text-xs">
                      {formatTimestamp(order.timestamp)}
                    </span>
                  </div>

                  {/* Order body */}
                  <div className="px-5 py-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                      {/* Player UID */}
                      <div>
                        <p className="font-rajdhani text-gamer-muted text-xs tracking-widest uppercase mb-1">
                          Player UID
                        </p>
                        <p className="font-orbitron font-bold text-gamer-heading text-sm break-all">
                          {order.playerUID || "—"}
                        </p>
                      </div>
                      {/* Package */}
                      <div>
                        <p className="font-rajdhani text-gamer-muted text-xs tracking-widest uppercase mb-1">
                          Package
                        </p>
                        <p className="font-orbitron font-bold text-neon-gold text-sm">
                          💎 {order.packageName || "—"}
                        </p>
                      </div>
                      {/* Price */}
                      <div>
                        <p className="font-rajdhani text-gamer-muted text-xs tracking-widest uppercase mb-1">
                          Amount
                        </p>
                        <p className="font-orbitron font-bold text-gamer-heading text-sm">
                          Rs. {Number(order.priceNPR).toLocaleString()} NPR
                        </p>
                      </div>
                      {/* Screenshot */}
                      <div>
                        <p className="font-rajdhani text-gamer-muted text-xs tracking-widest uppercase mb-1">
                          eSewa Screenshot
                        </p>
                        {order.screenshotData ? (
                          <button
                            type="button"
                            onClick={() => setLightboxImg(order.screenshotData)}
                            className="group relative w-16 h-16 rounded-lg overflow-hidden border border-gamer-border hover:border-neon-gold/60 transition-all"
                            aria-label="View screenshot"
                            data-ocid={`admin.button.${idx + 1}`}
                          >
                            <img
                              src={order.screenshotData}
                              alt="Payment screenshot"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye size={16} className="text-neon-gold" />
                            </div>
                          </button>
                        ) : (
                          <span className="font-rajdhani text-gamer-muted text-sm italic">
                            No screenshot
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mark completed button */}
                    {order.status !== "Completed" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleMarkCompleted(
                            order.id,
                            order.source === "local",
                          )
                        }
                        disabled={completingId === order.id}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-orbitron font-bold text-xs tracking-widest transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                        style={{
                          background:
                            completingId === order.id
                              ? "#2A303A"
                              : "linear-gradient(135deg, #22C55E, #16A34A)",
                          color: completingId === order.id ? "#6F7785" : "#fff",
                          boxShadow:
                            completingId === order.id
                              ? "none"
                              : "0 0 16px rgba(34,197,94,0.3)",
                        }}
                        data-ocid={`admin.confirm_button.${idx + 1}`}
                      >
                        {completingId === order.id ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            PROCESSING...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} />
                            MARK AS COMPLETED
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Screenshot Lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center px-4"
            style={{
              background: "rgba(0,0,0,0.95)",
              backdropFilter: "blur(8px)",
            }}
            onClick={() => setLightboxImg(null)}
            data-ocid="admin.modal"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="relative max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                className="absolute -top-10 right-0 text-gamer-muted hover:text-neon-gold transition-colors"
                aria-label="Close lightbox"
                data-ocid="admin.close_button"
              >
                <X size={24} />
              </button>
              <img
                src={lightboxImg}
                alt="Payment screenshot full view"
                className="w-full rounded-2xl border border-gamer-border"
                style={{ maxHeight: "80vh", objectFit: "contain" }}
              />
              <p className="text-center font-rajdhani text-gamer-muted text-sm mt-4">
                eSewa Payment Screenshot
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
