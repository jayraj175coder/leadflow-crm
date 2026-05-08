import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { useUiStore } from "../../../store/uiStore";
import { useCreateLead } from "../hooks/useLeads";

const schema = z.object({
  name: z.string().trim().min(1, "Full name is required"),
  company: z.string().optional(),
  phone: z.string().trim().regex(/^[+()\-\s\d.]{7,24}$/, "Enter a valid phone number").optional().or(z.literal(""))
});

type FormValues = z.infer<typeof schema>;

export function AddLeadDialog() {
  const open = useUiStore((state) => state.isAddLeadOpen);
  const setOpen = useUiStore((state) => state.setAddLeadOpen);
  const createLead = useCreateLead();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", company: "", phone: "" }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await createLead.mutateAsync(values);
    form.reset();
    setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <div className="border-b px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New Lead
          </DialogTitle>
          <DialogDescription className="sr-only">Create a new LeadFlow lead.</DialogDescription>
        </div>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 px-6 py-6">
            <label className="block text-sm font-medium">
              Full Name <span className="text-red-500">*</span>
              <Input className="mt-2" placeholder="e.g., John Doe" {...form.register("name")} autoFocus />
              {form.formState.errors.name ? <span className="mt-1 block text-xs text-red-600">{form.formState.errors.name.message}</span> : null}
            </label>
            <label className="block text-sm font-medium">
              Company <span className="text-muted-foreground">(Optional)</span>
              <Input className="mt-2" placeholder="e.g., Stark Industries" {...form.register("company")} />
            </label>
            <label className="block text-sm font-medium">
              Phone <span className="text-muted-foreground">(Optional)</span>
              <Input className="mt-2" placeholder="e.g., 555-0123" {...form.register("phone")} />
              {form.formState.errors.phone ? <span className="mt-1 block text-xs text-red-600">{form.formState.errors.phone.message}</span> : null}
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              Save Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
