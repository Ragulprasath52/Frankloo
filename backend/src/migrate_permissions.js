import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Migrating board permissions for existing workspace members...');

  const boards = await prisma.board.findMany({
    include: {
      workspace: {
        include: {
          members: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });

  let createdCount = 0;
  for (const board of boards) {
    const workspaceMembers = board.workspace.members;
    for (const wsMember of workspaceMembers) {
      // Determine board role based on workspace role
      const boardRole = (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN') ? 'ADMIN' : 'EDITOR';

      // Check if entry already exists
      const existing = await prisma.boardMember.findUnique({
        where: {
          boardId_userId: {
            boardId: board.id,
            userId: wsMember.userId
          }
        }
      });

      if (!existing) {
        await prisma.boardMember.create({
          data: {
            boardId: board.id,
            userId: wsMember.userId,
            role: boardRole
          }
        });
        createdCount++;
      }
    }
  }

  console.log(`Successfully migrated board permissions! Created ${createdCount} BoardMember records.`);
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
