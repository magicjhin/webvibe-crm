/**
 * Hash a password with bcrypt (cost 12) and print the hash to stdout.
 *
 * Recommended (interactive, no shell history leak):
 *   pnpm tsx scripts/hash-password.ts
 *   → prompts twice for password (typing hidden)
 *
 * Alternative (one-shot, leaks to shell history — use only in CI):
 *   pnpm tsx scripts/hash-password.ts "<plaintext>"
 *
 * Copy the output hash into ADMIN_PASSWORD_HASH in .env (with surrounding quotes).
 */
import bcrypt from "bcryptjs";

function promptPassword(label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;

    if (!stdin.isTTY) {
      reject(
        new Error(
          "Not a TTY — interactive password input unavailable. " +
            "Run from a real terminal, or pass plaintext as argv (less secure)."
        )
      );
      return;
    }

    process.stdout.write(label);

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let password = "";

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
    };

    const onData = (chunk: string) => {
      for (const ch of chunk) {
        const code = ch.charCodeAt(0);

        if (ch === "\n" || ch === "\r" || code === 0x04) {
          process.stdout.write("\n");
          cleanup();
          resolve(password);
          return;
        }

        if (code === 0x03) {
          process.stdout.write("\n");
          cleanup();
          process.exit(130);
        }

        if (code === 0x7f || ch === "\b") {
          if (password.length > 0) password = password.slice(0, -1);
          continue;
        }

        // accept printable characters only
        if (code >= 0x20) {
          password += ch;
        }
      }
    };

    stdin.on("data", onData);
  });
}

async function main() {
  let plain = process.argv[2];

  if (!plain) {
    console.log("Input is hidden — type your password and press Enter.\n");
    plain = await promptPassword("Password: ");
    if (!plain) {
      console.error("Empty password");
      process.exit(1);
    }
    const confirm = await promptPassword("Confirm:  ");
    if (confirm !== plain) {
      console.error("Passwords do not match");
      process.exit(1);
    }
  }

  if (plain.length < 8) {
    console.error("Password must be at least 8 characters");
    process.exit(1);
  }

  const hash = await bcrypt.hash(plain, 12);
  console.log(hash);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
