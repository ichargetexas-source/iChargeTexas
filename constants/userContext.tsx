import createContextHook from "@nkzw/create-context-hook";
import { useMemo } from "react";

export const [UserContext, useUser] = createContextHook(() => {
  return useMemo(() => ({
    isAdmin: true,
    isLoading: false,
  }), []);
});
