import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import Badge from '../components/Badge';

// Mock CSS modules
vi.mock('../styles/Badge.module.css', () => ({
  default: {
    badge: 'badge',
    'badge--primary': 'badge--primary',
    'badge--secondary': 'badge--secondary',
    'badge--success': 'badge--success',
    'badge--warning': 'badge--warning',
    'badge--error': 'badge--error',
    'badge--small': 'badge--small',
    'badge--medium': 'badge--medium',
    'badge--large': 'badge--large',
    'badge--clickable': 'badge--clickable',
  },
}));

describe('Badge Component', () => {
  const defaultProps = {
    children: 'Test Badge',
    variant: 'primary' as const,
    size: 'medium' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Badge {...defaultProps} />);
      
      const badge = screen.getByText('Test Badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge', 'badge--primary', 'badge--medium');
    });

    it('should render with custom text', () => {
      render(<Badge {...defaultProps}>Custom Badge Text</Badge>);
      
      expect(screen.getByText('Custom Badge Text')).toBeInTheDocument();
    });

    it('should apply correct variant classes', () => {
      const variants = ['primary', 'secondary', 'success', 'warning', 'error'] as const;
      
      variants.forEach(variant => {
        const { rerender } = render(<Badge {...defaultProps} variant={variant} />);
        const badge = screen.getByText('Test Badge');
        expect(badge).toHaveClass(`badge--${variant}`);
        rerender(<div />); // Clear for next iteration
      });
    });

    it('should apply correct size classes', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      
      sizes.forEach(size => {
        const { rerender } = render(<Badge {...defaultProps} size={size} />);
        const badge = screen.getByText('Test Badge');
        expect(badge).toHaveClass(`badge--${size}`);
        rerender(<div />); // Clear for next iteration
      });
    });

    it('should render as button when clickable', () => {
      const onClick = vi.fn();
      render(<Badge {...defaultProps} onClick={onClick} />);
      
      const badge = screen.getByRole('button');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge--clickable');
    });

    it('should render as span when not clickable', () => {
      render(<Badge {...defaultProps} />);
      
      const badge = screen.getByText('Test Badge');
      expect(badge.tagName).toBe('SPAN');
      expect(badge).not.toHaveClass('badge--clickable');
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', async () => {
      const onClick = vi.fn();
      render(<Badge {...defaultProps} onClick={onClick} />);
      
      const badge = screen.getByRole('button');
      fireEvent.click(badge);
      
      await waitFor(() => {
        expect(onClick).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle keyboard interactions when clickable', async () => {
      const onClick = vi.fn();
      render(<Badge {...defaultProps} onClick={onClick} />);
      
      const badge = screen.getByRole('button');
      
      // Test Enter key
      fireEvent.keyDown(badge, { key: 'Enter', code: 'Enter' });
      await waitFor(() => {
        expect(onClick).toHaveBeenCalledTimes(1);
      });
      
      // Test Space key
      fireEvent.keyDown(badge, { key: ' ', code: 'Space' });
      await waitFor(() => {
        expect(onClick).toHaveBeenCalledTimes(2);
      });
    });

    it('should not respond to click when disabled', () => {
      const onClick = vi.fn();
      render(<Badge {...defaultProps} onClick={onClick} disabled />);
      
      const badge = screen.getByRole('button');
      expect(badge).toBeDisabled();
      
      fireEvent.click(badge);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes when clickable', () => {
      const onClick = vi.fn();
      render(<Badge {...defaultProps} onClick={onClick} />);
      
      const badge = screen.getByRole('button');
      expect(badge).toHaveAttribute('type', 'button');
      expect(badge).toHaveAttribute('tabindex', '0');
    });

    it('should support custom ARIA label', () => {
      render(<Badge {...defaultProps} ariaLabel="Custom badge label" />);
      
      const badge = screen.getByLabelText('Custom badge label');
      expect(badge).toBeInTheDocument();
    });

    it('should be keyboard navigable when clickable', () => {
      const onClick = vi.fn();
      render(<Badge {...defaultProps} onClick={onClick} />);
      
      const badge = screen.getByRole('button');
      badge.focus();
      expect(badge).toHaveFocus();
    });

    it('should not be keyboard navigable when not clickable', () => {
      render(<Badge {...defaultProps} />);
      
      const badge = screen.getByText('Test Badge');
      expect(badge).not.toHaveAttribute('tabindex');
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      render(<Badge {...defaultProps} className="custom-class" />);
      
      const badge = screen.getByText('Test Badge');
      expect(badge).toHaveClass('custom-class', 'badge');
    });

    it('should accept custom data attributes', () => {
      render(<Badge {...defaultProps} data-testid="custom-badge" data-value="123" />);
      
      const badge = screen.getByTestId('custom-badge');
      expect(badge).toHaveAttribute('data-value', '123');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLSpanElement>();
      render(<Badge {...defaultProps} ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
      expect(ref.current?.textContent).toBe('Test Badge');
    });
  });

  describe('Icon Support', () => {
    it('should render with icon', () => {
      const MockIcon = () => <svg data-testid="badge-icon" />;
      render(<Badge {...defaultProps} icon={<MockIcon />} />);
      
      expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('should render icon-only badge', () => {
      const MockIcon = () => <svg data-testid="badge-icon" />;
      render(<Badge {...defaultProps} icon={<MockIcon />} children={undefined} />);
      
      expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
      expect(screen.queryByText('Test Badge')).not.toBeInTheDocument();
    });
  });

  describe('Theme Support', () => {
    it('should apply theme classes', () => {
      render(<Badge {...defaultProps} theme="dark" />);
      
      const badge = screen.getByText('Test Badge');
      expect(badge).toHaveClass('badge--dark');
    });

    it('should support high contrast mode', () => {
      render(<Badge {...defaultProps} highContrast />);
      
      const badge = screen.getByText('Test Badge');
      expect(badge).toHaveClass('badge--high-contrast');
    });
  });

  describe('Responsive Behavior', () => {
    it('should apply responsive size classes', () => {
      render(<Badge {...defaultProps} responsiveSize={{ mobile: 'small', desktop: 'large' }} />);
      
      const badge = screen.getByText('Test Badge');
      expect(badge).toHaveClass('badge--responsive-mobile-small', 'badge--responsive-desktop-large');
    });
  });

  describe('Animation Support', () => {
    it('should apply animation classes when specified', () => {
      render(<Badge {...defaultProps} animate="pulse" />);
      
      const badge = screen.getByText('Test Badge');
      expect(badge).toHaveClass('badge--animate-pulse');
    });

    it('should not apply animation classes by default', () => {
      render(<Badge {...defaultProps} />);
      
      const badge = screen.getByText('Test Badge');
      expect(badge.className).not.toMatch(/badge--animate/);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty children gracefully', () => {
      render(<Badge {...defaultProps} children="" />);
      
      const badge = screen.getByRole('generic', { hidden: true });
      expect(badge).toBeInTheDocument();
      expect(badge).toBeEmptyDOMElement();
    });

    it('should handle undefined variant gracefully', () => {
      // @ts-expect-error Testing error case
      render(<Badge {...defaultProps} variant={undefined} />);
      
      const badge = screen.getByText('Test Badge');
      expect(badge).toHaveClass('badge'); // Should still have base class
    });
  });
});