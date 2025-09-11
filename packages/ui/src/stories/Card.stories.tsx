import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "../components/Card";

const meta = {
  title: "Example/Card",
  component: Card,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Example Card",
    children: "This is the content of the card.",
    href: "https://github.com/PVAGR/pva-bazaar",
  },
};
