// upgrade-packages.js
const { execSync } = require("child_process");
const fs = require("fs");

const packagesToRemove = ["crypto"]; // built-in, should not be installed

const upgrade = () => {
  console.log("📦 Removing deprecated packages...");
  packagesToRemove.forEach(pkg => {
    try {
      execSync(`npm uninstall ${pkg}`, { stdio: "inherit" });
    } catch {}
  });

  console.log("🚀 Running npm-check-updates...");
  execSync("npx npm-check-updates -u", { stdio: "inherit" });

  console.log("🔁 Installing latest versions...");
  execSync("npm install", { stdio: "inherit" });

  console.log("✅ Upgrade complete.");
};

upgrade();

