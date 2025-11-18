import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import loginProcedure from "./routes/auth/login/route";
import getUsersProcedure from "./routes/auth/get-users/route";
import createUserProcedure from "./routes/auth/create-user/route";
import updateUserProcedure from "./routes/auth/update-user/route";
import deleteUserProcedure from "./routes/auth/delete-user/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    login: loginProcedure,
    getUsers: getUsersProcedure,
    createUser: createUserProcedure,
    updateUser: updateUserProcedure,
    deleteUser: deleteUserProcedure,
  }),
});

export type AppRouter = typeof appRouter;
