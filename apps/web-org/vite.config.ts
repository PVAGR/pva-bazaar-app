import { defineConfig } from "vite";
import { copyFileSync, cpSync, mkdirSync } from "fs";
import { resolve } from "path";

export default defineConfig({
	root: ".",
	build: {
		outDir: "dist",
		rollupOptions: {
			input: "index.html"
		}
	},
	plugins: [
		{
			name: "copy-writings",
			closeBundle() {
				// Copy writings folder to dist after build
				const writingsSource = resolve(__dirname, "writings");
				const writingsDest = resolve(__dirname, "dist/writings");
				try {
					cpSync(writingsSource, writingsDest, { recursive: true });
					console.log("✅ Copied writings folder to dist/writings");
				} catch (err) {
					console.error("❌ Failed to copy writings:", err);
				}
			}
		}
	]
});
