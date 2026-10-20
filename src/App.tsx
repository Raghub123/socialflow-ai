import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Bot,
  FileText,
  Search,
  Calendar as CalendarIcon,
  Link2,
  CheckCircle2,
  BarChart3,
  Settings,
  ShieldAlert,
  Sparkles,
  Send,
  Plus,
  Check,
  X as XIcon,
  RefreshCw,
  AlertCircle,
  Building2,
  User,
  Globe,
  Clock,
  Trash2,
  Play,
  CheckSquare,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  type: "PERSONAL" | "COMPANY";
  description: string;
  interests: string[];
  targetAudience: string;
  language: string;
  writingStyle: string;
  defaultPlatforms: string[];
  requireApproval: boolean;
  autoPublish: boolean;
}

interface Post {
  id: string;
  workspaceId: string;
  topic: string;
  platform: "LINKEDIN" | "X" | "INSTAGRAM";
  content: string;
  hashtags: string[];
  mediaPrompt?: string;
  mediaUrl?: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SCHEDULED" | "PUBLISHED" | "FAILED";
  scheduledTime?: string;
  publishedTime?: string;
  approvalMode: "MANUAL" | "AUTO";
  publishingMode: "MOCK" | "LIVE" | "MANUAL";
  sourceReferences?: { title: string; url: string; freshness: string }[];
  linkedInUrn?: string;
  linkedInHttpStatus?: number;
  error?: string;
  version: number;
  createdAt: string;
}

interface SocialAccount {
  id: string;
  workspaceId: string;
  platform: "LINKEDIN" | "X" | "INSTAGRAM";
  accountName: string;
  accountType: string;
  status: "CONNECTED" | "DISCONNECTED" | "EXPIRED";
  publishingMode: "MOCK" | "LIVE";
  permissionsVerified: boolean;
}

interface ResearchItem {
  id: string;
  workspaceId: string;
  query: string;
  summary: string;
  sources: { title: string; url: string; date: string }[];
  timestamp: string;
}

interface AnalyticsData {
  publishedCount: number;
  pendingCount: number;
  totalImpressions: number;
  totalEngagement: number;
  engagementRate: string;
  topTopics: string[];
  platformBreakdown: { LINKEDIN: number; X: number; INSTAGRAM: number };
}

interface TestResult {
  name: string;
  passed: boolean;
}

interface TestSuiteResponse {
  success: boolean;
  totalTests: number;
  passedTests: number;
  tests: TestResult[];
  message: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>("ws-personal");
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [researchList, setResearchList] = useState<ResearchItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  // LinkedIn Verification state
  const [linkedInVerifyData, setLinkedInVerifyData] = useState<any>(null);
  const [isVerifyingLinkedIn, setIsVerifyingLinkedIn] = useState<boolean>(false);
  const [linkedInVerifyError, setLinkedInVerifyError] = useState<string | null>(null);

  // AI Command Center state
  const [commandInput, setCommandInput] = useState<string>("");
  const [commandHistory, setCommandHistory] = useState<{ role: "user" | "assistant"; text: string; posts?: Post[] }[]>([
    {
      role: "assistant",
      text: "Hello! I am your SocialFlow AI Assistant. You can issue natural-language commands like: 'Research recent rains and football matches for India this week and generate 2 LinkedIn, 2 Instagram, and 3 X posts.'"
    }
  ]);
  const [isCommandLoading, setIsCommandLoading] = useState<boolean>(false);

  // Research input state
  const [researchQuery, setResearchQuery] = useState<string>("");
  const [isResearchLoading, setIsResearchLoading] = useState<boolean>(false);

  // New post form state
  const [newTopic, setNewTopic] = useState<string>("");
  const [newPlatform, setNewPlatform] = useState<"LINKEDIN" | "X" | "INSTAGRAM">("LINKEDIN");

  // Test suite state
  const [testResult, setTestResult] = useState<TestSuiteResponse | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0];

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (currentWorkspaceId) {
      fetchPosts();
      fetchAccounts();
      fetchResearch();
      fetchAnalytics();
    }
  }, [currentWorkspaceId]);

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, options);
    if (!res.ok) {
      let message = `HTTP ${res.status} (${url})`;
      try {
        const body = await res.json();
        message = `${body.message || body.error || message} (${url})`;
      } catch {
        // Keep the HTTP status when the response is not JSON.
      }
      throw new Error(message);
    }
    return res;
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await apiFetch("/api/workspaces");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid workspaces response: expected an array");
      setWorkspaces(data);
      setBackendError(null);
      if (data.length > 0 && !currentWorkspaceId) {
        setCurrentWorkspaceId(data[0].id);
      }
    } catch (e) {
      console.error("Failed to fetch workspaces", e);
      setBackendError(e instanceof Error ? e.message : "Could not load workspaces");
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await apiFetch(`/api/posts?workspaceId=${currentWorkspaceId}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid posts response: expected an array");
      setPosts(data);
    } catch (e) {
      console.error("Failed to fetch posts", e);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await apiFetch(`/api/accounts?workspaceId=${currentWorkspaceId}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid accounts response: expected an array");
      setAccounts(data);
    } catch (e) {
      console.error("Failed to fetch accounts", e);
    }
  };

  const fetchResearch = async () => {
    try {
      const res = await apiFetch(`/api/research?workspaceId=${currentWorkspaceId}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid researchList response: expected an array");
      setResearchList(data);
    } catch (e) {
      console.error("Failed to fetch research", e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await apiFetch(`/api/analytics?workspaceId=${currentWorkspaceId}`);
      const data = await res.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid analytics response");
      setAnalytics(data);
    } catch (e) {
      console.error("Failed to fetch analytics", e);
    }
  };

  const verifyLinkedInIdentity = async () => {
    setIsVerifyingLinkedIn(true);
    setLinkedInVerifyError(null);
    try {
      const res = await apiFetch("/api/linkedin/verify");
      const data = await res.json();
      if (data.verified) {
        setLinkedInVerifyData(data);
      } else {
        setLinkedInVerifyError(data.error || "Verification failed");
      }
    } catch (err: any) {
      setLinkedInVerifyError(err.message || "Failed to verify LinkedIn token");
    } finally {
      setIsVerifyingLinkedIn(false);
    }
  };

  const publishLinkedInLive = async (postId: string) => {
    if (!confirm("Are you sure you want to publish this post live to your LinkedIn personal profile? This will create an actual post on LinkedIn.")) {
      return;
    }

    try {
      const res = await apiFetch(`/api/linkedin/publish-live/${postId}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(`Success! Published live to LinkedIn.\nHTTP Status: ${data.httpStatus}\nURN: ${data.linkedInUrn}`);
      } else {
        alert(`LinkedIn Live Publishing Error: ${data.error}`);
      }
      fetchPosts();
      fetchAnalytics();
    } catch (err: any) {
      alert(`Publishing failed: ${err.message}`);
    }
  };

  const handleSendCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim() || isCommandLoading) return;

    const userMsg = commandInput.trim();
    setCommandInput("");
    setCommandHistory(prev => [...prev, { role: "user", text: userMsg }]);
    setIsCommandLoading(true);

    try {
      const res = await apiFetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: userMsg, workspaceId: currentWorkspaceId }),
      });
      const data = await res.json();

      setCommandHistory(prev => [
        ...prev,
        { role: "assistant", text: data.reply || "The AI service returned no response.", posts: data.savedPosts }
      ]);
      fetchPosts();
      fetchResearch();
    } catch (err: any) {
      setCommandHistory(prev => [
        ...prev,
        { role: "assistant", text: `Error processing command: ${err.message}` }
      ]);
    } finally {
      setIsCommandLoading(false);
    }
  };

  const handleRunResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchQuery.trim() || isResearchLoading) return;

    setIsResearchLoading(true);
    try {
      const res = await apiFetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: researchQuery, workspaceId: currentWorkspaceId }),
      });
      await res.json();
      setResearchQuery("");
      fetchResearch();
    } catch (err) {
      console.error("Research failed", err);
    } finally {
      setIsResearchLoading(false);
    }
  };

  const handleApprovePost = async (id: string) => {
    await apiFetch(`/api/posts/${id}/approve`, { method: "POST" });
    fetchPosts();
  };

  const handleRejectPost = async (id: string) => {
    await apiFetch(`/api/posts/${id}/reject`, { method: "POST" });
    fetchPosts();
  };

  const handlePublishPost = async (id: string) => {
    const res = await apiFetch(`/api/posts/${id}/publish`, { method: "POST" });
    const data = await res.json();
    alert(data.message);
    fetchPosts();
    fetchAnalytics();
  };

  const handleToggleConnect = async (accId: string, currentStatus: string) => {
    const endpoint = currentStatus === "CONNECTED" ? `disconnect` : `connect`;
    await apiFetch(`/api/accounts/${accId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishingMode: "MOCK" }),
    });
    fetchAccounts();
  };

  const handleToggleApprovalSetting = async () => {
    if (!currentWorkspace) return;
    const updatedApproval = !currentWorkspace.requireApproval;
    if (!updatedApproval) {
      if (!confirm("WARNING: Disabling approval mode means future eligible posts will be automatically approved and scheduled without review. Are you sure?")) {
        return;
      }
    }
    await apiFetch(`/api/workspaces/${currentWorkspace.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requireApproval: updatedApproval }),
    });
    fetchWorkspaces();
  };

  const runTestSuite = async () => {
    setIsRunningTests(true);
    try {
      const res = await apiFetch("/api/tests/run", { method: "POST" });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      console.error("Test suite failed", e);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                SocialFlow AI
              </h1>
              <p className="text-xs text-slate-400">Autonomous Social Manager</p>
            </div>
          </div>

          {/* Workspace Switcher */}
          <div className="p-4 border-b border-slate-800/60 bg-slate-950/40">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
              Active Workspace
            </label>
            <select
              value={currentWorkspaceId}
              onChange={(e) => setCurrentWorkspaceId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>
                  {ws.type === "PERSONAL" ? "👤 " : "🏢 "} {ws.name}
                </option>
              ))}
            </select>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "command", label: "AI Command Center", icon: Bot, badge: "New" },
              { id: "studio", label: "Content Studio & Planner", icon: FileText },
              { id: "research", label: "Autonomous Research", icon: Search },
              { id: "calendar", label: "Calendar & Schedule", icon: CalendarIcon },
              { id: "accounts", label: "Connected Accounts", icon: Link2 },
              { id: "approvals", label: "Approval Queue", icon: CheckCircle2, count: posts.filter(p => p.status === "PENDING_APPROVAL").length },
              { id: "analytics", label: "Analytics & Insights", icon: BarChart3 },
              { id: "settings", label: "Settings & Policy", icon: Settings },
              { id: "tests", label: "Test Suite Runner", icon: CheckSquare },
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                  {typeof item.count === "number" && item.count > 0 && (
                    <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>v2.4 Autonomous Engine</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="md:hidden flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              <span className="font-bold">SocialFlow AI</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs uppercase font-semibold text-slate-400">Workspace:</span>
              <span className="bg-slate-800 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-500/30 flex items-center gap-1.5">
                {currentWorkspace?.type === "PERSONAL" ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                {currentWorkspace?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("command")}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Bot className="w-4 h-4" />
              <span>AI Command Center</span>
            </button>
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold">
              RM
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="p-8 max-w-7xl mx-auto w-full">
          {backendError && (
            <div role="alert" className="mb-6 rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm text-amber-200">
              <strong>Backend migration in progress.</strong> {backendError}
              <p className="mt-2 text-amber-100/80">The dashboard can load, but workspace data and publishing are unavailable until the API is implemented.</p>
            </div>
          )}
          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
                  <p className="text-slate-400 text-sm">Welcome back! Here is your autonomous social media command center.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab("command")}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Command</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: "Published Posts", value: analytics?.publishedCount || 0, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  { label: "Pending Approvals", value: analytics?.pendingCount || 0, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
                  { label: "Total Impressions", value: analytics?.totalImpressions || 0, icon: BarChart3, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                  { label: "Engagement Rate", value: analytics?.engagementRate ?? "N/A", icon: Sparkles, color: "text-violet-400", bg: "bg-violet-500/10" },
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                        <h3 className="text-3xl font-extrabold mt-2 tracking-tight">{stat.value}</h3>
                      </div>
                      <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Prompt Hero Banner */}
              <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="max-w-2xl relative z-10">
                  <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Autonomous Scenario Ready
                  </span>
                  <h3 className="text-2xl font-bold mt-4 mb-2">
                    Generate week's content with recent rains & football matches
                  </h3>
                  <p className="text-slate-300 text-sm mb-6">
                    Issue a single natural-language command to research current events, formulate a content plan, and prepare platform-optimized posts for LinkedIn, X, and Instagram.
                  </p>
                  <button
                    onClick={() => {
                      setCommandInput("Research recent rains and football matches relevant to India this week. Generate two LinkedIn posts, two Instagram posts, and three X posts with conversational tone.");
                      setActiveTab("command");
                    }}
                    className="bg-white text-slate-950 font-bold px-5 py-2.5 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 text-sm shadow-lg"
                  >
                    <Bot className="w-4 h-4 text-indigo-600" />
                    <span>Run Example Command</span>
                  </button>
                </div>
              </div>

              {/* Recent Posts & Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">Recent Content Queue</h3>
                    <button onClick={() => setActiveTab("studio")} className="text-xs text-indigo-400 hover:underline">
                      View All ({posts.length})
                    </button>
                  </div>
                  <div className="space-y-4">
                    {posts.slice(0, 4).map(post => (
                      <div key={post.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                              {post.platform}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              post.status === "PUBLISHED" ? "bg-emerald-500/20 text-emerald-300" :
                              post.status === "APPROVED" ? "bg-indigo-500/20 text-indigo-300" :
                              post.status === "PENDING_APPROVAL" ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-300"
                            }`}>
                              {post.status}
                            </span>
                            <span className="text-xs text-slate-400">Mode: {post.publishingMode}</span>
                          </div>
                          <p className="text-sm font-semibold">{post.topic}</p>
                          <p className="text-xs text-slate-400 line-clamp-2">{post.content}</p>
                          {post.linkedInUrn && (
                            <p className="text-[11px] text-emerald-400">LinkedIn URN: {post.linkedInUrn}</p>
                          )}
                        </div>
                        {post.status === "PENDING_APPROVAL" && (
                          <div className="flex gap-2">
                            <button onClick={() => handleApprovePost(post.id)} className="p-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleRejectPost(post.id)} className="p-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 rounded-lg">
                              <XIcon className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {post.status === "APPROVED" && (
                          <div className="flex flex-col gap-2">
                            <button onClick={() => handlePublishPost(post.id)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
                              <Send className="w-3 h-3" /> Mock Publish
                            </button>
                            {post.platform === "LINKEDIN" && (
                              <button onClick={() => publishLinkedInLive(post.id)} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow">
                                <ShieldCheck className="w-3 h-3" /> Publish Live
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connected Accounts Quick View */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg">Connected Accounts</h3>
                      <button onClick={() => setActiveTab("accounts")} className="text-xs text-indigo-400 hover:underline">
                        Manage
                      </button>
                    </div>
                    <div className="space-y-4">
                      {accounts.map(acc => (
                        <div key={acc.id} className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                          <div>
                            <p className="text-sm font-bold">{acc.platform}</p>
                            <p className="text-xs text-slate-400">{acc.accountName}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            acc.status === "CONNECTED" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
                          }`}>
                            {acc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-xl">
                    <p className="text-xs text-indigo-300 font-semibold">LinkedIn Live Publishing Ready</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Configure <code className="text-indigo-200">LINKEDIN_ACCESS_TOKEN</code> in your environment secrets to publish live.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI COMMAND CENTER TAB */}
          {activeTab === "command" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold tracking-tight">AI Command Center</h2>
                <p className="text-slate-400 text-sm">Issue natural-language commands to research, plan, and generate social media content instantly.</p>
              </div>

              {/* Chat History Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[450px] flex flex-col justify-between">
                <div className="space-y-6 overflow-y-auto max-h-[500px] pr-2">
                  {commandHistory.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className={`max-w-xl rounded-2xl p-4 text-sm ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-bl-none"
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.posts && msg.posts.length > 0 && (
                          <div className="mt-4 space-y-2 border-t border-slate-700 pt-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Generated Drafts Saved:</p>
                            {msg.posts.map((p, i) => (
                              <div key={i} className="bg-slate-900/90 p-3 rounded-xl border border-slate-700 text-xs space-y-1">
                                <div className="flex justify-between font-bold text-indigo-400">
                                  <span>{p.platform}</span>
                                  <span>{p.status}</span>
                                </div>
                                <p className="font-semibold">{p.topic}</p>
                                <p className="text-slate-300 line-clamp-2">{p.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isCommandLoading && (
                    <div className="flex gap-4 items-center">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center animate-pulse">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-slate-800 text-slate-400 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Researching web sources and formulating platform posts...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Command Input Form */}
                <form onSubmit={handleSendCommand} className="mt-6 pt-4 border-t border-slate-800 flex gap-3">
                  <input
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    placeholder="e.g., Research recent rains and football matches for India this week. Generate 2 LinkedIn, 2 Instagram, and 3 X posts."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isCommandLoading || !commandInput.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </form>
              </div>

              {/* Suggested Prompt Buttons */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Suggested Autonomous Commands</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    "Research recent rains and football matches relevant to India this week. Generate two LinkedIn posts, two Instagram posts, and three X posts.",
                    "Prepare five LinkedIn posts about AI engineering and modular software architecture.",
                    "Find trending technology topics in India and suggest ten content ideas.",
                    "Create a motivational Monday post for LinkedIn and two X threads."
                  ].map((promptText, i) => (
                    <button
                      key={i}
                      onClick={() => setCommandInput(promptText)}
                      className="text-left bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-300 transition-all"
                    >
                      "{promptText}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CONTENT STUDIO TAB */}
          {activeTab === "studio" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Content Studio & Planner</h2>
                  <p className="text-slate-400 text-sm">Create, review, and manage platform-specific posts for your workspace.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Manual Post */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-lg">Create New Post</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newTopic) return;
                    try {
                      await apiFetch("/api/posts", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        workspaceId: currentWorkspaceId,
                        topic: newTopic,
                        platform: newPlatform,
                        content: `Insights on ${newTopic}: Engaging discussion and takeaways for professionals in our network. #Innovation #Tech`,
                        hashtags: ["Innovation", "Tech"]
                      }),
                    });
                      setNewTopic("");
                      fetchPosts();
                    } catch (error) {
                      alert(error instanceof Error ? error.message : "Failed to save post");
                    }
                  }} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Topic / Title</label>
                      <input
                        type="text"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        placeholder="e.g., Future of Autonomous Agents"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Platform</label>
                      <select
                        value={newPlatform}
                        onChange={(e: any) => setNewPlatform(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="LINKEDIN">LinkedIn</option>
                        <option value="X">X (Twitter)</option>
                        <option value="INSTAGRAM">Instagram</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20"
                    >
                      Generate Draft
                    </button>
                  </form>
                </div>

                {/* Posts List */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="font-bold text-lg mb-2">Workspace Content Queue ({posts.length})</h3>
                  {posts.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p>No posts found in this workspace yet. Try using the AI Command Center or create one above.</p>
                    </div>
                  ) : (
                    posts.map(post => (
                      <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg">
                              {post.platform}
                            </span>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                              post.status === "PUBLISHED" ? "bg-emerald-500/20 text-emerald-300" :
                              post.status === "APPROVED" ? "bg-indigo-500/20 text-indigo-300" :
                              post.status === "PENDING_APPROVAL" ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-300"
                            }`}>
                              {post.status}
                            </span>
                            <span className="text-xs text-slate-400">Mode: {post.publishingMode}</span>
                          </div>
                          <span className="text-xs text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-bold text-base">{post.topic}</h4>
                        <p className="text-sm text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800 whitespace-pre-wrap">{post.content}</p>
                        
                        {post.linkedInUrn && (
                          <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl text-xs space-y-1">
                            <p className="text-emerald-300 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Published Live to LinkedIn
                            </p>
                            <p className="text-slate-300">LinkedIn URN: <code className="text-indigo-200">{post.linkedInUrn}</code></p>
                            {post.linkedInHttpStatus && <p className="text-slate-400">HTTP Status: {post.linkedInHttpStatus}</p>}
                            <a href={`https://www.linkedin.com/feed/update/${post.linkedInUrn}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1 mt-1 font-semibold">
                              View on LinkedIn <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex gap-2">
                            {post.status === "PENDING_APPROVAL" && (
                              <>
                                <button onClick={() => handleApprovePost(post.id)} className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button onClick={() => handleRejectPost(post.id)} className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1">
                                  <XIcon className="w-3.5 h-3.5" /> Reject
                                </button>
                              </>
                            )}
                            {post.status === "APPROVED" && (
                              <>
                                <button onClick={() => handlePublishPost(post.id)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
                                  <Send className="w-3.5 h-3.5" /> Mock Publish
                                </button>
                                {post.platform === "LINKEDIN" && (
                                  <button onClick={() => publishLinkedInLive(post.id)} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Publish Live (LinkedIn)
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AUTONOMOUS RESEARCH TAB */}
          {activeTab === "research" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold tracking-tight">Autonomous Topic Discovery & Research</h2>
                <p className="text-slate-400 text-sm">Discover trending topics and verify real-time events with Google Search grounding.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <form onSubmit={handleRunResearch} className="flex gap-3">
                  <input
                    type="text"
                    value={researchQuery}
                    onChange={(e) => setResearchQuery(e.target.value)}
                    placeholder="Enter topic or event to research (e.g. recent AI breakthroughs in robotics)..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isResearchLoading || !researchQuery.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    {isResearchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>Research</span>
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg">Research History & Findings ({researchList.length})</h3>
                {researchList.map(res => (
                  <div key={res.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">Query: {res.query}</span>
                      <span>{new Date(res.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{res.summary}</p>
                    <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-400 font-semibold">Sources Verified:</span>
                      {res.sources.map((src, i) => (
                        <a key={i} href={src.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline">
                          {src.title}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CALENDAR TAB */}
          {activeTab === "calendar" && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold tracking-tight">Content Calendar & Publishing Queue</h2>
                <p className="text-slate-400 text-sm">Visualize and manage your scheduled content across platforms.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {["Pending Review", "Approved & Scheduled", "Published"].map((colTitle, idx) => {
                  const colStatus = idx === 0 ? "PENDING_APPROVAL" : idx === 1 ? "APPROVED" : "PUBLISHED";
                  const colPosts = posts.filter(p => p.status === colStatus);
                  return (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300">{colTitle}</h3>
                        <span className="text-xs font-bold bg-slate-800 px-2 py-0.5 rounded-full">{colPosts.length}</span>
                      </div>
                      <div className="space-y-3">
                        {colPosts.map(p => (
                          <div key={p.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                                {p.platform}
                              </span>
                              <span className="text-[10px] text-slate-500">{p.publishingMode}</span>
                            </div>
                            <p className="text-xs font-bold">{p.topic}</p>
                            <p className="text-xs text-slate-400 line-clamp-2">{p.content}</p>
                            {p.status === "PENDING_APPROVAL" && (
                              <button onClick={() => handleApprovePost(p.id)} className="w-full mt-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Approve Post
                              </button>
                            )}
                            {p.status === "APPROVED" && (
                              <div className="space-y-2 mt-2">
                                <button onClick={() => handlePublishPost(p.id)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1">
                                  <Send className="w-3 h-3" /> Mock Publish
                                </button>
                                {p.platform === "LINKEDIN" && (
                                  <button onClick={() => publishLinkedInLive(p.id)} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow">
                                    <ShieldCheck className="w-3 h-3" /> Publish Live (LinkedIn)
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CONNECTED ACCOUNTS TAB */}
          {activeTab === "accounts" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold tracking-tight">Connected Social Accounts & Live Verification</h2>
                <p className="text-slate-400 text-sm">Manage official OAuth connections, verify LinkedIn server token, and test live publishing.</p>
              </div>

              {/* LinkedIn Live Verification Card */}
              <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">LinkedIn Personal Profile Live Connector</h3>
                      <p className="text-xs text-slate-400">Verifies <code className="text-indigo-300">LINKEDIN_ACCESS_TOKEN</code> environment secret securely on the backend.</p>
                    </div>
                  </div>
                  <button
                    onClick={verifyLinkedInIdentity}
                    disabled={isVerifyingLinkedIn}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    {isVerifyingLinkedIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Verify LinkedIn Identity</span>
                  </button>
                </div>

                {linkedInVerifyError && (
                  <div className="bg-rose-950/40 border border-rose-500/30 p-4 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{linkedInVerifyError}</span>
                  </div>
                )}

                {linkedInVerifyData && linkedInVerifyData.verified && (
                  <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl text-xs space-y-2">
                    <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> LinkedIn Token Verified Successfully
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-slate-300 pt-1">
                      <div><span className="text-slate-400">Name:</span> <strong className="text-white">{linkedInVerifyData.name}</strong></div>
                      <div><span className="text-slate-400">Email:</span> <strong className="text-white">{linkedInVerifyData.email || "N/A"}</strong></div>
                      <div><span className="text-slate-400">Author URN:</span> <strong className="text-indigo-200">{linkedInVerifyData.authorUrn}</strong></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {accounts.map(acc => (
                  <div key={acc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg">{acc.platform}</h3>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          acc.status === "CONNECTED" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
                        }`}>
                          {acc.status}
                        </span>
                        <span className="text-xs font-semibold bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded">
                          Mode: {acc.publishingMode}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{acc.accountName} ({acc.accountType})</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleConnect(acc.id, acc.status)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          acc.status === "CONNECTED"
                            ? "bg-rose-600/20 hover:bg-rose-600/30 text-rose-300"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                        }`}
                      >
                        {acc.status === "CONNECTED" ? "Disconnect" : "Connect Account"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* APPROVALS & SETTINGS TAB */}
          {activeTab === "approvals" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold tracking-tight">Approval Queue & Policy</h2>
                <p className="text-slate-400 text-sm">Review pending posts and configure workspace approval requirements.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">Require approval before publishing</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    When enabled, all AI-generated content must be explicitly reviewed and approved before scheduling or publishing.
                  </p>
                </div>
                <button
                  onClick={handleToggleApprovalSetting}
                  className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${
                    currentWorkspace?.requireApproval ? "bg-indigo-600" : "bg-slate-700"
                  }`}
                >
                  <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${
                    currentWorkspace?.requireApproval ? "translate-x-6" : "translate-x-0"
                  }`} />
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg">Pending Review Queue ({posts.filter(p => p.status === "PENDING_APPROVAL").length})</h3>
                {posts.filter(p => p.status === "PENDING_APPROVAL").map(p => (
                  <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">{p.platform}</span>
                      <span className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleString()}</span>
                    </div>
                    <h4 className="font-bold">{p.topic}</h4>
                    <p className="text-sm text-slate-300 bg-slate-950 p-4 rounded-xl">{p.content}</p>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => handleApprovePost(p.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => handleRejectPost(p.id)} className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <XIcon className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold tracking-tight">Analytics & Performance</h2>
                <p className="text-slate-400 text-sm">Real performance metrics and engagement tracking across channels.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Total Impressions", value: analytics?.totalImpressions || 0, change: "Not available" },
                  { label: "Total Engagements", value: analytics?.totalEngagement || 0, change: "Not available" },
                  { label: "Engagement Rate", value: analytics?.engagementRate ?? "N/A", change: "Not available" },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <p className="text-xs text-slate-400 font-semibold">{stat.label}</p>
                    <h3 className="text-3xl font-extrabold mt-2">{stat.value}</h3>
                    <p className="text-xs text-emerald-400 mt-2 font-semibold">{stat.change} vs last week</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-lg">Top Performing Topics</h3>
                <div className="space-y-3">
                  {analytics?.topTopics.map((topic, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
                      <span className="text-sm font-semibold">{topic}</span>
                      <span className="text-xs text-indigo-400 font-bold">High Engagement</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold tracking-tight">Workspace Settings & Brand Template</h2>
                <p className="text-slate-400 text-sm">Configure workspace profile, AI interests, and brand templates.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Workspace Name</label>
                  <input
                    type="text"
                    value={currentWorkspace?.name || ""}
                    disabled
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Interests & Topics</label>
                  <div className="flex flex-wrap gap-2">
                    {currentWorkspace?.interests.map((interest, i) => (
                      <span key={i} className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Writing Style</label>
                  <textarea
                    value={currentWorkspace?.writingStyle || ""}
                    disabled
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TEST SUITE RUNNER TAB */}
          {activeTab === "tests" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Automated Test Suite Runner</h2>
                  <p className="text-slate-400 text-sm">Verify all regression assertions and LinkedIn LIVE publishing requirements.</p>
                </div>
                <button
                  onClick={runTestSuite}
                  disabled={isRunningTests}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {isRunningTests ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Run Test Suite</span>
                </button>
              </div>

              {testResult && (
                <div className="space-y-4">
                  <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-6 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-emerald-300">{testResult.message}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Passed {testResult.passedTests} of {testResult.totalTests} assertions successfully.
                      </p>
                    </div>
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4">Detailed Assertions</h4>
                    {testResult.tests.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-sm font-semibold">{t.name}</span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          t.passed ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                        }`}>
                          {t.passed ? "PASSED" : "FAILED"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
