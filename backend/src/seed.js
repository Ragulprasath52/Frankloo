import bcrypt from 'bcryptjs';
import { prisma } from './db.js';

async function main() {
  console.log('Seeding database...');

  // Clear existing data (order is important due to foreign key constraints)
  await prisma.notification.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.taskDependency.deleteMany({});
  await prisma.checklistItem.deleteMany({});
  await prisma.cardAssignee.deleteMany({});
  await prisma.card.deleteMany({});
  await prisma.list.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.automationRule.deleteMany({});
  await prisma.savedFilter.deleteMany({});
  await prisma.board.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.workspaceMember.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Demo Users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user1 = await prisma.user.create({
    data: {
      email: 'demo@frankloo.pro'.trim().toLowerCase(),
      username: 'demo_user',
      password: hashedPassword,
      name: 'Raghul Prasath',
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Raghul%20Prasath'
    }
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'alex@frankloo.pro'.trim().toLowerCase(),
      username: 'alex_admin',
      password: hashedPassword,
      name: 'Alex Rivera',
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Alex%20Rivera'
    }
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'sarah@frankloo.pro'.trim().toLowerCase(),
      username: 'sarah_dev',
      password: hashedPassword,
      name: 'Sarah Chen',
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Sarah%20Chen'
    }
  });

  console.log('Users created.');

  // 2. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Engineering Workspace',
      description: 'Central workspace for core software development projects and tracking milestones.'
    }
  });

  // Add workspace members
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: user1.id, role: 'OWNER' },
      { workspaceId: workspace.id, userId: user2.id, role: 'ADMIN' },
      { workspaceId: workspace.id, userId: user3.id, role: 'MEMBER' }
    ]
  });

  console.log('Workspace and members created.');

  // Create Workspace Goal
  await prisma.goal.create({
    data: {
      workspaceId: workspace.id,
      title: 'Launch Frankloo v1.0',
      description: 'Successfully deploy the self-hosted MVP board with all features enabled.',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }
  });

  // 3. Create Board
  const board = await prisma.board.create({
    data: {
      name: 'Frankloo Development',
      description: 'Scrum sprint planning and task board.',
      background: 'indigo',
      workspaceId: workspace.id
    }
  });

  console.log('Board created.');

  // Create milestones
  const milestone1 = await prisma.milestone.create({
    data: {
      boardId: board.id,
      title: 'Core MVP Architecture',
      description: 'Finish database migrations, API routes and drag-drop kanban boards.',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isCompleted: false
    }
  });

  // Create Lists (Columns)
  const backlogList = await prisma.list.create({
    data: { name: 'Backlog', position: 1000, boardId: board.id }
  });
  const todoList = await prisma.list.create({
    data: { name: 'To Do', position: 2000, boardId: board.id }
  });
  const doingList = await prisma.list.create({
    data: { name: 'Doing', position: 3000, boardId: board.id }
  });
  const doneList = await prisma.list.create({
    data: { name: 'Done', position: 4000, boardId: board.id }
  });

  console.log('Lists/Columns created.');

  // Create automation rules
  const rule = await prisma.automationRule.create({
    data: {
      boardId: board.id,
      triggerType: 'CARD_MOVED',
      triggerVal: doneList.id,
      actionType: 'SET_PRIORITY',
      actionVal: 'LOW'
    }
  });

  // 4. Create Cards/Tasks
  const card1 = await prisma.card.create({
    data: {
      title: 'Design Database Schema',
      description: 'Define relational models for Users, Workspaces, Boards, Cards and checklist subtasks using Prisma schema.',
      position: 1000,
      listId: doneList.id,
      priority: 'URGENT',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Overdue/completed
      coverImage: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&auto=format&fit=crop&q=60',
      estimatedTime: 120,
      loggedTime: 120,
      milestoneId: milestone1.id,
      customFields: JSON.stringify([{ name: 'Complexity', type: 'text', value: 'High' }])
    }
  });

  const card2 = await prisma.card.create({
    data: {
      title: 'Setup Express API Server',
      description: 'Implement JWT authentication middleware, routing for all tables, and setup Socket.io handlers.',
      position: 1000,
      listId: doingList.id,
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      estimatedTime: 240,
      loggedTime: 90,
      milestoneId: milestone1.id,
      customFields: JSON.stringify([{ name: 'Complexity', type: 'text', value: 'Medium' }])
    }
  });

  const card3 = await prisma.card.create({
    data: {
      title: 'Build Drag & Drop Kanban UI',
      description: 'Develop React components for boards, lists, and tasks supporting HTML5 drag-and-drop and CSS state updates.',
      position: 2000,
      listId: todoList.id,
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      estimatedTime: 300,
      loggedTime: 0
    }
  });

  const card4 = await prisma.card.create({
    data: {
      title: 'Write Documentation',
      description: 'Provide setup steps for SQLite database migration, running dev server, and local configuration details.',
      position: 1000,
      listId: backlogList.id,
      priority: 'LOW',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      estimatedTime: 60,
      loggedTime: 0
    }
  });

  const card5 = await prisma.card.create({
    data: {
      title: 'Setup Tailwind Styling System',
      description: 'Include Inter fonts, brand colors, custom themes, card cover preview grids, and dark mode toggles.',
      position: 2000,
      listId: doneList.id,
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      estimatedTime: 90,
      loggedTime: 90
    }
  });

  console.log('Cards created.');

  // Create Card Assignees
  await prisma.cardAssignee.createMany({
    data: [
      { cardId: card1.id, userId: user1.id },
      { cardId: card2.id, userId: user2.id },
      { cardId: card2.id, userId: user3.id },
      { cardId: card3.id, userId: user1.id },
      { cardId: card3.id, userId: user3.id },
      { cardId: card4.id, userId: user3.id }
    ]
  });

  // Create Checklist items
  await prisma.checklistItem.createMany({
    data: [
      { cardId: card1.id, content: 'Create User entity schema', isCompleted: true, position: 0 },
      { cardId: card1.id, content: 'Create Workspace model relation mapping', isCompleted: true, position: 1 },
      { cardId: card1.id, content: 'Run prisma generate', isCompleted: true, position: 2 },
      { cardId: card2.id, content: 'Install Express and CORS dependencies', isCompleted: true, position: 0 },
      { cardId: card2.id, content: 'Write JWT register/login controllers', isCompleted: true, position: 1 },
      { cardId: card2.id, content: 'Connect websocket room joins', isCompleted: false, position: 2 },
      { cardId: card3.id, content: 'Setup Vite React App boilerplate', isCompleted: true, position: 0 },
      { cardId: card3.id, content: 'Add drag/drop listeners on cards', isCompleted: false, position: 1 },
      { cardId: card3.id, content: 'Synchronize visual list hover states', isCompleted: false, position: 2 }
    ]
  });

  // Create Card comments
  await prisma.comment.createMany({
    data: [
      { cardId: card2.id, userId: user3.id, content: 'I started writing the controllers. Need help finishing the jwt logout flow.' },
      { cardId: card2.id, userId: user1.id, content: '@sarah_dev, I will review the PR today and add the token blacklist helper.' }
    ]
  });

  // Create Dependencies
  await prisma.taskDependency.create({
    data: {
      cardId: card2.id, // Express API Server depends on...
      dependsOnCardId: card1.id // ...Design Database Schema
    }
  });

  await prisma.taskDependency.create({
    data: {
      cardId: card3.id, // Drag-drop Kanban depends on...
      dependsOnCardId: card2.id // ...Express API Server
    }
  });

  // Create Activity logs
  await prisma.activityLog.createMany({
    data: [
      { userId: user1.id, boardId: board.id, cardId: card1.id, action: 'CREATE_CARD', details: 'Created task "Design Database Schema"' },
      { userId: user1.id, boardId: board.id, cardId: card1.id, action: 'MOVE_CARD', details: 'Moved task "Design Database Schema" to Done' },
      { userId: user2.id, boardId: board.id, cardId: card2.id, action: 'CREATE_CARD', details: 'Created task "Setup Express API Server"' },
      { userId: user2.id, boardId: board.id, cardId: card2.id, action: 'MOVE_CARD', details: 'Moved task "Setup Express API Server" to Doing' }
    ]
  });

  // 5. Create Documents (Wiki & Docs System)
  console.log('Seeding documents...');
  
  // A Space
  const docsSpace = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      title: '📚 Guides & Standard Operating Procedures',
      type: 'space',
      status: 'APPROVED',
      content: '',
      tags: JSON.stringify(['#onboarding', '#handbook']),
      views: 18,
      authorId: user1.id,
      authorName: user1.name
    }
  });

  // A Folder inside the Space
  const opsFolder = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      parentId: docsSpace.id,
      spaceId: docsSpace.id,
      title: '📁 DevOps & Environment Setup',
      type: 'folder',
      status: 'APPROVED',
      content: '',
      tags: JSON.stringify(['#devops']),
      views: 12,
      authorId: user2.id,
      authorName: user2.name
    }
  });

  // A Document inside the Folder
  const deployDoc = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      parentId: opsFolder.id,
      spaceId: docsSpace.id,
      folderId: opsFolder.id,
      title: '🚀 Deploying Release Builds',
      type: 'document',
      status: 'APPROVED',
      isFavorite: true,
      content: `# 🚀 Deploying Release Builds

**Owner:** @AlexRivera
**Status:** ✅ APPROVED
**Last Updated:** 2026-06-22

---

## 🌟 Purpose
Ensure stable, error-free deployment of Frankloo application bundles to staging and production.

## 🚶 Step-by-Step Instructions
1. Run local lint tests:
   \`\`\`bash
   npm run lint
   \`\`\`
2. Generate Prisma Client:
   \`\`\`bash
   npx prisma generate
   \`\`\`
3. Push changes to database:
   \`\`\`bash
   npx prisma db push
   \`\`\`

> 💡 **Tip:** Verify port 5000 is free before running generators in Windows.
> ⚠️ **CAUTION:** Never bypass migrations on production SQLite database files.
`,
      tags: JSON.stringify(['#devops', '#architecture']),
      views: 45,
      authorId: user2.id,
      authorName: user2.name,
      comments: JSON.stringify([
        {
          id: 'c1',
          userId: user3.id,
          userName: user3.name,
          avatarUrl: user3.avatarUrl,
          content: 'Added the warning tip about port 5000 file locks on Windows.',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ]),
      suggestions: JSON.stringify([
        {
          id: 's1',
          userId: user1.id,
          userName: user1.name,
          originalText: 'npm run lint',
          suggestedText: 'npm run lint && npm run test',
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ]),
      revisions: JSON.stringify([
        {
          id: 'r1',
          userId: user2.id,
          userName: user2.name,
          title: 'Deploying Release Builds - Initial Draft',
          content: '# Deploying Release Builds\nInitial draft of step-by-step instructions.',
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ])
    }
  });

  // A Document inside the Space (but not folder)
  const handbookDoc = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      parentId: docsSpace.id,
      spaceId: docsSpace.id,
      title: '📖 Engineering Team Handbook',
      type: 'document',
      status: 'APPROVED',
      isFavorite: true,
      content: `# 📖 Team Handbook: Frankloo Core Team

**Version:** 1.2
**Last Modified:** Q2 2026

---

## 🌟 Our Core Philosophy
1. **Transparency:** Default to documentation over private messaging.
2. **Speed & Design:** Deliver lag-free, visually stunning interfaces.

## 💼 Vacation & Benefits
- Flexible hours and unlimited PTO (minimum 20 days mandatory per year).
- Hardware allowance of $3,005 every two years.
`,
      tags: JSON.stringify(['#onboarding', '#handbook']),
      views: 94,
      authorId: user1.id,
      authorName: user1.name
    }
  });

  // A Root-level document
  const welcomeDoc = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      title: '👋 Welcome to Frankloo Core',
      type: 'document',
      status: 'APPROVED',
      isFavorite: true,
      content: `# 👋 Welcome to Frankloo Core!

This is the central knowledge hub for our software team. Here you will find onboarding manuals, roadmap reviews, sprint retrospectives, and architecture designs.

## 🏁 Quick Links & Navigation
- [📚 Guides & SOPs](link)
- [📖 Engineering Team Handbook](link)

> 🚀 *Tip: You can create your own spaces, folders, or child pages by clicking the "+" buttons in the sidebar tree. Feel free to use templates to get started!*
`,
      tags: JSON.stringify(['#onboarding', '#general']),
      views: 115,
      authorId: user1.id,
      authorName: user1.name
    }
  });

  console.log('Documents seeded.');

  console.log('Seed database completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
