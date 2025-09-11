import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../components/Button";

const meta = {
  title: "Example/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: { children: { control: "text" } },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "Click me",
  },
};
