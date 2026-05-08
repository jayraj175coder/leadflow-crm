export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST";

export type Discussion = {
  id: string;
  leadId: string;
  note: string;
  followUpAt: string | null;
  createdAt: string;
};

export type Lead = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  followUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  discussions: Discussion[];
};

export type CreateLeadInput = {
  name: string;
  company?: string;
  phone?: string;
};

export type UpdateLeadInput = Partial<Pick<Lead, "status" | "followUpAt" | "name" | "company" | "phone">>;

export type AddDiscussionInput = {
  note: string;
  followUpAt?: string | null;
};
