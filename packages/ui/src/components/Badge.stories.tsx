import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "PVA/Badge",
  component: Badge,
  args: {
    children: "Sage",
    color: "sage",
  },
};
export default meta;

export const Sage: StoryObj<typeof Badge> = {
  args: { color: "sage" },
};
export const Terracotta: StoryObj<typeof Badge> = {
  args: { color: "terracotta" },
};
export const Gold: StoryObj<typeof Badge> = {
  args: { color: "gold" },
};
export const Neutral: StoryObj<typeof Badge> = {
  args: { color: "neutral" },
};
