const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// 读取 package.json 文件
const packageJsonPath = path.join(__dirname, "package.json");

fs.readFile(packageJsonPath, "utf8", (err, data) => {
  if (err) {
    console.error("读取 package.json 文件失败:", err);
    return;
  }

  try {
    // 解析 JSON 数据
    const packageJson = JSON.parse(data);

    // 获取 assets 配置
    const assets = (packageJson.pkg && packageJson.pkg.assets) || [];

    if (!assets.length) {
      console.log("没有找到 pkg.assets 配置");
      return;
    }

    // 拼接 pkg 命令
    const assetsOptions = assets.map((asset) => `--assets ${asset}`).join(" ");

    // 拼接最终的 pkg 命令
    const command = `pkg server/main.js --output xhs-web-app -t node*-win-x64 ${assetsOptions}`;

    console.log("生成的命令:", command);

    // 执行命令
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("执行命令时出错:", err);
        return;
      }
      if (stderr) {
        console.error("命令错误输出:", stderr);
        return;
      }
      console.log("命令输出:", stdout);
    });
  } catch (err) {
    console.error("解析 package.json 文件失败:", err);
  }
});
