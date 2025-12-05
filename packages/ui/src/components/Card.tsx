import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  variant = "default",
  padding = "md",
  children,
  className = "",
  ...props
}: CardProps) {
  const baseStyles = "rounded-lg";

  const variants = {
    default: "shadow-md",
    bordered: "border",
  };

  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}
      style={{
        backgroundColor: "#fff",
        borderColor: variant === "bordered" ? "#323232" : undefined,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
