import { LeadStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { leadService } from "../services/leadService.js";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+()\-\s\d.]{7,24}$/, "Phone must be a valid phone number")
  .optional()
  .or(z.literal(""));

export const createLeadSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required"),
    company: z.string().trim().optional().or(z.literal("")),
    phone: phoneSchema
  })
});

export const updateLeadSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().trim().min(1).optional(),
    company: z.string().trim().nullable().optional().or(z.literal("")),
    phone: phoneSchema.nullable(),
    status: z.nativeEnum(LeadStatus).optional(),
    followUpAt: z.string().datetime().nullable().optional()
  })
});

export const addDiscussionSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    note: z.string().trim().min(1, "Discussion note is required"),
    followUpAt: z.string().datetime().nullable().optional()
  })
});

export async function listLeads(_req: Request, res: Response) {
  const leads = await leadService.list();
  res.status(200).json(leads);
}

export async function createLead(req: Request, res: Response) {
  const lead = await leadService.create({
    name: req.body.name,
    company: req.body.company,
    phone: req.body.phone
  });
  res.status(201).json(lead);
}

export async function updateLead(req: Request, res: Response) {
  const lead = await leadService.update(String(req.params.id), {
    ...req.body,
    followUpAt: req.body.followUpAt === undefined ? undefined : req.body.followUpAt ? new Date(req.body.followUpAt) : null
  });
  res.status(200).json(lead);
}

export async function addDiscussion(req: Request, res: Response) {
  const lead = await leadService.addDiscussion(String(req.params.id), {
    note: req.body.note,
    followUpAt: req.body.followUpAt ? new Date(req.body.followUpAt) : null
  });
  res.status(201).json(lead);
}
