import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../components/Badge";

const meta = {
  title: "Example/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: { children: { control: "text" }, color: { control: "select", options: ["sage", "terracotta", "gold", "neutral"] } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "New Feature",
  },
};
