import React from "react";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export function Container({
  size = "lg",
  children,
  className = "",
  ...props
}: ContainerProps) {
  const sizes = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-full",
  };

  return (
    <div
      className={`mx-auto px-4 sm:px-6 lg:px-8 ${sizes[size]} ${className}`}
      style={{ backgroundColor: "#fff" }}
      {...props}
    >
      {children}
    </div>
  );
}
