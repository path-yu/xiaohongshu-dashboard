import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import HDKey from "hdkey";
import { TronWeb } from "tronweb";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";

// 初始化 TronWeb
const tronWeb = new TronWeb({ fullHost: "https://api.trongrid.io" });

// 目标后4位
const TARGET_SUFFIX = "E8WI"; // 替换为你的目标后4位

// 主线程：启动多个 Worker
if (isMainThread) {
  const { cpus } = await import("os");
  const numCPUs = cpus().length; // 获取 CPU 核心数
  const workers = [];
  let attempts = 0;
  const maxAttempts = 1000000; // 总尝试次数上限

  console.log(`目标后4位: ${TARGET_SUFFIX}`);
  console.log(`使用 ${numCPUs} 个线程并行生成...`);

  // 创建 Worker 线程
  for (let i = 0; i < numCPUs; i++) {
    workers.push(
      new Worker(new URL(import.meta.url), {
        workerData: { target: TARGET_SUFFIX },
      })
    );
  }

  // 处理 Worker 消息
  for (const worker of workers) {
    worker.on("message", (result) => {
      if (result.found) {
        console.log(`成功找到匹配地址！总尝试次数: ${attempts}`);
        console.log(`助记词: ${result.mnemonic}`);
        console.log(`私钥: ${result.privateKey}`);
        console.log(`Tron 地址: ${result.address}`);
        console.log(`路径: ${result.path}`);
        workers.forEach((w) => w.terminate());
      } else {
        attempts += result.attempts;
        if (attempts >= maxAttempts) {
          console.log(`尝试 ${maxAttempts} 次后未找到匹配地址。`);
          workers.forEach((w) => w.terminate());
        }
      }
    });
  }
} else {
  // Worker 线程：生成并检查地址
  const targetSuffix = workerData.target;

  function generateTronAddress(mnemonic, pathIndex) {
    const seed = mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    const path = `m/44'/195'/0'/0/${pathIndex}`;
    const derivedKey = hdKey.derive(path);
    const privateKey = derivedKey.privateKey.toString("hex");
    const address = tronWeb.address.fromPrivateKey(privateKey);
    return { mnemonic, privateKey, address, path };
  }

  function findMatch() {
    const mnemonic = generateMnemonic(128); // 12 个单词
    let attempts = 0;
    const pathAttempts = 100; // 每个助记词尝试 100 个路径

    for (let i = 0; i < pathAttempts; i++) {
      const wallet = generateTronAddress(mnemonic, i);
      attempts++;

      if (wallet.address.slice(-4) === targetSuffix) {
        parentPort.postMessage({
          found: true,
          mnemonic: wallet.mnemonic,
          privateKey: wallet.privateKey,
          address: wallet.address,
          path: wallet.path,
          attempts,
        });
        return;
      }
    }

    // 未找到，报告尝试次数
    parentPort.postMessage({ found: false, attempts });
  }

  // 持续运行直到主线程终止
  while (true) {
    findMatch();
  }
}
