# Wallet UI

一个基于 **React + TypeScript + Next.js + Tailwind CSS** 的钱包 App，支持：

1. 连接 MetaMask
2. 断开 MetaMask 连接
3. 显示当前 MetaMask 网络（ETH / Polygon / BSC / AVAX）
2. 导入合约 ABI（JSON）
4. 根据 ABI 自动生成交互界面：
   - 普通合约：`Read Contract` / `Write Contract`
   - 代理合约：`Read as Proxy` / `Write as Proxy`

## 快速启动

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`

## 使用说明

1. 点击“连接 MetaMask”
2. 需要时点击“断开 MetaMask 链接”
3. 输入合约地址
4. 导入 ABI JSON 文件（支持纯 ABI 数组，或 `{ "abi": [...] }` 结构）
5. 如果是代理合约，勾选“该地址是代理合约（使用 Read/Write as Proxy）”
6. 在自动生成的函数卡片中输入参数并调用

## 说明

- `view/pure` 函数归类到 Read 区域
- `nonpayable/payable` 函数归类到 Write 区域
- `payable` 函数支持填写 `msg.value (wei)`
- 输入参数类型支持基础 Solidity 类型与数组（数组请用 JSON 格式输入）
