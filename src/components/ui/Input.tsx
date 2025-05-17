import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, containerClassName, ...props }, ref) => {
    return (
      <div className={cn('space-y-1', containerClassName)}>
        {label && (
          <label htmlFor={props.id} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          className={cn(
            'px-3 py-2 w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-primary-500 focus:border-primary-500 transition-colors',
            error && 'border-danger-300 focus:border-danger-500 focus:ring-danger-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-danger-600 text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export default Input;