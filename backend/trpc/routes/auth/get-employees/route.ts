import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";

interface Employee {
  id: string;
  username: string;
  passwordHash: string;
  role: "admin" | "employee";
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  createdBy: string;
  permissions: {
    canManageUsers: boolean;
    canViewReports: boolean;
    canHandleRequests: boolean;
    canCreateInvoices: boolean;
    canViewCustomerInfo: boolean;
    canDeleteData: boolean;
  };
}

export const getEmployeesProcedure = protectedProcedure.query(async () => {
  const employees = await kv.getJSON<Employee[]>("employees") || [];
  
  const employeesWithoutPasswords = employees.map(({ passwordHash, ...employee }) => employee);
  
  return employeesWithoutPasswords;
});
