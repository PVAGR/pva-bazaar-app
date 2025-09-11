import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";

const meta: Meta<typeof Card> = {
  title: "PVA/Card",
  component: Card,
  args: {
    title: "Example Card",
    children: "This is a card body demonstrating the Card component.",
    href: "https://example.com",
  },
};
export default meta;

export const Default: StoryObj<typeof Card> = { args: {} };
