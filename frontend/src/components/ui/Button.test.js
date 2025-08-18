import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, IconButton, FAB } from './Button';
import { PlusIcon } from '@heroicons/react/24/outline';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: React.forwardRef(({ children, ...props }, ref) => (
      <button ref={ref} {...props}>{children}</button>
    )),
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Test Button</Button>);
    const button = screen.getByRole('button', { name: /test button/i });
    expect(button).toBeInTheDocument();
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('from-primary-500');

    rerender(<Button variant="secondary">Secondary</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('from-secondary-500');

    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('from-red-500');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('h-8');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('h-12');
  });

  it('renders with icon on the left', () => {
    render(
      <Button icon={<PlusIcon data-testid="plus-icon" />} iconPosition="left">
        Add Item
      </Button>
    );
    
    const icon = screen.getByTestId('plus-icon');
    const text = screen.getByText('Add Item');
    expect(icon).toBeInTheDocument();
    expect(text).toBeInTheDocument();
  });

  it('renders with icon on the right', () => {
    render(
      <Button icon={<PlusIcon data-testid="plus-icon" />} iconPosition="right">
        Add Item
      </Button>
    );
    
    const icon = screen.getByTestId('plus-icon');
    const text = screen.getByText('Add Item');
    expect(icon).toBeInTheDocument();
    expect(text).toBeInTheDocument();
  });

  it('handles loading state', () => {
    render(<Button loading>Loading Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    // Check for loading spinner
    const spinner = button.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Clickable Button</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('applies glow effect', () => {
    render(<Button glow>Glow Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('glow');
  });

  it('applies pulse animation', () => {
    render(<Button pulse>Pulse Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('animate-pulse');
  });
});

describe('IconButton Component', () => {
  it('renders as icon button', () => {
    render(
      <IconButton>
        <PlusIcon data-testid="icon" />
      </IconButton>
    );
    
    const button = screen.getByRole('button');
    const icon = screen.getByTestId('icon');
    
    expect(button).toHaveClass('h-10', 'w-10', 'rounded-full');
    expect(icon).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <IconButton className="custom-icon-class">
        <PlusIcon />
      </IconButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-icon-class', 'rounded-full');
  });
});

describe('FAB Component', () => {
  it('renders as floating action button', () => {
    render(<FAB>FAB</FAB>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('fixed', 'bottom-6', 'right-6', 'rounded-full', 'shadow-xl');
  });

  it('renders in mini variant', () => {
    render(<FAB mini>Mini FAB</FAB>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('h-12', 'w-12');
  });

  it('renders in extended variant', () => {
    render(<FAB extended>Extended FAB</FAB>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('h-12', 'px-6', 'rounded-full');
  });

  it('has glow effect by default', () => {
    render(<FAB>FAB with Glow</FAB>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('glow');
  });
});