import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const bundleRoot = path.join(repoRoot, "registry");
const trellisRoot = path.join(bundleRoot, ".trellis");
const managedRoots = ["spec", "skills", "workflows"];
const files = [];
const manifestPath = path.join(trellisRoot, "team-manifest.json");
const signaturesPath = path.join(trellisRoot, "team-signatures.json");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(
        "拒绝生成包含符号链接的 Manifest：" +
          path.relative(repoRoot, absolutePath),
      );
    }
    if (entry.isDirectory()) {
      walk(absolutePath);
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }
}

for (const managedRoot of managedRoots) {
  const absolutePath = path.join(trellisRoot, managedRoot);
  if (fs.existsSync(absolutePath)) walk(absolutePath);
}

const defaultsPath = path.join(trellisRoot, "team-defaults.yaml");
if (fs.existsSync(defaultsPath)) files.push(defaultsPath);

const previous = readJson(manifestPath, {});
const manifest = {
  schemaVersion: 1,
  teamVersion:
    process.env.TEAM_VERSION ?? previous.teamVersion ?? "2026.08.1",
  core: previous.core ?? {
    min: "0.6.15",
    maxExclusive: "0.8.0",
  },
  files: files.sort().map((absolutePath) => {
    const content = fs.readFileSync(absolutePath);
    return {
      path: path
        .relative(bundleRoot, absolutePath)
        .split(path.sep)
        .join("/"),
      sha256: createHash("sha256").update(content).digest("hex"),
    };
  }),
  delete: previous.delete ?? [],
  rename: previous.rename ?? [],
  ...(previous.rollbackVersion
    ? { rollbackVersion: previous.rollbackVersion }
    : {}),
  summary:
    process.env.TEAM_SUMMARY ??
    previous.summary ??
    "公司默认工作流、Git、产品差异、工程质量和安全规范",
  compatibility: previous.compatibility ?? {
    platforms: [],
    notes: "内容为平台无关 Markdown，公司 Skill 由 Trellis 投影。",
  },
  deprecations: previous.deprecations ?? [],
  governance: previous.governance ?? {
    requireDeprecationNotices: true,
  },
};

const manifestRaw = JSON.stringify(manifest, null, 2) + "\n";
fs.mkdirSync(trellisRoot, { recursive: true });
fs.writeFileSync(manifestPath, manifestRaw);

function validExistingSignatures() {
  const document = readJson(signaturesPath, { signatures: [] });
  if (!Array.isArray(document.signatures)) return [];

  return document.signatures.filter((entry) => {
    try {
      if (entry.algorithm !== "ed25519") return false;
      const publicKeyBytes = Buffer.from(entry.publicKey, "base64");
      const keyId = createHash("sha256").update(publicKeyBytes).digest("hex");
      if (keyId !== entry.keyId) return false;
      return verify(
        null,
        Buffer.from(manifestRaw, "utf-8"),
        createPublicKey({
          key: publicKeyBytes,
          format: "der",
          type: "spki",
        }),
        Buffer.from(entry.signature, "base64"),
      );
    } catch {
      return false;
    }
  });
}

const privateKeyFile =
  process.env.TEAM_SIGNING_PRIVATE_KEY_FILE?.trim();

if (!privateKeyFile) {
  fs.rmSync(signaturesPath, { force: true });
  console.log(
    "已生成 " +
      path.relative(repoRoot, manifestPath) +
      "，当前版本未签名。",
  );
  console.log(
    "如需签名，请通过 TEAM_SIGNING_PRIVATE_KEY_FILE 指向仓库外的 Ed25519 PEM 私钥。",
  );
  process.exit(0);
}

const privateKey = createPrivateKey(
  fs.readFileSync(path.resolve(privateKeyFile)),
);
if (privateKey.asymmetricKeyType !== "ed25519") {
  throw new Error(
    "TEAM_SIGNING_PRIVATE_KEY_FILE 必须包含 Ed25519 私钥。",
  );
}

const publicKeyBytes = createPublicKey(privateKey).export({
  format: "der",
  type: "spki",
});
const keyId = createHash("sha256").update(publicKeyBytes).digest("hex");
const nextSignature = {
  keyId,
  algorithm: "ed25519",
  publicKey: publicKeyBytes.toString("base64"),
  signature: sign(
    null,
    Buffer.from(manifestRaw, "utf-8"),
    privateKey,
  ).toString("base64"),
};

const signatures = new Map(
  validExistingSignatures().map((entry) => [entry.keyId, entry]),
);
signatures.set(keyId, nextSignature);
fs.writeFileSync(
  signaturesPath,
  JSON.stringify(
    {
      schemaVersion: 1,
      signatures: [...signatures.values()].sort((left, right) =>
        left.keyId.localeCompare(right.keyId),
      ),
    },
    null,
    2,
  ) + "\n",
);

console.log(
  "已生成 " +
    path.relative(repoRoot, manifestPath) +
    "，有效签名数：" +
    signatures.size,
);
console.log("签名 key id：" + keyId);
