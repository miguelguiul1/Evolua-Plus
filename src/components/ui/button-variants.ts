import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-700 shadow-sm hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-error-600",
        outline: "border border-input bg-background hover:bg-secondary hover:border-primary/30 text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        accent: "bg-accent text-accent-foreground hover:bg-accent-600 shadow-sm hover:shadow-glow-accent",
        success: "bg-success text-success-foreground hover:bg-success-600 shadow-sm",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-primary text-primary-foreground hover:bg-primary-700 shadow-floating hover:shadow-glow font-display font-semibold tracking-wide",
        premium: "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-floating hover:shadow-glow font-display font-semibold tracking-wide bg-[length:200%_100%] hover:bg-[position:100%_0] transition-[background-position,box-shadow] duration-slower",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-xl px-8",
        xl: "h-14 rounded-xl px-10 text-base",
        icon: "h-11 w-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
