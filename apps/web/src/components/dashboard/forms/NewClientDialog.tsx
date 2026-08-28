"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { CreateClientSchema, CreateClientInput } from "@fleetman/shared"
import { createClientAction } from "@/app/dashboard/clients/actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

export function NewClientDialog() {
  const [open, setOpen] = useState(false)
  const form = useForm<CreateClientInput>({
    resolver: zodResolver(CreateClientSchema),
    defaultValues: { fullName: "", contactInfo: "", email: "", password: "" },
  })

  async function onSubmit(data: CreateClientInput) {
    const result = await createClientAction(data)
    if (result.success) {
      setOpen(false)
      form.reset()
    } else {
      form.setError("root", { message: result.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-1.5" />
          New Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Client</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="client@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Min. 8 characters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan dela Cruz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Info</FormLabel>
                  <FormControl>
                    <Input placeholder="+63 912 345 6789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-sm text-red-500">{form.formState.errors.root.message}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
