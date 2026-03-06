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
import { avalanche, bsc, mainnet, polygon } from "wagmi/chains";

const supportedChains = [mainnet, polygon, bsc, avalanche] as const;

const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    metaMask({
      dappMetadata: {
        name: "Wallet UI",
        url: "http://localhost:3000",
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
    [avalanche.id]: http(),
  },
});

const queryClient = new QueryClient();

function getChainName(chainId?: number): string {
  if (!chainId) return "未知网络";
  const map: Record<number, string> = {
    1: "ETH Mainnet",
    137: "Polygon",
    56: "BSC",
    43114: "AVAX",
  };
  return map[chainId] ?? `Chain ID: ${chainId}`;
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

  const [proxyMode, setProxyMode] = useState(false);
  const [proxyChecking, setProxyChecking] = useState(false);
  const [proxyDetectionNote, setProxyDetectionNote] = useState("");
  const [selectedMode, setSelectedMode] = useState<ContractMode>("read");
  const [callStates, setCallStates] = useState<Record<string, CallState>>({});

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

  const isHydratedConnected = mounted && isConnected;
  const isHydratedPending = mounted && isPending;

  useEffect(() => {
    setMounted(true);
  }, []);

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
      setConnectError(wagmiConnectError.message || "连接钱包失败");
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
        const tx = fn.stateMutability === "payable"
          ? await method(...params, {
              value: currentState.value.trim() === "" ? 0n : BigInt(currentState.value),
            })
          : await method(...params);

        const receipt = await tx.wait();
        updateCallState(fn.signature, {
          loading: false,
          result: prettyResult({ hash: tx.hash, status: receipt?.status ?? null }),
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
    <main className="mx-auto min-h-screen max-w-6xl p-6 md:p-10">
      <h1 className="text-2xl font-semibold">Wallet App (MetaMask + ABI)</h1>

      <section className="mt-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium">1. 钱包连接</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={connectWallet}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              disabled={!mounted || isHydratedPending}
            >
              {isHydratedPending ? "连接中..." : "连接 MetaMask"}
            </button>
            <button
              onClick={disconnectWallet}
              className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300"
              disabled={!mounted || !isHydratedConnected}
            >
              断开 MetaMask 链接
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <span className="text-sm text-slate-600">
              {mounted ? (walletAddress ? `地址: ${walletAddress}` : "未连接") : "地址: --"}
            </span>
            <span className="text-sm text-slate-600">
              网络: {mounted ? getChainName(currentChainId || detectedChainId) : "--"}
            </span>
          </div>
        </div>
        {connectError && <p className="mt-2 text-sm text-red-600">{connectError}</p>}
      </section>

      <section className="mt-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium">2. ABI 导入与合约配置</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-700">合约地址</span>
            <input
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value.trim())}
              placeholder="0x..."
              className="w-full rounded-md border px-3 py-2 outline-none ring-slate-300 focus:ring"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-700">导入 ABI JSON 文件</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={onImportAbi}
              className="block w-full rounded-md border p-2"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-700">自动检测结果：</span>
            <span className={proxyMode ? "text-emerald-700" : "text-slate-700"}>
              {proxyChecking ? "检测中..." : proxyMode ? "代理合约" : "普通合约"}
            </span>
          </div>
          <button
            onClick={() => detectProxyByAddress(contractAddress)}
            className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-300"
            disabled={proxyChecking || !isAddress(contractAddress)}
          >
            重新检测
          </button>
        </div>

        {proxyDetectionNote && (
          <p className="mt-2 text-sm text-slate-600">{proxyDetectionNote}</p>
        )}

        {abiFileName && (
          <p className="mt-2 text-sm text-emerald-700">已导入 ABI：{abiFileName}</p>
        )}
        {abiError && <p className="mt-2 text-sm text-red-600">{abiError}</p>}
      </section>

      <section className="mt-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium">3. 合约接口</h2>
        <div className="mt-3 flex flex-wrap justify-between gap-2">
          <button
            onClick={() => setSelectedMode("read")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              selectedMode === "read"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {proxyMode ? "Read as Proxy" : "Read Contract"}
          </button>
          <button
            onClick={() => setSelectedMode("write")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              selectedMode === "write"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {proxyMode ? "Write as Proxy" : "Write Contract"}
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {selectedMode === "read" && (
            <>
              {readFunctions.length === 0 && (
                <p className="text-sm text-slate-500">暂无可读函数（view/pure）</p>
              )}
              {readFunctions.map((fn) => {
                const state = getCallState(fn.signature);
                return (
                  <div key={fn.signature} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{fn.signature}</p>
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
                          className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => executeFunction(fn, false)}
                      className="mt-3 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500"
                      disabled={state.loading}
                    >
                      {state.loading ? "调用中..." : "Read"}
                    </button>

                    {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
                    {state.result && (
                      <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-2 text-xs">
                        {state.result}
                      </pre>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {selectedMode === "write" && (
            <>
              {writeFunctions.length === 0 && (
                <p className="text-sm text-slate-500">暂无可写函数（nonpayable/payable）</p>
              )}
              {writeFunctions.map((fn) => {
                const state = getCallState(fn.signature);
                return (
                  <div key={fn.signature} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{fn.signature}</p>
                    <p className="mt-1 text-xs text-slate-500">{fn.stateMutability}</p>

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
                          className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                      ))}

                      {fn.stateMutability === "payable" && (
                        <input
                          placeholder="msg.value (wei)"
                          value={state.value}
                          onChange={(e) =>
                            updateCallState(fn.signature, { value: e.target.value })
                          }
                          className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                      )}
                    </div>

                    <button
                      onClick={() => executeFunction(fn, true)}
                      className="mt-3 rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
                      disabled={state.loading}
                    >
                      {state.loading ? "提交中..." : "Write"}
                    </button>

                    {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
                    {state.result && (
                      <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-2 text-xs">
                        {state.result}
                      </pre>
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
