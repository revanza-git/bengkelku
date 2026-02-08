import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateUser, useResetUserPassword, useUpdateUser, type User } from "@/hooks/useUsers";
import { Checkbox } from "@/components/ui/checkbox";

const userFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "procurement", "warehouse", "finance", "viewer"]),
  is_active: z.boolean(),
  password: z.string().optional(),
}).refine((data) => data.password === undefined || data.password.length === 0 || data.password.length >= 8, {
  message: "Password must be at least 8 characters",
  path: ["password"],
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editUser?: User;
}

export function UserForm({ open, onOpenChange, editUser }: UserFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const resetPassword = useResetUserPassword();
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      full_name: "",
      role: "viewer",
      is_active: true,
      password: "",
    },
  });

  // Update form when editUser changes
  useEffect(() => {
    if (editUser) {
      form.reset({
        email: editUser.email,
        full_name: editUser.full_name || "",
        role: (["admin", "procurement", "warehouse", "finance", "viewer"].includes(editUser.role) 
          ? editUser.role 
          : "viewer") as "admin" | "procurement" | "warehouse" | "finance" | "viewer",
        is_active: editUser.is_active ?? true,
        password: "",
      });
      setShowPasswordReset(false);
    } else {
      form.reset({
        email: "",
        full_name: "",
        role: "viewer",
        is_active: true,
        password: "",
      });
      setShowPasswordReset(false);
    }
  }, [editUser, form]);

  const onSubmit = async (values: UserFormValues) => {
    try {
      if (editUser) {
        await updateUser.mutateAsync({
          id: editUser.id,
          full_name: values.full_name,
          role: values.role,
          is_active: values.is_active,
        });

        if (showPasswordReset && values.password && values.password.length >= 8) {
          await resetPassword.mutateAsync({
            userId: editUser.id,
            newPassword: values.password,
          });
        }

        toast({
          title: "User updated",
          description: "User information has been updated successfully.",
        });
      } else {
        if (!values.password || values.password.length < 8) {
          toast({
            title: "Password required",
            description: "Please provide a password with at least 8 characters for the new user.",
            variant: "destructive",
          });
          return;
        }

        await createUser.mutateAsync({
          email: values.email,
          password: values.password,
          full_name: values.full_name,
          role: values.role,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
      form.reset();
      setShowPasswordReset(false);
    } catch (error: any) {
      console.error("Error submitting user form:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editUser ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {editUser 
              ? "Update user information and permissions"
              : "Create a new user account with email and password"
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="user@example.com" 
                      {...field} 
                      disabled={!!editUser}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!editUser && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Min 8 characters" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {editUser && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="resetPassword"
                    checked={showPasswordReset}
                    onCheckedChange={(checked) => setShowPasswordReset(checked as boolean)}
                  />
                  <label
                    htmlFor="resetPassword"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Reset this user's password
                  </label>
                </div>
                {showPasswordReset && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Min 8 characters" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-[100] bg-popover">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="procurement">Procurement</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable or disable this user account
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editUser ? "Update" : "Add"} User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
