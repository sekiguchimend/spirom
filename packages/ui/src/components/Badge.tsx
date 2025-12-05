import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error";
  size?: "sm" | "md";
}

export function Badge({
  variant = "default",
  size = "md",
  children,
  className = "",
  ...props
}: BadgeProps) {
  const baseStyles = "inline-flex items-center font-medium rounded-full";

  const variants = {
    default: "",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      style={
        variant === "default"
          ? { backgroundColor: "#323232", color: "#fff" }
          : undefined
      }
      {...props}
    >
      {children}
    </span>
  );
}
