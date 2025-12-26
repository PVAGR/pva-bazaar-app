import { StoryObj } from '@storybook/react';
declare const meta: {
    title: string;
    component: import('react').FC<import('..').BadgeProps>;
    parameters: {
        layout: string;
    };
    tags: string[];
    argTypes: {
        children: {
            control: "text";
        };
        color: {
            control: "select";
            options: string[];
        };
    };
};
export default meta;
type Story = StoryObj<typeof meta>;
export declare const Default: Story;
