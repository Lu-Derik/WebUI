"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserProvider,
  Contract,
  FunctionFragment,
  InterfaceAbi,
  JsonFragment,
  isAddress,
} from "ethers";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  WagmiProvider,
  useChainId,
  createConfig,
  http,
  useAccount,
  useConnect,
  useDisconnect,
} from "wagmi";
import { metaMask } from "wagmi/connectors";
import {
  avalanche,
  avalancheFuji,
  bsc,
  bscTestnet,
  mainnet,
  polygon,
  polygonAmoy,
  sepolia,
} from "wagmi/chains";

const supportedChains = [
  mainnet,
  polygon,
  bsc,
  avalanche,
  sepolia,
  polygonAmoy,
  bscTestnet,
  avalancheFuji,
] as const;

const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    metaMask({
      dappMetadata: {
        name: "Web3 UI",
        url: "http://localhost:3000",
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
    [avalanche.id]: http(),
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [bscTestnet.id]: http(),
    [avalancheFuji.id]: http(),
  },
});

const queryClient = new QueryClient();
const SAVED_CONTRACTS_STORAGE_KEY = "wallet_ui_saved_contracts_v1";
const UI_LOCALE_STORAGE_KEY = "wallet_ui_locale_v1";
const UI_THEME_STORAGE_KEY = "wallet_ui_theme_v1";

type UiLocale = "zh-CN" | "zh-TW" | "en" | "fr";
type UiTheme = "light" | "dark";

const localeOptions: Array<{ value: UiLocale; label: string }> = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "zh-TW", label: "繁體中文" },
];

const uiText: Record<UiLocale, Record<string, string>> = {
  "zh-CN": {
    subtitle: "连接钱包、导入 ABI、快速执行合约读写调用。",
    language: "语言",
    theme: "主题",
    light: "白天",
    dark: "黑夜",
    walletSection: "1. 钱包连接",
    connecting: "连接中...",
    connectMetaMask: "连接 MetaMask",
    disconnectMetaMask: "断开 MetaMask 链接",
    address: "地址",
    notConnected: "未连接",
    network: "网络",
    testnet: "测试网",
    mainnet: "主网",
    testnetWarning: "⚠ 当前为测试网环境（{network}），请勿使用主网资产。",
    contractSection: "2. ABI 导入与合约配置",
    contractAddress: "合约地址",
    importAbi: "导入 ABI JSON 文件",
    localConfig: "本地存储合约配置（名称 + 地址 + ABI）",
    saveToCurrentNetwork: "当前配置将保存到：{networkType}列表（{networkName}）",
    saveNamePlaceholder: "输入存储名称，例如：USDT 主网",
    saveConfig: "保存当前配置",
    selectConfig: "请选择当前网络已保存配置",
    deleteSelected: "删除已选配置",
    configStats: "当前网络配置 {current} 条（总计 {total} 条），刷新后仍可使用；切换网络后列表会自动切换。",
    detectResult: "自动检测结果：",
    detecting: "检测中...",
    proxyContract: "代理合约",
    normalContract: "普通合约",
    redetect: "重新检测",
    importedAbi: "已导入 ABI：",
    interfaceSection: "3. 合约接口",
    readAsProxy: "Read as Proxy",
    readContract: "Read Contract",
    writeAsProxy: "Write as Proxy",
    writeContract: "Write Contract",
    noReadFunctions: "暂无可读函数（view/pure）",
    noWriteFunctions: "暂无可写函数（nonpayable/payable）",
    collapse: "收起",
    expand: "展开",
    calling: "调用中...",
    submitting: "提交中...",
    read: "Read",
    write: "Write",
  },
  "zh-TW": {
    subtitle: "連接錢包、匯入 ABI、快速執行合約讀寫呼叫。",
    language: "語言",
    theme: "主題",
    light: "白天",
    dark: "黑夜",
    walletSection: "1. 錢包連接",
    connecting: "連接中...",
    connectMetaMask: "連接 MetaMask",
    disconnectMetaMask: "斷開 MetaMask 連接",
    address: "地址",
    notConnected: "未連接",
    network: "網路",
    testnet: "測試網",
    mainnet: "主網",
    testnetWarning: "⚠ 目前為測試網環境（{network}），請勿使用主網資產。",
    contractSection: "2. ABI 匯入與合約配置",
    contractAddress: "合約地址",
    importAbi: "匯入 ABI JSON 檔案",
    localConfig: "本地儲存合約配置（名稱 + 地址 + ABI）",
    saveToCurrentNetwork: "目前配置將儲存到：{networkType}列表（{networkName}）",
    saveNamePlaceholder: "輸入儲存名稱，例如：USDT 主網",
    saveConfig: "儲存目前配置",
    selectConfig: "請選擇目前網路已儲存配置",
    deleteSelected: "刪除已選配置",
    configStats: "目前網路配置 {current} 筆（總計 {total} 筆），重新整理後仍可使用；切換網路後列表會自動切換。",
    detectResult: "自動偵測結果：",
    detecting: "偵測中...",
    proxyContract: "代理合約",
    normalContract: "普通合約",
    redetect: "重新偵測",
    importedAbi: "已匯入 ABI：",
    interfaceSection: "3. 合約介面",
    readAsProxy: "Read as Proxy",
    readContract: "Read Contract",
    writeAsProxy: "Write as Proxy",
    writeContract: "Write Contract",
    noReadFunctions: "暫無可讀函式（view/pure）",
    noWriteFunctions: "暫無可寫函式（nonpayable/payable）",
    collapse: "收起",
    expand: "展開",
    calling: "呼叫中...",
    submitting: "提交中...",
    read: "Read",
    write: "Write",
  },
  en: {
    subtitle: "Connect wallet, import ABI, and execute read/write contract calls quickly.",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    walletSection: "1. Wallet Connection",
    connecting: "Connecting...",
    connectMetaMask: "Connect MetaMask",
    disconnectMetaMask: "Disconnect MetaMask",
    address: "Address",
    notConnected: "Not connected",
    network: "Network",
    testnet: "Testnet",
    mainnet: "Mainnet",
    testnetWarning: "⚠ You are on a testnet ({network}). Do not use mainnet assets.",
    contractSection: "2. ABI Import & Contract Config",
    contractAddress: "Contract Address",
    importAbi: "Import ABI JSON File",
    localConfig: "Local Contract Config (Name + Address + ABI)",
    saveToCurrentNetwork: "Current config will be saved to: {networkType} list ({networkName})",
    saveNamePlaceholder: "Enter config name, e.g. USDT Mainnet",
    saveConfig: "Save Current Config",
    selectConfig: "Select saved config for current network",
    deleteSelected: "Delete Selected Config",
    configStats: "Current network configs: {current} (total: {total}). Data persists after refresh; list switches with network.",
    detectResult: "Auto-detection:",
    detecting: "Detecting...",
    proxyContract: "Proxy Contract",
    normalContract: "Regular Contract",
    redetect: "Detect Again",
    importedAbi: "Imported ABI:",
    interfaceSection: "3. Contract Interface",
    readAsProxy: "Read as Proxy",
    readContract: "Read Contract",
    writeAsProxy: "Write as Proxy",
    writeContract: "Write Contract",
    noReadFunctions: "No readable functions (view/pure)",
    noWriteFunctions: "No writable functions (nonpayable/payable)",
    collapse: "Collapse",
    expand: "Expand",
    calling: "Calling...",
    submitting: "Submitting...",
    read: "Read",
    write: "Write",
  },
  fr: {
    subtitle: "Connectez le portefeuille, importez l'ABI et exécutez rapidement les appels de lecture/écriture.",
    language: "Langue",
    theme: "Thème",
    light: "Clair",
    dark: "Sombre",
    walletSection: "1. Connexion du portefeuille",
    connecting: "Connexion...",
    connectMetaMask: "Connecter MetaMask",
    disconnectMetaMask: "Déconnecter MetaMask",
    address: "Adresse",
    notConnected: "Non connecté",
    network: "Réseau",
    testnet: "Testnet",
    mainnet: "Mainnet",
    testnetWarning: "⚠ Vous êtes sur un testnet ({network}). N'utilisez pas d'actifs mainnet.",
    contractSection: "2. Import ABI et configuration du contrat",
    contractAddress: "Adresse du contrat",
    importAbi: "Importer le fichier ABI JSON",
    localConfig: "Configuration locale du contrat (Nom + Adresse + ABI)",
    saveToCurrentNetwork: "La configuration actuelle sera enregistrée dans : liste {networkType} ({networkName})",
    saveNamePlaceholder: "Saisir un nom, ex. USDT Mainnet",
    saveConfig: "Enregistrer la configuration",
    selectConfig: "Sélectionner une configuration du réseau actuel",
    deleteSelected: "Supprimer la configuration sélectionnée",
    configStats: "Configurations du réseau actuel : {current} (total : {total}). Les données persistent après actualisation et suivent le changement de réseau.",
    detectResult: "Détection automatique :",
    detecting: "Détection...",
    proxyContract: "Contrat proxy",
    normalContract: "Contrat normal",
    redetect: "Relancer la détection",
    importedAbi: "ABI importé :",
    interfaceSection: "3. Interface du contrat",
    readAsProxy: "Read as Proxy",
    readContract: "Read Contract",
    writeAsProxy: "Write as Proxy",
    writeContract: "Write Contract",
    noReadFunctions: "Aucune fonction lisible (view/pure)",
    noWriteFunctions: "Aucune fonction modifiable (nonpayable/payable)",
    collapse: "Réduire",
    expand: "Étendre",
    calling: "Appel en cours...",
    submitting: "Soumission...",
    read: "Read",
    write: "Write",
  },
};

function getNetworkInfo(chainId?: number): { name: string; isTestnet: boolean; isKnown: boolean } {
  if (!chainId) return { name: "未知网络", isTestnet: false, isKnown: false };

  const map: Record<number, { name: string; isTestnet: boolean }> = {
    1: { name: "ETH Mainnet", isTestnet: false },
    137: { name: "Polygon", isTestnet: false },
    56: { name: "BSC", isTestnet: false },
    43114: { name: "AVAX", isTestnet: false },
    11155111: { name: "Sepolia", isTestnet: true },
    80001: { name: "Polygon Mumbai", isTestnet: true },
    80002: { name: "Polygon Amoy", isTestnet: true },
    97: { name: "BSC Testnet", isTestnet: true },
    43113: { name: "Avalanche Fuji", isTestnet: true },
  };

  return map[chainId]
    ? { ...map[chainId], isKnown: true }
    : { name: `Chain ID: ${chainId}`, isTestnet: false, isKnown: false };
}

type FunctionIO = {
  name: string;
  type: string;
};

type ParsedFunction = {
  signature: string;
  name: string;
  stateMutability: string;
  inputs: FunctionIO[];
  outputs: FunctionIO[];
};

type CallState = {
  args: Record<string, string>;
  value: string;
  result: string;
  error: string;
  loading: boolean;
};

type ContractMode = "read" | "write";

type SavedContractEntry = {
  id: string;
  name: string;
  address: string;
  chainId: number | null;
  abi: JsonFragment[];
  abiFileName: string;
  updatedAt: number;
};

const defaultCallState: CallState = {
  args: {},
  value: "",
  result: "",
  error: "",
  loading: false,
};

function isArrayType(solType: string): boolean {
  return solType.endsWith("]");
}

function parseArrayBaseType(solType: string): string {
  const idx = solType.indexOf("[");
  return idx === -1 ? solType : solType.slice(0, idx);
}

function convertInputValue(rawValue: string, solType: string): unknown {
  if (isArrayType(solType)) {
    const parsed = JSON.parse(rawValue || "[]");
    if (!Array.isArray(parsed)) {
      throw new Error(`参数类型 ${solType} 需要 JSON 数组`);
    }
    const baseType = parseArrayBaseType(solType);
    return parsed.map((item) => convertInputValue(String(item), baseType));
  }

  if (solType.startsWith("uint") || solType.startsWith("int")) {
    if (rawValue.trim() === "") {
      throw new Error(`参数类型 ${solType} 不能为空`);
    }
    return BigInt(rawValue);
  }

  if (solType === "bool") {
    const lowered = rawValue.trim().toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
    throw new Error("bool 参数只接受 true 或 false");
  }

  if (solType === "address") {
    if (!isAddress(rawValue)) {
      throw new Error("address 参数格式不正确");
    }
    return rawValue;
  }

  return rawValue;
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      next[key] = normalizeValue(obj[key]);
    }
    return next;
  }

  return value;
}

function prettyResult(value: unknown): string {
  const normalized = normalizeValue(value);
  try {
    return JSON.stringify(normalized, null, 2);
  } catch {
    return String(normalized);
  }
}

function hasNonZeroStorage(storage: string): boolean {
  const value = storage.replace(/^0x/, "").toLowerCase();
  return value !== "" && !/^0+$/.test(value);
}

function isEip1167ProxyBytecode(code: string): boolean {
  const normalized = code.toLowerCase();
  return normalized.startsWith("0x363d3d373d3d3d363d73") && normalized.includes("5af43d82803e903d91602b57fd5bf3");
}

function increaseByTenPercent(value: bigint): bigint {
  return (value * 110n) / 100n;
}

function maxBigInt(values: bigint[]): bigint {
  return values.reduce((maxValue, currentValue) =>
    currentValue > maxValue ? currentValue : maxValue,
  0n);
}

function parseMinimumPriorityFeeFromError(error: unknown): bigint | null {
  const message = (error as { message?: string })?.message ?? String(error ?? "");
  const matched = message.match(/minimum needed\s+(\d+)/i);
  if (!matched?.[1]) {
    return null;
  }

  try {
    return BigInt(matched[1]);
  } catch {
    return null;
  }
}

async function buildGasOverrides(
  provider: BrowserProvider,
  minPriorityFeePerGas?: bigint,
): Promise<Record<string, bigint>> {
  const feeData = await provider.getFeeData();
  const overrides: Record<string, bigint> = {};

  const hasEip1559Fields = feeData.maxFeePerGas !== null || feeData.maxPriorityFeePerGas !== null;
  if (hasEip1559Fields) {
    const boostedPriorityFee = feeData.maxPriorityFeePerGas !== null
      ? increaseByTenPercent(feeData.maxPriorityFeePerGas)
      : 0n;
    const priorityFeeCandidates = [boostedPriorityFee];
    if (minPriorityFeePerGas && minPriorityFeePerGas > 0n) {
      priorityFeeCandidates.push(increaseByTenPercent(minPriorityFeePerGas));
    }
    const priorityFee = maxBigInt(priorityFeeCandidates);

    const boostedMaxFee = feeData.maxFeePerGas !== null
      ? increaseByTenPercent(feeData.maxFeePerGas)
      : 0n;
    const minMaxFee = priorityFee * 2n;
    const maxFee = maxBigInt([boostedMaxFee, minMaxFee, priorityFee]);

    overrides.maxPriorityFeePerGas = priorityFee;
    overrides.maxFeePerGas = maxFee;
    return overrides;
  }

  if (feeData.gasPrice !== null) {
    overrides.gasPrice = increaseByTenPercent(feeData.gasPrice);
  }

  return overrides;
}

function classifyFunctions(abi: JsonFragment[]): ParsedFunction[] {
  return abi
    .filter((item) => item.type === "function")
    .map((item) => {
      const fn = FunctionFragment.from(item);
      const signature = `${fn.name}(${fn.inputs
        .map((input: { type: string }) => input.type)
        .join(",")})`;
      return {
        signature,
        name: fn.name,
        stateMutability: fn.stateMutability,
        inputs: fn.inputs.map((input: { name: string; type: string }, index: number) => ({
          name: input.name || `arg${index}`,
          type: input.type,
        })),
        outputs: fn.outputs.map((output: { name: string; type: string }, index: number) => ({
          name: output.name || `output${index}`,
          type: output.type,
        })),
      };
    });
}

function WalletAppContent() {
  const { address: walletAddress, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { connectAsync, connectors, error: wagmiConnectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const [mounted, setMounted] = useState(false);
  const [detectedChainId, setDetectedChainId] = useState<number | undefined>(undefined);
  const [connectError, setConnectError] = useState("");

  const [contractAddress, setContractAddress] = useState("");
  const [rawAbi, setRawAbi] = useState<JsonFragment[]>([]);
  const [abiFileName, setAbiFileName] = useState("");
  const [abiError, setAbiError] = useState("");
  const [savedContracts, setSavedContracts] = useState<SavedContractEntry[]>([]);
  const [saveName, setSaveName] = useState("");
  const [selectedSavedId, setSelectedSavedId] = useState("");
  const [selectedSwitchChainId, setSelectedSwitchChainId] = useState<number>(supportedChains[0].id);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [locale, setLocale] = useState<UiLocale>("zh-CN");
  const [theme, setTheme] = useState<UiTheme>("light");
  const [storageMessage, setStorageMessage] = useState("");
  const [storageError, setStorageError] = useState("");

  const [proxyMode, setProxyMode] = useState(false);
  const [proxyChecking, setProxyChecking] = useState(false);
  const [proxyDetectionNote, setProxyDetectionNote] = useState("");
  const [selectedMode, setSelectedMode] = useState<ContractMode>("read");
  const [callStates, setCallStates] = useState<Record<string, CallState>>({});
  const [expandedFunctions, setExpandedFunctions] = useState<Record<string, boolean>>({});

  const parsedFunctions = useMemo(() => classifyFunctions(rawAbi), [rawAbi]);

  const readFunctions = useMemo(
    () =>
      parsedFunctions.filter((fn: ParsedFunction) =>
        ["view", "pure"].includes(fn.stateMutability),
      ),
    [parsedFunctions],
  );

  const writeFunctions = useMemo(
    () =>
      parsedFunctions.filter((fn: ParsedFunction) => !["view", "pure"].includes(fn.stateMutability)),
    [parsedFunctions],
  );

  const activeChainId = currentChainId || detectedChainId;
  const networkInfo = useMemo(
    () => getNetworkInfo(activeChainId),
    [activeChainId],
  );
  const displayNetworkInfo = mounted
    ? networkInfo
    : { name: "--", isTestnet: false, isKnown: false };
  const t = uiText[locale];

  function formatTemplate(template: string, values: Record<string, string | number>): string {
    let formatted = template;
    for (const [key, value] of Object.entries(values)) {
      formatted = formatted.split(`{${key}}`).join(String(value));
    }
    return formatted;
  }

  const currentNetworkSavedContracts = useMemo(
    () => savedContracts.filter((item) => item.chainId === activeChainId),
    [savedContracts, activeChainId],
  );

  const isHydratedConnected = mounted && isConnected;
  const isHydratedPending = mounted && isPending;

  function toggleFunctionExpanded(signature: string) {
    setExpandedFunctions((prev) => ({
      ...prev,
      [signature]: !prev[signature],
    }));
  }

  function persistSavedContracts(next: SavedContractEntry[]) {
    setSavedContracts(next);
    window.localStorage.setItem(SAVED_CONTRACTS_STORAGE_KEY, JSON.stringify(next));
  }

  function saveCurrentContract() {
    setStorageError("");
    setStorageMessage("");

    const normalizedName = saveName.trim();
    if (!normalizedName) {
      setStorageError("请先输入存储名称");
      return;
    }

    if (!isAddress(contractAddress)) {
      setStorageError("请先输入有效合约地址");
      return;
    }

    if (rawAbi.length === 0) {
      setStorageError("请先导入 ABI JSON 文件");
      return;
    }

    if (!activeChainId) {
      setStorageError("请先连接钱包并识别当前网络");
      return;
    }

    const now = Date.now();
    const existing = savedContracts.find(
      (item) => item.name === normalizedName && item.chainId === activeChainId,
    );
    const nextEntry: SavedContractEntry = {
      id: existing?.id ?? `${now}`,
      name: normalizedName,
      address: contractAddress,
      chainId: activeChainId,
      abi: rawAbi,
      abiFileName,
      updatedAt: now,
    };

    const next = [
      nextEntry,
      ...savedContracts.filter((item) => item.id !== nextEntry.id),
    ];
    persistSavedContracts(next);
    setSelectedSavedId(nextEntry.id);
    setStorageMessage(
      existing
        ? `已更新 ${networkInfo.isTestnet ? "测试网" : "主网"} 配置`
        : `已保存到${networkInfo.isTestnet ? "测试网" : "主网"}配置列表`,
    );
  }

  function loadSavedContractById(savedId: string) {
    setStorageError("");
    setStorageMessage("");

    const target = savedContracts.find((item) => item.id === savedId);
    if (!target) {
      return;
    }

    setSaveName(target.name);
    setContractAddress(target.address);
    setRawAbi(target.abi);
    setAbiFileName(target.abiFileName);
    setCallStates({});
    const targetNetwork = getNetworkInfo(target.chainId ?? undefined);
    setStorageMessage(`已加载配置：${target.name}（${targetNetwork.name}）`);
    if (isAddress(target.address)) {
      void detectProxyByAddress(target.address);
    }
  }

  function deleteSavedContractById(savedId: string) {
    setStorageError("");
    setStorageMessage("");

    if (!savedId) {
      setStorageError("请先选择需要删除的配置");
      return;
    }

    const target = savedContracts.find((item) => item.id === savedId);
    if (!target) {
      setStorageError("未找到要删除的配置");
      return;
    }

    const next = savedContracts.filter((item) => item.id !== savedId);
    persistSavedContracts(next);
    setSelectedSavedId("");
    setStorageMessage(`已删除配置：${target.name}`);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const savedLocale = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY) as UiLocale | null;
    if (savedLocale && localeOptions.some((item) => item.value === savedLocale)) {
      setLocale(savedLocale);
    }

    const savedTheme = window.localStorage.getItem(UI_THEME_STORAGE_KEY) as UiTheme | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = locale;
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  }, [mounted, theme, locale]);

  // Suppress noisy wagmi connector log about already connected
  useEffect(() => {
    const origWarn = console.warn.bind(console);
    const origInfo = console.info.bind(console);
    const filterMsg = (args: unknown[]) =>
      args.some(
        (a) => typeof a === "string" && /Connector already connected/.test(a),
      );

    console.warn = (...args: unknown[]) => {
      if (filterMsg(args)) return;
      origWarn(...args);
    };
    console.info = (...args: unknown[]) => {
      if (filterMsg(args)) return;
      origInfo(...args);
    };

    return () => {
      console.warn = origWarn;
      console.info = origInfo;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = window.localStorage.getItem(SAVED_CONTRACTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedContractEntry[];
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.address === "string" &&
          (typeof item.chainId === "number" || item.chainId === null || typeof item.chainId === "undefined") &&
          Array.isArray(item.abi),
      );
      setSavedContracts(
        valid.map((item) => ({
          ...item,
          chainId: typeof item.chainId === "number" ? item.chainId : null,
        })),
      );
    } catch {
      setStorageError("本地配置读取失败，请重新保存");
    }
  }, [mounted]);

  useEffect(() => {
    setExpandedFunctions({});
  }, [rawAbi]);

  useEffect(() => {
    if (!mounted) return;
    if (!selectedSavedId) return;
    loadSavedContractById(selectedSavedId);
  }, [selectedSavedId, savedContracts, mounted]);

  useEffect(() => {
    if (!mounted || !activeChainId) return;
    setSelectedSwitchChainId(activeChainId);
  }, [mounted, activeChainId]);

  useEffect(() => {
    if (!mounted) return;
    if (!selectedSavedId) return;
    const inCurrentNetwork = currentNetworkSavedContracts.some((item) => item.id === selectedSavedId);
    if (!inCurrentNetwork) {
      setSelectedSavedId("");
    }
  }, [mounted, selectedSavedId, currentNetworkSavedContracts]);

  useEffect(() => {
    const ethereum = (window as Window & {
      ethereum?: {
        request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        on?: (event: string, listener: (payload: string) => void) => void;
        removeListener?: (event: string, listener: (payload: string) => void) => void;
      };
    }).ethereum;

    async function loadChain() {
      if (!ethereum?.request) return;
      try {
        const chainHex = (await ethereum.request({
          method: "eth_chainId",
        })) as string;
        setDetectedChainId(parseInt(chainHex, 16));
      } catch {
        setDetectedChainId(undefined);
      }
    }

    const handleChainChanged = (chainHex: string) => {
      setDetectedChainId(parseInt(chainHex, 16));
    };

    loadChain();
    ethereum?.on?.("chainChanged", handleChainChanged);

    return () => {
      ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  useEffect(() => {
    if (wagmiConnectError) {
      const msg = wagmiConnectError.message || "连接钱包失败";
      // Ignore benign 'Connector already connected' noise from wagmi
      if (/Connector already connected/.test(msg)) {
        setConnectError("");
        return;
      }
      setConnectError(msg);
      return;
    }
    setConnectError("");
  }, [wagmiConnectError]);

  async function connectWallet() {
    setConnectError("");

    if (!window.ethereum) {
      setConnectError("未检测到 MetaMask，请先安装扩展。");
      return;
    }

    const connector = connectors.find((item: { id: string }) => item.id === "metaMask") ?? connectors[0];
    if (!connector) {
      setConnectError("未找到可用的钱包连接器");
      return;
    }

    try {
      const ethereum = (window as Window & {
        ethereum?: {
          request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        };
      }).ethereum;

      if (isConnected) {
        await disconnectWallet();
      }

      if (ethereum?.request) {
        await ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });

        await ethereum.request({
          method: "eth_requestAccounts",
        });
      }

      await connectAsync({ connector });
      setConnectError("");
    } catch (error) {
      const message = (error as Error).message || "连接钱包失败";
      if (message.toLowerCase().includes("already connected")) {
        setConnectError("");
        return;
      }
      setConnectError(message);
    }
  }

  async function disconnectWallet() {
    disconnect();

    const ethereum = (window as Window & {
      ethereum?: {
        request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    }).ethereum;

    if (ethereum?.request) {
      try {
        await ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {
      }
    }

    setConnectError("");
  }

  async function switchNetwork(chainId: number) {
    setConnectError("");
    setStorageError("");
    setStorageMessage("");

    const ethereum = (window as Window & {
      ethereum?: {
        request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    }).ethereum;

    if (!ethereum?.request) {
      setConnectError("未检测到 MetaMask，无法切换网络");
      return;
    }

    const targetChain = supportedChains.find((chain) => chain.id === chainId);
    if (!targetChain) {
      setStorageError("目标网络不在支持列表中");
      return;
    }

    try {
      setSwitchingNetwork(true);
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      setDetectedChainId(chainId);
      setStorageMessage(`已切换到 ${targetChain.name}`);
    } catch (error) {
      const err = error as { code?: number; message?: string };
      if (err.code === 4902) {
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${targetChain.id.toString(16)}`,
                chainName: targetChain.name,
                nativeCurrency: targetChain.nativeCurrency,
                rpcUrls: targetChain.rpcUrls.default.http,
                blockExplorerUrls: targetChain.blockExplorers?.default?.url
                  ? [targetChain.blockExplorers.default.url]
                  : undefined,
              },
            ],
          });

          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          });

          setDetectedChainId(chainId);
          setStorageMessage(`已添加并切换到 ${targetChain.name}`);
        } catch (addError) {
          setConnectError((addError as Error).message || "添加网络失败");
        }
      } else {
        setConnectError(err.message || "网络切换失败");
      }
    } finally {
      setSwitchingNetwork(false);
    }
  }

  async function detectProxyByAddress(address: string) {
    if (!isAddress(address)) {
      setProxyMode(false);
      setProxyDetectionNote("请输入有效合约地址后自动检测");
      return;
    }

    const ethereum = (window as Window & {
      ethereum?: {
        request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    }).ethereum;

    if (!ethereum) {
      setProxyMode(false);
      setProxyDetectionNote("未检测到 MetaMask，无法自动检测代理合约");
      return;
    }

    const IMPLEMENTATION_SLOT =
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const BEACON_SLOT =
      "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";

    try {
      setProxyChecking(true);
      const provider = new BrowserProvider(ethereum);
      const [implStorage, beaconStorage, code] = await Promise.all([
        provider.getStorage(address, IMPLEMENTATION_SLOT),
        provider.getStorage(address, BEACON_SLOT),
        provider.getCode(address),
      ]);

      const detected =
        hasNonZeroStorage(implStorage) ||
        hasNonZeroStorage(beaconStorage) ||
        isEip1167ProxyBytecode(code);

      setProxyMode(detected);
      setProxyDetectionNote(
        detected
          ? "已自动识别：该地址疑似代理合约（EIP-1967/EIP-1167 特征）"
          : "已自动识别：该地址看起来是普通合约",
      );
    } catch (error) {
      setProxyMode(false);
      setProxyDetectionNote((error as Error).message || "自动检测失败，已按普通合约处理");
    } finally {
      setProxyChecking(false);
    }
  }

  useEffect(() => {
    if (!mounted) return;
    if (!isAddress(contractAddress)) {
      setProxyDetectionNote("请输入有效合约地址后自动检测");
      setProxyMode(false);
      return;
    }

    const timer = setTimeout(() => {
      detectProxyByAddress(contractAddress);
    }, 500);

    return () => clearTimeout(timer);
  }, [contractAddress, mounted]);

  function updateCallState(signature: string, patch: Partial<CallState>) {
    setCallStates((prev: Record<string, CallState>) => ({
      ...prev,
      [signature]: {
        ...(prev[signature] || defaultCallState),
        ...patch,
      },
    }));
  }

  function getCallState(signature: string): CallState {
    return callStates[signature] || defaultCallState;
  }

  async function onImportAbi(event: ChangeEvent<HTMLInputElement>) {
    setAbiError("");
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as JsonFragment[] | { abi: JsonFragment[] };
      const abi = Array.isArray(parsed) ? parsed : parsed.abi;

      if (!Array.isArray(abi)) {
        throw new Error("ABI 文件格式错误，需为数组或包含 abi 字段");
      }

      setRawAbi(abi);
      setAbiFileName(file.name);
      setCallStates({});
      if (isAddress(contractAddress)) {
        void detectProxyByAddress(contractAddress);
      }
    } catch (error) {
      setAbiError((error as Error).message || "ABI 导入失败");
    }
  }

  async function executeFunction(fn: ParsedFunction, isWrite: boolean) {
    if (!window.ethereum) {
      updateCallState(fn.signature, { error: "未检测到 MetaMask" });
      return;
    }

    if (!isAddress(contractAddress)) {
      updateCallState(fn.signature, { error: "请输入有效的合约地址" });
      return;
    }

    try {
      updateCallState(fn.signature, {
        loading: true,
        error: "",
        result: "",
      });

      const currentState = getCallState(fn.signature);
      const params = fn.inputs.map((input) =>
        convertInputValue(currentState.args[input.name] ?? "", input.type),
      );

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, rawAbi as InterfaceAbi, signer);
      const method = contract.getFunction(fn.signature);

      if (isWrite) {
        const sendWriteTx = async (gasOverrides: Record<string, bigint>) => {
          const txOverrides: Record<string, bigint> = { ...gasOverrides };
          if (fn.stateMutability === "payable") {
            txOverrides.value = currentState.value.trim() === "" ? 0n : BigInt(currentState.value);
          }
          return method(...params, txOverrides);
        };

        let tx;
        try {
          const gasOverrides = await buildGasOverrides(provider);
          tx = await sendWriteTx(gasOverrides);
        } catch (firstError) {
          const minimumPriorityFee = parseMinimumPriorityFeeFromError(firstError);
          if (minimumPriorityFee === null) {
            throw firstError;
          }

          const retryGasOverrides = await buildGasOverrides(provider, minimumPriorityFee);
          tx = await sendWriteTx(retryGasOverrides);
        }

        const receipt = await tx.wait();
        updateCallState(fn.signature, {
          loading: false,
          result: prettyResult({
            hash: tx.hash,
            status: receipt?.status ?? null,
            gasPrice: tx.gasPrice ? tx.gasPrice.toString() : null,
            maxFeePerGas: tx.maxFeePerGas ? tx.maxFeePerGas.toString() : null,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? tx.maxPriorityFeePerGas.toString() : null,
          }),
        });
        return;
      }

      const result = await method.staticCall(...params);
      updateCallState(fn.signature, {
        loading: false,
        result: prettyResult(result),
      });
    } catch (error) {
      updateCallState(fn.signature, {
        loading: false,
        error: (error as Error).message || "调用失败",
      });
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <div className="rounded-3xl border border-primary-100/70 bg-gradient-to-br from-white via-white to-primary-50/60 p-6 shadow-lg shadow-primary-500/10 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:shadow-black/30 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Web3 UI</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 md:text-3xl">Wallet App (MetaMask + ABI)</h1>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t.language}</label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as UiLocale)}
              className="input-field w-[9.5rem] py-1.5"
            >
              {localeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="btn-secondary rounded-xl px-3 py-2 text-xs"
            >
              {`${t.theme}: ${theme === "dark" ? t.dark : t.light}`}
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 md:text-base">
          {t.subtitle}
        </p>
      </div>

      <section className="section-card mt-6 animate-fadeIn">
        <h2 className="section-title">{t.walletSection}</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={connectWallet}
              className="btn-primary rounded-xl px-4 py-2 text-sm inline-flex items-center"
              disabled={!mounted || isHydratedPending}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M12 2a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zM5 7a1 1 0 011 1v2a1 1 0 11-2 0V8a1 1 0 011-1zm13 0a1 1 0 011 1v2a1 1 0 11-2 0V8a1 1 0 011-1zM4 13a1 1 0 011 1v2a6 6 0 006 6h2a6 6 0 006-6v-2a1 1 0 112 0v2a8 8 0 01-8 8h-2a8 8 0 01-8-8v-2a1 1 0 011-1z" fill="currentColor" />
              </svg>
              {isHydratedPending ? t.connecting : t.connectMetaMask}
            </button>
            <button
              onClick={disconnectWallet}
              className="btn-secondary rounded-xl px-4 py-2 text-sm"
              disabled={!mounted || !isHydratedConnected}
            >
              {t.disconnectMetaMask}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {mounted ? (walletAddress ? `${t.address}: ${walletAddress}` : t.notConnected) : `${t.address}: --`}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                mounted && displayNetworkInfo.isTestnet
                  ? "bg-amber-100 font-semibold text-amber-700"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {t.network}: {displayNetworkInfo.isTestnet ? t.testnet : t.mainnet} · {displayNetworkInfo.name}
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={selectedSwitchChainId}
            onChange={(e) => {
              const nextChainId = Number(e.target.value);
              setSelectedSwitchChainId(nextChainId);
              if (mounted && !switchingNetwork && nextChainId !== activeChainId) {
                void switchNetwork(nextChainId);
              }
            }}
            className="input-field max-w-xs"
            disabled={!mounted || switchingNetwork}
          >
            {supportedChains.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {`${chain.testnet ? t.testnet : t.mainnet} · ${chain.name}`}
              </option>
            ))}
          </select>
        </div>
        {mounted && displayNetworkInfo.isTestnet && (
          <p className="mt-2 text-sm font-semibold text-amber-700">
            {formatTemplate(t.testnetWarning, { network: displayNetworkInfo.name })}
          </p>
        )}
        {connectError && <p className="mt-2 text-sm text-red-600">{connectError}</p>}
      </section>

      <section className="section-card mt-6 animate-slideUp">
        <h2 className="section-title">{t.contractSection}</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-700 dark:text-slate-300">{t.contractAddress}</span>
            <input
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value.trim())}
              placeholder="0x..."
              className="input-field"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-700 dark:text-slate-300">{t.importAbi}</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={onImportAbi}
              className="block w-full rounded-xl border border-slate-200 bg-white/80 p-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-arkreen file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-primary-600 dark:border-slate-700 dark:bg-slate-800/90"
            />
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-primary-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.localConfig}</p>
          <p className={`mt-1 text-xs font-semibold ${displayNetworkInfo.isTestnet ? "text-amber-700" : "text-primary-700"}`}>
            {formatTemplate(t.saveToCurrentNetwork, {
              networkType: displayNetworkInfo.isTestnet ? t.testnet : t.mainnet,
              networkName: displayNetworkInfo.name,
            })}
          </p>
          <div className="mt-2 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t.saveNamePlaceholder}
              className="input-field"
            />
            <button
              onClick={saveCurrentContract}
              className="btn-primary rounded-xl px-4 py-2 text-sm"
            >
              {t.saveConfig}
            </button>
          </div>

          <div className="mt-3">
            <select
              value={selectedSavedId}
              onChange={(e) => setSelectedSavedId(e.target.value)}
              className="input-field"
            >
              <option value="">{t.selectConfig}</option>
              {currentNetworkSavedContracts.map((item) => (
                <option key={item.id} value={item.id}>
                  {`${item.name} · ${item.address.slice(0, 6)}...${item.address.slice(-4)} · ${
                    item.abiFileName || "ABI"
                  }`}
                </option>
              ))}
            </select>
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => deleteSavedContractById(selectedSavedId)}
                className="btn-secondary rounded-xl px-4 py-2 text-sm"
                disabled={!selectedSavedId}
              >
                {t.deleteSelected}
              </button>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {formatTemplate(t.configStats, {
              current: currentNetworkSavedContracts.length,
              total: savedContracts.length,
            })}
          </p>
          {storageMessage && <p className="mt-2 text-sm text-primary-700">{storageMessage}</p>}
          {storageError && <p className="mt-2 text-sm text-red-600">{storageError}</p>}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-700 dark:text-slate-300">{t.detectResult}</span>
            <span className={proxyMode ? "text-primary-700" : "text-slate-700"}>
              {proxyChecking ? t.detecting : proxyMode ? t.proxyContract : t.normalContract}
            </span>
          </div>
          <button
            onClick={() => detectProxyByAddress(contractAddress)}
            className="btn-secondary rounded-lg px-3 py-1.5 text-xs"
            disabled={proxyChecking || !isAddress(contractAddress)}
          >
            {t.redetect}
          </button>
        </div>

        {proxyDetectionNote && (
          <p className="mt-2 text-sm text-slate-600">{proxyDetectionNote}</p>
        )}

        {abiFileName && (
          <p className="mt-2 text-sm text-primary-700">{t.importedAbi} {abiFileName}</p>
        )}
        {abiError && <p className="mt-2 text-sm text-red-600">{abiError}</p>}
      </section>

      <section className="section-card mt-6 animate-slideUp">
        <h2 className="section-title">{t.interfaceSection}</h2>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => setSelectedMode("read")}
            className={`min-w-[10.5rem] rounded-xl px-3 py-2 text-center text-sm font-medium transition-all ${
              selectedMode === "read"
                ? "bg-primary-600 text-white shadow-md shadow-primary-500/30"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {proxyMode ? t.readAsProxy : t.readContract}
          </button>
          <button
            onClick={() => setSelectedMode("write")}
            className={`min-w-[10.5rem] rounded-xl px-3 py-2 text-center text-sm font-medium transition-all ${
              selectedMode === "write"
                ? "bg-primary-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {proxyMode ? t.writeAsProxy : t.writeContract}
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {selectedMode === "read" && (
            <>
              {readFunctions.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t.noReadFunctions}</p>
              )}
              {readFunctions.map((fn) => {
                const state = getCallState(fn.signature);
                const expanded = !!expandedFunctions[fn.signature];
                return (
                  <div key={fn.signature} className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <button
                      type="button"
                      onClick={() => toggleFunctionExpanded(fn.signature)}
                      className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left transition-colors hover:bg-primary-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      <span className="text-sm font-medium dark:text-slate-100">{fn.signature}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{expanded ? t.collapse : t.expand}</span>
                    </button>

                    {expanded && (
                      <>
                        <div className="mt-2 space-y-2">
                          {fn.inputs.map((input) => (
                            <input
                              key={`${fn.signature}-${input.name}`}
                              placeholder={`${input.name} (${input.type})`}
                              value={state.args[input.name] ?? ""}
                              onChange={(e) =>
                                updateCallState(fn.signature, {
                                  args: {
                                    ...state.args,
                                    [input.name]: e.target.value,
                                  },
                                })
                              }
                              className="input-field"
                            />
                          ))}
                        </div>

                        <button
                          onClick={() => executeFunction(fn, false)}
                          className="btn-primary mt-3 rounded-xl px-4 py-2 text-sm"
                          disabled={state.loading}
                        >
                          {state.loading ? t.calling : t.read}
                        </button>

                        {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
                        {state.result && (
                          <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {state.result}
                          </pre>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {selectedMode === "write" && (
            <>
              {writeFunctions.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t.noWriteFunctions}</p>
              )}
              {writeFunctions.map((fn) => {
                const state = getCallState(fn.signature);
                const expanded = !!expandedFunctions[fn.signature];
                return (
                  <div key={fn.signature} className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <button
                      type="button"
                      onClick={() => toggleFunctionExpanded(fn.signature)}
                      className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left transition-colors hover:bg-primary-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      <span className="text-sm font-medium dark:text-slate-100">{fn.signature}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{expanded ? t.collapse : t.expand}</span>
                    </button>

                    {expanded && (
                      <>
                        <p className="mt-2 text-xs text-slate-500">{fn.stateMutability}</p>

                        <div className="mt-2 space-y-2">
                          {fn.inputs.map((input) => (
                            <input
                              key={`${fn.signature}-${input.name}`}
                              placeholder={`${input.name} (${input.type})`}
                              value={state.args[input.name] ?? ""}
                              onChange={(e) =>
                                updateCallState(fn.signature, {
                                  args: {
                                    ...state.args,
                                    [input.name]: e.target.value,
                                  },
                                })
                              }
                              className="input-field"
                            />
                          ))}

                          {fn.stateMutability === "payable" && (
                            <input
                              placeholder="msg.value (wei)"
                              value={state.value}
                              onChange={(e) =>
                                updateCallState(fn.signature, { value: e.target.value })
                              }
                              className="input-field"
                            />
                          )}
                        </div>

                        <button
                          onClick={() => executeFunction(fn, true)}
                          className="btn-primary mt-3 rounded-xl px-4 py-2 text-sm"
                          disabled={state.loading}
                        >
                          {state.loading ? t.submitting : t.write}
                        </button>

                        {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
                        {state.result && (
                          <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {state.result}
                          </pre>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletAppContent />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
