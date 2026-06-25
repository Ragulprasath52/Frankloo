import { prisma } from '../db.js';

/**
 * Executes Board Automation Rules for a specific card event.
 * @param {string} boardId - The Board ID
 * @param {string} cardId - The Card ID
 * @param {string} triggerType - "CARD_CREATED" or "CARD_MOVED"
 * @param {string} triggerVal - Extra trigger info (like the target List/Column ID)
 */
export async function runAutomations(boardId, cardId, triggerType, triggerVal) {
  try {
    const rules = await prisma.automationRule.findMany({
      where: {
        boardId,
        triggerType,
        OR: [
          { triggerVal: null },
          { triggerVal: triggerVal }
        ]
      }
    });

    for (const rule of rules) {
      console.log(`Executing automation rule: [${rule.triggerType} -> ${rule.actionType}]`);
      
      switch (rule.actionType) {
        case 'SET_PRIORITY':
          if (rule.actionVal) {
            await prisma.card.update({
              where: { id: cardId },
              data: { priority: rule.actionVal }
            });
          }
          break;

        case 'ADD_CHECKLIST':
          if (rule.actionVal) {
            await prisma.checklistItem.create({
              data: {
                cardId,
                content: rule.actionVal,
                isCompleted: false
              }
            });
          }
          break;

        case 'ASSIGN_USER':
          if (rule.actionVal) {
            try {
              await prisma.cardAssignee.create({
                data: {
                  cardId,
                  userId: rule.actionVal
                }
              });
            } catch (err) {
              // Ignore unique constraint error if already assigned
            }
          }
          break;

        case 'MARK_COMPLETE':
          // We can set its checklist items to complete, or set due date to past/done
          await prisma.checklistItem.updateMany({
            where: { cardId },
            data: { isCompleted: true }
          });
          break;
          
        default:
          break;
      }
    }
  } catch (error) {
    console.error('Error running automation rules:', error);
  }
}
