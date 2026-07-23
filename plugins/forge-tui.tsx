/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule, TuiSlotPlugin } from "@opencode-ai/plugin/tui";

const FORGE_ART = [
  " ███████╗ ██████╗ ██████╗  ██████╗ ███████╗",
  " ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝",
  " █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ",
  " ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ",
  " ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗",
  " ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝",
] as const;

const FORGE_TAGLINE = "By HumanForce";
const HF_PRIMARY = "#3c489f";
const HF_SECONDARY = "#ffd042";
const HF_TERTIARY = "#f15b29";

function themeColor(map: Record<string, unknown>, name: string, fallback: string): string {
  const value = map[name];
  return typeof value === "string" ? value : fallback;
}

const tui: TuiPlugin = async (api) => {
  const slot: TuiSlotPlugin = {
    slots: {
      home_logo(ctx) {
        const map = ctx.theme.current;
        const primary = themeColor(map, "primary", HF_PRIMARY);
        const secondary = themeColor(map, "secondary", HF_SECONDARY);
        const tertiary = themeColor(map, "accent", HF_TERTIARY);
        const muted = themeColor(map, "textMuted", HF_SECONDARY);
        const lineColors = [primary, primary, primary, primary, primary, primary];

        return (
          <box flexDirection="column" alignItems="center" gap={0}>
            {FORGE_ART.map((line, i) => (
              <text fg={lineColors[i % lineColors.length]}>{line}</text>
            ))}
            <text fg={muted}>{`               ${FORGE_TAGLINE}`}</text>
          </box>
        );
      },
    },
  };

  api.slots.register(slot);
};

const plugin: TuiPluginModule & { id: string } = {
  id: "humanforce.forge",
  tui,
};

export default plugin;
