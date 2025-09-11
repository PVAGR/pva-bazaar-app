import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "PVA/Button",
  component: Button,
  args: {
    children: "Click me",
  },
};
export default meta;

export const Primary: StoryObj<typeof Button> = {
  args: { variant: "primary" },
};

export const Secondary: StoryObj<typeof Button> = {
  args: { variant: "secondary" },
};

export const Tertiary: StoryObj<typeof Button> = {
  args: { variant: "tertiary" },
};
