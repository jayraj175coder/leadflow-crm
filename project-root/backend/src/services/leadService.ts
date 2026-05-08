import { LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";

const includeDiscussions = {
  discussions: {
    orderBy: { createdAt: "desc" as const }
  }
};

export const leadService = {
  list() {
    return prisma.lead.findMany({
      include: includeDiscussions,
      orderBy: [{ followUpAt: "asc" }, { updatedAt: "desc" }]
    });
  },

  create(data: { name: string; company?: string | null; phone?: string | null }) {
    return prisma.lead.create({
      data: {
        name: data.name,
        company: data.company || null,
        phone: data.phone || null,
        status: LeadStatus.NEW,
        discussions: {
          create: {
            note: "Lead created.",
            createdAt: new Date()
          }
        }
      },
      include: includeDiscussions
    });
  },

  update(id: string, data: { status?: LeadStatus; followUpAt?: Date | null; name?: string; company?: string | null; phone?: string | null }) {
    return prisma.lead.update({
      where: { id },
      data,
      include: includeDiscussions
    });
  },

  async addDiscussion(id: string, data: { note: string; followUpAt?: Date | null }) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.discussion.create({
        data: {
          leadId: id,
          note: data.note,
          followUpAt: data.followUpAt ?? null
        }
      });

      return tx.lead.update({
        where: { id },
        data: {
          followUpAt: data.followUpAt ?? null
        },
        include: includeDiscussions
      });
    });
  }
};
