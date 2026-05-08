import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMinutes } from "date-fns";
import { leadApi } from "../../../services/leadApi";
import type { AddDiscussionInput, CreateLeadInput, Lead, UpdateLeadInput } from "../../../types/lead";

export const leadsQueryKey = ["leads"];

export function useLeads() {
  return useQuery({
    queryKey: leadsQueryKey,
    queryFn: leadApi.list
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: leadApi.create,
    onMutate: async (input: CreateLeadInput) => {
      await queryClient.cancelQueries({ queryKey: leadsQueryKey });
      const previous = queryClient.getQueryData<Lead[]>(leadsQueryKey) ?? [];
      const optimisticLead: Lead = {
        id: `optimistic-${crypto.randomUUID()}`,
        name: input.name,
        company: input.company || null,
        phone: input.phone || null,
        status: "NEW",
        followUpAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        discussions: [
          {
            id: `optimistic-discussion-${crypto.randomUUID()}`,
            leadId: "optimistic",
            note: "Lead created.",
            followUpAt: null,
            createdAt: new Date().toISOString()
          }
        ]
      };
      queryClient.setQueryData<Lead[]>(leadsQueryKey, [optimisticLead, ...previous]);
      return { previous };
    },
    onError: (_error, _input, context) => queryClient.setQueryData(leadsQueryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: leadsQueryKey })
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLeadInput }) => leadApi.update(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: leadsQueryKey });
      const previous = queryClient.getQueryData<Lead[]>(leadsQueryKey) ?? [];
      queryClient.setQueryData<Lead[]>(
        leadsQueryKey,
        previous.map((lead) => (lead.id === id ? { ...lead, ...input, updatedAt: new Date().toISOString() } : lead))
      );
      return { previous };
    },
    onError: (_error, _input, context) => queryClient.setQueryData(leadsQueryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: leadsQueryKey })
  });
}

export function useAddDiscussion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddDiscussionInput }) => leadApi.addDiscussion(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: leadsQueryKey });
      const previous = queryClient.getQueryData<Lead[]>(leadsQueryKey) ?? [];
      queryClient.setQueryData<Lead[]>(
        leadsQueryKey,
        previous.map((lead) =>
          lead.id === id
            ? {
                ...lead,
                followUpAt: input.followUpAt ?? null,
                updatedAt: addMinutes(new Date(), 1).toISOString(),
                discussions: [
                  {
                    id: `optimistic-discussion-${crypto.randomUUID()}`,
                    leadId: id,
                    note: input.note,
                    followUpAt: input.followUpAt ?? null,
                    createdAt: new Date().toISOString()
                  },
                  ...lead.discussions
                ]
              }
            : lead
        )
      );
      return { previous };
    },
    onError: (_error, _input, context) => queryClient.setQueryData(leadsQueryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: leadsQueryKey })
  });
}
