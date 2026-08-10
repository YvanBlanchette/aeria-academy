import { spawn } from "node:child_process";

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

const tunnel = spawn(npmCmd, ["run", "db:tunnel"], {
	stdio: "inherit",
	shell: isWin,
});

const dev = spawn(npmCmd, ["run", "dev"], {
	stdio: "inherit",
	shell: isWin,
});

let shuttingDown = false;

function shutdown(code = 0) {
	if (shuttingDown) return;
	shuttingDown = true;

	if (!tunnel.killed) {
		tunnel.kill("SIGINT");
	}
	if (!dev.killed) {
		dev.kill("SIGINT");
	}

	setTimeout(() => process.exit(code), 250);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

tunnel.on("exit", (code) => {
	if (shuttingDown) return;
	console.error(`DB tunnel exited with code ${code ?? 0}. Stopping dev server.`);
	shutdown(code ?? 1);
});

dev.on("exit", (code) => {
	if (shuttingDown) return;
	console.log(`Dev server exited with code ${code ?? 0}. Closing DB tunnel.`);
	shutdown(code ?? 0);
});
