export interface IOrganizationBranding {
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  companyName: string;
  supportEmail?: string;
}

export interface IOrganizationSecurityPolicy {
  passwordMinLength: number;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  passwordRequireUppercase: boolean;
  enforce2FARoles: string[];
  sessionMaxLifetimeMinutes: number;
  ipAllowList: string[];
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
}

export interface IOrganization {
  id: string;
  name: string;
  slug: string;
  branding: IOrganizationBranding;
  securityPolicy: IOrganizationSecurityPolicy;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IDepartment {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  leadId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITeam {
  id: string;
  organizationId: string;
  departmentId?: string;
  name: string;
  description?: string;
  leadId?: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}
