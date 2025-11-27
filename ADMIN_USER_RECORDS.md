# Administrative Access Only - Employee & Admin Records

## Security Notice
This file contains administrative information about user accounts. 
**IMPORTANT:** This file does NOT contain passwords. Passwords are hashed and stored securely.

## System Overview

### Super Admin Account
- **Username:** Moms308
- **Role:** super_admin
- **Email:** admin@ichargetexas.com
- **Created:** System Default
- **Permissions:** Full Access

### Authentication System
All employee and admin accounts are stored in the backend database with:
- Hashed passwords (NOT plain text)
- Role-based access control
- Activity audit logging
- Permission management

### Accessing User Information
1. **View All Employees:** Use the User Management tab in the Admin section
2. **View Audit Logs:** Use the backend API endpoint `/api/trpc/auth.getAuditLogs`
3. **Create New Employee:** Use the "Add Employee" button in User Management

### Audit Log Features
The system tracks:
- Login attempts (successful and failed)
- User account creation
- Password changes
- User updates
- Logout events

### Backend Storage
- Employees: Stored in backend key-value store under "employees"
- Audit Logs: Stored in backend key-value store under "audit_logs"
- Passwords: Hashed using secure algorithm (never stored in plain text)

### Security Best Practices
✓ Passwords are hashed before storage
✓ Audit logs track all authentication events
✓ Only administrators can create new accounts
✓ Failed login attempts are logged
✓ Last login timestamps are tracked

### Accessing Logs Programmatically
Use the tRPC client to fetch audit logs:
```typescript
const logs = await trpcClient.auth.getAuditLogs.query({
  limit: 100,
  action: "login_success", // optional filter
  username: "someuser" // optional filter
});
```

### Creating New Employees
Use the tRPC client to create employees:
```typescript
await trpcClient.auth.createEmployee.mutate({
  username: "newuser",
  password: "securepassword",
  role: "employee", // or "admin"
  fullName: "John Doe",
  email: "john@example.com",
  phone: "555-0100",
  permissions: {
    canManageUsers: false,
    canViewReports: true,
    canHandleRequests: true,
    canCreateInvoices: false,
    canViewCustomerInfo: true,
    canDeleteData: false,
  }
});
```

## Contact
For security concerns or access issues, contact the system administrator.
