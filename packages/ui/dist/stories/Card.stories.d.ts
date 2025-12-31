import { StoryObj } from '@storybook/react';
import { Card } from '../components/Card';
declare const meta: {
  title: string;
  component: typeof Card;
  parameters: {
    layout: string;
  };
  tags: string[];
};
export default meta;
type Story = StoryObj<typeof meta>;
export declare const Default: Story;
