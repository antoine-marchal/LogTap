import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url))
);

const platform = process.argv[2] ?? "native";

const commonArgs = [
    "bun build src/index.js",
    "--compile",
    `--outfile dist/${pkg.name}${platform === "windows" ? ".exe" : ""}`,
];

const icon = "ico.ico";

if (platform === "windows") {
    commonArgs.push(
        `--target=bun-windows-x64`,
        `--windows-icon ${icon}`,
        `--windows-title ${pkg.name}`,
        `--windows-publisher "${pkg.author}"`,
        `--windows-version ${pkg.version}`,
        `--windows-description "${pkg.description}"`,
        `--windows-copyright "${pkg.author}"`
    );
} else if (platform === "linux") {
    commonArgs.push(
        "--target=bun-linux-x64",
        `--icon ${icon}`,
        `--outfile dist/${pkg.name}-linux`
    );
} else if (platform === "mac") {
    commonArgs.push(
        "--target=bun-darwin-x64",
        `--icon ${icon}`,
        `--outfile dist/${pkg.name}-mac`
    );
} else {

    commonArgs.push(
        `--icon ${icon}`,
        `--target=bun-windows-x64`,
        `--windows-icon ${icon}`,
        `--windows-title ${pkg.name}`,
        `--windows-publisher "${pkg.author}"`,
        `--windows-version ${pkg.version}`,
        `--windows-description "${pkg.description}"`,
        `--windows-copyright "${pkg.author}"`
    );
}

const cmd = commonArgs.join(" ");
console.log("▶", cmd);
execSync(cmd, { stdio: "inherit" });
