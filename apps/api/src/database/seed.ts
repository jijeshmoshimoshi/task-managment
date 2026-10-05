import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { OrganizationModel } from '../modules/orgs/org.model';
import { UserModel } from '../modules/users/user.model';
import { CryptoService } from '../common/services/crypto.service';
import { ROLES, USER_STATUSES } from '@taskmaster/shared';

async function seed() {
  logger.info('🌱 Starting Database Seed...');

  try {
    await mongoose.connect(env.MONGODB_URI);

    // 1. Create or ensure Default Organization exists
    let org = await OrganizationModel.findOne({ slug: 'acme-corp' });
    if (!org) {
      org = await OrganizationModel.create({
        name: 'Acme Corporation',
        slug: 'acme-corp',
        branding: {
          companyName: 'Acme Corporation',
          logoUrl: '',
          primaryColor: '#3b82f6',
          accentColor: '#6366f1',
          supportEmail: 'support@acmecorp.com',
        },
        securityPolicy: {
          passwordMinLength: 8,
          passwordRequireNumbers: true,
          passwordRequireSymbols: true,
          passwordRequireUppercase: true,
          enforce2FARoles: [],
          sessionMaxLifetimeMinutes: 10080,
          ipAllowList: [],
          maxFailedLoginAttempts: 5,
          lockoutDurationMinutes: 15,
        },
      });
      logger.info({ orgId: org._id.toString() }, '🏢 Organization created');
    }

    const defaultAdminPassword = await CryptoService.hashPassword('Admin@123456!');
    const defaultUserPassword = await CryptoService.hashPassword('User@123456!');

    // 2. Create Super Admin
    const superAdminEmail = 'superadmin@taskmaster.local';
    let superAdmin = await UserModel.findOne({ email: superAdminEmail, organizationId: org._id });
    if (!superAdmin) {
      superAdmin = await UserModel.create({
        organizationId: org._id,
        email: superAdminEmail,
        passwordHash: defaultAdminPassword,
        firstName: 'System',
        lastName: 'SuperAdmin',
        role: ROLES.SUPER_ADMIN,
        status: USER_STATUSES.ACTIVE,
        jobTitle: 'Chief Technology Officer',
        timezone: 'America/New_York',
      });
      logger.info('👑 Super Admin seeded: superadmin@taskmaster.local / Admin@123456!');
    }

    // 2b. Create User Jijesh (jijeshmoshimoshi@gmail.com)
    const jijeshEmail = 'jijeshmoshimoshi@gmail.com';
    const jijeshPasswordHash = await CryptoService.hashPassword('jijesh@123');
    let jijeshUser = await UserModel.findOne({ email: jijeshEmail, organizationId: org._id });
    if (!jijeshUser) {
      jijeshUser = await UserModel.create({
        organizationId: org._id,
        email: jijeshEmail,
        passwordHash: jijeshPasswordHash,
        firstName: 'Jijesh',
        lastName: 'Admin',
        role: ROLES.SUPER_ADMIN,
        status: USER_STATUSES.ACTIVE,
        jobTitle: 'Lead Administrator',
        timezone: 'Asia/Kolkata',
      });
      logger.info('👑 User Jijesh seeded: jijeshmoshimoshi@gmail.com / jijesh@123');
    } else {
      jijeshUser.passwordHash = jijeshPasswordHash;
      jijeshUser.role = ROLES.SUPER_ADMIN;
      jijeshUser.status = USER_STATUSES.ACTIVE;
      await jijeshUser.save();
      logger.info('🔄 User Jijesh updated: jijeshmoshimoshi@gmail.com / jijesh@123');
    }

    // 2c. Create User Jijesh KV (contactjijeshkv@gmail.com)
    const contactJijeshEmail = 'contactjijeshkv@gmail.com';
    const contactJijeshPasswordHash = await CryptoService.hashPassword('jijesh@123');
    let contactJijeshUser = await UserModel.findOne({ email: contactJijeshEmail, organizationId: org._id });
    if (!contactJijeshUser) {
      contactJijeshUser = await UserModel.create({
        organizationId: org._id,
        email: contactJijeshEmail,
        passwordHash: contactJijeshPasswordHash,
        firstName: 'Jijesh',
        lastName: 'KV',
        role: ROLES.USER,
        status: USER_STATUSES.ACTIVE,
        jobTitle: 'Software Engineer',
        timezone: 'Asia/Kolkata',
      });
      logger.info('👤 User contactjijeshkv@gmail.com seeded: contactjijeshkv@gmail.com / jijesh@123');
    } else {
      contactJijeshUser.passwordHash = contactJijeshPasswordHash;
      contactJijeshUser.role = ROLES.USER;
      contactJijeshUser.status = USER_STATUSES.ACTIVE;
      await contactJijeshUser.save();
      logger.info('🔄 User contactjijeshkv@gmail.com updated to USER: contactjijeshkv@gmail.com / jijesh@123');
    }

    // 3. Create 2 Admins
    const admins = [
      { email: 'admin.alice@taskmaster.local', firstName: 'Alice', lastName: 'Vance', title: 'Engineering Director' },
      { email: 'admin.bob@taskmaster.local', firstName: 'Bob', lastName: 'Stone', title: 'Product Operations Lead' },
    ];

    for (const adm of admins) {
      let adminUser = await UserModel.findOne({ email: adm.email, organizationId: org._id });
      if (!adminUser) {
        adminUser = await UserModel.create({
          organizationId: org._id,
          email: adm.email,
          passwordHash: defaultAdminPassword,
          firstName: adm.firstName,
          lastName: adm.lastName,
          role: ROLES.ADMIN,
          status: USER_STATUSES.ACTIVE,
          jobTitle: adm.title,
          timezone: 'America/New_York',
        });
        logger.info(`🛡️ Admin seeded: ${adm.email} / Admin@123456!`);
      }
    }

    // 4. Create 10 Users (Employees)
    const employees = [
      { firstName: 'Charlie', lastName: 'Brown', title: 'Senior Frontend Engineer' },
      { firstName: 'Diana', lastName: 'Prince', title: 'Backend Engineer' },
      { firstName: 'Ethan', lastName: 'Hunt', title: 'DevOps Architect' },
      { firstName: 'Fiona', lastName: 'Gallagher', title: 'Product Designer' },
      { firstName: 'George', lastName: 'Clark', title: 'QA Automation Lead' },
      { firstName: 'Hannah', lastName: 'Abbott', title: 'Full Stack Developer' },
      { firstName: 'Ian', lastName: 'Malcolm', title: 'Data Engineer' },
      { firstName: 'Julia', lastName: 'Roberts', title: 'Scrum Master' },
      { firstName: 'Kevin', lastName: 'Flynn', title: 'Security Specialist' },
      { firstName: 'Laura', lastName: 'Croft', title: 'UI/UX Specialist' },
    ];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]!;
      const email = `user${i + 1}@taskmaster.local`;
      let user = await UserModel.findOne({ email, organizationId: org._id });
      if (!user) {
        user = await UserModel.create({
          organizationId: org._id,
          email,
          passwordHash: defaultUserPassword,
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: ROLES.USER,
          status: USER_STATUSES.ACTIVE,
          jobTitle: emp.title,
          timezone: 'America/New_York',
        });
        logger.info(`👤 User seeded: ${email} / User@123456!`);
      }
    }

    // 5. Seed Initial Projects
    const { ProjectModel } = await import('../modules/projects/project.model');
    const existingProjectsCount = await ProjectModel.countDocuments({ organizationId: org._id });
    if (existingProjectsCount === 0 && superAdmin) {
      const allUsers = await UserModel.find({ organizationId: org._id });
      const userIds = allUsers.map((u) => u._id);

      const projectsData = [
        {
          organizationId: org._id,
          name: 'Core Platform v2.0 Modernization',
          key: 'PLAT',
          description: 'Migrating legacy monolith services to event-driven microservices architecture with high concurrency support.',
          client: 'Enterprise Architecture Guild',
          status: 'ACTIVE',
          priority: 'HIGH',
          health: 'ON_TRACK',
          budget: 150000,
          tags: ['architecture', 'microservices', 'cloud', 'q3-goal'],
          coverColor: '#3b82f6',
          icon: 'server',
          members: [
            { userId: superAdmin._id, role: 'MANAGER', joinedAt: new Date() },
            ...(userIds.slice(1, 6).map((uid) => ({ userId: uid, role: 'CONTRIBUTOR', joinedAt: new Date() }))),
          ],
          milestones: [
            { title: 'System Architecture Design & RFC Review', isCompleted: true, completedAt: new Date(), dueDate: new Date(Date.now() - 7 * 86400000) },
            { title: 'Auth & Multi-Tenancy Module Implementation', isCompleted: true, completedAt: new Date(), dueDate: new Date() },
            { title: 'Task & Realtime Synchronization Engine', isCompleted: false, dueDate: new Date(Date.now() + 14 * 86400000) },
            { title: 'Load Testing & Staging Validation', isCompleted: false, dueDate: new Date(Date.now() + 30 * 86400000) },
          ],
          createdBy: superAdmin._id,
          updatedBy: superAdmin._id,
        },
        {
          organizationId: org._id,
          name: 'Mobile App Redesign & Offline Sync',
          key: 'MOB',
          description: 'Next-generation mobile client featuring instant local SQLite sync and fluid 120fps gesture controls.',
          client: 'Consumer Growth Team',
          status: 'ACTIVE',
          priority: 'URGENT',
          health: 'AT_RISK',
          budget: 85000,
          tags: ['react-native', 'mobile', 'offline-first', 'ux'],
          coverColor: '#8b5cf6',
          icon: 'smartphone',
          members: [
            { userId: superAdmin._id, role: 'MANAGER', joinedAt: new Date() },
            ...(userIds.slice(3, 8).map((uid) => ({ userId: uid, role: 'CONTRIBUTOR', joinedAt: new Date() }))),
          ],
          milestones: [
            { title: 'Figma Design System & Token Export', isCompleted: true, completedAt: new Date() },
            { title: 'CRDT Sync Engine Integration', isCompleted: false, dueDate: new Date(Date.now() + 7 * 86400000) },
            { title: 'Beta Testing on TestFlight & Play Console', isCompleted: false, dueDate: new Date(Date.now() + 21 * 86400000) },
          ],
          createdBy: superAdmin._id,
          updatedBy: superAdmin._id,
        },
        {
          organizationId: org._id,
          name: 'Security SOC2 Type II Certification',
          key: 'SEC',
          description: 'Audit preparation, automated compliance monitoring, penetration testing, and evidence collection.',
          client: 'Information Security & Legal',
          status: 'PLANNING',
          priority: 'HIGH',
          health: 'ON_TRACK',
          budget: 45000,
          tags: ['security', 'compliance', 'soc2', 'audit'],
          coverColor: '#10b981',
          icon: 'shield-check',
          members: [
            { userId: superAdmin._id, role: 'MANAGER', joinedAt: new Date() },
            ...(userIds.slice(8, 11).map((uid) => ({ userId: uid, role: 'VIEWER', joinedAt: new Date() }))),
          ],
          milestones: [
            { title: 'Gap Assessment & Vendor Questionnaire', isCompleted: false, dueDate: new Date(Date.now() + 10 * 86400000) },
            { title: 'Continuous Evidence Collection Automation', isCompleted: false, dueDate: new Date(Date.now() + 45 * 86400000) },
          ],
          createdBy: superAdmin._id,
          updatedBy: superAdmin._id,
        },
      ];

      for (const pData of projectsData) {
        await ProjectModel.create(pData);
      }
      logger.info('🚀 Seeded 3 sample Enterprise Projects');
    }

    // 6. Seed Sample Tasks for Kanban & List
    const { TaskModel } = await import('../modules/tasks/task.model');
    const existingTasksCount = await TaskModel.countDocuments({ organizationId: org._id });
    if (existingTasksCount === 0 && superAdmin) {
      const platProject = await ProjectModel.findOne({ organizationId: org._id, key: 'PLAT' });
      const allUsers = await UserModel.find({ organizationId: org._id });
      const userIds = allUsers.map((u) => u._id);

      if (platProject) {
        const sampleTasks = [
          {
            organizationId: org._id,
            projectId: platProject._id,
            taskKey: 'PLAT-1',
            taskNumber: 1,
            title: 'Design distributed event bus schema & topic naming convention',
            descriptionHtml: '<p>Define schema registry rules, Protobuf message contracts, and dead-letter queue routing for microservices.</p>',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            type: 'FEATURE',
            assigneeIds: [userIds[1], userIds[2]],
            reporterId: superAdmin._id,
            dueDate: new Date(Date.now() + 5 * 86400000),
            estimatedMinutes: 480,
            labels: ['architecture', 'kafka', 'event-driven'],
            checklist: [
              { title: 'Draft RFC document', isCompleted: true, completedAt: new Date() },
              { title: 'Review with Engineering Leads', isCompleted: false },
              { title: 'Establish AVRO/Protobuf linting pipeline', isCompleted: false },
            ],
            comments: [
              { userId: superAdmin._id, content: 'Ensure backward compatibility is enforced at CI level.' },
            ],
            orderIndex: 0,
            createdBy: superAdmin._id,
            updatedBy: superAdmin._id,
          },
          {
            organizationId: org._id,
            projectId: platProject._id,
            taskKey: 'PLAT-2',
            taskNumber: 2,
            title: 'Implement distributed locking & idempotency keys in Redis',
            descriptionHtml: '<p>Protect non-idempotent billing and webhook endpoints with 5-minute deduplication window.</p>',
            status: 'TODO',
            priority: 'URGENT',
            type: 'TASK',
            assigneeIds: [userIds[3]],
            reporterId: superAdmin._id,
            dueDate: new Date(Date.now() + 8 * 86400000),
            estimatedMinutes: 300,
            labels: ['redis', 'security', 'backend'],
            checklist: [
              { title: 'Write Redlock utility middleware', isCompleted: false },
              { title: 'Add load test with concurrent duplicate payloads', isCompleted: false },
            ],
            orderIndex: 0,
            createdBy: superAdmin._id,
            updatedBy: superAdmin._id,
          },
          {
            organizationId: org._id,
            projectId: platProject._id,
            taskKey: 'PLAT-3',
            taskNumber: 3,
            title: 'Optimize MongoDB aggregation pipelines with compound index',
            descriptionHtml: '<p>Analyze query execution plan (explain: executionStats) on multi-tenant audit logs.</p>',
            status: 'DONE',
            priority: 'MEDIUM',
            type: 'CHORE',
            assigneeIds: [userIds[4]],
            reporterId: superAdmin._id,
            dueDate: new Date(Date.now() - 2 * 86400000),
            estimatedMinutes: 240,
            labels: ['database', 'performance'],
            checklist: [
              { title: 'Add compound index on (organizationId, createdAt)', isCompleted: true, completedAt: new Date() },
              { title: 'Benchmark execution time under 100k docs', isCompleted: true, completedAt: new Date() },
            ],
            orderIndex: 0,
            createdBy: superAdmin._id,
            updatedBy: superAdmin._id,
          },
          {
            organizationId: org._id,
            projectId: platProject._id,
            taskKey: 'PLAT-4',
            taskNumber: 4,
            title: 'Multi-region failover testing in staging cluster',
            descriptionHtml: '<p>Perform chaos testing by simulating primary replica set stepdown under high write load.</p>',
            status: 'BACKLOG',
            priority: 'HIGH',
            type: 'TASK',
            assigneeIds: [userIds[5]],
            reporterId: superAdmin._id,
            estimatedMinutes: 600,
            labels: ['devops', 'resilience', 'sre'],
            checklist: [],
            orderIndex: 0,
            createdBy: superAdmin._id,
            updatedBy: superAdmin._id,
          },
          {
            organizationId: org._id,
            projectId: platProject._id,
            taskKey: 'PLAT-5',
            taskNumber: 5,
            title: 'Security review on JWT rotation and session revoking pipeline',
            descriptionHtml: '<p>Verify token blacklist propagation across Redis cluster instances within 50ms.</p>',
            status: 'IN_REVIEW',
            priority: 'URGENT',
            type: 'BUG',
            assigneeIds: [userIds[2], userIds[6]],
            reporterId: superAdmin._id,
            dueDate: new Date(Date.now() + 2 * 86400000),
            estimatedMinutes: 180,
            labels: ['security', 'auth'],
            checklist: [
              { title: 'Test concurrent token refresh replay attack', isCompleted: true, completedAt: new Date() },
              { title: 'Verify revocation audit trail', isCompleted: false },
            ],
            orderIndex: 0,
            createdBy: superAdmin._id,
            updatedBy: superAdmin._id,
          },
        ];

        for (const t of sampleTasks) {
          await TaskModel.create(t);
        }
        logger.info('🎯 Seeded sample Tasks across Kanban columns for PLAT project');
      }
    }

    // 7. Seed Sample Notifications
    const { NotificationModel } = await import('../modules/notifications/notification.model');
    const existingNotifCount = await NotificationModel.countDocuments({ organizationId: org._id });
    if (existingNotifCount === 0 && superAdmin) {
      await NotificationModel.create([
        {
          recipientId: superAdmin._id.toString(),
          organizationId: org._id.toString(),
          senderName: 'Jane Developer',
          type: 'TASK_COMMENT',
          title: 'New Comment on Task',
          message: 'Jane commented on PLAT-1: "Protobuf contracts drafted and ready for review."',
          link: '/dashboard',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 15),
        },
        {
          recipientId: superAdmin._id.toString(),
          organizationId: org._id.toString(),
          senderName: 'Security Automation',
          type: 'SYSTEM_ALERT',
          title: 'Security Compliance Check Passed',
          message: 'Zero critical CVEs found in container registry scan.',
          link: '/audit-logs',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        },
        {
          recipientId: superAdmin._id.toString(),
          organizationId: org._id.toString(),
          senderName: 'Alex Lead',
          type: 'TASK_STATUS_CHANGED',
          title: 'Task Status Updated',
          message: 'Alex moved "PLAT-3: Implement Redis cache layer" to Done.',
          link: '/dashboard',
          isRead: true,
          readAt: new Date(),
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        },
      ]);
      logger.info('🔔 Seeded sample in-app notifications');
    }

    logger.info('✅ Database Seed Completed Successfully!');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, '❌ Seed failed');
    process.exit(1);
  }
}


seed();
