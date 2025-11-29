import { kv } from "./storage";

interface SeededEmployee {
  id: string;
  employeeId: string;
  username: string;
  password: string;
  passwordHash: string;
  role: "admin" | "worker" | "super_admin";
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
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

interface CredentialLogEntry {
  id: string;
  username: string;
  password: string;
  role: string;
  createdAt: string;
  createdBy: string;
  createdById: string;
}

async function seedData() {
  console.log("[Seed] Starting seed process...");
  const employees = (await kv.getJSON<SeededEmployee[]>("employees")) || [];
  console.log(`[Seed] Current employees count: ${employees.length}`);

  let didChange = false;

  if (!employees.some((e) => e.username === "admin")) {
    console.log("[Seed] Creating admin user");
    employees.push({
      id: "super_admin_001",
      employeeId: "000001",
      username: "admin",
      password: "admin123",
      passwordHash: "hashed_admin123",
      role: "super_admin",
      fullName: "System Admin",
      email: "admin@rork.app",
      phone: "",
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: "system",
      permissions: {
        canManageUsers: true,
        canViewReports: true,
        canHandleRequests: true,
        canCreateInvoices: true,
        canViewCustomerInfo: true,
        canDeleteData: true,
      },
    });

    const credentialLogs = (await kv.getJSON<CredentialLogEntry[]>("credential_logs")) || [];
    credentialLogs.push({
      id: "cred_admin",
      username: "admin",
      password: "admin123",
      role: "super_admin",
      createdAt: new Date().toISOString(),
      createdBy: "system",
      createdById: "system",
    });
    await kv.setJSON("credential_logs", credentialLogs);
    didChange = true;
  }

  if (!employees.some((e) => e.username === "elena")) {
    console.log("[Seed] Creating user elena");
    const elenaEmployeeId = (employees.length + 1).toString().padStart(6, "0");
    employees.push({
      id: `emp_${Date.now()}_elena`,
      employeeId: elenaEmployeeId,
      username: "elena",
      password: "bacon",
      passwordHash: "hashed_bacon",
      role: "worker",
      fullName: "elena",
      email: "ichargetexas@gmail.com",
      phone: "9034520052",
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: "super_admin_001",
      permissions: {
        canManageUsers: false,
        canViewReports: true,
        canHandleRequests: true,
        canCreateInvoices: true,
        canViewCustomerInfo: true,
        canDeleteData: false,
      },
    });

    const credentialLogs = (await kv.getJSON<CredentialLogEntry[]>("credential_logs")) || [];
    credentialLogs.push({
      id: `cred_${Date.now()}_elena`,
      username: "elena",
      password: "bacon",
      role: "worker",
      createdAt: new Date().toISOString(),
      createdBy: "Super Admin",
      createdById: "super_admin_001",
    });
    await kv.setJSON("credential_logs", credentialLogs);
    didChange = true;
  }

  if (!employees.some((e) => e.username === "testworker")) {
    console.log("[Seed] Creating user testworker");
    const testWorkerEmployeeId = (employees.length + 1).toString().padStart(6, "0");
    employees.push({
      id: `emp_${Date.now()}_testworker`,
      employeeId: testWorkerEmployeeId,
      username: "testworker",
      password: "testworker123",
      passwordHash: "hashed_testworker123",
      role: "worker",
      fullName: "Test Worker",
      email: "testworker@example.com",
      phone: "5550001234",
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: "super_admin_001",
      permissions: {
        canManageUsers: false,
        canViewReports: true,
        canHandleRequests: true,
        canCreateInvoices: true,
        canViewCustomerInfo: true,
        canDeleteData: false,
      },
    });

    const credentialLogs = (await kv.getJSON<CredentialLogEntry[]>("credential_logs")) || [];
    credentialLogs.push({
      id: `cred_${Date.now()}_testworker`,
      username: "testworker",
      password: "testworker123",
      role: "worker",
      createdAt: new Date().toISOString(),
      createdBy: "Super Admin",
      createdById: "super_admin_001",
    });
    await kv.setJSON("credential_logs", credentialLogs);
    didChange = true;
  }

  if (didChange) {
    await kv.setJSON("employees", employees);
  }

  console.log(`[Seed] Seed complete. Total employees: ${employees.length}`);
  console.log("[Seed] Employee usernames:", employees.map((e) => e.username));
}

let seedPromise: Promise<void> | null = null;

export async function ensureSeedReady() {
  if (!seedPromise) {
    seedPromise = seedData().catch((err) => {
      console.error("[Seed Error]", err);
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
