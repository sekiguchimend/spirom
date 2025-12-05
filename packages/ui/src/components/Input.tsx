import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium mb-1"
          style={{ color: "#323232" }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
          error ? "border-red-500 focus:ring-red-500" : "focus:ring-gray-500"
        } ${className}`}
        style={{
          borderColor: error ? undefined : "#323232",
          color: "#323232",
          backgroundColor: "#fff",
        }}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-sm" style={{ color: "#323232", opacity: 0.7 }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
