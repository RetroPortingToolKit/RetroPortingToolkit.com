import "react";

declare module "react" {
  // Generic name must match React's declaration for interface merging.
  interface HTMLAttributes<T> {
    /** Prevents focus and interaction within a covered UI subtree. */
    inert?: "";
  }
}
