import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  org_id: string;
  created_at: string;
  is_active?: boolean;
}

export function useUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
    retry: 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: { email: string; password: string; full_name?: string; role: string; is_active?: boolean }) =>
      usersApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'User created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating user',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<User> & { id: string }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'User updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating user',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      usersApi.updatePassword(userId, newPassword),
    onSuccess: () => {
      toast({ title: 'Password updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating password',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'User deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting user',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    users,
    isLoading,
    error,
    createUser: createMutation.mutate,
    createUserAsync: createMutation.mutateAsync,
    updateUser: updateMutation.mutate,
    updateUserAsync: updateMutation.mutateAsync,
    updatePassword: updatePasswordMutation.mutate,
    updatePasswordAsync: updatePasswordMutation.mutateAsync,
    deleteUser: deleteMutation.mutate,
    deleteUserAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export const useCreateUser = () => {
  const { createUser, createUserAsync } = useUsers();
  return { mutate: createUser, mutateAsync: createUserAsync };
};

export const useUpdateUser = () => {
  const { updateUser, updateUserAsync } = useUsers();
  return { mutate: updateUser, mutateAsync: updateUserAsync };
};

export const useResetUserPassword = () => {
  const { updatePassword, updatePasswordAsync } = useUsers();
  return { mutate: updatePassword, mutateAsync: updatePasswordAsync };
};
