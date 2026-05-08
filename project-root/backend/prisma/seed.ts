import { PrismaClient, LeadStatus } from "@prisma/client";
import { addDays, addHours, setHours, setMinutes, subDays, subHours } from "date-fns";

const prisma = new PrismaClient();

function atTime(base: Date, hours: number, minutes = 0) {
  return setMinutes(setHours(base, hours), minutes);
}

async function main() {
  await prisma.discussion.deleteMany();
  await prisma.lead.deleteMany();

  const now = new Date();
  const todayFollowUp = atTime(now, 14, 0);
  const overdueFollowUp = subHours(now, 5);

  await prisma.lead.create({
    data: {
      name: "Sarah Connor",
      company: "Acme Corp",
      phone: "555-0199",
      status: LeadStatus.PROPOSAL_SENT,
      followUpAt: todayFollowUp,
      discussions: {
        create: [
          {
            note: "Sent pricing tier PDF. She will review with her boss.",
            followUpAt: todayFollowUp,
            createdAt: subDays(now, 2)
          },
          {
            note: "Initial discovery call. They need CRM visibility for 50 reps and cleaner follow-up tracking.",
            createdAt: subDays(now, 5)
          }
        ]
      }
    }
  });

  await prisma.lead.create({
    data: {
      name: "Hank Scorpio",
      company: "Globex",
      phone: "555-0123",
      status: LeadStatus.NEW,
      discussions: {
        create: [{ note: "Inbound lead from website contact form.", createdAt: subHours(now, 2) }]
      }
    }
  });

  await prisma.lead.create({
    data: {
      name: "Bill Lumbergh",
      company: "Initech",
      phone: "555-0177",
      status: LeadStatus.CONTACTED,
      followUpAt: overdueFollowUp,
      discussions: {
        create: [
          { note: "Left voicemail with his assistant.", followUpAt: overdueFollowUp, createdAt: subDays(now, 7) },
          { note: "Asked for budget approval timeline.", createdAt: subDays(now, 10) }
        ]
      }
    }
  });

  await prisma.lead.create({
    data: {
      name: "Bruce Wayne",
      company: "Wayne Enterprises",
      phone: "555-0101",
      status: LeadStatus.WON,
      discussions: {
        create: [{ note: "Contract signed. Sending welcome package.", createdAt: subDays(now, 21) }]
      }
    }
  });

  await prisma.lead.create({
    data: {
      name: "Dana Scully",
      company: "Federal Analytics",
      phone: "555-0148",
      status: LeadStatus.QUALIFIED,
      followUpAt: addDays(atTime(now, 9, 30), 1),
      discussions: {
        create: [
          { note: "Qualified opportunity. Wants security review before a pilot.", createdAt: subDays(now, 1) },
          { note: "Shared SOC2 and architecture overview.", followUpAt: addDays(atTime(now, 9, 30), 1), createdAt: subHours(now, 8) }
        ]
      }
    }
  });

  await prisma.lead.create({
    data: {
      name: "Elliot Alderson",
      company: "Allsafe",
      phone: "555-0114",
      status: LeadStatus.LOST,
      discussions: {
        create: [{ note: "Chose to defer procurement until next quarter.", createdAt: addHours(subDays(now, 3), 2) }]
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
