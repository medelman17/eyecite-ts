import { usage } from "./cli";
import { inspectFinding } from "./commands/inspect";
import { promoteFinding } from "./commands/promote";
import { runBughunt } from "./commands/run";

export async function runCommand(argv: string[] = process.argv.slice(2)): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return command ? 0 : 1;
  }

  if (command === "run") {
    return runBughunt(rest);
  }
  if (command === "inspect") {
    return inspectFinding(rest);
  }
  if (command === "promote") {
    return promoteFinding(rest);
  }

  console.error(`Unknown bughunt command: ${command}\n\n${usage()}`);
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCommand().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
