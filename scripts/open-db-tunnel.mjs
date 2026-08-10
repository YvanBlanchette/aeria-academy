import "dotenv/config";
import { spawn } from "node:child_process";

const sshTargetAlias = process.env.SSH_DB_TARGET;
const sshHost = process.env.SSH_DB_HOST;
const sshUser = process.env.SSH_DB_USER;
const sshPort = process.env.SSH_DB_PORT;
const remoteHost = process.env.SSH_DB_REMOTE_HOST || "127.0.0.1";
const remotePort = process.env.SSH_DB_REMOTE_PORT || "5432";
const localPort = process.env.SSH_DB_LOCAL_PORT || "5433";

if (!sshTargetAlias && (!sshHost || !sshUser)) {
	console.error("Missing SSH_DB_TARGET, or SSH_DB_HOST/SSH_DB_USER in .env");
	process.exit(1);
}

const sshTarget = sshTargetAlias || `${sshUser}@${sshHost}`;
const forwarding = `${localPort}:${remoteHost}:${remotePort}`;
const args = ["-N", "-L", forwarding];

if (sshPort) {
	args.push("-p", sshPort);
}

args.push(sshTarget);
const sshLabel = sshPort ? `${sshTarget}:${sshPort}` : sshTarget;

console.log(`Opening SSH tunnel: 127.0.0.1:${localPort} -> ${remoteHost}:${remotePort} via ${sshLabel}`);
console.log("Keep this terminal open while running the app.");

const child = spawn("ssh", args, {
	stdio: "inherit",
	shell: process.platform === "win32",
});

child.on("exit", (code) => {
	process.exit(code ?? 0);
});
