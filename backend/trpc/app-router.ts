import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { createInvoiceProcedure } from "./routes/stripe/create-invoice/route";
import { loginProcedure } from "./routes/auth/login/route";
import { getAuditLogsProcedure } from "./routes/auth/get-audit-logs/route";
import { createEmployeeProcedure } from "./routes/auth/create-employee/route";
import { getEmployeesProcedure } from "./routes/auth/get-employees/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  stripe: createTRPCRouter({
    createInvoice: createInvoiceProcedure,
  }),
  auth: createTRPCRouter({
    login: loginProcedure,
    getAuditLogs: getAuditLogsProcedure,
    createEmployee: createEmployeeProcedure,
    getEmployees: getEmployeesProcedure,
  }),
});

export type AppRouter = typeof appRouter;
