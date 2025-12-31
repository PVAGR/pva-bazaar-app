import { StoryObj } from '@storybook/react';
declare const meta: {
  title: string;
  component: import('react').FC<import('..').ButtonProps>;
  parameters: {
    layout: string;
  };
  tags: string[];
  argTypes: {
    children: {
      control: 'text';
    };
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
export declare const Primary: Story;
