import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type = "text", error, label, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-semibold text-gray-700 block">
            {label}
          </label>
        )}
        <input
          type={type}
          className={`flex h-10 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-gray-800 transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? "border-red-500 focus:ring-red-400" : ""
          } ${className}`}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
